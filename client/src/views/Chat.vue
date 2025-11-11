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
              <div v-for="(line, lineIdx) in item.q.prompt" :key="lineIdx" class="recommendation-line">
                {{ line }}
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
      <div v-if="currentQuestion && !isLanguageQuestion(currentQuestion) && !isRecommendationHeading(currentQuestion.prompt)" class="bubble bot current">
        <div class="bubble-content">
          <!-- Format recommendation prompts nicely -->
          <template v-if="Array.isArray(currentQuestion.prompt)">
            <div class="recommendation-heading">Based on your symptoms, here are our recommendations:</div>
            <div v-for="(line, idx) in currentQuestion.prompt" :key="idx" class="recommendation-line">
              {{ line }}
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

      <div v-if="sessionId && !currentQuestion && !loading" class="done">No further questions. Conversation complete.</div>
    </div>

  <!-- Composer - Hide completely when showing recommendation array -->
  <div v-if="currentQuestion && !Array.isArray(currentQuestion.prompt)" class="composer">
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
}

// Identify the standalone heading prompt sent by backend
function isRecommendationHeading(prompt) {
  if (typeof prompt !== 'string') return false
  return prompt.toLowerCase().includes('based on your symptoms')
}

// Filter out heading-only items from history to avoid duplicates
const filteredHistory = computed(() => {
  return history.value.filter(it => !isRecommendationHeading(it.q?.prompt))
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
    const res = await axios.post('/api/chat/ask', payload)

    // track history
    history.value.push({ q: currentQuestion.value, a: payload.answer })

    currentQuestion.value = res.data.nextQuestion
    resetInput()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to send answer'
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
  if (opt.toLowerCase().startsWith('yes')) {
    yesSelected.value = true;
    // Don't send answer immediately, wait for user input
  } else {
    yesSelected.value = false; // Ensure yesSelected is false for "No"
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
.recommendation-line {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}
.recommendation-line:last-child {
  margin-bottom: 0;
}
.recommendation-line:first-child {
  font-weight: 600;
  color: #42b983;
  font-size: 1.05em;
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

.error { margin-top:0.6rem; color:#c33; background:#fee; border:1px solid #fbb; padding:0.6rem; border-radius:8px }
</style>
