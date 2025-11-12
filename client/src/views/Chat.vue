<template>
  <div class="chat card">
    <div class="chat-header">
      <div class="title">AI_SIHAT CHAT</div>
      <div class="controls">
        <button class="btn" @click="refreshChat" :disabled="loading">Start New Chat</button>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="messages" ref="messagesRef">
  <div v-if="!sessionId && !loading" class="empty">Initializing chat...</div>
      <div v-if="loading" class="status">Loading...</div>

      <!-- Render history as alternating bot/user bubbles (filter out standalone recommendation heading) -->
      <template v-for="(item, idx) in filteredHistory" :key="idx">
        <div class="bubble bot">
          <div class="bubble-content">
            <!-- Format recommendation prompts nicely in history -->
            <template v-if="Array.isArray(item.q.prompt)">
              <div class="recommendation-heading">Based on your symptoms, here are our recommendations:</div>
              <div v-for="section in parseRecommendationSections(item.q.prompt)" :key="section.title" class="recommendation-section">
                <div v-if="section.title" class="section-title">{{ section.title }}</div>
                <div v-for="(line, lineIdx) in section.lines" :key="lineIdx" :class="section.class">
                  {{ line }}
                </div>
              </div>
            </template>
            <template v-else>
              {{ item.q.prompt }}
            </template>
          </div>
        </div>
        <div class="bubble user">
          <div class="bubble-content">{{ formatAnswer(item.a) }}</div>
        </div>
      </template>

      <!-- Current question from bot (if any) -->
      <!-- Don't show regular bubble for medication_cart or completion_message (they have special rendering below) -->
      <div v-if="currentQuestion && !isLanguageQuestion(currentQuestion) && !isRecommendationHeading(currentQuestion.prompt) && currentQuestion.type !== 'medication_cart' && currentQuestion.type !== 'completion_message'" class="bubble bot current">
        <div class="bubble-content">
          <!-- Format recommendation prompts nicely -->
          <template v-if="Array.isArray(currentQuestion.prompt)">
            <div class="recommendation-heading">Based on your symptoms, here are our recommendations:</div>
            <div v-for="section in parseRecommendationSections(currentQuestion.prompt)" :key="section.title" class="recommendation-section">
              <div v-if="section.title" class="section-title">{{ section.title }}</div>
              <div v-for="(line, idx) in section.lines" :key="idx" :class="section.class">
                {{ line }}
              </div>
            </div>
          </template>
          <template v-else>
            {{ currentQuestion.prompt }}
          </template>
        </div>
      </div>

      <!-- Quick replies for choice questions: render below the question bubble for better mobile layout -->
      <div v-if="currentQuestion && !isLanguageQuestion(currentQuestion) && currentQuestion.type === 'single_choice'" class="quick-replies below">
        <button v-for="opt in currentQuestion.options" :key="opt" :class="['chip', {selected: singleChoice === opt}]" @click="selectQuick(opt)">{{ opt }}</button>
      </div>

      <div v-else-if="currentQuestion && !isLanguageQuestion(currentQuestion) && currentQuestion.type === 'multiple_choice'" class="quick-replies below">
        <button v-for="opt in currentQuestion.options" :key="opt" :class="['chip', {selected: multiChoice.includes(opt)}]" @click="toggleMulti(opt)">{{ opt }}</button>
      </div>

      <!-- Continue button only for array recommendation bubble (after auto-skipping heading) -->
      <div v-if="currentQuestion && Array.isArray(currentQuestion.prompt)" class="quick-replies below centered">
        <button class="chip continue-btn" @click="continueFromRecommendation" :disabled="loading">
          <span>Continue</span>
          <span class="arrow">→</span>
        </button>
      </div>

      <!-- Medication Cart Display -->
      <div v-if="currentQuestion && currentQuestion.type === 'medication_cart'" class="medication-cart">
        <div class="cart-title">💊 Available Medications</div>
        <div class="medications-grid">
          <div v-for="(med, idx) in currentQuestion.medications" :key="idx" class="medication-card">
            <div class="med-image-placeholder">
              <span class="image-icon">📦</span>
            </div>
            <div class="med-info">
              <div class="med-name">{{ med.name }}</div>
              <div class="med-symptom">For: {{ med.symptom }}</div>
            </div>
            <button 
              class="btn-add-cart" 
              :class="{ 'added': addedToCart.find(m => m.name === med.name) }"
              @click="addToCart(med)">
              {{ addedToCart.find(m => m.name === med.name) ? '✓ Added' : 'Add to Cart' }}
            </button>
          </div>
        </div>
        <div class="cart-actions">
          <button class="chip continue-btn" @click="continueFromCart" :disabled="loading">
            <span>Continue {{ addedToCart.length > 0 ? `(${addedToCart.length} item${addedToCart.length > 1 ? 's' : ''})` : '' }}</span>
            <span class="arrow">→</span>
          </button>
        </div>
      </div>

      <!-- Completion Message Display -->
      <div v-if="currentQuestion && currentQuestion.type === 'completion_message'" class="completion-message">
        <div class="completion-icon">✅</div>
        <div class="completion-text">{{ currentQuestion.prompt }}</div>
      </div>

      <div v-if="sessionId && !currentQuestion && !loading" class="done">No further questions. Conversation complete.</div>
    </div>

  <!-- Composer - Hide completely when showing recommendation array, medication cart, or completion message -->
  <div v-if="currentQuestion && !Array.isArray(currentQuestion.prompt) && currentQuestion.type !== 'medication_cart' && currentQuestion.type !== 'completion_message'" class="composer">
      <!-- Show input whenever session exists (bot asks first). Send button remains disabled until canSubmit is true. -->
      <input v-if="sessionId && !loading && currentQuestion && ((currentQuestion.type !== 'multiple_choice' && currentQuestion.type !== 'single_choice') || otherSymptomSelected || yesSelected)" v-model="textAnswer" :type="currentQuestion && currentQuestion.type === 'number_input' ? 'number' : 'text'" placeholder="Type your answer..." @keydown.enter.prevent="sendAnswer" />

      <div class="composer-actions">
        <button class="btn primary" @click="sendAnswer" :disabled="loading || !canSubmit">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from 'axios'

