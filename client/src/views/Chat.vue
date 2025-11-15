<template>
  <!-- Show Branch Selector if showSelector is true -->
  <BranchSelector v-if="showSelector" @branch-selected="handleBranchSelected" />

  <!-- Show Chat Content only if a branch is selected -->
  <div v-else-if="selectedBranch" class="chat card">
    <div class="chat-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack" title="Go back">
          <span class="back-arrow">←</span>
        </button>
        <div class="title">AI_SIHAT CHAT</div>
      </div>

      <div class="controls">
        <button class="btn" @click="refreshChat" :disabled="loading">Start New Chat</button>
      </div>
    </div>
    <div class="subtitle"
      style="padding: 0.5rem 1rem; background: #fafafa; border-bottom: 1px solid #e6e6e6; font-size: 0.9rem; color: #555; flex-shrink: 0;">
      Connected to: <strong>{{ selectedBranch.name }}</strong>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="messages" ref="messagesRef">
      <div v-if="!sessionId && !loading" class="empty">Initializing chat...</div>
      <div v-if="loading" class="status">Loading...</div>

      <template v-for="(item, idx) in filteredHistory" :key="idx">
        <div class="bubble bot">
          <div class="bubble-content">
            <template v-if="Array.isArray(item.q.prompt)">
              <div class="recommendation-heading">{{ recommendationHeading }}</div>
              <div
                v-for="(section, sIdx) in parseRecommendationSections(item.q.prompt, item.q.symptomName, sessionLangCode)"
                :key="sIdx" class="recommendation-section">
                <div class="recommendation-line symptom-header">{{ section.symptomHeader }}</div>
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

      <div v-if="showPlaceholder" class="bubble user placeholder">
        <div class="bubble-content">Can you describe your symptoms in your own words?</div>
      </div>

      <div v-if="currentQuestion && !isRecommendationHeading(currentQuestion.prompt)" class="bubble bot current">
        <div class="bubble-content">
          <template v-if="Array.isArray(currentQuestion.prompt)">
            <div class="recommendation-heading">{{ recommendationHeading }}</div>
            <div
              v-for="(section, sIdx) in parseRecommendationSections(currentQuestion.prompt, currentQuestion.symptomName, sessionLangCode)"
              :key="sIdx" class="recommendation-section">
              <div class="recommendation-line symptom-header">{{ section.symptomHeader }}</div>
              <template v-for="(subsection, subIdx) in section.subsections" :key="subIdx">
                <div v-if="subsection.title" class="section-title">{{ subsection.title }}</div>
                <div v-for="(line, lineIdx) in subsection.lines" :key="lineIdx" :class="subsection.class">
                  {{ line }}
                </div>
              </template>
            </div>
          </template>
          <template v-else-if="currentQuestion.showAllTranslations && currentQuestion.translations && !isLanguageQuestion(currentQuestion)">
            <div class="language-selection-prompt">
              <div class="lang-line"><strong>English:</strong> {{ currentQuestion.translations.en }}</div>
              <div class="lang-line"><strong>Malay:</strong> {{ currentQuestion.translations.my }}</div>
              <div class="lang-line"><strong>中文:</strong> {{ currentQuestion.translations.zh }}</div>
            </div>
          </template>
          <template v-else>
            {{ currentQuestion.prompt }}
          </template>
        </div>
      </div>

      <div v-if="currentQuestion && currentQuestion.type === 'single_choice' && !isLanguageQuestion(currentQuestion)" class="quick-replies-wrapper">
        <div class="quick-replies below">
          <template v-if="currentQuestion.optionsWithTranslations">
            <button v-for="opt in currentQuestion.optionsWithTranslations" :key="opt.value"
              :class="['chip', 'lang-option', { selected: singleChoice === opt.value }]"
              @click="selectQuick(opt.value)">
              <div class="lang-option-content">
                <span class="lang-name">{{ opt.display.en }}</span>
                <span class="lang-separator">/</span>
                <span class="lang-name">{{ opt.display.my }}</span>
                <span class="lang-separator">/</span>
                <span class="lang-name">{{ opt.display.zh }}</span>
              </div>
            </button>
          </template>
          <template v-else>
            <button v-for="opt in currentQuestion.options" :key="opt"
              :class="['chip', { selected: singleChoice === opt }]" @click="selectQuick(opt)">{{ opt }}</button>
          </template>
        </div>
      </div>

      <!-- Compact language chips when backend asks the language selection question -->
      <div v-if="currentQuestion && isLanguageQuestion(currentQuestion)" class="quick-replies-wrapper">
        <div class="quick-replies below">
          <button v-for="l in languages" :key="l.code" :class="['chip', 'lang-option']" @click="selectQuick(l.label)">
            {{ l.label }}
          </button>
        </div>
      </div>

      <div v-else-if="currentQuestion && currentQuestion.type === 'multiple_choice'" class="quick-replies-wrapper">
        <div class="quick-replies below">
          <button v-for="opt in currentQuestion.options" :key="opt"
            :class="['chip', { selected: multiChoice.includes(opt) }]" @click="toggleMulti(opt)">{{ opt }}</button>
        </div>
      </div>

      <div v-if="currentQuestion && Array.isArray(currentQuestion.prompt)" class="quick-replies below centered">
        <button class="chip continue-btn" @click="continueFromRecommendation" :disabled="loading">
          <span>{{ continueText }}</span>
          <span class="arrow">→</span>
        </button>
      </div>

      <div v-if="currentQuestion && currentQuestion.type === 'waiting_approval'" class="waiting-approval">
        <div class="waiting-icon">
          <div class="spinner"></div>
        </div>
        <div class="waiting-text">{{ currentQuestion.prompt }}</div>
        <div class="waiting-subtext">
          {{ currentQuestion.subtext || (sessionLangCode.value === 'ms' ? 'Ini biasanya mengambil masa beberapa minit. Anda akan diberitahu sebaik sahaja ahli farmasi menyemak konsultasi anda.' : (sessionLangCode.value === 'zh' ? '这通常需要几分钟。药剂师审核您的咨询后，您将收到通知。' : "This usually takes a few minutes. You'll be notified once the pharmacist reviews your consultation.")) }}
        </div>
      </div>

      <div v-if="currentQuestion && currentQuestion.type === 'medication_cart'" class="medication-cart">
        <div class="cart-title">{{ t.availableMeds }}</div>
        <div class="medications-grid">
          <div v-for="(med, idx) in currentQuestion.medications" :key="idx" class="medication-card">
            <div class="med-image-placeholder">
              <img v-if="med.imageUrl" :src="med.imageUrl" :alt="med.name" class="med-image" />
              <span v-else class="image-icon">📦</span>
            </div>
            <div class="med-info">
              <div class="med-name">{{ med.name }}</div>
              <div class="med-symptom">{{ t.forSymptom }} {{ med.symptom }}</div>
              <div v-if="med.wasRejected" class="rejection-info">
                <span class="rejection-badge">{{ t.alternative }}</span>
                <p class="rejection-reason">{{ t.originalRejected }} {{ med.rejectionReason }}</p>
              </div>
            </div>
            <button class="btn-add-cart" :class="{ 'added': addedToCart.find(m => m.name === med.name) }"
              @click="addToCart(med)">
              {{addedToCart.find(m => m.name === med.name) ? t.added : t.addToCart}}
            </button>
          </div>
        </div>
        <div class="cart-actions">
          <button class="chip continue-btn" @click="continueFromCart" :disabled="loading">
            <span>{{ addedToCart.length > 0 ? t.finish : t.skip }}</span>
            <span class="arrow">→</span>
          </button>
          <router-link v-if="addedToCart.length > 0" to="/cart" class="chip view-cart-btn">
            <span>{{ t.viewCart }} ({{ addedToCart.length }})</span>
          </router-link>
        </div>
      </div>

      <div v-if="currentQuestion && currentQuestion.type === 'completion_message'" class="completion-message">
        <div class="completion-icon">✅</div>
        <div class="completion-text">{{ currentQuestion.prompt }}</div>
      </div>

      <div v-if="sessionId && !currentQuestion && !loading" class="done">No further questions. Conversation complete.
      </div>
    </div>
    <div
      v-if="currentQuestion && !Array.isArray(currentQuestion.prompt) && currentQuestion.type !== 'medication_cart' && currentQuestion.type !== 'completion_message' && currentQuestion.type !== 'waiting_approval'"
      class="composer">
      <input
        v-if="sessionId && !loading && currentQuestion && ((currentQuestion.type !== 'multiple_choice' && currentQuestion.type !== 'single_choice') || otherSymptomSelected || yesSelected)"
        v-model="textAnswer" :type="currentQuestion && currentQuestion.type === 'number_input' ? 'number' : 'text'"
        placeholder="Type your answer..." @keydown.enter.prevent="sendAnswer" />

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
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useCartStore } from '../store/cart'
import BranchSelector from './components/BranchSelector.vue' // Import the modal

