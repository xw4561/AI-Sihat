<template>
  <div class="pharmacist-confirm">
    <div class="page-header">
      <button class="btn-back" @click="goBack" title="Go back">
        <span class="back-arrow">←</span>
      </button>
      <h2>Confirm Pickups / Deliveries</h2>
    </div>

    <div v-if="loading" class="loading">Loading orders...</div>
    <div v-else>
      <div v-if="orders.length === 0" class="empty">No branch orders found.</div>

      <div class="filters" style="display:flex; gap:0.5rem; margin:0.75rem 0">
        <button :class="{active: filter === 'all'}" @click="setFilter('all')">All</button>
        <button :class="{active: filter === 'pending'}" @click="setFilter('pending')">Pending</button>
        <button :class="{active: filter === 'completed'}" @click="setFilter('completed')">Completed</button>
      </div>

      <div class="order-list">
        <div v-for="order in orders" :key="order.orderId" class="order-card">
          <div class="order-top">
            <div>
              <strong>Order #{{ order.orderId }}</strong>
              <div class="sub">{{ formatDate(order.createdAt) }}</div>
            </div>
            <div class="status">Status: {{ prettyStatus(order.status) }}</div>
          </div>

          <div class="order-items">
            <div v-for="item in order.items" :key="item.orderItemId" class="item-row">
              <div class="name">{{ item.medicine?.medicineName || 'Unknown' }}</div>
              <div class="qty">Qty: {{ item.quantity }}</div>
            </div>
          </div>

          <div class="order-meta" style="margin-top:0.5rem">
            <div><strong>Customer:</strong> {{ order.customerName }} • {{ order.customerPhone }}</div>
            <div v-if="order.customerAddress"><strong>Address:</strong> {{ order.customerAddress }}</div>
            <div v-else><strong>Order Type:</strong> Pickup (in-store)</div>
          </div>

          <div class="actions">
            <!-- Pickup orders: show Picked Up button -->
            <button v-if="!order.customerAddress && order.status !== 'picked_up'" @click="markPickedUp(order.orderId)" class="btn">Confirm Pickup</button>

            <!-- Delivery orders: show Delivered button -->
            <button v-if="order.customerAddress && order.status !== 'delivered'" @click="markDelivered(order.orderId)" class="btn secondary">Confirm Delivery</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const orders = ref([])
const loading = ref(true)
const filter = ref('all')
const router = useRouter()

function goBack() {
  router.push('/pharmacist')
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString()
}

