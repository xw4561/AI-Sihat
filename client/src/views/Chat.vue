<template>
  <!-- Show Branch Selector if showSelector is true -->
  <BranchSelector 
    v-if="showSelector" 
    @branch-selected="handleBranchSelected" 
  />

  <!-- Show Chat Content only if a branch is selected -->
  <div v-else-if="selectedBranch" class="chat card">
    <div class="chat-header">
      <div class="title">AI_SIHAT CHAT</div>
      <div class="subtitle">
        Connected to: <strong>{{ selectedBranch.name }}</strong>
      </div>
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
            <div v-for="(section, sIdx) in parseRecommendationSections(item.q.prompt, item.q.symptomName)" :key="sIdx" class="recommendation-section">
                <!-- Symptom header at top of card -->
                <div class="recommendation-line symptom-header">{{ section.symptomHeader }}</div>
                <!-- All subsections within the same card -->
                <template v-for="(subsection, subIdx) in section.subsections" :key="subIdx">
                  <div v-if="subsection.title" class="section-title">{{ subsection.title }}</div>
                  <div v-for="(line, lineIdx) in subsection.lines" :key="lineIdx" :class="subsection.class">
                    {{ line }}
                  </div>
                </template>
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

      <!-- Placeholder user bubble to maintain width consistency before first reply -->
      <div v-if="showPlaceholder" class="bubble user placeholder">
        <div class="bubble-content">Can you describe your symptoms in your own words?</div>
      </div>

      <!-- Current question from bot (if any) -->
      <div v-if="currentQuestion && !isRecommendationHeading(currentQuestion.prompt)" class="bubble bot current">
        <div class="bubble-content">
          <!-- Format recommendation prompts nicely -->
          <template v-if="Array.isArray(currentQuestion.prompt)">
            <div class="recommendation-heading">Based on your symptoms, here are our recommendations:</div>
            <div v-for="(section, sIdx) in parseRecommendationSections(currentQuestion.prompt, currentQuestion.symptomName)" :key="sIdx" class="recommendation-section">
              <!-- Symptom header at top of card -->
              <div class="recommendation-line symptom-header">{{ section.symptomHeader }}</div>
              <!-- All subsections within the same card -->
              <template v-for="(subsection, subIdx) in section.subsections" :key="subIdx">
                <div v-if="subsection.title" class="section-title">{{ subsection.title }}</div>
                <div v-for="(line, lineIdx) in subsection.lines" :key="lineIdx" :class="subsection.class">
                  {{ line }}
                </div>
              </template>
            </div>
          </template>
          <template v-else>
            {{ currentQuestion.prompt }}
          </template>
        </div>
      </div>

      <!-- Quick replies for choice questions: render below the question bubble for better mobile layout -->
      <div v-if="currentQuestion && currentQuestion.type === 'single_choice'" class="quick-replies-wrapper">
        <div class="quick-replies below">
          <button v-for="opt in currentQuestion.options" :key="opt" :class="['chip', {selected: singleChoice === opt}]" @click="selectQuick(opt)">{{ opt }}</button>
        </div>
      </div>

      <div v-else-if="currentQuestion && currentQuestion.type === 'multiple_choice'" class="quick-replies-wrapper">
        <div class="quick-replies below">
          <button v-for="opt in currentQuestion.options" :key="opt" :class="['chip', {selected: multiChoice.includes(opt)}]" @click="toggleMulti(opt)">{{ opt }}</button>
        </div>
      </div>

      <!-- Continue button only for array recommendation bubble (after auto-skipping heading) -->
      <div v-if="currentQuestion && Array.isArray(currentQuestion.prompt)" class="quick-replies below centered">
        <button class="chip continue-btn" @click="continueFromRecommendation" :disabled="loading">
          <span>Continue</span>
          <span class="arrow">→</span>
        </button>
      </div>

      <!-- Waiting for Approval Display -->
      <div v-if="currentQuestion && currentQuestion.type === 'waiting_approval'" class="waiting-approval">
        <div class="waiting-icon">
          <div class="spinner"></div>
        </div>
        <div class="waiting-text">{{ currentQuestion.prompt }}</div>
        <div class="waiting-subtext">This usually takes a few minutes. You'll be notified once the pharmacist reviews your consultation.</div>
      </div>

      <!-- Medication Cart Display -->
      <div v-if="currentQuestion && currentQuestion.type === 'medication_cart'" class="medication-cart">
        <div class="cart-title">💊 Available Medications</div>
        <div class="medications-grid">
          <div v-for="(med, idx) in currentQuestion.medications" :key="idx" class="medication-card">
            <div class="med-image-placeholder">
              <img v-if="med.imageUrl" :src="med.imageUrl" :alt="med.name" class="med-image" />
              <span v-else class="image-icon">📦</span>
            </div>
            <div class="med-info">
              <div class="med-name">{{ med.name }}</div>
              <div class="med-symptom">For: {{ med.symptom }}</div>
              <div v-if="med.wasRejected" class="rejection-info">
                <span class="rejection-badge">⚠️ Alternative</span>
                <p class="rejection-reason">Original rejected: {{ med.rejectionReason }}</p>
              </div>
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
            <span>{{ addedToCart.length > 0 ? 'Finish' : 'Skip' }}</span>
            <span class="arrow">→</span>
          </button>
          <router-link v-if="addedToCart.length > 0" to="/cart" class="chip view-cart-btn">
            <span>🛒 View Cart ({{ addedToCart.length }})</span>
          </router-link>
        </div>
      </div>

      <!-- Completion Message Display -->
      <div v-if="currentQuestion && currentQuestion.type === 'completion_message'" class="completion-message">
        <div class="completion-icon">✅</div>
        <div class="completion-text">{{ currentQuestion.prompt }}</div>
      </div>

      <div v-if="sessionId && !currentQuestion && !loading" class="done">No further questions. Conversation complete.</div>
    </div>

    <!-- Composer - Hide completely when showing recommendation array, medication cart, completion message, or waiting for approval -->
    <div v-if="currentQuestion && !Array.isArray(currentQuestion.prompt) && currentQuestion.type !== 'medication_cart' && currentQuestion.type !== 'completion_message' && currentQuestion.type !== 'waiting_approval'" class="composer">
      <!-- Show input whenever session exists (bot asks first). Send button remains disabled until canSubmit is true. -->
      <input v-if="sessionId && !loading && currentQuestion && ((currentQuestion.type !== 'multiple_choice' && currentQuestion.type !== 'single_choice') || otherSymptomSelected || yesSelected)" v-model="textAnswer" :type="currentQuestion && currentQuestion.type === 'number_input' ? 'number' : 'text'" placeholder="Type your answer..." @keydown.enter.prevent="sendAnswer" />

      <div class="composer-actions">
        <button class="btn primary" @click="sendAnswer" :disabled="loading || !canSubmit">Send</button>
      </div>
    </div>
  </div>

  <!-- Show a loader while checking localStorage -->
  <div v-else class="loader">
    Loading...
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { useCartStore } from '../store/cart'
import BranchSelector from './components/BranchSelector.vue' // Import the modal