const router = useRouter()
const cartStore = useCartStore()

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
const sessionLangCode = ref('en') // 'en' | 'ms' | 'zh' - tracks selected language for UI translations

// --- START: I18n Translations ---
const t = computed(() => {
  const lang = sessionLangCode.value;
  if (lang === 'ms') {
    return {
      availableMeds: '💊 Ubat yang Tersedia',
      forSymptom: 'Untuk:',
      alternative: '⚠️ Alternatif',
      originalRejected: 'Asal ditolak:',
      addToCart: 'Tambah ke Troli',
      added: '✓ Ditambah',
      skip: 'Langkau',
      finish: 'Selesai',
      viewCart: '🛒 Lihat Troli',
      approvalPrompt: 'Konsultasi anda telah diluluskan! Berikut adalah ubat-ubatan yang disyorkan:',
    };
  }
  if (lang === 'zh') {
    return {
      availableMeds: '💊 可用药物',
      forSymptom: '用于：',
      alternative: '⚠️ 替代选项',
      originalRejected: '原药被拒：',
      addToCart: '添加到购物车',
      added: '✓ 已添加',
      skip: '跳过',
      finish: '完成',
      viewCart: '🛒 查看购物车',
      approvalPrompt: '您的咨询已获批准！以下是推荐的药物：',
    };
  }
  // English (default)
  return {
    availableMeds: '💊 Available Medications',
    forSymptom: 'For:',
    alternative: '⚠️ Alternative',
    originalRejected: 'Original rejected:',
    addToCart: 'Add to Cart',
    added: '✓ Added',
    skip: 'Skip',
    finish: 'Finish',
    viewCart: '🛒 View Cart',
    approvalPrompt: 'Your consultation has been approved! Here are the recommended medications:',
  };
});
// --- END: I18n Translations ---

