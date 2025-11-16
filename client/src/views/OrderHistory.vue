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
/* --- General Page Layout --- */
.order-history {
  padding-bottom: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.btn-back {
  background: none;
  border: none;
  font-size: 1.75rem;
  color: #2c3e50;
  cursor: pointer;
  margin-right: 1rem;
  padding: 0 0.5rem;
}

.btn-back .back-arrow {
  transition: transform 0.2s ease;
}

.btn-back:hover .back-arrow {
  transform: translateX(-3px);
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

/* --- Loading/Empty States --- */
.loading,
.error,
.empty {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #666;
}

.error {
  color: #721c24;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  margin: 1rem;
}

.empty p {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

/* --- Filter Tabs --- */
.orders-container {
  padding: 0 1.5rem;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 1rem;
}

.tab {
  padding: 0.6rem 1.2rem;
  border: 1px solid #ccc;
  border-radius: 20px;
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap; /* Prevents text from wrapping */
}

.tab:hover {
  background: #e9ecef;
}

.tab.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

/* --- Orders List & Cards --- */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.order-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
}

.order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-info h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #2c3e50;
}

.order-date {
  font-size: 0.9rem;
  color: #666;
}

/* --- Status Badge (From your code) --- */
.status-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
  flex-shrink: 0; /* Prevents badge from shrinking */
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.picked_up,
.status-badge.delivered {
  background: #d4edda;
  color: #155724;
}

.status-badge.rejected {
  background: #f8d7da;
  color: #721c24;
}

/* --- Order Details (From your code) --- */
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

/* --- Order Actions (From your code) --- */
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

/* ======================================= */
/* === MOBILE RESPONSIVE STYLES === */
/* ======================================= */

@media (max-width: 600px) {
  .page-header {
    padding: 0.75rem 1rem;
  }
  
  .page-header h1 {
    font-size: 1.4rem; /* Smaller title */
  }

  .btn-back {
    margin-right: 0.75rem;
  }

  .orders-container {
    padding: 0; /* Remove side padding to allow tabs to scroll to edge */
  }

  .filter-tabs {
    overflow-x: auto; /* Allow horizontal scrolling */
    white-space: nowrap; /* Keep tabs in one line */
    padding: 0.75rem 1rem; /* Add padding for content and scrollbar area */
    margin-bottom: 1rem;
    /* Hide scrollbar for a cleaner look */
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  .filter-tabs::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .tab {
    padding: 0.5rem 1rem; /* Slightly smaller tabs */
    font-size: 0.9rem;
    flex: 0 0 auto; /* Prevent tabs from shrinking */
  }

  .orders-list {
    padding: 0 1rem; /* Add padding back for the cards list */
    gap: 1rem;
  }
  
  .order-card {
    padding: 1rem; /* Reduce card padding */
    border-radius: 10px;
  }

  .order-header {
    flex-wrap: wrap; /* Allow badge to wrap below if needed */
    margin-bottom: 1rem;
  }
  
  .order-info h3 {
    font-size: 1.15rem; /* Smaller order ID */
  }
  
  .status-badge {
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
  }

  .detail-row {
    flex-direction: column; /* Stack label and value */
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .label {
    font-size: 0.9rem;
  }
  
  .value {
    font-weight: 500;
  }

  .medication-list {
    padding-left: 0.5rem;
  }
  
  .med-name {
    font-size: 0.95rem;
  }

  .med-qty {
    font-size: 0.85rem;
  }

  .order-actions .btn-small {
    width: 100%; /* Make buttons full-width */
    text-align: center;
    padding: 0.75rem;
  }
}
</style>