function prettyStatus(s) {
  if (!s) return ''
  if (s === 'picked_up') return 'Picked Up'
  if (s === 'delivered') return 'Delivered'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function fetchOrders() {
  loading.value = true
  try {
    // Prefer using server-side branch-filtered endpoint
    const userStr = localStorage.getItem('user')
    let userId = null
    try { userId = userStr ? JSON.parse(userStr).userId : null } catch(e) { userId = null }

    if (!userId) {
      // fallback: fetch all
      const res = await axios.get('/ai-sihat/order')
      orders.value = res.data || []
    } else {
      const res = await axios.post('/ai-sihat/order/branch', { userId, status: filter.value })
      orders.value = res.data || []
    }
  } catch (e) {
    console.error('Failed to fetch orders', e)
    orders.value = []
  } finally {
    loading.value = false
  }
}

async function markPickedUp(id) {
  try {
    await axios.put(`/ai-sihat/order/${id}/picked-up`)
    await fetchOrders()
  } catch (e) {
    alert('Failed to mark as picked up: ' + (e.response?.data?.error || e.message))
  }
}

async function markDelivered(id) {
  try {
    await axios.put(`/ai-sihat/order/${id}/delivered`)
    await fetchOrders()
  } catch (e) {
    alert('Failed to mark as delivered: ' + (e.response?.data?.error || e.message))
  }
}

onMounted(() => {
  fetchOrders()
})

function setFilter(s) {
  filter.value = s
  fetchOrders()
}
</script>

<style scoped>
/* --- Base Layout --- */
.pharmacist-confirm {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 2rem;
  background-color: #f8f9fa; /* Lighter page background */
  min-height: 100vh;
}

/* --- Page Header --- */
.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.btn-back {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.btn-back:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
.back-arrow {
  font-size: 1.5rem; /* Bigger tap target */
  color: #333;
  line-height: 1;
  font-weight: 600;
}
.page-header h2 {
  flex: 1 1 auto;
  text-align: center;
  margin: 0;
  font-size: 1.25rem;
  /* Shift left to account for back button, centering the title */
  margin-left: -2.5rem; 
}

/* --- Loading / Empty States --- */
.loading,
.empty {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #666;
  font-size: 1.1rem;
}

/* --- Filters (Mobile-Optimized) --- */
.filters {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  overflow-x: auto; /* Key change: Allow horizontal scrolling */
  white-space: nowrap;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;

  /* Hide scrollbar for a cleaner look */
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.filters::-webkit-scrollbar {
  display: none;
}
.filters button {
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  border-radius: 20px; /* Pill shape */
  background: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  flex-shrink: 0; /* Prevent buttons from shrinking */
}
.filters button.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}
.filters button:hover:not(.active) {
  background: #f0f0f0;
}

/* --- Order List & Cards --- */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 1.5rem;
  margin-top: 1rem;
}

.order-card {
  border: 1px solid #e0e0e0;
  padding: 1.25rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.order-top {
  display: flex;
  flex-direction: column; /* Key change: Stack info vertically */
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.order-top strong {
  font-size: 1.15rem;
  color: #2c3e50;
}

.sub {
  color: #666;
  font-size: 0.9rem;
}

.status {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  background: #e9ecef;
  color: #495057;
  text-transform: capitalize;
}

/* --- Order Items & Meta --- */
.order-items {
  margin-top: 0.75rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0; /* More vertical space */
  border-bottom: 1px dashed #f0f0f0; /* Softer separator */
}
.item-row:last-child {
  border-bottom: none;
}

.name {
  color: #333;
  font-weight: 500;
  margin-right: 1rem; /* Space before qty */
}

.qty {
  color: #10b981; /* Use accent color */
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.order-meta {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
  font-size: 0.95rem;
  color: #444;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.order-meta strong {
  color: #000;
}

/* --- Actions (Mobile-Optimized) --- */
.actions {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column; /* Key change: Stack buttons */
  gap: 0.75rem;
}

.btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.75rem 1rem; /* Bigger tap target */
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  text-align: center;
  transition: all 0.2s ease;
  width: 100%; /* Key change: Full width */
}
.btn:hover {
  background: #059669;
}

.btn.secondary {
  background: #6b7280;
}
.btn.secondary:hover {
  background: #4b5563;
}

/* ======================================= */
/* === DESKTOP / WIDER SCREEN STYLES === */
/* ======================================= */

@media (min-width: 600px) {
  .pharmacist-confirm {
    padding: 1.5rem; /* Restore padding */
  }

  .page-header {
    background: none;
    border-bottom: none;
    position: static;
    padding: 0.5rem 0;
    margin-bottom: 1rem;
  }
  
  .page-header h2 {
    margin-left: 0; /* Reset mobile centering hack */
  }

  .filters {
    overflow-x: visible; /* Disable scrolling */
    background: none;
    padding: 0.75rem 0;
  }
  
  .order-list {
    padding: 0; /* Reset padding */
  }

  .order-top {
    flex-direction: row; /* Back to row layout */
    justify-content: space-between;
    align-items: center;
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0.75rem;
  }

  .actions {
    flex-direction: row; /* Buttons side-by-side */
    gap: 0.5rem;
  }

  .btn {
    width: auto; /* Auto-width for buttons */
    padding: 0.5rem 0.8rem; /* Restore original padding */
    font-size: 0.9rem;
  }
}
</style>