function goBack() {
  router.back()
}

// Save chat state to localStorage
function saveChatState() {
  const chatState = {
    sessionId: sessionId.value,
    currentQuestion: currentQuestion.value,
    history: history.value,
    prescriptionId: prescriptionId.value,
    orderStatus: orderStatus.value,
    approvedMedicines: approvedMedicines.value,
    chatComplete: chatComplete.value,
    addedToCart: addedToCart.value,
    timestamp: Date.now()
  }
  localStorage.setItem('chatState', JSON.stringify(chatState))
}

// Restore chat state from localStorage
function restoreChatState() {
  try {
    const savedState = localStorage.getItem('chatState')
    if (savedState) {
      const chatState = JSON.parse(savedState)
      sessionId.value = chatState.sessionId || ''
      currentQuestion.value = chatState.currentQuestion || null
      history.value = chatState.history || []
      prescriptionId.value = chatState.prescriptionId || null
      orderStatus.value = chatState.orderStatus || null
      approvedMedicines.value = chatState.approvedMedicines || []
      chatComplete.value = chatState.chatComplete || false
      addedToCart.value = chatState.addedToCart || []
      return true
    }
  } catch (e) {
    console.error('Error restoring chat state:', e)
  }
  return false
}

// Clear chat state from localStorage
function clearChatState() {
  localStorage.removeItem('chatState')
}

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

// --- START: Symptom Translation Map ---
// Moved from parseRecommendationSections to global scope
const symptomMap = {
  'en': {
    'Fever': 'Fever', 'Cough': 'Cough', 'Flu': 'Flu', 'Cold': 'Cold',
    'Nausea and Vomiting': 'Nausea and Vomiting', 'Constipation': 'Constipation',
    'Diarrhoea': 'Diarrhoea', 'Indigestion/Heartburn': 'Indigestion/Heartburn',
    'Menstrual Pain': 'Menstrual Pain', 'Joint Pain': 'Joint Pain',
    'Muscle Pain': 'Muscle Pain', 'Bloat': 'Bloat', 'Itchy Skin': 'Itchy Skin',
    'Recommendation': 'Recommendation'
  },
  'ms': {
    'Fever': 'Demam', 'Cough': 'Batuk', 'Flu': 'Selesema', 'Cold': 'Selsema Biasa',
    'Nausea and Vomiting': 'Loya dan Muntah', 'Constipation': 'Sembelit',
    'Diarrhoea': 'Cirit-birit', 'Indigestion/Heartburn': 'Masalah Pencernaan/Pedih Ulu Hati',
    'Menstrual Pain': 'Sakit Senggugut', 'Joint Pain': 'Sakit Sendi',
    'Muscle Pain': 'Sakit Otot', 'Bloat': 'Kembung Perut', 'Itchy Skin': 'Kulit Gatal',
    'Recommendation': 'Cadangan'
  },
  'zh': {
    'Fever': '发烧', 'Cough': '咳嗽', 'Flu': '流感', 'Cold': '感冒',
    'Nausea and Vomiting': '恶心和呕吐', 'Constipation': '便秘',
    'Diarrhoea': '腹泻', 'Indigestion/Heartburn': '消化不良/胃灼热',
    'Menstrual Pain': '痛经', 'Joint Pain': '关节疼痛',
    'Muscle Pain': '肌肉疼痛', 'Bloat': '腹胀', 'Itchy Skin': '皮肤瘙痒',
    'Recommendation': '建议'
  }
};
// --- END: Symptom Translation Map ---

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
  // --- DO NOT RESET cart, prescription, or status here ---
  // addedToCart.value = [] 
  // prescriptionId.value = null
  // orderStatus.value = null
  // approvedMedicines.value = []
  // chatComplete.value = false 
}