const cartStore = useCartStore();

// Local state for branch
const selectedBranch = ref(null);
const showSelector = ref(false);

// (All your existing refs)
const sessionId = ref('')
const currentQuestion = ref(null)
const loading = ref(false)
const error = ref('')
const history = ref([])
const otherSymptomSelected = ref(false)
const yesSelected = ref(false)
const addedToCart = ref([]) // Track medications added to cart
const showPlaceholder = ref(true) // Show placeholder bubble until first reply
const prescriptionId = ref(null) // Track created prescription ID
const orderStatus = ref(null) // Track order status (pending, approved, rejected)
const approvedMedicines = ref([]) // Store approved medicines from pharmacist
const chatComplete = ref(false) // Track if chat has been completed

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
  prescriptionId.value = null
  orderStatus.value = null
  approvedMedicines.value = []
  chatComplete.value = false
}

// Identify the standalone heading prompt sent by backend
function isRecommendationHeading(prompt) {
  if (typeof prompt !== 'string') return false
  return prompt.toLowerCase().includes('based on your symptoms')
}

// Filter out heading-only items from history to avoid duplicates
// Also filter out special types that have dedicated rendering (medication_cart, completion_message)
// Also filter out language selection questions
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
  if (!selectedBranch.value) return;

  try {
    loading.value = true
    error.value = ''
    history.value = []

    // Get user string from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      error.value = "You must be logged in to start a chat.";
      loading.value = false;
      return;
    }
    let user;
    try {
      // Parse the user object
      user = JSON.parse(userStr);
    } catch (e) {
      error.value = "Your user data is corrupted. Please log out and log in again.";
      loading.value = false;
      return;
    } 

    // Check if user.userId actually exists
    if (!user || !user.userId) {
      error.value = "User ID not found in your login data. Please log out and log in again.";
      loading.value = false;
      return;
    }

    // Send the correct userId to the backend
    const res = await axios.post('/api/chat/start', { userId: user.userId })
    sessionId.value = res.data.sessionId
    currentQuestion.value = res.data.currentQuestion

    // Language selection is now shown to user (not auto-selected)
    // This provides consistent UX

    resetInput()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to start session'
  } finally {
    loading.value = false
  }
}

