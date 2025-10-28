<template>
  <div class="chat">
    <h2>Chat Demo</h2>

    <div class="controls">
      <button class="btn" @click="startSession" :disabled="loading">Start Session</button>
      <span v-if="sessionId" class="session">Session: {{ sessionId }}</span>
    </div>

    <div v-if="loading" class="status">Loading...</div>

    <div v-if="currentQuestion" class="question-card">
      <h3>Question {{ currentQuestion.id }}</h3>
      <p class="prompt">{{ currentQuestion.prompt }}</p>

      <!-- Input renderer -->
      <div class="input-area">
        <!-- Single choice -->
        <div v-if="currentQuestion.type === 'single_choice'">
          <label v-for="opt in currentQuestion.options" :key="opt" class="opt">
            <input type="radio" name="single" :value="opt" v-model="singleChoice" />
            <span>{{ opt }}</span>
          </label>
        </div>

        <!-- Multiple choice -->
        <div v-else-if="currentQuestion.type === 'multiple_choice'">
          <label v-for="opt in currentQuestion.options" :key="opt" class="opt">
            <input type="checkbox" :value="opt" v-model="multiChoice" />
            <span>{{ opt }}</span>
          </label>
        </div>

        <!-- Number input -->
        <div v-else-if="currentQuestion.type === 'number_input'">
          <input class="text-input" type="number" v-model.number="textAnswer" placeholder="Enter a number" />
        </div>

        <!-- Text input -->
        <div v-else>
          <input class="text-input" type="text" v-model="textAnswer" placeholder="Type your answer" />
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" @click="sendAnswer" :disabled="loading || !canSubmit">Send Answer</button>
      </div>
    </div>

    <div v-else-if="sessionId && !currentQuestion" class="done">
      <p>No further questions. Conversation complete.</p>
    </div>

    <div v-if="history.length" class="history">
      <h3>History</h3>
      <ul>
        <li v-for="(item, idx) in history" :key="idx">
          <strong>Q{{ item.q.id }}:</strong> {{ item.q.prompt }}<br />
          <strong>A:</strong> {{ formatAnswer(item.a) }}
        </li>
      </ul>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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

    const res = await axios.post('/chat/start')
    sessionId.value = res.data.sessionId
    currentQuestion.value = res.data.currentQuestion
    resetInput()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to start session'
  } finally {
    loading.value = false
  }
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
    const res = await axios.post('/chat/ask', payload)

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

function formatAnswer(a) {
  return Array.isArray(a) ? a.join(', ') : String(a)
}
</script>

<style scoped>
.chat { max-width: 800px; margin: 0 auto; }
.controls { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.session { color: #666; font-size: 0.95rem; }
.status { margin: 1rem 0; color: #666; font-style: italic; }
.question-card { background: #fff; border-radius: 8px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.prompt { margin: 0.5rem 0 1rem; color: #2c3e50; }
.input-area { margin-bottom: 1rem; }
.opt { display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0; }
.text-input { width: 100%; padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid #ddd; }
.actions { display: flex; gap: 0.5rem; }
.btn { background: #ddd; border: none; padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; }
.btn.primary { background: #42b983; color: #fff; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.history { margin-top: 1.5rem; }
.history ul { list-style: none; padding: 0; }
.history li { background: #fafafa; padding: 0.75rem; border: 1px solid #eee; border-radius: 6px; margin-bottom: 0.5rem; }
.error { margin-top: 1rem; color: #c33; background: #fee; border: 1px solid #fbb; padding: 0.75rem; border-radius: 6px; }
</style>