const fullReset = () => {
  // Reset *everything*
  resetInput()
  addedToCart.value = []
  prescriptionId.value = null
  orderStatus.value = null
  approvedMedicines.value = []
  chatComplete.value = false
  clearChatState() // Clear localStorage
}

// --- START: Symptom Translation Helper ---
function translateSymptom(symptomName) {
  if (!symptomName) return '';
  // symptomMap is now in the global script setup scope
  const langKey = (sessionLangCode.value === 'ms') ? 'ms' : (sessionLangCode.value === 'zh' ? 'zh' : 'en');
  const map = symptomMap[langKey];
  if (map && map[symptomName]) {
    return map[symptomName];
  }
  return symptomName; // Fallback
}
// --- END: Symptom Translation Helper ---

// Identify the standalone heading prompt sent by backend
function isRecommendationHeading(prompt) {
  if (typeof prompt !== 'string') return false
  const p = prompt.toLowerCase()
  // check for English, Malay, Chinese variants
  return p.includes('based on your symptoms') || p.includes('berdasarkan simptom anda') || p.includes('根据您的症状')
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

const recommendationHeading = computed(() => {
  if (sessionLangCode.value === 'ms') return 'Berdasarkan simptom anda, berikut adalah cadangan kami:'
  if (sessionLangCode.value === 'zh') return '根据您的症状，以下是我们的建议：'
  return 'Based on your symptoms, here are our recommendations:'
})

// --- START: I18n FIX ---
const continueText = computed(() => {
  if (sessionLangCode.value === 'ms') return 'Teruskan'
  if (sessionLangCode.value === 'zh') return '继续'
  return 'Continue'
})
// --- END: I18n FIX ---

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

    fullReset() // Use fullReset to ensure state is clean
    saveChatState() // Save after starting new session
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to start session'
  } finally {
    loading.value = false
  }
}

function refreshChat() {
  // clear history and restart
  showPlaceholder.value = true // Reset placeholder for new chat
  fullReset() // Clear localStorage when starting new chat
  startSession()
}