function refreshChat() {
  // clear history and restart
  showPlaceholder.value = true // Reset placeholder for new chat
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

    // Hide placeholder after first answer
    showPlaceholder.value = false

    // Store previous question type to determine if we should add to history
    const previousQuestionType = currentQuestion.value.type
    
    // Only add to history if it's not a special type (medication_cart should not appear in history)
    if (previousQuestionType !== 'medication_cart') {
      history.value.push({ q: currentQuestion.value, a: payload.answer })
    }
    
    // Clear current question to show "loading" state
    const previousQuestion = currentQuestion.value
    currentQuestion.value = null
    
    // Reset input immediately so user sees their answer was captured
    resetInput()

    // Now send to backend
    const res = await axios.post('/api/chat/ask', payload)

    // Update with next question from backend
    currentQuestion.value = res.data.nextQuestion
    
    // If completion_message, add it to history as a regular bot message instead of showing special UI
    if (currentQuestion.value && currentQuestion.value.type === 'completion_message') {
      // Add user's cart summary to history
      history.value.push({ 
        q: { prompt: "Cart Summary", type: "text" }, 
        a: payload.answer 
      })
      // Add bot's thank you message to history
      history.value.push({ 
        q: { prompt: currentQuestion.value.prompt, type: "text" }, 
        a: "acknowledged" 
      })
      // Clear current question so it doesn't show the special completion UI
      currentQuestion.value = null
    }
    
    // Debug: Log medication cart data
    if (currentQuestion.value && currentQuestion.value.type === 'medication_cart') {
      console.log('Received medication_cart question:', currentQuestion.value)
      console.log('Medications array:', currentQuestion.value.medications)
    }
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

// Check localStorage on load
onMounted(() => {
  const storedBranch = localStorage.getItem('selectedBranch');
  if (storedBranch) {
    try {
      selectedBranch.value = JSON.parse(storedBranch);
      startSession(); // Branch exists, start chat
    } catch (e) {
      console.error("Failed to parse branch, forcing re-selection:", e);
      localStorage.removeItem('selectedBranch');
      showSelector.value = true; // Data was bad, force selection
    }
  } else {
    // No branch saved, show the modal
    showSelector.value = true;
  }
});

// Handle event from BranchSelector
function handleBranchSelected(branch) {
  selectedBranch.value = branch;
  showSelector.value = false;
  startSession(); // Now that branch is selected, start chat
}

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
MultiChoice.value.push(opt)
    } else if (idx > -1 && !otherSymptomSelected.value) {
      multiChoice.value.splice(idx, 1)
    }
    return
  }

  const idx = multiChoice.value.indexOf(opt)
  if (idx === -1) multiChoice.value.push(opt)
  else multiChoice.value.splice(idx, 1)
}

