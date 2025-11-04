<template>
  <div class="db-manager">
    <h2>Database Manager</h2>
    <p class="subtitle">Add and manage test data in your PostgreSQL database</p>

    <!-- Users Section -->
    <div class="section">
      <h3>👤 Users</h3>
      
      <!-- Add User Form -->
      <div class="form-card">
        <h4>Add New User</h4>
        <form @submit.prevent="addUser">
          <div class="form-row">
            <input v-model="newUser.username" type="text" placeholder="Username" required />
            <input v-model="newUser.email" type="email" placeholder="Email" required />
            <input v-model="newUser.password" type="password" placeholder="Password" required />
            <button type="submit" class="btn-add">Add User</button>
          </div>
        </form>
      </div>

      <!-- Users List -->
      <div class="data-card">
        <div class="card-header">
          <h4>All Users</h4>
          <button @click="loadUsers" class="btn-refresh">🔄 Refresh</button>
        </div>
        <div v-if="usersLoading" class="loading">Loading users...</div>
        <div v-else-if="users.length === 0" class="empty">No users found</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.userId">
                <td>{{ user.userId }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.points }}</td>
                <td>
                  <button @click="deleteUser(user.userId)" class="btn-delete">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Medicines Section -->
    <div class="section">
      <h3>💊 Medicines</h3>
      
      <!-- Add Medicine Form -->
      <div class="form-card">
        <h4>Add New Medicine</h4>
        <form @submit.prevent="addMedicine">
          <div class="form-row">
            <input v-model="newMedicine.medicineName" type="text" placeholder="Medicine Name" required />
            <input v-model="newMedicine.medicineType" type="text" placeholder="Type" required />
            <input v-model.number="newMedicine.medicineQuantity" type="number" placeholder="Quantity" required min="0" />
            <button type="submit" class="btn-add">Add Medicine</button>
          </div>
        </form>
      </div>

      <!-- Medicines List -->
      <div class="data-card">
        <div class="card-header">
          <h4>All Medicines</h4>
          <button @click="loadMedicines" class="btn-refresh">🔄 Refresh</button>
        </div>
        <div v-if="medicinesLoading" class="loading">Loading medicines...</div>
        <div v-else-if="medicines.length === 0" class="empty">No medicines found</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="medicine in medicines" :key="medicine.medicineId">
                <td>{{ medicine.medicineId }}</td>
                <td>{{ medicine.medicineName }}</td>
                <td>{{ medicine.medicineType }}</td>
                <td>{{ medicine.medicineQuantity }}</td>
                <td>
                  <button @click="deleteMedicine(medicine.medicineId)" class="btn-delete">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Orders Section -->
    <div class="section">
      <h3>📦 Orders</h3>
      
      <!-- Add Order Form -->
      <div class="form-card">
        <h4>Create New Order</h4>
        <form @submit.prevent="addOrder">
          <div class="form-row">
            <select v-model="newOrder.userId" required>
              <option value="" disabled>Select User</option>
              <option v-for="user in users" :key="user.userId" :value="user.userId">
                {{ user.username }} (ID: {{ user.userId }})
              </option>
            </select>
            <select v-model="newOrder.medicineId" required>
              <option value="" disabled>Select Medicine</option>
              <option v-for="medicine in medicines" :key="medicine.medicineId" :value="medicine.medicineId">
                {{ medicine.medicineName }} (ID: {{ medicine.medicineId }})
              </option>
            </select>
            <input v-model.number="newOrder.quantity" type="number" placeholder="Quantity" required min="1" />
            <select v-model="newOrder.orderType" required>
              <option value="" disabled>Order Type</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
            <label class="checkbox-label">
              <input v-model="newOrder.useAi" type="checkbox" />
              Use AI (2x points)
            </label>
            <button type="submit" class="btn-add">Create Order</button>
          </div>
        </form>
      </div>

      <!-- Orders List -->
      <div class="data-card">
        <div class="card-header">
          <h4>All Orders</h4>
          <button @click="loadOrders" class="btn-refresh">🔄 Refresh</button>
        </div>
        <div v-if="ordersLoading" class="loading">Loading orders...</div>
        <div v-else-if="orders.length === 0" class="empty">No orders found</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Medicine ID</th>
                <th>Quantity</th>
                <th>Type</th>
                <th>AI Used</th>
                <th>Points</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.orderId">
                <td>{{ order.orderId }}</td>
                <td>{{ order.userId }}</td>
                <td>{{ order.medicineId }}</td>
                <td>{{ order.quantity }}</td>
                <td>{{ order.orderType }}</td>
                <td>{{ order.useAi ? '✅' : '❌' }}</td>
                <td>{{ order.totalPoints }}</td>
                <td><span :class="'status-' + order.status">{{ order.status }}</span></td>
                <td>
                  <button @click="deleteOrder(order.orderId)" class="btn-delete">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" :class="['status-message', statusType]">
      {{ statusMessage }}
    </div>
  </div>