const sessionId = ref('')
const currentQuestion = ref(null)
const loading = ref(false)
const error = ref('')
const history = ref([])
const otherSymptomSelected = ref(false)
const yesSelected = ref(false)
const addedToCart = ref([]) // Track medications added to cart

// form state
const singleChoice = ref('')
const multiChoice = ref([])
const textAnswer = ref('')
// keep a small language-label list to detect and hide backend language-selection questions
const languages = ref([
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Malay' },
  { code: 'zh', label: '中文' },
  { code: 'ta', label: 'தமிழ்' }
])

function isLanguageQuestion(q) {
  if (!q || !q.options || !Array.isArray(q.options)) return false
  const labels = languages.value.map(l => l.label.toLowerCase())
  return q.options.every(opt => labels.includes(String(opt).toLowerCase()))
}

const resetInput = () => {
  singleChoice.value = ''
  multiChoice.value = []
  textAnswer.value = ''
  otherSymptomSelected.value = false
  yesSelected.value = false
  addedToCart.value = [] // Clear cart on reset
}

// Identify the standalone heading prompt sent by backend
function isRecommendationHeading(prompt) {
  if (typeof prompt !== 'string') return false
  return prompt.toLowerCase().includes('based on your symptoms')
}

// Filter out heading-only items from history to avoid duplicates
// Also filter out special types that have dedicated rendering (medication_cart, completion_message)
const filteredHistory = computed(() => {
  return history.value.filter(it => {
    const isHeading = isRecommendationHeading(it.q?.prompt)
    const isSpecialType = it.q?.type === 'medication_cart' || it.q?.type === 'completion_message'
    return !isHeading && !isSpecialType
  })
})

const canSubmit = computed(() => {
  if (!currentQuestion.value) return false
  const t = currentQuestion.value.type
  // Allow proceeding when recommendation is being displayed, either by type or by array prompt
  if (t === 'recommendation_display' || Array.isArray(currentQuestion.value?.prompt)) {
    return true // Always allow proceeding from recommendation display
  }
  if (t === 'single_choice') {
    // If 'Yes' is selected, textAnswer must not be empty.
    if (yesSelected.value) {
      return textAnswer.value.trim().length > 0
    }
    // Otherwise, a choice must be made (for 'No' or other options).
    return !!singleChoice.value
  }
  if (t === 'multiple_choice') {
    // If 'Other' is selected, textAnswer must not be empty.
    if (otherSymptomSelected.value) {
      return textAnswer.value.trim().length > 0
    }
    // Otherwise, at least one option must be selected.
    return multiChoice.value.length > 0
  }
  return String(textAnswer.value).length > 0 || t === 'number_input'
})

