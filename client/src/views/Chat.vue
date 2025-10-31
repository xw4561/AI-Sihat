<template>
  <div class="chat card">
    <div class="chat-header">
      <div class="title">Chat Demo</div>
      <div class="controls">
        <button class="btn" @click="refreshChat" :disabled="loading">Start New Chat</button>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="messages" ref="messagesRef">
  <div v-if="!sessionId && !loading" class="empty">Initializing chat...</div>
      <div v-if="loading" class="status">Loading...</div>

      <!-- Render history as alternating bot/user bubbles -->
      <template v-for="(item, idx) in history" :key="idx">
        <div class="bubble bot">
          <div class="bubble-content">{{ item.q.prompt }}</div>
        </div>
        <div class="bubble user">
          <div class="bubble-content">{{ formatAnswer(item.a) }}</div>
        </div>
      </template>

      <!-- Current question from bot (if any) -->
      <div v-if="currentQuestion && !isLanguageQuestion(currentQuestion)" class="bubble bot current">
        <div class="bubble-content">{{ currentQuestion.prompt }}</div>
      </div>

      <!-- Quick replies for choice questions: render below the question bubble for better mobile layout -->
      <div v-if="currentQuestion && !isLanguageQuestion(currentQuestion) && currentQuestion.type === 'single_choice'" class="quick-replies below">
        <button v-for="opt in currentQuestion.options" :key="opt" class="chip" @click="selectQuick(opt)">{{ opt }}</button>
      </div>

      <div v-else-if="currentQuestion && !isLanguageQuestion(currentQuestion) && currentQuestion.type === 'multiple_choice'" class="quick-replies below">
        <button v-for="opt in currentQuestion.options" :key="opt" :class="['chip', {selected: multiChoice.includes(opt)}]" @click="toggleMulti(opt)">{{ opt }}</button>
      </div>

      <div v-if="sessionId && !currentQuestion && !loading" class="done">No further questions. Conversation complete.</div>
    </div>

    <!-- Composer -->
    <div class="composer">
      <!-- Show input whenever session exists (bot asks first). Send button remains disabled until canSubmit is true. -->
      <input v-if="sessionId && !loading" v-model="textAnswer" :type="currentQuestion && currentQuestion.type === 'number_input' ? 'number' : 'text'" placeholder="Type your answer..." @keydown.enter.prevent="sendAnswer" />

      <div v-if="currentQuestion && currentQuestion.type === 'single_choice'" class="composer-hint">Tap a quick reply or type to override</div>

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
}

const canSubmit = computed(() => {
  if (!currentQuestion.value) return false
  const t = currentQuestion.value.type
  if (t === 'single_choice') return !!singleChoice.value
  if (t === 'multiple_choice') return multiChoice.value.length > 0
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
  if (t === 'single_choice') return singleChoice.value
  if (t === 'multiple_choice') return [...multiChoice.value]
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

function selectQuick(opt) {
  // for single choice, set textAnswer and send immediately
  singleChoice.value = opt
  textAnswer.value = opt
  sendAnswer()
}

function toggleMulti(opt) {
  const idx = multiChoice.value.indexOf(opt)
  if (idx === -1) multiChoice.value.push(opt)
  else multiChoice.value.splice(idx, 1)
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