<!-- Chat Section -->
<div class="section">
  <h3>💬 AI Chat</h3>

  <!-- Start Chat -->
  <div class="form-card">
    <button @click="startChat" class="btn-add">Start New Chat</button>
    <p v-if="chatSessionId">Session ID: {{ chatSessionId }}</p>
  </div>

  <!-- Chat Messages -->
  <div class="data-card" v-if="chatMessages.length > 0">
    <h4>Conversation</h4>
    <div class="chat-log">
      <div v-for="msg in chatMessages" :key="msg.id" :class="['chat-message', msg.type]">
        <strong>{{ msg.type === 'user' ? 'You' : 'AI' }}:</strong> {{ msg.text }}
      </div>
    </div>

    <!-- Answer Input -->
    <div class="form-row">
      <input v-model="chatInput" type="text" placeholder="Type your answer..." @keyup.enter="sendChat" />
      <button @click="sendChat" class="btn-add">Send</button>
    </div>
  </div>

  <div v-else class="empty">
    No chat started yet.
  </div>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// Users
const users = ref([])
const usersLoading = ref(false)
const newUser = ref({ username: '', email: '', password: '' })

// Medicines
const medicines = ref([])
const medicinesLoading = ref(false)
const newMedicine = ref({ medicineName: '', medicineType: '', medicineQuantity: 0 })

// Orders
const orders = ref([])
const ordersLoading = ref(false)
const newOrder = ref({ 
  userId: '', 
  medicineId: '', 
  quantity: 1, 
  orderType: '', 
  useAi: false 
})

// Chat
const chatSessionId = ref('')
const chatMessages = ref([])
const chatInput = ref('')



// Status
const statusMessage = ref('')
const statusType = ref('success')

const showStatus = (message, type = 'success') => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}

// Users API
const loadUsers = async () => {
  usersLoading.value = true
  try {
    const response = await axios.get('/ai-sihat/user')
    users.value = response.data
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load users', 'error')
  } finally {
    usersLoading.value = false
  }
}

const addUser = async () => {
  try {
    await axios.post('/ai-sihat/user', newUser.value)
    showStatus('✅ User added successfully!', 'success')
    newUser.value = { username: '', email: '', password: '' }
    await loadUsers()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to add user', 'error')
  }
}

const deleteUser = async (id) => {
  if (!confirm('Delete this user? This will also delete all their orders.')) return
  try {
    await axios.post('/ai-sihat/user/delete', { id })
    showStatus('✅ User deleted successfully!', 'success')
    await loadUsers()
    await loadOrders() // Refresh orders since they cascade delete
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to delete user', 'error')
  }
}

// Medicines API
const loadMedicines = async () => {
  medicinesLoading.value = true
  try {
    const response = await axios.get('/ai-sihat/medicines')
    medicines.value = response.data
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load medicines', 'error')
  } finally {
    medicinesLoading.value = false
  }
}

const addMedicine = async () => {
  try {
    await axios.post('/ai-sihat/medicines', newMedicine.value)
    showStatus('✅ Medicine added successfully!', 'success')
    newMedicine.value = { medicineName: '', medicineType: '', medicineQuantity: 0 }
    await loadMedicines()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to add medicine', 'error')
  }
}

