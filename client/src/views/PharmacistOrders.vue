<template>
  <div class="pharmacist-orders">
    <h2>Pending Orders</h2>

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
          <button class="btn approve" @click="openApproveModal(order)" :disabled="order.status !== 'Pending'">Approve</button>
          <button class="btn reject" @click="openRejectModal(order)" :disabled="order.status !== 'Pending'">Reject</button>
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
          
          <div v-if="selectedOrder.summary.recommendationDetails || selectedOrder.summary.recommendation" class="summary-section">
            <h5>AI Recommendation</h5>
            <pre class="recommendation-text">{{ selectedOrder.summary.recommendationDetails?.fullText || selectedOrder.summary.recommendation }}</pre>
          </div>
          
          <div v-if="selectedOrder.summary.allRecommendations && selectedOrder.summary.allRecommendations.length > 0" class="summary-section">
            <h5>Detailed Recommendations</h5>
            <div v-for="(rec, idx) in selectedOrder.summary.allRecommendations" :key="idx" class="recommendation-item">
              <strong>{{ rec.symptom }}:</strong>
              <pre class="recommendation-text">{{ rec.details.join('\n') }}</pre>
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
            <h4>Approve Order #{{ selectedOrder?.id.substring(0, 8) }}</h4>
            <p>Select or add medicines for each symptom:</p>
            
            <div v-for="(medSlot, idx) in medicineSlots" :key="idx" class="medicine-slot">
              <div class="symptom-label">{{ medSlot.symptom }}</div>
              
              <div class="medicine-select-group">
                <div class="form-group">
                  <label>Medicine:</label>
                  <select v-model="medSlot.medicineId" @change="onMedicineSelect(idx)" class="form-control">
                    <option value="">Select existing medicine</option>
                    <option v-for="med in medicines" :key="med.medicineId" :value="med.medicineId">
                      {{ med.medicineName }} ({{ med.medicineType }}) - Stock: {{ med.medicineQuantity }}
                    </option>
                    <option value="__new__">+ Add New Medicine</option>
                  </select>
                </div>
                
                <!-- New Medicine Form -->
                <div v-if="medSlot.isNew" class="new-medicine-form">
                  <div class="form-group">
                    <label>Medicine Name:</label>
                    <input v-model="medSlot.medicineName" type="text" class="form-control" placeholder="Enter medicine name" />
                  </div>
                  <div class="form-group">
                    <label>Type:</label>
                    <select v-model="medSlot.medicineType" class="form-control">
                      <option value="OTC">OTC (Can add to cart)</option>
                      <option value="NON_OTC">NON-OTC (Prescription only)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Price (RM):</label>
                    <input v-model.number="medSlot.price" type="number" step="0.01" min="0" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label>Image URL (optional):</label>
                    <input v-model="medSlot.imageUrl" type="text" class="form-control" placeholder="https://..." />
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Quantity:</label>
                  <input v-model.number="medSlot.quantity" type="number" min="1" class="form-control" />
                </div>
                
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="medSlot.approved" />
                    Approve this medicine
                  </label>
                </div>
              </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn" @click="closeApproveModal">Cancel</button>
                <button class="btn approve" @click="submitApproval">Approve Selected Medicines</button>
            </div>
        </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="closeRejectModal">
        <div class="modal-content">
            <span class="close-btn" @click="closeRejectModal">&times;</span>
            <h4>Reject Order #{{ selectedOrder.id }}</h4>
            <p>Please provide a reason for rejection and suggest an alternative if applicable.</p>
            <textarea v-model="rejectionReason" placeholder="e.g., 'This medicine is out of stock. I recommend...'"></textarea>
            <div class="modal-actions">
                <button class="btn" @click="closeRejectModal">Cancel</button>
                <button class="btn reject" @click="submitRejection">Submit Rejection</button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const orders = ref([]);
const isLoading = ref(true);
const showReportModal = ref(false);
const showRejectModal = ref(false);
const showApproveModal = ref(false);
const selectedOrder = ref(null);
const rejectionReason = ref('');
const medicines = ref([]);
const medicineSlots = ref([]);