async function startSession() {
  try {
    loading.value = true
    error.value = ''
    history.value = []
    const res = await axios.post('/api/chat/start')
    sessionId.value = res.data.sessionId
    currentQuestion.value = res.data.currentQuestion

    // If backend asks to select a language, auto-respond with English (so user doesn't see the language prompt)
    const defaultLangLabel = languages.value.find(l => l.code === 'en')?.label || 'English'
    // consume language-selection questions automatically
    while (currentQuestion.value && isLanguageQuestion(currentQuestion.value)) {
      try {
        const ansRes = await axios.post('/api/chat/ask', { sessionId: sessionId.value, answer: defaultLangLabel })
        // do not push language-selection into history; just advance
        currentQuestion.value = ansRes.data.nextQuestion
      } catch (e) {
        // if auto-answer fails, break and show the question so user can see it
        console.error('Auto-select language failed', e)
        break
      }
    }

    resetInput()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to start session'
  } finally {
    loading.value = false
  }
}

function refreshChat() {
  // clear history and restart
  startSession()
}

function buildAnswerPayload() {
  const t = currentQuestion.value.type
  if (t === 'single_choice') {
    // For 'Yes' with details, send just the text. Otherwise, send the selected option.
    if (yesSelected.value) {
      return textAnswer.value
    }
    return singleChoice.value
  }
  if (t === 'multiple_choice') {
    // Combine selected chips and the text input if 'Other' was selected
    const payload = [...multiChoice.value]
    if (otherSymptomSelected.value && textAnswer.value) {
      // Remove 'Other (Specify)' and add the actual text
      const otherIndex = payload.indexOf('Other (Specify)')
      if (otherIndex > -1) {
        payload.splice(otherIndex, 1)
      }
      payload.push(textAnswer.value)
    }
    return payload
  }
  if (t === 'number_input') return Number(textAnswer.value)
  return String(textAnswer.value)
}

async function sendAnswer() {
  if (!sessionId.value || !currentQuestion.value) return
  try {
    loading.value = true
    error.value = ''

    const payload = {
      sessionId: sessionId.value,
      answer: buildAnswerPayload()
    }

    // Optimistic UI update: Add to history immediately (before backend response)
    history.value.push({ q: currentQuestion.value, a: payload.answer })
    
    // Clear current question to show "loading" state
    const previousQuestion = currentQuestion.value
    currentQuestion.value = null
    
    // Reset input immediately so user sees their answer was captured
    resetInput()

    // Now send to backend
    const res = await axios.post('/api/chat/ask', payload)

    // Update with next question from backend
    currentQuestion.value = res.data.nextQuestion
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to send answer'
    // On error, restore the question so user can try again
    if (history.value.length > 0) {
      const lastEntry = history.value.pop()
      currentQuestion.value = lastEntry.q
    }
  } finally {
    loading.value = false
  }
}