function buildAnswerPayload() {
  const t = currentQuestion.value.type
  if (t === 'single_choice') {
    // For 'Yes' with details, send just the text. Otherwise, send the selected option.
    if (yesSelected.value) {
      return textAnswer.value
    }
    // If the backend provided optionMapping, prefer sending the mapped original value
    const mapping = currentQuestion.value && currentQuestion.value.optionMapping ? currentQuestion.value.optionMapping : null;
    if (mapping && mapping[singleChoice.value]) return mapping[singleChoice.value]
    return singleChoice.value
  }
  if (t === 'multiple_choice') {
    // Combine selected chips and the text input if 'Other' was selected
    const payload = [...multiChoice.value]
    if (otherSymptomSelected.value && textAnswer.value) {
      // Remove any 'Other' placeholder (localized or original) and add the actual text
      const mapping = currentQuestion.value && currentQuestion.value.optionMapping ? currentQuestion.value.optionMapping : null;
      // Find index of any payload item that maps to an 'Other' original or contains 'other'
      const otherIndex = payload.findIndex(p => {
        const orig = mapping && mapping[p] ? mapping[p] : p
        return typeof orig === 'string' && orig.toLowerCase().includes('other')
      })
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

    // Capture the current question before we clear it so we can detect language selection
    const previousQuestion = currentQuestion.value

    const payload = {
      sessionId: sessionId.value,
      answer: buildAnswerPayload() // This is the *backend* value (e.g., "Female")
    }

    // --- START: I18n FIX ---
    // Update sessionLangCode *first*
    try {
      if (previousQuestion && previousQuestion.showAllTranslations) {
        const raw = payload.answer
        const candidate = String(raw).toLowerCase();
        if (candidate.includes('malay') || candidate.includes('bahasa') && candidate.includes('melayu') || candidate.includes('melayu') || candidate.includes('ms')) {
          sessionLangCode.value = 'ms'
        } else if (candidate.includes('chinese') || candidate.includes('中文') || candidate.includes('cina') || candidate.includes('华语') || candidate.includes('华')) {
          sessionLangCode.value = 'zh'
        } else {
          sessionLangCode.value = 'en'
        }
      }
    } catch (e) { /* ignore */ }

    // Determine what to *display* in the history *after* lang code is set
    let displayedAnswer = payload.answer;
    const t = previousQuestion.type;

    if (previousQuestion.showAllTranslations) {
      const selectedLangData = previousQuestion.optionsWithTranslations.find(o => o.value === payload.answer);
      if (selectedLangData) {
        const langKey = sessionLangCode.value === 'ms' ? 'my' : (sessionLangCode.value === 'zh' ? 'zh' : 'en');
        displayedAnswer = selectedLangData.display[langKey] || payload.answer;
      }
    } else if (t === 'single_choice') {
      if (yesSelected.value) {
        displayedAnswer = textAnswer.value; // Text input is the display value
      } else {
        // Use the value that was set in singleChoice (the displayed, translated value)
        displayedAnswer = singleChoice.value;
      }
    } else if (t === 'multiple_choice') {
      const displayedMulti = [...multiChoice.value];
      if (otherSymptomSelected.value && textAnswer.value) {
        // Find and replace "Other" placeholder with the text
        const otherIndex = displayedMulti.findIndex(opt => {
          const mapping = previousQuestion.optionMapping || {};
          const original = mapping[opt] || opt;
          return String(original).toLowerCase().includes('other');
        });
        if (otherIndex > -1) {
          displayedMulti.splice(otherIndex, 1);
        }
        displayedMulti.push(textAnswer.value);
      }
      displayedAnswer = displayedMulti; // This is an array, formatAnswer() will handle it
    } else if (t === 'text_input' || t === 'number_input') {
      displayedAnswer = textAnswer.value;
    }
    // --- END: I18n FIX ---

    // Hide placeholder after first answer
    showPlaceholder.value = false

    // Store previous question type to determine if we should add to history
    const previousQuestionType = previousQuestion.type

    // Only add to history if it's not a special type (medication_cart should not appear in history)
    if (previousQuestionType !== 'medication_cart') {
      // Use the `displayedAnswer` for history, not `payload.answer`
      history.value.push({ q: currentQuestion.value, a: displayedAnswer })
    }

    // Clear current question to show "loading" state
    currentQuestion.value = null

    // Reset input immediately so user sees their answer was captured
    resetInput()

    // Now send to backend
    const res = await axios.post('/api/chat/ask', payload)

    // Update with next question from backend
    currentQuestion.value = res.data.nextQuestion

    // Save state after each answer
    saveChatState()

    // Debug: Log medication cart data
    if (currentQuestion.value && currentQuestion.value.type === 'medication_cart') {
      console.log('Received medication_cart question:', currentQuestion.value)
      console.log('Medications array:', currentQuestion.value.medications)
    }
  } catch (e) {
    const errorMessage = e.response?.data?.error || e.message || 'Failed to send answer'

    // If session is invalid, start a new session automatically
    if (errorMessage.includes('Invalid session')) {
      console.warn('Session expired, starting new session...')
      clearChatState() // Clear the invalid session from localStorage
      error.value = '' // Clear error message
      await startSession() // Start a fresh session
      return // Exit early, new session will show the first question
    }

    error.value = errorMessage
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
  const isChanging = selectedBranch.value && selectedBranch.value.branchId !== branch.branchId;
  
  selectedBranch.value = branch;
  showSelector.value = false; // Hide the modal

  // If the session is already running and they changed branch, start a new chat.
  // If this is the *first time* they are selecting, start the chat.
  if (isChanging || !sessionId.value) {
    refreshChat(); // This calls startSession()
}

// Auto-advance past heading-only prompt so user only sees the combined recommendation bubble
watch(currentQuestion, (q) => {
  if (q && isRecommendationHeading(q.prompt)) {
    // silently proceed
    continueFromRecommendation()
  }

  // When chat is complete, mark it and clear state
  if (q && q.type === 'completion_message') {
    chatComplete.value = true
    clearChatState() // Clear localStorage when chat is completed
  }
})

function selectQuick(opt) {
  // Store the displayed value
  singleChoice.value = opt;

  // If the backend provided an optionMapping, map the displayed label back to the original value
  const mapping = currentQuestion.value && currentQuestion.value.optionMapping ? currentQuestion.value.optionMapping : null;
  const original = mapping && mapping[opt] ? mapping[opt] : opt;

  // --- START FIX: Robust "requiresInput" logic ---
  // Determine if this option requires free-text from the user (based on *original* value)
  const lowerOrig = String(original).toLowerCase();
  // Check for "yes (details)", "yes , what", "yes , when", "other (specify)"
  const requiresInput = (lowerOrig.startsWith('yes') && (lowerOrig.includes('details') || lowerOrig.includes('what') || lowerOrig.includes('when'))) ||
    (lowerOrig.startsWith('other') && lowerOrig.includes('specify'));
  // --- END FIX ---

  if (requiresInput) {
    yesSelected.value = true;
    // Wait for user to type details before submitting
  } else {
    yesSelected.value = false;
    // For options that map to an original value, prefer sending the mapped original
    // textAnswer.value = original; // We don't need to set textAnswer here
    sendAnswer();
  }
}

// Handler for the header language dropdown
// removed header change handler — language is selected via compact chips

function toggleMulti(opt) {
  // Determine if this option is the 'Other' type by checking mapping/original text
  const mapping = currentQuestion.value && currentQuestion.value.optionMapping ? currentQuestion.value.optionMapping : null;
  const original = mapping && mapping[opt] ? mapping[opt] : opt;
  const isOther = typeof original === 'string' && original.toLowerCase().includes('other');

  if (isOther) {
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
    chatComplete.value = true // Mark chat as complete logic-wise

    // Show waiting message (localized)
    const waitingPrompts = {
      en: {
        prompt: 'Thank you! Your consultation has been submitted to our pharmacist for review. Please wait for approval...',
        subtext: "This usually takes a few minutes. You'll be notified once the pharmacist reviews your consultation."
      },
      ms: {
        prompt: 'Terima kasih! Konsultasi anda telah dihantar kepada ahli farmasi kami untuk semakan. Sila tunggu kelulusan...',
        subtext: 'Ini biasanya mengambil masa beberapa minit. Anda akan diberitahu sebaik sahaja ahli farmasi menyemak konsultasi anda.'
      },
      zh: {
        prompt: '谢谢！您的咨询已提交给我们的药剂师审核。请等待批准...',
        subtext: '这通常需要几分钟。药剂师审核您的咨询后，您将收到通知。'
      }
    }

    const langCode = sessionLangCode.value || 'en'
    currentQuestion.value = {
      type: 'waiting_approval',
      prompt: waitingPrompts[langCode].prompt,
      subtext: waitingPrompts[langCode].subtext
    }

    // Save state so we can restore to this waiting screen
    saveChatState()

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
          prompt: t.value.approvalPrompt, // Use computed translation
          medications: approvedMedicines.value.map(med => ({
            name: med.medicineName,
            symptom: translateSymptom(med.symptom || med.medicineType), // <-- FIX: Translate symptom
            medicineId: med.medicineId,
            price: med.price,
            imageUrl: med.imageUrl,
            wasRejected: med.wasRejected,
            rejectionReason: med.rejectionReason
          }))
        }
        // Save state
        saveChatState()

      } else if (prescription.status === 'rejected') {
        clearInterval(pollInterval)
        orderStatus.value = 'rejected'
        loading.value = false

        currentQuestion.value = {
          type: 'completion_message',
          prompt: `We're sorry, but the pharmacist was unable to approve this consultation. ${prescription.rejectionReason || 'Please consult with a healthcare professional for further assistance.'}`
        }
        // Save state (which includes completion)
        saveChatState()
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

async function continueFromCart() {
  // User finished reviewing approved medications
  if (loading.value) return

  // Set the textAnswer to be used by sendAnswer()
  // This text is checked by the backend in chatService.js
  if (addedToCart.value.length > 0) {
    textAnswer.value = `Added ${addedToCart.value.length} item(s) to cart.`
  } else {
    textAnswer.value = 'No items added'
  }

  // Send this answer to the backend. The backend will reply
  // with the final 'completion_message' question.
  await sendAnswer()
}


// --- START: I18n FIX for parseRecommendationSections ---
function parseRecommendationSections(promptArray, symptomName = null, lang = 'en') {
  if (!Array.isArray(promptArray)) return [];

  const sections = [];
  let currentSymptomSection = null;
  let currentSubsection = null;

  // Define translations for titles
  const titles = {
    en: {
      medication: '💊 Medication:',
      doctor: '🏥 When to See a Doctor:',
      sideEffect: '⚠️ Side Effects:',
      advice: '💡 Advice:',
    },
    ms: {
      medication: '💊 Ubat-ubatan:',
      doctor: '🏥 Bila Perlu Berjumpa Doktor:',
      sideEffect: '⚠️ Kesan Sampingan:',
      advice: '💡 Nasihat:',
    },
    zh: {
      medication: '💊 药物：',
      doctor: '🏥 何时就医：',
      sideEffect: '⚠️ 副作用：',
      advice: '💡 建议：',
    }
  };

  // NOTE: symptomMap is now defined in the global script setup scope

  // Determine current language key
  const currentLang = (lang === 'ms') ? 'ms' : (lang === 'zh' ? 'zh' : 'en');
  const T = titles[currentLang]; // Get the titles for the current language

  // Check if prompt has symptom headers (multi-symptom) or not (single symptom)
  const hasSymptomHeaders = promptArray.some(line =>
    line.trim().startsWith('---') && line.trim().endsWith('---')
  );

  // If no symptom headers, create a default section for single symptom
  if (!hasSymptomHeaders) {
    const translatedSymptom = symptomMap[currentLang][symptomName] || symptomName || T.Recommendation;
    currentSymptomSection = {
      symptomHeader: `--- ${translatedSymptom} ---`,
      subsections: []
    };
  }

  promptArray.forEach(line => {
    const trimmedLine = line.trim();
    const lowerLine = trimmedLine.toLowerCase();

    // Check if this is a symptom header (starts with ---)
    if (trimmedLine.startsWith('---') && trimmedLine.endsWith('---')) {
      // Save previous symptom section if exists
      if (currentSymptomSection) {
        if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection);
        sections.push(currentSymptomSection);
      }
      // --- FIX: Translate symptom header ---
      let headerText = trimmedLine.replace(/-/g, '').trim(); // "Fever"
      const translatedHeader = symptomMap[currentLang][headerText] || headerText;

      // Start new symptom section
      currentSymptomSection = {
        symptomHeader: `--- ${translatedHeader} ---`,
        subsections: []
      };
      currentSubsection = null;
      return;
    }

    if (!currentSymptomSection) return;

    // Check for Side Effects (S/E, Kesan Sampingan, 副作用)
    if (lowerLine.startsWith('s/e') || lowerLine.startsWith('kesan sampingan') || trimmedLine.startsWith('副作用')) {
      if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection);
      currentSubsection = {
        title: T.sideEffect,
        lines: [trimmedLine.replace(/^S\/E\s?:/i, '').replace(/^Kesan Sampingan\s?:/i, '').replace(/^副作用\s?:/i, '').trim()],
        class: 'recommendation-line side-effect'
      };

      // Check for "See Doctor" (if your condition, refer to doctor, i recommend, jika keadaan, sila rujuk, saya syorkan, 如果您的病情, 请咨询医生, 我建议您)
    } else if (lowerLine.includes('if your condition') || lowerLine.includes('refer to doctor') || lowerLine.includes('i recommend') ||
      lowerLine.includes('jika keadaan') || lowerLine.includes('sila rujuk') || lowerLine.includes('saya syorkan') ||
      trimmedLine.includes('如果您的病情') || trimmedLine.includes('请咨询医生') || trimmedLine.includes('我建议您')) {
      if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection);
      currentSubsection = {
        title: T.doctor,
        lines: [trimmedLine],
        class: 'recommendation-line warning'
      };

      // Check for "Advice" (advise:, advice:, avoid, drink enough water, have a good rest, elakkan, minum air, berehat, 建议：, 避免, 多喝水, 好好休息)
    } else if (lowerLine.startsWith('advise:') || lowerLine.startsWith('advice:') || (lowerLine.includes('avoid') && !lowerLine.includes('medication')) || lowerLine.includes('drink enough water') || lowerLine.includes('have a good rest') ||
      lowerLine.startsWith('nasihat:') || (lowerLine.includes('elakkan') && !lowerLine.includes('ubat')) || lowerLine.includes('minum air') || lowerLine.includes('berehat') ||
      trimmedLine.startsWith('建议：') || (trimmedLine.includes('避免') && !trimmedLine.includes('药物')) || trimmedLine.includes('多喝水') || trimmedLine.includes('好好休息')) {

      // Check if current subsection is already an advice section
      if (currentSubsection && currentSubsection.class === 'recommendation-line advice') {
        currentSubsection.lines.push(trimmedLine.replace(/^Advise:/i, '').replace(/^Advice:/i, '').replace(/^Nasihat:/i, '').replace(/^建议：/i, '').trim());
      } else {
        if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection);
        currentSubsection = {
          title: T.advice,
          lines: [trimmedLine.replace(/^Advise:/i, '').replace(/^Advice:/i, '').replace(/^Nasihat:/i, '').replace(/^建议：/i, '').trim()],
          class: 'recommendation-line advice'
        };
      }

      // Check for "Thank you" (thank you for your time, terima kasih, 感谢您的时间)
    } else if (lowerLine.includes('thank you for your time') || lowerLine.includes('terima kasih') || trimmedLine.includes('感谢您的时间')) {
      if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection);
      currentSubsection = {
        title: null,
        lines: [trimmedLine],
        class: 'recommendation-line greeting'
      };

      // Default: Medication
    } else if (trimmedLine.length > 0) {
      // Check if current subsection is already a medication section
      if (currentSubsection && currentSubsection.class === 'recommendation-line medication') {
        currentSubsection.lines.push(trimmedLine);
      } else {
        // Start new medication subsection
        if (currentSubsection) currentSymptomSection.subsections.push(currentSubsection);
        currentSubsection = {
          title: T.medication,
          lines: [trimmedLine],
          class: 'recommendation-line medication'
        };
      }
    }
  });
  // --- END: I18n FIX ---

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
.chat-header .subtitle.clickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
  transition: color 0.2s;
}
.chat-header .subtitle.clickable:hover {
  color: #007bff;
}