const deleteMedicine = async (id) => {
  if (!confirm('Delete this medicine?')) return
  try {
    await axios.delete(`/ai-sihat/medicines/${id}`)
    showStatus('✅ Medicine deleted successfully!', 'success')
    await loadMedicines()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to delete medicine', 'error')
  }
}

// Orders API
const loadOrders = async () => {
  ordersLoading.value = true
  try {
    const response = await axios.get('/ai-sihat/order')
    orders.value = response.data
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load orders', 'error')
  } finally {
    ordersLoading.value = false
  }
}


// Chat API
// Start a new chat session
const startChat = async () => {
  try {
    const response = await axios.post('/ai-sihat/chat/start')
    chatSessionId.value = response.data.sessionId
    chatMessages.value = []
    chatMessages.value.push({
      id: Date.now(),
      type: 'ai',
      text: response.data.currentQuestion?.prompt || 'Chat started!'
    })
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to start chat', 'error')
  }
}

// Send answer and get next question
const sendChat = async () => {
  if (!chatSessionId.value || !chatInput.value.trim()) return

  const userAnswer = chatInput.value
  chatMessages.value.push({
    id: Date.now(),
    type: 'user',
    text: userAnswer
  })
  chatInput.value = ''

  try {
    const response = await axios.post('/ai-sihat/chat/ask', {
      sessionId: chatSessionId.value,
      answer: userAnswer
    })

    // Add AI response
    const nextQ = response.data.nextQuestion
    if (nextQ) {
      chatMessages.value.push({
        id: Date.now() + 1,
        type: 'ai',
        text: nextQ.prompt
      })
    } else {
      chatMessages.value.push({
        id: Date.now() + 1,
        type: 'ai',
        text: '✅ Chat complete! You can check recommendations.'
      })
    }
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to send chat answer', 'error')
  }
}

const addOrder = async () => {
  try {
    await axios.post('/ai-sihat/order', newOrder.value)
    showStatus('✅ Order created successfully!', 'success')
    newOrder.value = { userId: '', medicineId: '', quantity: 1, orderType: '', useAi: false }
    await loadOrders()
    await loadUsers() // Refresh to see updated points
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to create order', 'error')
  }
}

const deleteOrder = async (id) => {
  if (!confirm('Delete this order?')) return
  try {
    await axios.delete(`/ai-sihat/order/${id}`)
    showStatus('✅ Order deleted successfully!', 'success')
    await loadOrders()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to delete order', 'error')
  }
}

// Load all data on mount
onMounted(async () => {
  await Promise.all([loadUsers(), loadMedicines(), loadOrders()])
})
</script>

<style scoped>
.db-manager {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

h3 {
  color: #2c3e50;
  margin: 2rem 0 1rem 0;
  font-size: 1.5rem;
}

h4 {
  color: #374151;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.section {
  margin-bottom: 3rem;
}

.form-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

.data-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.form-row input,
.form-row select {
  flex: 1;
  min-width: 150px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.btn-add {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
  transition: background-color 0.3s;
}

.btn-add:hover {
  background-color: #059669;
}

.btn-refresh {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.btn-refresh:hover {
  background-color: #2563eb;
}

.btn-delete {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.3s;
}

.btn-delete:hover {
  background-color: #dc2626;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background-color: #f9fafb;
}

th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

tbody tr:hover {
  background-color: #f9fafb;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
}

.status-pending {
  background-color: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-completed {
  background-color: #d1fae5;
  color: #065f46;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-cancelled {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.status-message.success {
  background-color: #d1fae5;
  color: #065f46;
  border: 2px solid #10b981;
}

.status-message.error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 2px solid #ef4444;
}

.chat-log {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  background: #f9fafb;
}

.chat-message {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.chat-message.user {
  background-color: #d1fae5;
  text-align: right;
}

.chat-message.ai {
  background-color: #f3f4f6;
  text-align: left;
}


@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
  
  .form-row input,
  .form-row select {
    width: 100%;
  }
}
</style>