async function continueFromRecommendation() {
  // For recommendation_display type, create order and wait for pharmacist approval
  if (loading.value) return

  try {
    loading.value = true
    // Create prescription from chat session
    const res = await axios.post('/api/chat/complete', {
      sessionId: sessionId.value
    })

    prescriptionId.value = res.data.prescription.prescriptionId
    orderStatus.value = 'pending'
    chatComplete.value = true

    // Show waiting message
    currentQuestion.value = {
      type: 'waiting_approval',
      prompt: 'Thank you! Your consultation has been submitted to our pharmacist for review. Please wait for approval...'
    }

    // Start polling for approval status
    pollOrderStatus()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to submit consultation'
    loading.value = false
  }
}

function addToCart(medication) {
  // Add medication to cart tracking
  if (!addedToCart.value.find(m => m.name === medication.name)) {
    addedToCart.value.push(medication)

    // Add to actual cart store
    cartStore.addToCart({
      id: medication.medicineId,
      name: medication.name,
      rice: parseFloat(medication.price || 0),
      imageUrl: medication.imageUrl,
      type: medication.symptom
      })
    }
}

async function pollOrderStatus() {
  if (!prescriptionId.value) return

  const pollInterval = setInterval(async () => {
    try {
      const res = await axios.get(`/ai-sihat/prescriptions/${prescriptionId.value}`)
      const prescription = res.data

      if (prescription.status === 'approved') {
        clearInterval(pollInterval)
        orderStatus.value = 'approved'
        loading.value = false
        
        // Get approved medicines from prescription items
        if (prescription.items && prescription.items.length > 0) {
          approvedMedicines.value = prescription.items.map(item => ({
             ...item.medicine,
            quantity: item.quantity,
            symptom: item.symptom,
            notes: item.notes,
            wasRejected: item.wasRejected,
            rejectionReason: item.rejectionReason
          }))
        }
 
        // Show approved medicines
        currentQuestion.value = {
          type: 'medication_cart',
          prompt: 'Your consultation has been approved! Here are the recommended medications:',
          medications: approvedMedicines.value.map(med => ({
            name: med.medicineName,
            symptom: med.symptom || med.medicineType,
            medicineId: med.medicineId,
            price: med.price,
            imageUrl: med.imageUrl,
            wasRejected: med.wasRejected,
            rejectionReason: med.rejectionReason
          }))
        }
      } else if (prescription.status === 'rejected') {
        clearInterval(pollInterval)
        orderStatus.value = 'rejected'
        loading.value = false
        
        currentQuestion.value = {
          type: 'completion_message',
          prompt: `We're sorry, but the pharmacist was unable to approve this consultation. ${prescription.rejectionReason || 'Please consult with a healthcare professional for further assistance.'}`
        }
      }
    } catch (e) {
      console.error('Error polling prescription status:', e)
    }
  }, 5000) // Poll every 5 seconds

  // Stop polling after 5 minutes
  setTimeout(() => {
    clearInterval(pollInterval)
    if (orderStatus.value === 'pending') {
      loading.value = false
      error.value = 'Approval timeout. Please check your prescription status later.'
    }
  }, 808000)
}

function continueFromCart() {
  // User finished reviewing approved medications
  if (loading.value) return

  // Show completion message
  currentQuestion.value = {
    type: 'completion_message',
    prompt: `Thank you for using AI-Sihat! ${addedToCart.value.length > 0 ? `You've added ${addedToCart.value.length} item(s) to your cart.` : ''} You can proceed to checkout or continue shopping.`
  }
}

