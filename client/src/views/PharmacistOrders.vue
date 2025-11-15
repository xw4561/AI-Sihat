<template>
  <div class="pharmacist-orders">
    <div class="page-header">
      <button class="btn-back" @click="goBack" title="Go back">
        <span class="back-arrow">←</span>
      </button>
      <h2>Pending Orders</h2>
    </div>

    <div v-if="isLoading" class="loading">
      <p>Loading orders...</p>
    </div>

    <div v-else-if="orders.length === 0" class="no-orders">
      <p>No pending orders at the moment.</p>
    </div>

    <div v-else class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-card" :class="order.status.toLowerCase()">
        <div class="order-header">
          <h3>Order #{{ order.id.substring(0, 8) }}</h3>
          <span class="status">{{ order.status }}</span>
        </div>
        <p><strong>Customer:</strong> {{ order.customerName }}</p>
        <p><strong>Symptoms:</strong> {{ order.summary?.symptoms?.join(', ') || 'N/A' }}</p>
        <p><strong>Date:</strong> {{ new Date(order.createdAt).toLocaleString() }}</p>
        <div class="actions">
          <button class="btn view-report" @click="viewReport(order)">View Report</button>
          <button class="btn approve" @click="openApproveModal(order)" :disabled="order.status !== 'Pending'">Review & Approve</button>
        </div>
      </div>
    </div>

    <!-- Report Modal -->
    <div v-if="showReportModal" class="modal-overlay" @click.self="closeReportModal">
      <div class="modal-content">
        <span class="close-btn" @click="closeReportModal">&times;</span>
        <h4>Chat Report for Order #{{ selectedOrder.id.substring(0, 8) }}</h4>
        <div v-if="selectedOrder.summary" class="summary-report">
          <div class="summary-section">
            <h5>Patient Information</h5>
            <p><strong>Name:</strong> {{ selectedOrder.summary.name }}</p>
            <p><strong>Age:</strong> {{ selectedOrder.summary.age }}</p>
            <p><strong>Gender:</strong> {{ selectedOrder.summary.gender }}</p>
            <p v-if="selectedOrder.summary.pregnant && selectedOrder.summary.pregnant !== 'N/A'"><strong>Pregnant:</strong> {{ selectedOrder.summary.pregnant }}</p>
          </div>
          
          <div class="summary-section">
            <h5>Patient's Description</h5>
            <p class="user-description">{{ selectedOrder.summary.userDescription || 'N/A' }}</p>
          </div>
          
          <div class="summary-section">
            <h5>Symptoms & Condition</h5>
            <p><strong>Symptoms:</strong> {{ Array.isArray(selectedOrder.summary.symptoms) ? selectedOrder.summary.symptoms.join(', ') : selectedOrder.summary.symptoms }}</p>
            <p><strong>Duration:</strong> {{ selectedOrder.summary.duration }}</p>
            <p><strong>Temperature:</strong> {{ selectedOrder.summary.temperature }}°C</p>
          </div>
          
          <div class="summary-section">
            <h5>Medical History</h5>
            <p><strong>Allergies:</strong> {{ selectedOrder.summary.allergies }}</p>
            <p><strong>Current Medication:</strong> {{ selectedOrder.summary.medication }}</p>
          </div>
          
          <!-- Symptom-Specific Questions -->
          <div v-if="selectedOrder.summary.allAnswers" v-for="symptom in getGroupedSymptomQuestions(selectedOrder.summary.allAnswers)" :key="symptom.name" class="symptom-qa-section">
            <h6 class="symptom-header"> {{ symptom.name }}</h6>
            <div class="qa-list">
              <div v-for="qa in symptom.questions" :key="qa.id" class="qa-item">
                <div class="question-label">{{ qa.label }}:</div>
                <div class="answer-text">
                  <template v-if="typeof qa.answer === 'object' && qa.answer.userInput">
                    {{ qa.answer.userInput }}
                  </template>
                  <template v-else-if="Array.isArray(qa.answer)">
                    {{ qa.answer.join(', ') }}
                  </template>
                  <template v-else>
                    {{ qa.answer }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <p>No report available for this order.</p>
        </div>
      </div>
    </div>

    <!-- Approve Modal with Multiple Medicines -->
    <div v-if="showApproveModal" class="modal-overlay" @click.self="closeApproveModal">
        <div class="modal-content large">
            <span class="close-btn" @click="closeApproveModal">&times;</span>
            <h4>Review Order #{{ selectedOrder?.id.substring(0, 8) }}</h4>
            
            <!-- Patient Symptoms Description -->
            <div v-if="selectedOrder?.summary" class="patient-info">
              <h5>Patient Reported Symptoms:</h5>
              <div class="symptom-description">
                <p><strong>Symptoms:</strong> {{ Array.isArray(selectedOrder.summary.symptoms) ? selectedOrder.summary.symptoms.join(', ') : selectedOrder.summary.symptoms }}</p>
                <p><strong>Duration:</strong> {{ selectedOrder.summary.duration }}</p>
                <p><strong>Temperature:</strong> {{ selectedOrder.summary.temperature }}°C</p>
                <p v-if="selectedOrder.summary.allergies !== 'None'"><strong>Allergies:</strong> {{ selectedOrder.summary.allergies }}</p>
              </div>
            </div>
            
            <p class="instruction">Review each symptom and approve/reject medicine:</p>
            
            <!-- Symptom Medicine Slots -->
            <div v-for="(medSlot, idx) in medicineSlots" :key="idx" class="medicine-slot">
              <div class="slot-header">
                <div class="symptom-label">{{ medSlot.symptom }}</div>
                <div class="action-buttons">
                  <button 
                    @click="medSlot.action = 'approve'" 
                    :class="['action-btn', 'approve-btn', { active: medSlot.action === 'approve' }]">
                    ✓ Approve
                  </button>
                  <button 
                    @click="medSlot.action = 'reject'" 
                    :class="['action-btn', 'reject-btn', { active: medSlot.action === 'reject' }]">
                    ✗ Reject
                  </button>
                </div>
              </div>
              
              <!-- AI Recommendation Display -->
              <div class="ai-recommendation">
                <h6>AI Recommendation:</h6>
                <p class="recommendation-text">{{ medSlot.recommendationText }}</p>
                <div v-if="medSlot.medicineId" class="recommended-medicine">
                  <strong>Recommended Medicine:</strong> {{ medSlot.medicineName }}
                  <br><strong>Type:</strong> {{ medSlot.medicineType }}
                  <br><strong>Price:</strong> RM{{ medSlot.price.toFixed(2) }}
                  <br><strong>Quantity:</strong> {{ medSlot.quantity }}
                </div>
                <div v-else class="no-match-warning">
                  ⚠️ No matching medicine found in database. Please select alternative below.
                </div>
              </div>
              
              <!-- Show alternative selection only if rejected OR no medicine matched -->
              <div v-if="(medSlot.action === 'reject') || (!medSlot.medicineId && medSlot.action === 'approve')" class="medicine-select-group">
                <div v-if="medSlot.action === 'reject'" class="rejection-note">
                  <label>Reason for rejection:</label>
                  <textarea v-model="medSlot.rejectionReason" placeholder="Explain why this is rejected..."></textarea>
                  <p class="help-text">Please provide an alternative medicine below:</p>
                </div>
                
                <div class="form-group">
                  <label>{{ medSlot.action === 'reject' ? 'Alternative Medicine:' : 'Select Medicine:' }}</label>
                  <div style="position: relative;">
                    <input 
                      v-model="medSlot.searchQuery" 
                      @input="medSlot.showDropdown = true; medSlot.isNew = false"
                      @focus="medSlot.showDropdown = true"
                      type="text" 
                      class="form-control search-input" 
                      placeholder="Search medicine by name..."
                    />
                    <div v-if="medSlot.showDropdown" class="medicine-dropdown">
                      <div 
                        v-for="med in filteredMedicines(medSlot.searchQuery)" 
                        :key="med.medicineId" 
                        @click="selectMedicine(idx, med)"
                        class="medicine-option">
                        <div class="medicine-details">
                          <strong>{{ med.medicineName }}</strong>
                          <span>{{ med.medicineType }} • RM{{ parseFloat(med.price).toFixed(2) }} • Stock: {{ med.medicineQuantity }}</span>
                        </div>
                      </div>
                      <div v-if="filteredMedicines(medSlot.searchQuery).length === 0" class="no-results">
                        No medicines found. Try a different search term.
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    @click="medSlot.isNew = true; medSlot.showDropdown = false; medSlot.searchQuery = ''"
                    class="btn-add-medicine">
                    ➕ Add New Medicine (Not in Database)
                  </button>
                </div>
                
                <!-- New Medicine Form -->
                <div v-if="medSlot.isNew" class="new-medicine-form">
                  <div class="form-group">
                    <label>Medicine Name:</label>
                    <input v-model="medSlot.newMedicineName" type="text" class="form-control" placeholder="Enter medicine name" />
                  </div>
                  <div class="form-group">
                    <label>Type:</label>
                    <select v-model="medSlot.newMedicineType" class="form-control">
                      <option value="OTC">OTC (Can add to cart)</option>
                      <option value="NON_OTC">NON-OTC (Prescription only)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Price (RM):</label>
                    <input v-model.number="medSlot.newPrice" type="number" step="0.01" min="0" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label>Image URL (optional):</label>
                    <input v-model="medSlot.newImageUrl" type="text" class="form-control" placeholder="https://..." />
                  </div>
                </div>
                
                <div v-if="medSlot.action === 'reject' || !medSlot.medicineId" class="form-group">
                  <label>Quantity:</label>
                  <input v-model.number="medSlot.alternativeQuantity" type="number" min="1" class="form-control" />
                </div>
              </div>
            </div>
            
            <!-- Extra Medicines Section -->
            <div class="extra-medicines-section">
              <h5>Additional Medicines (Optional)</h5>
              <button @click="addExtraMedicine" class="btn add-extra">+ Add Extra Medicine</button>
              
              <div v-for="(extra, idx) in extraMedicines" :key="'extra-' + idx" class="medicine-slot extra">
                <div class="slot-header">
                  <div class="symptom-label">Extra Medicine {{ idx + 1 }}</div>
                  <button @click="removeExtraMedicine(idx)" class="remove-btn">✗ Remove</button>
                </div>
                
                <div class="medicine-select-group">
                  <div class="form-group">
                    <label>Medicine:</label>
                    <div style="position: relative;">
                      <input 
                        v-model="extra.searchQuery" 
                        @input="extra.showDropdown = true; extra.isNew = false"
                        @focus="extra.showDropdown = true"
                        type="text" 
                        class="form-control search-input" 
                        placeholder="Search medicine by name..."
                      />
                      <div v-if="extra.showDropdown" class="medicine-dropdown">
                        <div 
                          v-for="med in filteredMedicines(extra.searchQuery)" 
                          :key="med.medicineId" 
                          @click="selectExtraMedicine(idx, med)"
                          class="medicine-option">
                          <div class="medicine-details">
                            <strong>{{ med.medicineName }}</strong>
                            <span>{{ med.medicineType }} • RM{{ parseFloat(med.price).toFixed(2) }} • Stock: {{ med.medicineQuantity }}</span>
                          </div>
                        </div>
                        <div v-if="filteredMedicines(extra.searchQuery).length === 0" class="no-results">
                          No medicines found. Try a different search term.
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      @click="extra.isNew = true; extra.showDropdown = false; extra.searchQuery = ''"
                      class="btn-add-medicine">
                      ➕ Add New Medicine (Not in Database)
                    </button>
                  </div>
                  
                  <!-- New Medicine Form for Extra -->
                  <div v-if="extra.isNew" class="new-medicine-form">
                    <div class="form-group">
                      <label>Medicine Name:</label>
                      <input v-model="extra.medicineName" type="text" class="form-control" placeholder="Enter medicine name" />
                    </div>
                    <div class="form-group">
                      <label>Type:</label>
                      <select v-model="extra.medicineType" class="form-control">
                        <option value="OTC">OTC (Can add to cart)</option>
                        <option value="NON_OTC">NON-OTC (Prescription only)</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Price (RM):</label>
                      <input v-model.number="extra.price" type="number" step="0.01" min="0" class="form-control" />
                    </div>
                    <div class="form-group">
                      <label>Image URL (optional):</label>
                      <input v-model="extra.imageUrl" type="text" class="form-control" placeholder="https://..." />
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label>Quantity:</label>
                    <input v-model.number="extra.quantity" type="number" min="1" class="form-control" />
                  </div>
                  
                  <div class="form-group">
                    <label>Reason for adding:</label>
                    <input v-model="extra.reason" type="text" class="form-control" placeholder="e.g., To complement treatment..." />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn" @click="closeApproveModal">Cancel</button>
                <button class="btn approve" @click="submitReview">Submit Review</button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router'
import axios from 'axios';

const orders = ref([]);
const isLoading = ref(true);
const showReportModal = ref(false);
const showApproveModal = ref(false);
const selectedOrder = ref(null);
const medicines = ref([]);
const medicineSlots = ref([]);
const extraMedicines = ref([]);
const router = useRouter()

function goBack() {
  router.back()
}

onMounted(async () => {
  await fetchOrders();
  await fetchMedicines();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function handleClickOutside(event) {
  // Check if click is outside all medicine dropdowns
  if (!event.target.closest('.search-input') && !event.target.closest('.medicine-dropdown')) {
    // Close all medicine slot dropdowns
    medicineSlots.value.forEach(slot => {
      slot.showDropdown = false;
    });
    // Close all extra medicine dropdowns
    extraMedicines.value.forEach(extra => {
      extra.showDropdown = false;
    });
  }
}

async function fetchOrders() {
  try {
    isLoading.value = true;

    const user = localStorage.getItem('user');

    const parsedUser = JSON.parse(user);

    const response = await axios.post('/ai-sihat/order/pending-ai', {
      userId: parsedUser.userId
    });

    // console.log('Fetched prescriptions:', response.data.length);

    orders.value = response.data.map(prescription => ({
      id: prescription.prescriptionId,
      customerName: prescription.customerName || prescription.user?.username || 'Unknown',
      status: prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1),
      chatHistory: prescription.chat || null,
      summary: prescription.chat?.summary || null,
      userId: prescription.userId,
      createdAt: prescription.createdAt,
      prescriptionId: prescription.prescriptionId
    }));
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
  } finally {
    isLoading.value = false;
  }
}

async function fetchMedicines() {
  try {
    const response = await axios.get('/ai-sihat/medicines');
    medicines.value = response.data;
    console.log('Fetched medicines:', medicines.value.length);
    console.log('Sample medicine:', medicines.value[0]);
    console.log('Paracetamol search:', medicines.value.filter(m => m.medicineName.toLowerCase().includes('paracetamol')));
  } catch (error) {
    console.error('Error fetching medicines:', error);
  }
}

function filteredMedicines(query) {
  if (!query || query.trim() === '') {
    const firstTen = medicines.value.slice(0, 10);
    console.log('Showing first 10 medicines:', firstTen.map(m => m.medicineName));
    return firstTen;
  }
  const searchTerm = query.toLowerCase();
  const filtered = medicines.value.filter(med => 
    med.medicineName.toLowerCase().includes(searchTerm)
  );
  console.log(`Filtered by "${query}":`, filtered.length, 'results', filtered.map(m => m.medicineName));
  return filtered;
}

function isSymptomQuestion(questionId) {
  // Skip common questions (1-11) and only show symptom-specific questions
  const numericId = parseInt(questionId, 10);
  if (!isNaN(numericId) && numericId >= 1 && numericId <= 11) {
    return false;
  }
  // Include questions with prefixes like FL1, FE1, CO1, etc.
  return /^[A-Z]+\d+$/.test(questionId) || /^Q[A-Z]+\d+$/.test(questionId);
}

function getSymptomName(questionId) {
  // Extract symptom name from question ID
  const prefix = questionId.match(/^([A-Z]+)/)?.[1] || '';
  
  const symptomMap = {
    'FL': 'Flu',
    'FE': 'Fever',
    'CO': 'Cough',
    'CA': 'Cough',
    'CL': 'Cold',
    'NV': 'Nausea and Vomiting',
    'CN': 'Constipation',
    'DI': 'Diarrhoea',
    'IH': 'Indigestion/Heartburn',
    'MP': 'Menstrual Pain',
    'JP': 'Joint Pain',
    'MU': 'Muscle Pain',
    'BL': 'Bloat',
    'IS': 'Itchy Skin',
    'QFL': 'Flu',
    'QFE': 'Fever',
    'QCO': 'Cough',
    'QCL': 'Cold',
    'QCA': 'Common Questions',
    'QE': 'Extra Questions'
  };
  
  return symptomMap[prefix] || 'Symptom';
}

function getGroupedSymptomQuestions(allAnswers) {
  if (!allAnswers) return [];
  
  // Question label mappings - convert technical questions to simple labels
  const questionLabels = {
    // Cough
    'CA1': 'Sore throat',
    'CA2': 'Have phlegm',
    'CA3_WET': 'Experienced phlegm before',
    'CA3_DRY': 'Experienced dry cough before',
    
    // Flu
    'FL1': 'Experienced flu before',
    'FL2': 'Blocked nose',
    
    // Fever
    'FE1': 'Experienced fever before',
    
    // Cold
    'CO1': 'Experienced cold before',
    'CO2': 'Blocked nose',
    
    // Nausea and Vomiting
    'NV1': 'Experienced nausea/vomiting before',
    'NV2': 'Vomiting frequency',
    'NV3': 'Feel thirsty',
    
    // Indigestion/Heartburn
    'IH1': 'Experienced indigestion/heartburn before',
    'IH2': 'Have chest pain',
    'IH3': 'Have sore throat',
    
    // Diarrhoea
    'DI1': 'Experienced diarrhoea before',
    'DI2': 'Abdominal discomfort',
    'DI3': 'Normal stool frequency',
    'DI4': 'Current stool frequency',
    'DI5': 'Started new medication',
    'DI6': 'Feel thirsty',
    'DI7': 'Blood in stool',
    'DI8': 'Recent travel or new food',
    
    // Constipation
    'CN1': 'Experienced constipation before',
    'CN2': 'Abdominal discomfort',
    'CN3': 'Normal stool frequency',
    'CN4': 'Current stool frequency',
    'CN5': 'Started new medication',
    
    // Menstrual Pain
    'MP1': 'Experienced menstrual pain before',
    'MP2': 'Pain level (1-10)',
    
    // Joint Pain
    'JP1': 'Which joint',
    'JP2': 'Experienced joint pain before',
    'JP3': 'Pain level (1-10)',
    
    // Muscle Pain
    'MU1': 'Muscle location',
    'MU2': 'Experienced muscle pain before',
    'MU3': 'Pain level (1-10)',
    'MU4': 'Recent vigorous activity',
    
    // Bloat
    'BL1': 'Experienced bloat before',
    'BL2': 'Have chest pain',
    'BL3': 'Have sore throat',
    'BL4': 'Excessive flatulence',
    
    // Itchy Skin
    'IS1': 'Body part affected',
    'IS2': 'Experienced itchy skin before',
    'IS3': 'Have rash',
    'IS4': 'Rash color',
    'IS5': 'Recent new products/food'
  };
  
  const grouped = {};
  
  // Group questions by symptom
  Object.keys(allAnswers).forEach(qId => {
    if (isSymptomQuestion(qId)) {
      const symptomName = getSymptomName(qId);
      
      if (!grouped[symptomName]) {
        grouped[symptomName] = [];
      }
      
      const label = questionLabels[qId] || `Question ${qId}`;
      
      grouped[symptomName].push({
        id: qId,
        label: label,
        answer: allAnswers[qId]
      });
    }
  });
  
  // Convert to array format
  return Object.keys(grouped).map(symptomName => ({
    name: symptomName,
    questions: grouped[symptomName]
  }));
}

function selectMedicine(idx, med) {
  const slot = medicineSlots.value[idx];
  slot.alternativeMedicineId = med.medicineId;
  slot.newMedicineName = med.medicineName;
  slot.newMedicineType = med.medicineType;
  slot.newPrice = parseFloat(med.price);
  slot.newImageUrl = med.imageUrl;
  slot.searchQuery = med.medicineName;
  slot.showDropdown = false;
  slot.isNew = false;
}

function selectExtraMedicine(idx, med) {
  const extra = extraMedicines.value[idx];
  extra.medicineId = med.medicineId;
  extra.medicineName = med.medicineName;
  extra.medicineType = med.medicineType;
  extra.price = parseFloat(med.price);
  extra.imageUrl = med.imageUrl;
  extra.searchQuery = med.medicineName;
  extra.showDropdown = false;
  extra.isNew = false;
}

function viewReport(order) {
  selectedOrder.value = order;
  showReportModal.value = true;
}

function closeReportModal() {
  showReportModal.value = false;
  selectedOrder.value = null;
}

function openApproveModal(order) {
  selectedOrder.value = order;
  
  // Initialize medicine slots from AI recommendations
  const recommendedMeds = order.summary?.recommendedMedicines || [];
  
  if (recommendedMeds.length > 0) {
    // Use AI recommendations directly
    medicineSlots.value = recommendedMeds.map(rec => ({
      symptom: rec.symptom,
      recommendationText: rec.recommendationText || 'N/A',
      action: null, // 'approve' or 'reject'
      // Original AI recommendation
      medicineId: rec.medicineId,
      medicineName: rec.medicineName,
      medicineType: rec.medicineType,
      price: rec.price || 0,
      imageUrl: rec.imageUrl,
      quantity: rec.quantity || 1,
      // Alternative selection (if rejected or no match)
      alternativeMedicineId: '',
      alternativeQuantity: 1,
      isNew: false,
      newMedicineName: '',
      newMedicineType: 'OTC',
      newPrice: 0,
      newImageUrl: '',
      rejectionReason: '',
      // Search fields
      searchQuery: '',
      showDropdown: false
    }));
  } else {
    // Fallback if no recommendations (shouldn't happen)
    const symptoms = order.summary?.symptoms || [];
    medicineSlots.value = symptoms.map(symptom => ({
      symptom: symptom,
      recommendationText: 'No AI recommendation available',
      action: null,
      medicineId: null,
      medicineName: null,
      medicineType: 'OTC',
      price: 0,
      imageUrl: null,
      quantity: 1,
      alternativeMedicineId: '',
      alternativeQuantity: 1,
      isNew: false,
      newMedicineName: '',
      newMedicineType: 'OTC',
      newPrice: 0,
      newImageUrl: '',
      rejectionReason: '',
      // Search fields
      searchQuery: '',
      showDropdown: false
    }));
  }
  
  extraMedicines.value = [];
  showApproveModal.value = true;
}

function closeApproveModal() {
  showApproveModal.value = false;
  selectedOrder.value = null;
  medicineSlots.value = [];
  extraMedicines.value = [];
}

function addExtraMedicine() {
  extraMedicines.value.push({
    medicineId: '',
    medicineName: '',
    medicineType: 'OTC',
    quantity: 1,
    price: 0,
    imageUrl: '',
    isNew: false,
    reason: '',
    searchQuery: '',
    showDropdown: false
  });
}

function removeExtraMedicine(idx) {
  extraMedicines.value.splice(idx, 1);
}

async function submitReview() {
  // Collect all approved medicines (from symptoms and extras)
  const approvedMeds = [];
  
  // Process symptom medicines
  for (const medSlot of medicineSlots.value) {
    if (!medSlot.action) {
      alert(`Please approve or reject the medicine for: ${medSlot.symptom}`);
      return;
    }
    
    if (medSlot.action === 'reject' && !medSlot.rejectionReason.trim()) {
      alert(`Please provide a rejection reason for: ${medSlot.symptom}`);
      return;
    }
    
    // Determine which medicine to use
    let finalMedicineId, finalMedicineName, finalMedicineType, finalPrice, finalImageUrl, finalQuantity, isNew;
    
    if (medSlot.action === 'approve' && medSlot.medicineId) {
      // Approve AI recommendation directly
      finalMedicineId = medSlot.medicineId;
      finalMedicineName = medSlot.medicineName;
      finalMedicineType = medSlot.medicineType;
      finalPrice = medSlot.price;
      finalImageUrl = medSlot.imageUrl;
      finalQuantity = medSlot.quantity;
      isNew = false;
    } else {
      // Use alternative (rejected OR no AI match)
      if (!medSlot.alternativeMedicineId && !medSlot.isNew) {
        alert(`Please select an alternative medicine for: ${medSlot.symptom}`);
        return;
      }
      
      if (medSlot.isNew) {
        if (!medSlot.newMedicineName || !medSlot.newPrice) {
          alert(`Please fill in all required fields for new medicine (${medSlot.symptom})`);
          return;
        }
        finalMedicineId = null;
        finalMedicineName = medSlot.newMedicineName;
        finalMedicineType = medSlot.newMedicineType;
        finalPrice = medSlot.newPrice;
        finalImageUrl = medSlot.newImageUrl || 'https://via.placeholder.com/150';
        isNew = true;
      } else {
        finalMedicineId = medSlot.alternativeMedicineId;
        const altMed = medicines.value.find(m => m.medicineId === medSlot.alternativeMedicineId);
        finalMedicineName = altMed.medicineName;
        finalMedicineType = altMed.medicineType;
        finalPrice = parseFloat(altMed.price);
        finalImageUrl = altMed.imageUrl;
        isNew = false;
      }
      finalQuantity = medSlot.alternativeQuantity;
    }
    
    approvedMeds.push({
      symptom: medSlot.symptom,
      action: medSlot.action,
      rejectionReason: medSlot.rejectionReason || null,
      medicineId: finalMedicineId,
      medicineName: finalMedicineName,
      medicineType: finalMedicineType,
      quantity: finalQuantity,
      price: finalPrice,
      imageUrl: finalImageUrl,
      isNew: isNew
    });
  }
  
  // Process extra medicines
  for (const extra of extraMedicines.value) {
    if (!extra.medicineId && !extra.isNew) continue;
    
    if (extra.isNew && (!extra.medicineName || !extra.price)) {
      alert('Please fill in all required fields for extra medicines');
      return;
    }
    
    approvedMeds.push({
      symptom: 'Extra',
      action: 'extra',
      reason: extra.reason,
      medicineId: extra.medicineId,
      medicineName: extra.medicineName,
      medicineType: extra.medicineType,
      quantity: extra.quantity,
      price: extra.price,
      imageUrl: extra.imageUrl || 'https://via.placeholder.com/150',
      isNew: extra.isNew
    });
  }
  
  if (approvedMeds.length === 0) {
    alert('Please approve at least one medicine or add alternatives.');
    return;
  }

  try {
    await axios.put(`/ai-sihat/order/${selectedOrder.value.id}/approve`, {
      approvedMedicines: approvedMeds
    });
    
    alert('Order reviewed successfully!');
    closeApproveModal();
    await fetchOrders();
  } catch (error) {
    console.error('Error reviewing order:', error);
    alert('Failed to review order: ' + (error.response?.data?.error || error.message));
  }
}
</script>

<style scoped>
.pharmacist-orders {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #2c3e50;
}

.loading, .no-orders {
  text-align: center;
  color: #7f8c8d;
  font-size: 1.2rem;
}

.order-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.order-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border-left: 5px solid #3498db; /* Default for Pending */
}

.order-card.approved {
    border-left-color: #2ecc71;
}

.order-card.rejected {
    border-left-color: #e74c3c;
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.order-header h3 {
    margin: 0;
    color: #34495e;
}

.status {
    font-weight: bold;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    color: #fff;
    background-color: #3498db;
}

.order-card.approved .status { background-color: #2ecc71; }
.order-card.rejected .status { background-color: #e74c3c; }


.medicines ul {
  list-style-type: none;
  padding-left: 0;
  margin-top: 0.5rem;
}

.medicines li {
  background: #f9f9f9;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.btn {
  background: #f0f0f0;
  border: 1px solid #ddd;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}
.btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.btn.view-report { background-color: #9b59b6; color: white; }
.btn.approve { background-color: #27ae60; color: white; }
.btn.reject { background-color: #c0392b; color: white; }

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
}

.modal-content.large {
  max-width: 900px;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  cursor: pointer;
  color: #777;
}

.chat-history {
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  margin-top: 1rem;
  padding-top: 1rem;
}

.chat-message {
    padding: 0.8rem;
    border-radius: 8px;
    margin-bottom: 0.8rem;
}
.chat-message.customer {
    background-color: #ecf0f1;
}
.chat-message.ai-sihat {
    background-color: #e2f5ea;
}

.modal-content textarea {
    width: 100%;
    min-height: 100px;
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #ccc;
    margin-top: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #2c3e50;
}

.form-control {
    width: 100%;
    padding: 0.6rem;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 1rem;
}

.summary-report {
    margin-top: 1rem;
    line-height: 1.8;
}

.summary-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 8px;
    border-left: 4px solid #42b983;
}

.summary-section h5 {
    margin: 0 0 1rem 0;
    color: #2c3e50;
    font-size: 1.1rem;
    font-weight: 600;
}

.user-description {
  font-style: italic;
  color: #555;
  background: white;
  padding: 0.8rem;
  border-radius: 6px;
  border-left: 3px solid #42b983;
}

.summary-report p {
    margin-bottom: 0.8rem;
}

.recommendation-item {
    margin-bottom: 1rem;
    padding: 0.8rem;
    background: white;
    border-radius: 6px;
}

.recommendation-text {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #42b983;
    white-space: pre-wrap;
    font-family: inherit;
    line-height: 1.6;
    max-height: 400px;
    overflow-y: auto;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}

.medicine-slot {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #3498db;
}

.symptom-label {
  font-weight: 700;
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 0.8rem;
}

.medicine-select-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.new-medicine-form {
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  border: 2px dashed #42b983;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.patient-info {
  background: #e8f5e9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.patient-info h5 {
  margin-top: 0;
  color: #2c3e50;
}

.symptom-description {
  line-height: 1.8;
}

.instruction {
  font-weight: 600;
  color: #2c3e50;
  margin: 1.5rem 0 1rem;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.action-btn.approve-btn {
  color: #27ae60;
  border-color: #27ae60;
}

.action-btn.approve-btn.active {
  background: #27ae60;
  color: white;
}

.action-btn.reject-btn {
  color: #c0392b;
  border-color: #c0392b;
}

.action-btn.reject-btn.active {
  background: #c0392b;
  color: white;
}

.rejection-note {
  background: #ffe6e6;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.rejection-note textarea {
  width: 100%;
  min-height: 60px;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  margin-top: 0.5rem;
}

.help-text {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.extra-medicines-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e0e0e0;
}

.extra-medicines-section h5 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.btn.add-extra {
  background: #3498db;
  color: white;
  margin-bottom: 1rem;
}

.medicine-slot.extra {
  border-left-color: #9b59b6;
}

.remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.ai-recommendation {
  background: #f0f8ff;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #3498db;
}

.ai-recommendation h6 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 0.95rem;
}

.ai-recommendation .recommendation-text {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 0.8rem;
}

.recommended-medicine {
  background: white;
  padding: 0.8rem;
  border-radius: 6px;
  border: 1px solid #3498db;
  font-size: 0.9rem;
  line-height: 1.8;
}

.no-match-warning {
  background: #fff3cd;
  color: #856404;
  padding: 0.8rem;
  border-radius: 6px;
  border: 1px solid #ffc107;
  font-weight: 600;
}

.qa-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  background: #fafafa;
}

.symptom-qa-section {
  margin-bottom: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.symptom-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.8rem 1rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.qa-item {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  background: white;
}

.qa-item:last-child {
  border-bottom: none;
}

.question-label {
  font-weight: bold;
  color: #3498db;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.answer-text {
  color: #2c3e50;
  line-height: 1.6;
  padding-left: 0.5rem;
}

.answer-text strong {
  color: #34495e;
}

.ai-response {
  color: #7f8c8d;
  font-style: italic;
  margin-top: 0.5rem;
  display: block;
}

/* Medicine Search Dropdown Styles */
.search-input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.medicine-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 250px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
  margin-top: -1px;
}

.medicine-option {
  padding: 0.8rem;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.15s;
}

.medicine-option:hover {
  background-color: #f8f9fa;
}

.medicine-option:last-child {
  border-bottom: none;
}

.medicine-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.medicine-details strong {
  color: #2c3e50;
  font-size: 0.95rem;
}

.medicine-details span {
  color: #7f8c8d;
  font-size: 0.85rem;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: #95a5a6;
  font-style: italic;
}

.btn-add-medicine {
  background: #27ae60;
  color: white;
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
}

.btn-add-medicine:hover {
  background-color: #229954;
}

.btn-add-medicine:active {
  transform: scale(0.98);
}

/* Header back button styles (consistent with other pages) */
.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
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
  flex-shrink: 0;
}
.btn-back:hover { transform: translateX(-2px); background-color: rgba(0,0,0,0.03); }
.back-arrow { font-size: 1.2rem; color: #333; line-height: 1; font-weight: 600; }
/* Make the header title centered while leaving the back button at left */
.page-header h2 {
  flex: 1 1 auto;
  text-align: center;
  margin: 0;
}
</style>