onMounted(async () => {
  await fetchOrders();
  await fetchMedicines();
});

async function fetchOrders() {
  try {
    isLoading.value = true;
    const response = await axios.get('/ai-sihat/order/pending-ai');
    orders.value = response.data.map(order => ({
      id: order.orderId,
      customerName: order.user?.username || 'Unknown',
      status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      chatHistory: order.user?.chats?.[0] || null,
      summary: order.user?.chats?.[0]?.summary || null,
      userId: order.userId,
      createdAt: order.createdAt
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
  } finally {
    isLoading.value = false;
  }
}

async function fetchMedicines() {
  try {
    const response = await axios.get('/ai-sihat/medicine');
    medicines.value = response.data;
  } catch (error) {
    console.error('Error fetching medicines:', error);
  }
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
  
  // Initialize medicine slots from recommended medicines or symptoms
  const symptoms = order.summary?.symptoms || [];
  medicineSlots.value = symptoms.map(symptom => ({
    symptom: symptom,
    medicineId: '',
    medicineName: '',
    medicineType: 'OTC',
    quantity: 1,
    price: 0,
    imageUrl: '',
    isNew: false,
    approved: false
  }));
  
  showApproveModal.value = true;
}

function closeApproveModal() {
  showApproveModal.value = false;
  selectedOrder.value = null;
  medicineSlots.value = [];
}

function onMedicineSelect(idx) {
  const slot = medicineSlots.value[idx];
  if (slot.medicineId === '__new__') {
    slot.isNew = true;
    slot.medicineId = null;
  } else {
    slot.isNew = false;
    // Find selected medicine and populate info
    const selected = medicines.value.find(m => m.medicineId === slot.medicineId);
    if (selected) {
      slot.medicineName = selected.medicineName;
      slot.medicineType = selected.medicineType;
      slot.price = parseFloat(selected.price);
      slot.imageUrl = selected.imageUrl;
    }
  }
}

function openRejectModal(order) {
  selectedOrder.value = order;
  showRejectModal.value = true;
}

function closeRejectModal() {
  showRejectModal.value = false;
  selectedOrder.value = null;
  rejectionReason.value = '';
}

async function submitApproval() {
  // Get only approved medicines
  const approvedMeds = medicineSlots.value.filter(slot => slot.approved);
  
  if (approvedMeds.length === 0) {
    alert('Please approve at least one medicine.');
    return;
  }
  
  // Validate new medicines
  for (const med of approvedMeds) {
    if (med.isNew && (!med.medicineName || !med.price)) {
      alert('Please fill in all fields for new medicines (name and price required).');
      return;
    }
    if (!med.isNew && !med.medicineId) {
      alert('Please select a medicine or add a new one.');
      return;
    }
  }

  try {
    await axios.put(`/ai-sihat/order/${selectedOrder.value.id}/approve`, {
      approvedMedicines: approvedMeds.map(med => ({
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        medicineType: med.medicineType,
        quantity: med.quantity,
        price: med.price,
        imageUrl: med.imageUrl || 'https://via.placeholder.com/150',
        isNew: med.isNew
      }))
    });
    
    alert('Order approved successfully!');
    closeApproveModal();
    await fetchOrders();
  } catch (error) {
    console.error('Error approving order:', error);
    alert('Failed to approve order: ' + (error.response?.data?.error || error.message));
  }
}

async function submitRejection() {
  if (!rejectionReason.value.trim()) {
    alert('Please provide a reason for rejection.');
    return;
  }

  try {
    await axios.put(`/ai-sihat/order/${selectedOrder.value.id}/reject`, {
      reason: rejectionReason.value
    });
    
    alert('Order rejected successfully.');
    closeRejectModal();
    await fetchOrders();
  } catch (error) {
    console.error('Error rejecting order:', error);
    alert('Failed to reject order: ' + (error.response?.data?.error || error.message));
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
</style>