.loader {
  text-align: center;
  font-size: 1.2rem;
  padding: 3rem;
}

.chat {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 48px;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  flex-shrink: 0;
  padding: 1rem;
  background: white;
  z-index: 10;
  border-bottom: 1px solid #e6e6e6;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-back {
  background: none;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}

.btn-back:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  transform: translateX(-2px);
}

.btn-back:active {
  transform: translateX(-4px);
}

.back-arrow {
  font-size: 1.2rem;
  color: #333;
  line-height: 1;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.title {
  font-weight: 700
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center
}

.session {
  color: #666;
  font-size: 0.9rem
}

.messages {
  background: #f7f7f7;
  flex: 1 1 auto;
  padding: 1rem;
  margin: 0;
  overflow-y: auto;
  border-radius: 0;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Push content to bottom when there's not enough to fill the container */
.messages> :first-child {
  margin-top: auto;
}

.empty {
  color: #666;
  text-align: center;
  padding: 1.2rem
}

.status {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 0.6rem
}

.bubble {
  display: flex;
  margin: 0.5rem 0;
  width: 100%;
}

.bubble .bubble-content {
  max-width: 75%;
  padding: 0.6rem 0.9rem;
  border-radius: 12px
}

.bubble.bot {
  justify-content: flex-start
}

.bubble.bot .bubble-content {
  background: #fff;
  color: #2c3e50;
  border: 1px solid #eee
}

.bubble.user {
  justify-content: flex-end
}

.bubble.user .bubble-content {
  background: #42b983;
  color: #fff
}

.bubble.current .bubble-content {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06)
}

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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background: #f3f4f6;
  /* light neutral */
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0.6rem 1.05rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  color: #111827;
  box-shadow: 0 2px 6px rgba(2, 6, 23, 0.04);
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}

