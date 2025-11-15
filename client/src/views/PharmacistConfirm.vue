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
.pharmacist-confirm { max-width: 1000px; margin: 1.5rem auto; padding: 1rem }
.page-header { display:flex; align-items:center; gap:0.75rem; margin-bottom: 1rem }
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
.page-header h2 { flex: 1 1 auto; text-align: center; margin: 0; }
.order-list { display:flex; flex-direction:column; gap:1rem; margin-top:1rem }
.order-card { border:1px solid #eee; padding:1rem; border-radius:8px; background:white }
.order-top { display:flex; justify-content:space-between; align-items:center }
.sub { color:#666; font-size:0.9rem }
.order-items { margin-top:0.75rem }
.item-row { display:flex; justify-content:space-between; padding:0.3rem 0 }
.actions { margin-top:0.75rem; display:flex; gap:0.5rem }
.btn { background:#10b981; color:white; border:none; padding:0.5rem 0.8rem; border-radius:6px; cursor:pointer }
.btn.secondary { background:#6b7280 }
.filters button { border:1px solid #ddd; padding:0.4rem 0.6rem; border-radius:6px; background:white; cursor:pointer }
.filters button.active { background:#efefef; border-color:#bbb }
</style>
