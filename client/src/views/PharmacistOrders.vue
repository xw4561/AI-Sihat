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
          <h3>Order #{{ order.id }}</h3>
          <span class="status">{{ order.status }}</span>
        </div>
        <p><strong>Customer:</strong> {{ order.customerName }}</p>
        <div class="medicines">
          <strong>Requested Medicines:</strong>
          <ul>
            <li v-for="med in order.requestedMedicines" :key="med.id">
              {{ med.name }} (Quantity: {{ med.quantity }})
            </li>
          </ul>
        </div>
        <div class="actions">
          <button class="btn view-report" @click="viewReport(order)">View Report</button>
          <button class="btn approve" @click="approveOrder(order)" :disabled="order.status !== 'Pending'">Approve</button>
          <button class="btn reject" @click="openRejectModal(order)" :disabled="order.status !== 'Pending'">Reject</button>
        </div>
      </div>
    </div>

    <!-- Report Modal -->
    <div v-if="showReportModal" class="modal-overlay" @click.self="closeReportModal">
      <div class="modal-content">
        <span class="close-btn" @click="closeReportModal">&times;</span>
        <h4>Chat Report for Order #{{ selectedOrder.id }}</h4>
        <div class="chat-history">
          <div v-for="(msg, index) in selectedOrder.chatHistory" :key="index" class="chat-message" :class="msg.sender.toLowerCase()">
            <p><strong>{{ msg.sender }}:</strong> {{ msg.text }}</p>
          </div>
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

const orders = ref([]);
const isLoading = ref(true);
const showReportModal = ref(false);
const showRejectModal = ref(false);
const selectedOrder = ref(null);
const rejectionReason = ref('');

// Mock data representing orders from customers
const mockOrders = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    status: 'Pending',
    requestedMedicines: [
      { id: 'med-1', name: 'Paracetamol', quantity: 20 },
      { id: 'med-2', name: 'Ibuprofen', quantity: 10 },
    ],
    chatHistory: [
      { sender: 'Customer', text: 'I have a severe headache and body aches.' },
      { sender: 'AI-Sihat', text: 'Based on your symptoms, I recommend Paracetamol for pain relief and Ibuprofen to reduce inflammation. Would you like to order them?' },
      { sender: 'Customer', text: 'Yes, please.' },
    ],
  },
  {
    id: 'ORD-002',
    customerName: 'Jane Smith',
    status: 'Pending',
    requestedMedicines: [
      { id: 'med-3', name: 'Loratadine', quantity: 30 },
    ],
    chatHistory: [
      { sender: 'Customer', text: 'I have seasonal allergies, my nose is runny and I keep sneezing.' },
      { sender: 'AI-Sihat', text: 'Loratadine is an effective antihistamine for seasonal allergies. I suggest one tablet per day. Would you like to proceed?' },
      { sender: 'Customer', text: 'Yes, that sounds good.' },
    ],
  },
    {
    id: 'ORD-003',
    customerName: 'Sam Wilson',
    status: 'Approved',
    requestedMedicines: [
      { id: 'med-4', name: 'Amoxicillin', quantity: 14 },
    ],
    chatHistory: [],
  },
];

onMounted(() => {
  // Simulate fetching data from an API
  setTimeout(() => {
    orders.value = mockOrders;
    isLoading.value = false;
  }, 1000);
});

function viewReport(order) {
  selectedOrder.value = order;
  showReportModal.value = true;
}

function closeReportModal() {
  showReportModal.value = false;
  selectedOrder.value = null;
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

function approveOrder(order) {
  const index = orders.value.findIndex(o => o.id === order.id);
  if (index !== -1) {
    orders.value[index].status = 'Approved';
  }
}

function submitRejection() {
    if (!rejectionReason.value.trim()) {
        alert('Please provide a reason for rejection.');
        return;
    }
    const index = orders.value.findIndex(o => o.id === selectedOrder.value.id);
    if (index !== -1) {
        orders.value[index].status = 'Rejected';
        // Here you would also send the rejectionReason to the backend
        console.log(`Order ${selectedOrder.value.id} rejected. Reason: ${rejectionReason.value}`);
    }
    closeRejectModal();
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
  position: relative;
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

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}
</style>