// UI helpers: auto-scroll messages container
const messagesRef = ref(null)
const scrollToBottom = async () => {
  await nextTick()
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

watch([history, currentQuestion, loading], () => {
  scrollToBottom()
})

onMounted(() => scrollToBottom())

// auto-start chat when view mounts
onMounted(() => {
  startSession()
})

// Auto-advance past heading-only prompt so user only sees the combined recommendation bubble
watch(currentQuestion, (q) => {
  if (q && isRecommendationHeading(q.prompt)) {
    // silently proceed
    continueFromRecommendation()
  }
})

function selectQuick(opt) {
  singleChoice.value = opt;
  // Check if this is a "Yes" option that requires user input
  // Patterns: "Yes (List down details)", "Yes, When___?", "Yes , What__?"
  const requiresInput = opt.toLowerCase().includes('yes') && 
                        (opt.includes('(') || opt.includes('_'))
  
  if (requiresInput) {
    yesSelected.value = true;
    // Don't send answer immediately, wait for user input
  } else {
    yesSelected.value = false;
    textAnswer.value = opt;
    sendAnswer();
  }
}

function toggleMulti(opt) {
  if (opt === 'Other (Specify)') {
    otherSymptomSelected.value = !otherSymptomSelected.value
    // also add/remove from multichoice to show visual selection
    const idx = multiChoice.value.indexOf(opt)
    if (idx === -1 && otherSymptomSelected.value) {
      multiChoice.value.push(opt)
    } else if (idx > -1 && !otherSymptomSelected.value) {
      multiChoice.value.splice(idx, 1)
    }
    return
  }

  const idx = multiChoice.value.indexOf(opt)
  if (idx === -1) multiChoice.value.push(opt)
  else multiChoice.value.splice(idx, 1)
}

function continueFromRecommendation() {
  // For recommendation_display type, proceed with a dummy answer
  if (loading.value) return
  textAnswer.value = 'Continue'
  sendAnswer()
}

function addToCart(medication) {
  // Add medication to cart tracking
  if (!addedToCart.value.find(m => m.name === medication.name)) {
    addedToCart.value.push(medication)
  }
  // Visual feedback is handled by button state change
  // TODO: Integrate with actual shopping cart system
}

function continueFromCart() {
  // User finished reviewing medications, proceed to next question
  if (loading.value) return
  // Send information about whether items were added
  textAnswer.value = addedToCart.value.length > 0 
    ? `Added ${addedToCart.value.length} item(s) to cart` 
    : 'No items added'
  sendAnswer()
}

function parseRecommendationSections(promptArray) {
  if (!Array.isArray(promptArray)) return []
  
  const sections = []
  let currentSection = null
  
  promptArray.forEach(line => {
    const trimmedLine = line.trim()
    
    // Check if this is a section header (starts with ---)
    if (trimmedLine.startsWith('---') && trimmedLine.endsWith('---')) {
      // Save previous section if exists
      if (currentSection) sections.push(currentSection)
      // Start new symptom section
      currentSection = {
        title: trimmedLine,
        lines: [],
        class: 'recommendation-line symptom-header'
      }
      return
    }
    
    // Detect section types by keywords
    if (trimmedLine.startsWith('S/E')) {
      if (currentSection) sections.push(currentSection)
      currentSection = {
        title: '⚠️ Side Effects:',
        lines: [trimmedLine.replace('S/E :', '').replace('S/E:', '').trim()],
        class: 'recommendation-line side-effect'
      }
    } else if (trimmedLine.toLowerCase().includes('if your condition') || trimmedLine.toLowerCase().includes('refer to doctor')) {
      if (currentSection) sections.push(currentSection)
      currentSection = {
        title: '🏥 When to See a Doctor:',
        lines: [trimmedLine],
        class: 'recommendation-line warning'
      }
    } else if (trimmedLine.toLowerCase().startsWith('advise:') || trimmedLine.toLowerCase().includes('avoid')) {
      if (currentSection) sections.push(currentSection)
      currentSection = {
        title: '💡 Advice:',
        lines: [trimmedLine.replace(/^Advise:/i, '').trim()],
        class: 'recommendation-line advice'
      }
    } else if (trimmedLine.toLowerCase().includes('please have a good rest') || trimmedLine.toLowerCase().includes('thank you')) {
      if (currentSection) sections.push(currentSection)
      currentSection = {
        title: null,
        lines: [trimmedLine],
        class: 'recommendation-line greeting'
      }
    } else {
      // Regular medication/instruction line
      if (!currentSection || currentSection.title === null) {
        if (currentSection) sections.push(currentSection)
        currentSection = {
          title: '💊 Medication:',
          lines: [trimmedLine],
          class: 'recommendation-line medication'
        }
      } else {
        // Add to current section
        currentSection.lines.push(trimmedLine)
      }
    }
  })
  
  // Push last section
  if (currentSection) sections.push(currentSection)
  
  return sections
}

function formatAnswer(a) {
  return Array.isArray(a) ? a.join(', ') : String(a)
}
</script>

<style scoped>
.chat {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 70vh;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.title { font-weight: 700 }

.controls { display:flex; gap:0.5rem; align-items:center }

.session { color: #666; font-size:0.9rem }

.messages {
  background: #f7f7f7;
  flex: 1 1 auto;
  padding: 1rem;
  overflow-y: auto;
  border-radius: 10px;
}

.empty { color:#666; text-align:center; padding:1.2rem }
.status { color:#666; font-style:italic; text-align:center; padding:0.6rem }

.bubble { display: flex; margin: 0.5rem 0 }
.bubble .bubble-content { max-width: 75%; padding:0.6rem 0.9rem; border-radius:12px }
.bubble.bot { justify-content: flex-start }
.bubble.bot .bubble-content { background: #fff; color:#2c3e50; border:1px solid #eee }
.bubble.user { justify-content: flex-end }
.bubble.user .bubble-content { background: #42b983; color:#fff }
.bubble.current .bubble-content { box-shadow: 0 2px 8px rgba(0,0,0,0.06) }

/* Make recommendation bubbles wider */
.bubble.bot .bubble-content:has(.recommendation-line) {
  max-width: 90%;
  padding: 1rem 1.2rem;
}

/* Recommendation line formatting */
.recommendation-section {
  margin-bottom: 1rem;
}
.recommendation-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.4rem;
  color: #2c3e50;
}

.recommendation-line {
  margin-bottom: 0.4rem;
  line-height: 1.6;
  padding-left: 0.5rem;
}
.recommendation-line:last-child {
  margin-bottom: 0;
}

.recommendation-line.symptom-header {
  font-weight: 700;
  color: #42b983;
  font-size: 1.05em;
  padding-left: 0;
  margin-top: 0.8rem;
  margin-bottom: 0.5rem;
}

.recommendation-line.medication {
  color: #2c3e50;
  font-weight: 600;
}

.recommendation-line.side-effect {
  color: #e67e22;
  background: #fef5e7;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border-left: 3px solid #e67e22;
}

.recommendation-line.warning {
  color: #c0392b;
  background: #fadbd8;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border-left: 3px solid #c0392b;
}

.recommendation-line.advice {
  color: #16a085;
  background: #d5f4e6;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border-left: 3px solid #16a085;
}

.recommendation-line.greeting {
  color: #7f8c8d;
  font-style: italic;
  padding-left: 0;
  margin-top: 0.6rem;
}

.recommendation-heading {
  font-weight: 700;
  margin-bottom: 0.6rem;
}

.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.8rem;
  align-items: center;
}
.quick-replies.below {
  /* make quick-replies sit visually below the question bubble with a bit of breathing room */
  margin-top: 0.5rem;
  margin-bottom: 0.6rem;
  justify-content: flex-start;
}
.quick-replies.centered {
  justify-content: center;
}
.chip {
  background: #f3f4f6; /* light neutral */
  border: 1px solid rgba(0,0,0,0.04);
  padding: 0.6rem 1.05rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  color: #111827;
  box-shadow: 0 2px 6px rgba(2,6,23,0.04);
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}
.chip:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(2,6,23,0.08);
}
.chip.selected {
  background: #42b983;
  color: #fff;
  border-color: rgba(0,0,0,0.06);
}
.chip.continue-btn {
  background: #42b983;
  color: #fff;
  padding: 0.6rem 1.05rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 2px 6px rgba(2,6,23,0.06);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}
.chip.continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(2,6,23,0.12);
}
.chip.continue-btn .arrow {
  font-size: 1.05rem;
  transition: transform .2s ease;
}
.chip.continue-btn:hover .arrow {
  transform: translateX(3px);
}

.composer { display:flex; gap:0.5rem; margin-top:0.6rem; align-items:center }
.composer input { flex:1; padding:0.6rem; border-radius:10px; border:1px solid #e6e6e6 }
.composer-actions { display:flex }
.composer-hint { font-size:0.9rem; color:#666; margin-top:0.4rem }

.btn { background: #ddd; border: none; padding: 0.5rem 0.9rem; border-radius: 8px; cursor: pointer }
.btn.primary { background:#42b983; color:#fff }
.btn:disabled { opacity:0.6 }

.done { text-align:center; color:#666; padding:0.8rem }

/* Medication Cart Styles */
.medication-cart {
  margin-top: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.cart-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1.2rem;
  text-align: center;
}

.medications-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.medication-card {
  background: white;
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.medication-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.med-image-placeholder {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.image-icon {
  font-size: 2.5rem;
}

.med-info {
  flex: 1;
}

.med-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.3rem;
  line-height: 1.4;
}

.med-symptom {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.btn-add-cart {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-add-cart:hover {
  background: #359268;
  transform: scale(1.05);
}

.btn-add-cart.added {
  background: #95a5a6;
  cursor: default;
}

.btn-add-cart.added:hover {
  background: #95a5a6;
  transform: scale(1);
}

.cart-actions {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

/* Completion Message Styles */
.completion-message {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-top: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.completion-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: bounce 0.8s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.completion-text {
  font-size: 1.1rem;
  line-height: 1.6;
  font-weight: 500;
  white-space: pre-line;
}

.error { margin-top:0.6rem; color:#c33; background:#fee; border:1px solid #fbb; padding:0.6rem; border-radius:8px }
</style>