function parseRecommendationSections(promptArray, symptomName = null) {
  if (!Array.isArray(promptArray)) return []

  const sections = []
  let currentSymptomSection = null
  let currentSubsection = null

  // Check if prompt has symptom headers (multi-symptom) or not (single symptom)
  const hasSymptomHeaders = promptArray.some(line => 
    line.trim().startsWith('---') && line.trim().endsWith('---')
  )

  // If no symptom headers, create a default section for single symptom
  if (!hasSymptomHeaders) {
    currentSymptomSection = {
      symptomHeader: symptomName ? `--- ${symptomName} ---` : '--- Recommendation ---',
      subsections: []
    }
  }

  promptArray.forEach(line => {
    const trimmedLine = line.trim()

    // Check if this is a symptom header (starts with ---)
    if (trimmedLine.startsWith('---') && trimmedLine.endsWith('---')) {
      // Save previous symptom section if exists
      if (currentSymptomSection) {
        if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection)
        sections.push(currentSymptomSection)
      }
      // Start new symptom section
      currentSymptomSection = {
        symptomHeader: trimmedLine,
        subsections: []
      }
      currentSubsection = null
      return
    }
    
    if (!currentSymptomSection) return
    
    // Detect subsection types by keywords
    if (trimmedLine.startsWith('S/E')) {
      if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection)
      currentSubsection = {
        title: '⚠️ Side Effects:',
        lines: [trimmedLine.replace('S/E :', '').replace('S/E:', '').trim()],
        class: 'recommendation-line side-effect'
      }
    } else if (trimmedLine.toLowerCase().includes('if your condition') || trimmedLine.toLowerCase().includes('refer to doctor') || trimmedLine.toLowerCase().includes('i recommend')) {
      if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection)
      currentSubsection = {
        title: '🏥 When to See a Doctor:',
        lines: [trimmedLine],
        class: 'recommendation-line warning'
      }
    } else if (trimmedLine.toLowerCase().startsWith('advise:') || trimmedLine.toLowerCase().startsWith('advice:') || (trimmedLine.toLowerCase().includes('avoid') && !trimmedLine.toLowerCase().includes('medication')) || trimmedLine.toLowerCase().includes('drink enough water') || trimmedLine.toLowerCase().includes('have a good rest')) {
      // Check if current subsection is already an advice section
      if (currentSubsection && currentSubsection.class === 'recommendation-line advice') {
        // Add to existing advice section instead of creating a new one
        currentSubsection.lines.push(trimmedLine.replace(/^Advise:/i, '').replace(/^Advice:/i, '').trim())
I     } else {
        // Create new advice section
        if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection)
        currentSubsection = {
          title: '💡 Advice:',
          lines: [trimmedLine.replace(/^Advise:/i, '').replace(/^Advice:/i, '').trim()],
          class: 'recommendation-line advice'
        }
      }
    } else if (trimmedLine.toLowerCase().includes('thank you for your time')) {
      if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection)
      currentSubsection = {
        title: null,
        lines: [trimmedLine],
        class: 'recommendation-line greeting'
      }
    } else if (trimmedLine.length > 0) {
      // Regular line - could be medication or continuation
      if (!currentSubsection) {
        // Start medication subsection
        currentSubsection = {
          title: '💊 Medication:',
          lines: [trimmedLine],
          class: 'recommendation-line medication'
        }
      } else {
        // Add to current subsection
        currentSubsection.lines.push(trimmedLine)
section   }
    }
  })
  
  // Push last section
  if (currentSymptomSection) {
    if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection)
    sections.push(currentSymptomSection)
  }
  
  return sections
}

function formatAnswer(a) {
  return Array.isArray(a) ? a.join(', ') : String(a)
}
</script>

