<template>
  <div class="order-history">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/customer')" title="Go back">
        <span class="back-arrow">←</span>
      </button>
      <h1>Order History</h1>
    </div>

    <div v-if="loading" class="loading">Loading orders...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="orders.length === 0" class="empty">
      <p>No orders found.</p>
      <router-link to="/shop" class="btn primary">Start Shopping</router-link>
    </div>
    
    <div v-else class="orders-container">
      <div class="filter-tabs">
        <button 
          :class="['tab', { active: filter === 'all' }]" 
          @click="filter = 'all'"
        >
          All ({{ orders.length }})
        </button>
        <button 
          :class="['tab', { active: filter === 'pending' }]" 
          @click="filter = 'pending'"
        >
          Pending ({{ pendingCount }})
        </button>
        <button 
          :class="['tab', { active: filter === 'completed' }]" 
          @click="filter = 'completed'"
        >
          Completed ({{ completedCount }})
        </button>
      </div>

      <div class="orders-list">
        <div 
          v-for="order in filteredOrders" 
          :key="order.orderId" 
          class="order-card"
        >
          <div class="order-header">
            <div class="order-info">
              <h3>Order #{{ order.orderId }}</h3>
              <span class="order-date">{{ formatDate(order.orderDate) }}</span>
            </div>
            <span :class="['status-badge', order.orderStatus.toLowerCase()]">
              {{ order.orderStatus.replace('_', ' ') }}
            </span>
          </div>

          <div class="order-details">
            <div class="detail-row">
              <span class="label">Total Amount:</span>
              <span class="value">RM {{ parseFloat(order.totalAmount).toFixed(2) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment Method:</span>
              <span class="value">{{ order.paymentMethod }}</span>
            </div>
            <div v-if="order.prescriptions && order.prescriptions.length > 0" class="medications">
              <span class="label">Medications:</span>
              <div class="medication-list">
                <div 
                  v-for="prescription in order.prescriptions" 
                  :key="prescription.prescriptionId"
                  class="medication-item"
                >
                  <span class="med-name">{{ prescription.medicine?.medicineName || 'Unknown' }}</span>
                  <span class="med-qty">Qty: {{ prescription.quantity }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="order.orderStatus === 'Approved'" class="order-actions">
            <button class="btn-small primary">Track Order</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const orders = ref([]);
const loading = ref(true);
const error = ref('');
const filter = ref('all'); // default filter

// --- SCRIPT MODIFIED ---

const filteredOrders = computed(() => {
  const currentFilter = filter.value;
  if (currentFilter === 'all') {
    return orders.value;
  }
  if (currentFilter === 'pending') {
    return orders.value.filter(order => 
      order.orderStatus.toLowerCase() === 'pending'
    );
  }
  if (currentFilter === 'completed') {
    return orders.value.filter(order => 
      order.orderStatus.toLowerCase() === 'picked_up' ||
      order.orderStatus.toLowerCase() === 'delivered'
    );
  }
  return orders.value;
});

const pendingCount = computed(() => 
  orders.value.filter(o => o.orderStatus.toLowerCase() === 'pending').length
);

// ADDED
const completedCount = computed(() => 
  orders.value.filter(o => 
    o.orderStatus.toLowerCase() === 'picked_up' ||
    o.orderStatus.toLowerCase() === 'delivered'
  ).length
);

// REMOVED approvedCount
// REMOVED rejectedCount

async function fetchOrders() {
  try {
    loading.value = true;
    error.value = '';
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      error.value = 'User not logged in';
      return;
    }

    const response = await axios.get(`/ai-sihat/order/user/${userId}`);
    orders.value = response.data;
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    error.value = 'Failed to load orders. Please try again.';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped>
/* ... (all styles above .status-badge are unchanged) ... */

.status-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

/* --- STYLE MODIFIED --- */
/* Combined 'completed' states */
.status-badge.picked_up,
.status-badge.delivered {
  background: #d4edda;
  color: #155724;
}

/* This is likely no longer used but safe to keep */
.status-badge.rejected {
  background: #f8d7da;
  color: #721c24;
}

/* ... (all styles below this are unchanged) ... */
.order-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #2c3e50;
  font-weight: 600;
}

.medications {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.medication-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1rem;
}

.medication-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.med-name {
  color: #2c3e50;
  font-weight: 500;
}

.med-qty {
  color: #666;
  font-size: 0.9rem;
}

.order-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 0.75rem;
}

.btn, .btn-small {
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn.primary, .btn-small.primary {
  background: #10b981;
  color: white;
}

.btn.primary:hover, .btn-small.primary:hover {
  background: #059669;
  transform: translateY(-1px);
}
</style>