.chip:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.08);
}

.chip.selected {
  background: #42b983;
  color: #fff;
  border-color: rgba(0, 0, 0, 0.06);
}

.chip.continue-btn {
  background: #42b983;
  color: #fff;
  padding: 0.6rem 1.05rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 6px rgba(2, 6, 23, 0.06);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}

.chip.continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.12);
}

.chip.continue-btn .arrow {
  font-size: 1.05rem;
  transition: transform .2s ease;
}

.chip.continue-btn:hover .arrow {
  transform: translateX(3px);
}

.composer {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
  align-items: center;
  flex-shrink: 0;
  padding: 0.5rem 0;
  background: white;
  z-index: 10;
}

.composer input {
  flex: 1;
  padding: 0.6rem;
  border-radius: 10px;
  border: 1px solid #e6e6e6;
}

.composer-actions {
  display: flex
}

.composer-hint {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.4rem
}

.btn {
  background: #ddd;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  cursor: pointer
}

.btn.primary {
  background: #42b983;
  color: #fff
}

.btn:disabled {
  opacity: 0.6
}

.done {
  text-align: center;
  color: #666;
  padding: 0.8rem
}

/* Medication Cart Styles */
.medication-cart {
  margin-top: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.medication-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.completion-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: bounce 0.8s ease-in-out;
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.completion-text {
  font-size: 1.1rem;
  line-height: 1.6;
  font-weight: 500;
  white-space: pre-line;
}

/* Language Selection Prompt Styles */
.language-selection-prompt {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lang-line {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.lang-line:last-child {
  border-bottom: none;
}

.lang-line strong {
  color: #42b983;
  margin-right: 0.5rem;
  font-weight: 600;
}

/* Language Option Button Styles */
.lang-option {
  min-width: auto;
  padding: 0.75rem 1rem;
}

/* (header select removed) */

.lang-option-content {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

.lang-name {
  font-size: 0.9rem;
  white-space: nowrap;
}

.lang-separator {
  color: #95a5a6;
  font-weight: 300;
  font-size: 0.85rem;
}

/* Waiting for Approval Styles */
.waiting-approval {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  color: white;
  margin-top: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.waiting-icon {
  margin-bottom: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.error {
  margin-top: 0.6rem;
  color: #c33;
  background: #fee;
  border: 1px solid #fbb;
  padding: 0.6rem;
  border-radius: 8px
}
</style>