<style scoped>
.chat {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  min-height: 400px;
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
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Push content to bottom when there's not enough to fill the container */
.messages > :first-child {
  margin-top: auto;
}

.empty { color:#666; text-align:center; padding:1.2rem }
.status { color:#666; font-style:italic; text-align:center; padding:0.6rem }

.bubble { display: flex; margin: 0.5rem 0; width: 100%; }
.bubble .bubble-content { max-width: 75%; padding:0.6rem 0.9rem; border-radius:12px }
.bubble.bot { justify-content: flex-start }
.bubble.bot .bubble-content { background: #fff; color:#2c3e50; border:1px solid #eee }
.bubble.user { justify-content: flex-end }
.bubble.user .bubble-content { background: #42b983; color:#fff }
.bubble.current .bubble-content { box-shadow: 0 2px 8px rgba(0,0,0,0.06) }

/* Placeholder bubble - transparent to maintain width without being obvious */
.bubble.placeholder .bubble-content {
  opacity: 0;
  pointer-events: none;
}

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

/* Make recommendation bubbles wider and better structured */
.bubble.bot .bubble-content:has(.recommendation-heading) {
  max-width: 92%;
  padding: 1.2rem 1.5rem;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.recommendation-heading {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1.2rem;
  color: #2c3e50;
  padding-bottom: 0.8rem;
  border-bottom: 2px solid #42b983;
}

/* Recommendation section formatting - Each symptom in its own card */
.recommendation-section {
  margin-bottom: 1.5rem;
  background: #ffffff;
  padding: 0;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
.recommendation-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 0.8rem;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.2rem;
}

.recommendation-line {
  margin-bottom: 0.7rem;
  line-height: 1.7;
  padding-left: 0;
  padding-right: 0;
  margin-left: 1.2rem;
  margin-right: 1.2rem;
}
.recommendation-line:last-child {
  margin-bottom: 1.2rem;
}

/* Symptom header styling - Green banner at top of each section */
.recommendation-line.symptom-header {
  font-weight: 700;
  color: white;
  font-size: 1.15rem;
  padding: 0.8rem 1.2rem;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #42b983 0%, #35956a 100%);
  border-radius: 0;
  border-left: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Medication styling - Same style as doctor warning with green theme */
.recommendation-line.medication {
  color: #1b5e20;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.7rem 0.9rem;
  background: #e8f5e9;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
  margin-bottom: 0.8rem;
  line-height: 1.6;
}

/* Side Effects styling */
.recommendation-line.side-effect {
  color: #d84315;
  background: #fff3e0;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  margin-bottom: 0.7rem;
  font-size: 0.95rem;
}

/* Doctor Warning styling */
.recommendation-line.warning {
  color: #c62828;
  background: #ffebee;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border-left: 4px solid #f44336;
  margin-bottom: 0.7rem;
  font-weight: 500;
  font-size: 0.95rem;
}

/* Advice styling */
.recommendation-line.advice {
  color: #00695c;
  background: #e0f2f1;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border-left: 4px solid #009688;
  margin-bottom: 0.7rem;
  font-size: 0.95rem;
}

/* Greeting styling */
.recommendation-line.greeting {
  color: #616161;
  font-style: italic;
  padding: 0.7rem 0.9rem;
  margin-top: 0.8rem;
  background: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #9e9e9e;
  font-size: 0.95rem;
}

.quick-replies-wrapper {
  display: flex;
  margin: 0.5rem 0;
}

.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
.quick-replies.below {
  /* make quick-replies sit visually below the question bubble with a bit of breathing room */
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
  margin-top: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.cart-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1rem;
  text-align: center;
}

.medications-grid {
  display: grid;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.medication-card {
  background: white;
  border-radius: 10px;
  padding: 0.8rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.medication-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.med-image-placeholder {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.med-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-icon {
  font-size: 2rem;
}

.med-info {
  flex: 1;
  min-width: 0;
}

.med-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.rejection-info {
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: #fff3cd;
  border-radius: 6px;
  border-left: 3px solid #ff9800;
}

.rejection-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #ff9800;
  display: block;
  margin-bottom: 0.2rem;
}

.rejection-reason {
  font-size: 0.75rem;
  color: #666;
  margin: 0;
  font-style: italic;
}

.med-symptom {
  font-size: 0.8rem;
  color: #7f8c8d;
}

.btn-add-cart {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
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
  gap: 0.8rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.view-cart-btn {
  background: #3498db !important;
  color: white !important;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.view-cart-btn:hover {
  background: #2980b9 !important;
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

/* Waiting for Approval Styles */
.waiting-approval {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  color: white;
  margin-top: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.waiting-icon {
  margin-bottom: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.waiting-text {
  font-size: 1.2rem;
  line-height: 1.6;
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.waiting-subtext {
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
}

.error { margin-top:0.6rem; color:#c33; background:#fee; border:1px solid #fbb; padding:0.6rem; border-radius:8px }
</style>
