<template>
  <div class="db-manager">
    <div class="header-container">
      <!-- Back arrow / Home link -->
      <button @click="$router.push('/admin')" class="back-arrow" aria-label="Go back">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h2>Database Manager</h2>
        <p class="subtitle"></p>
      </div>
    </div>

    <!-- USERS SECTION -->
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('users')">
          <h3>👤 Users</h3>
          <button class="collapse-btn">{{ collapsedSections.users ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.users" class="section-body">
          <h4>Add New User</h4>
          <form @submit.prevent="addUser" class="form-row">
            <input v-model="newUser.username" type="text" placeholder="Username" required />
            <input v-model="newUser.email" type="email" placeholder="Email" required />
            <input v-model="newUser.password" type="password" placeholder="Password" required />
            <select v-model="newUser.role" required>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" class="btn-add">Add User</button>
          </form>
          <div class="table-container">
            <div class="card-header">
              <h4>All Users</h4>
              <button @click="loadUsers" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="usersLoading" class="loading">Loading users…</div>
            <div v-else-if="users.length === 0" class="empty">No users found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.userId">
                    <td data-label="ID">{{ user.userId.substring(0, 8) }}…</td>
                    <td data-label="Username">{{ user.username }}</td>
                    <td data-label="Email">{{ user.email }}</td>
                    <td data-label="Role">
                      <span :class="'role-badge role-' + user.role.toLowerCase()">
                        {{ user.role }}
                      </span>
                    </td>
                    <td data-label="Points">{{ user.points }}</td>
                    <td data-label="Actions">
                      <button @click="deleteUser(user.userId)" class="btn-delete">
                        Delete
                      </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- === NEW PHARMACY BRANCH SECTION === -->
    <div class="section">
      <h3>🏥 Pharmacy Branches</h3>

      <!-- Add Branch Form -->
      <div class="form-card">
        <h4>Add New Branch (creates Pharmacist account)</h4>
        <form @submit.prevent="addBranch">
          <div class="form-row" style="flex-wrap: wrap;">
            <!-- Branch Details -->
            <input v-model="newBranch.name" type="text" placeholder="Branch Name" required />
            <input v-model="newBranch.address" type="text" placeholder="Branch Address" required style="flex-basis: 300px;" />
            <input v-model="newBranch.phone" type="text" placeholder="Branch Phone" />
          </div>
          <div class="form-row" style="flex-wrap: wrap; margin-top: 10px;">
            <!-- Login Details -->
            <input v-model="newBranch.username" type="text" placeholder="Pharmacy Name" required />
            <input v-model="newBranch.email" type="email" placeholder="Pharmacy Login Email" required />
            <input v-model="newBranch.password" type="password" placeholder="Pharmacy Password" required />
            <button type="submit" class="btn-add">Add Branch</button>
          </div>
        </form>
      </div>

      <!-- Branches List -->
      <div class="data-card">
        <div class="card-header">
          <h4>All Branches</h4>
          <button @click="loadBranches" class="btn-refresh">🔄 Refresh</button>
        </div>
        <div v-if="branchesLoading" class="loading">Loading branches...</div>
        <div v-else-if="branches.length === 0" class="empty">No branches found</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Branch ID</th>
                <th>Branch Name</th>
                <th>Address</th>
              <th>Phone</th>
                <th>Pharmacist Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="branch in branches" :key="branch.branchId">
                <td>{{ branch.branchId.substring(0, 8) }}...</td>
                <td>{{ branch.name }}</td>
                <td>{{ branch.address }}</td>
                <td>{{ branch.phone }}</td>
                <td>{{ branch.user?.email }} ({{ branch.user?.username }})</td>
                <td>
                  <button @click="deleteBranch(branch.branchId)" class="btn-delete">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MEDICINES SECTION -->
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('medicines')">
          <h3>💊 Medicines</h3>
          <button class="collapse-btn">{{ collapsedSections.medicines ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.medicines" class="section-body">
          <h4>Add New Medicine</h4>
          <form @submit.prevent="addMedicine" class="form-row">
            <input
              v-model="newMedicine.medicineName"
              type="text"
              placeholder="Medicine Name"
              required
            />
            <input
              v-model="newMedicine.medicineType"
              type="text"
              placeholder="Type"
              required
            />
            <input
              v-model.number="newMedicine.medicineQuantity"
              type="number"
              placeholder="Quantity"
              required
              min="0"
            />
            <input
              v-model.number="newMedicine.price"
              type="number"
              placeholder="Price (e.g., 12.50)"
              required
              min="0"
              step="0.01"
            />
            <input
              v-model="newMedicine.imageUrl"
              type="text"
              placeholder="Image URL (e.g., https://…)"
              required
            />
            <button type="submit" class="btn-add">Add Medicine</button>
          </form>
          <div class="table-container">
            <div class="card-header">
              <h4>All Medicines</h4>
              <button @click="loadMedicines" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="medicinesLoading" class="loading">Loading medicines…</div>
            <div v-else-if="medicines.length === 0" class="empty">No medicines found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Image</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="medicine in medicines" :key="medicine.medicineId">
                    <td data-label="ID">{{ medicine.medicineId.substring(0, 8) }}…</td>
                    <td data-label="Name">{{ medicine.medicineName }}</td>
                    <td data-label="Type">{{ medicine.medicineType }}</td>
                    <td data-label="Quantity">{{ medicine.medicineQuantity }}</td>
                    <td data-label="Price">
                      {{
                        medicine.price
                          ? 'RM ' + parseFloat(medicine.price).toFixed(2)
                          : 'N/A'
                      }}
                    </td>
                    <td data-label="Image">
                      <img
                        v-if="medicine.imageUrl"
                        :src="medicine.imageUrl"
                        :alt="medicine.medicineName"
                        class="table-image-preview"
                      />
                      <span v-else>No Image</span>
                    </td>
                    <td data-label="Actions">
                      <button @click="deleteMedicine(medicine.medicineId)" class="btn-delete">
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ORDERS SECTION -->
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('orders')">
          <h3>📦 Orders</h3>
          <button class="collapse-btn">{{ collapsedSections.orders ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.orders" class="section-body">
          <h4>Create New Order</h4>
          <form @submit.prevent="addOrder" class="form-row">
            <select v-model="newOrder.userId" required>
              <option value="" disabled>Select User</option>
              <option v-for="user in users" :key="user.userId" :value="user.userId">
                {{ user.username }} (ID: {{ user.userId }})
              </option>
            </select>
            <select v-model="newOrder.medicineId" required>
              <option value="" disabled>Select Medicine</option>
              <option
                v-for="medicine in medicines"
                :key="medicine.medicineId"
                :value="medicine.medicineId"
              >
                {{ medicine.medicineName }} (ID: {{ medicine.medicineId }})
              </option>
            </select>
            <input
              v-model.number="newOrder.quantity"
              type="number"
              placeholder="Quantity"
              required
              min="1"
            />
            <select v-model="newOrder.orderType" required>
              <option value="" disabled>Order Type</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
            <label class="checkbox-label">
              <input v-model="newOrder.useAi" type="checkbox" />
              Use AI (2× points)
            </label>
            <button type="submit" class="btn-add">Create Order</button>
          </form>
          <div class="table-container">
            <div class="card-header">
              <h4>All Orders</h4>
              <button @click="loadOrders" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="ordersLoading" class="loading">Loading orders…</div>
            <div v-else-if="orders.length === 0" class="empty">No orders found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
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
                    <td data-label="ID">{{ order.orderId.substring(0, 8) }}…</td>
                    <td data-label="User ID">{{ order.userId.substring(0, 8) }}…</td>
                    <td data-label="Medicine ID">{{ order.medicineId.substring(0, 8) }}…</td>
                    <td data-label="Quantity">{{ order.quantity }}</td>
                    <td data-label="Type">{{ order.orderType }}</td>
                    <td data-label="AI Used">{{ order.useAi ? '✅' : '❌' }}</td>
                    <td data-label="Points">{{ order.totalPoints }}</td>
                    <td data-label="Status">
                      <span :class="'status-' + order.status">
                        {{ order.status }}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <button @click="deleteOrder(order.orderId)" class="btn-delete">
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CHATS SECTION -->
    <!-- ORDER ITEMS SECTION -->
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('orderItems')">
          <h3>📦 Order Items</h3>
          <button class="collapse-btn">{{ collapsedSections.orderItems ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.orderItems" class="section-body">
          <div class="table-container">
            <div class="card-header">
              <h4>Order Items</h4>
              <button @click="loadOrderItems" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="orderItemsLoading" class="loading">Loading order items…</div>
            <div v-else-if="orderItems.length === 0" class="empty">No order items found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Order ID</th>
                    <th>Medicine</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="oi in orderItems" :key="oi.orderItemId">
                    <td data-label="ID">{{ oi.orderItemId?.substring(0,8) }}</td>
                    <td data-label="Order">{{ oi.orderId?.substring(0,8) }}</td>
                    <td data-label="Medicine">{{ oi.medicine?.medicineName || oi.medicineId }}</td>
                    <td data-label="Quantity">{{ oi.quantity }}</td>
                    <td data-label="Price">{{ oi.price ? ('RM ' + parseFloat(oi.price).toFixed(2)) : '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PRESCRIPTIONS SECTION -->
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('prescriptions')">
          <h3>🧾 Prescriptions</h3>
          <button class="collapse-btn">{{ collapsedSections.prescriptions ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.prescriptions" class="section-body">
          <div class="table-container">
            <div class="card-header">
              <h4>Prescriptions</h4>
              <button @click="loadPrescriptions" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="prescriptionsLoading" class="loading">Loading prescriptions…</div>
            <div v-else-if="prescriptions.length === 0" class="empty">No prescriptions found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Chat Summary</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in prescriptions" :key="p.prescriptionId">
                    <td data-label="ID">{{ p.prescriptionId?.substring(0,8) || '-' }}</td>
                    <td data-label="User">{{ p.user?.username || p.customerName || 'Unknown' }}</td>
                    <td data-label="Chat Summary">{{ p.chat?.summary ? (String(p.chat.summary).substring(0,60) + '…') : '-' }}</td>
                    <td data-label="Status"><span :class="prescriptionStatusClass(p.status)">{{ formatStatus(p.status) }}</span></td>
                    <td data-label="Created">{{ formatDate(p.createdAt) }}</td>
                    <td data-label="Actions">
                      <button @click="viewPrescriptionDetails(p.prescriptionId || p.prescription_id || p.id)" class="btn-view">View</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PRESCRIPTION ITEMS SECTION -->
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('prescriptionItems')">
          <h3>🧾 Prescription Items</h3>
          <button class="collapse-btn">{{ collapsedSections.prescriptionItems ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.prescriptionItems" class="section-body">
          <div class="table-container">
            <div class="card-header">
              <h4>All Prescription Items</h4>
              <button @click="loadPrescriptionItems" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="prescriptionItemsLoading" class="loading">Loading prescription items…</div>
            <div v-else-if="prescriptionItems.length === 0" class="empty">No prescription items found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Prescription ID</th>
                    <th>Medicine</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="pi in prescriptionItems" :key="pi.prescriptionItemId">
                    <td data-label="ID">{{ pi.prescriptionItemId?.substring(0,8) }}</td>
                    <td data-label="Prescription">{{ pi.prescriptionId?.substring(0,8) }}</td>
                    <td data-label="Medicine">{{ pi.medicine?.medicineName || pi.medicineId }}</td>
                    <td data-label="Quantity">{{ pi.quantity }}</td>
                    <td data-label="Notes">{{ pi.notes || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-card">
        <div class="section-header" @click="toggleSection('chats')">
          <h3>💬 Chat History</h3>
          <button class="collapse-btn">{{ collapsedSections.chats ? '►' : '▼' }}</button>
        </div>
        <div v-show="!collapsedSections.chats" class="section-body">
          <div class="table-container">
            <div class="card-header">
              <h4>All Chat Sessions</h4>
              <button @click="loadChats" class="btn-refresh">🔄 Refresh</button>
            </div>
            <div v-if="chatsLoading" class="loading">Loading chats…</div>
            <div v-else-if="chats.length === 0" class="empty">No chat sessions found</div>
            <div v-else class="table-wrapper">
              <table class="responsive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Summary</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="chat in chats" :key="chat.id">
                    <td data-label="ID">{{ chat.id }}</td>
                    <td data-label="User">
                      {{ chat.userId ? chat.userId.substring(0, 8) + '…' : 'Anonymous' }}
                    </td>
                    <td data-label="Summary">{{ formatChatSummary(chat.summary) }}</td>
                    <td data-label="Created">{{ formatDate(chat.createdAt) }}</td>
                    <td data-label="Actions">
                      <button @click="deleteChat(chat.id)" class="btn-delete">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Chat details removed: chat preview now shows 'summary' from DB and View modal has been removed -->
        </div>
      </div>
    </div>

    <!-- Prescription Details Modal -->
    <div v-if="selectedPrescriptionDetail" class="modal-overlay" @click="selectedPrescriptionDetail = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Prescription #{{ selectedPrescriptionDetail.prescriptionId }}</h3>
          <button @click="selectedPrescriptionDetail = null" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <p><strong>User:</strong> {{ selectedPrescriptionDetail.user?.username || selectedPrescriptionDetail.customerName }}</p>
          <p><strong>Status:</strong> {{ selectedPrescriptionDetail.status }}</p>
          <p><strong>Created:</strong> {{ formatDate(selectedPrescriptionDetail.createdAt) }}</p>
          <h4>Items</h4>
          <div v-if="Array.isArray(selectedPrescriptionDetail.items) && selectedPrescriptionDetail.items.length">
            <ul>
              <li v-for="it in selectedPrescriptionDetail.items" :key="it.prescriptionItemId">
                {{ it.medicine?.medicineName || it.medicineId }} — Qty: {{ it.quantity }} — Notes: {{ it.notes || '-' }}
              </li>
            </ul>
          </div>
          <div v-else>No items</div>
        </div>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrderDetail" class="modal-overlay" @click="selectedOrderDetail = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Order #{{ selectedOrderDetail.orderId }}</h3>
          <button @click="selectedOrderDetail = null" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <p><strong>User ID:</strong> {{ selectedOrderDetail.userId }}</p>
          <p><strong>Status:</strong> {{ selectedOrderDetail.status }}</p>
          <p><strong>Created:</strong> {{ formatDate(selectedOrderDetail.createdAt) }}</p>
          <h4>Items</h4>
          <div v-if="Array.isArray(selectedOrderDetail.items) && selectedOrderDetail.items.length">
            <ul>
              <li v-for="it in selectedOrderDetail.items" :key="it.orderItemId">
                {{ it.medicine?.medicineName || it.medicineId }} — Qty: {{ it.quantity }} — Price: {{ it.price ? ('RM ' + parseFloat(it.price).toFixed(2)) : '-' }}
              </li>
            </ul>
          </div>
          <div v-else>No items</div>
        </div>
      </div>
    </div>

    <!-- STATUS MESSAGE -->
    <div v-if="statusMessage" :class="['status-message', statusType]">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// USERS
const users = ref([])
const usersLoading = ref(false)
const newUser = ref({ username: '', email: '', password: '', role: 'USER' })
const branches = ref([])
const branchesLoading = ref(false)
const newBranch = ref({
  name: '',
  address: '',
  phone: '',
  username: '',
  email: '',
  password: ''
})

// MEDICINES
const medicines = ref([])
const medicinesLoading = ref(false)
const newMedicine = ref({
  medicineName: '',
  medicineType: '',
  medicineQuantity: null,
  price: null,
  imageUrl: '',
})

// ORDERS
const orders = ref([])
const ordersLoading = ref(false)
const newOrder = ref({
  userId: '',
  medicineId: '',
  quantity: 1,
  orderType: '',
  useAi: false,
})

// CHATS
const chats = ref([])
const chatsLoading = ref(false)

// PRESCRIPTIONS & ITEMS
const prescriptions = ref([])
const prescriptionsLoading = ref(false)
const prescriptionItems = ref([])
const prescriptionItemsLoading = ref(false)

// ORDER ITEMS
const orderItems = ref([])
const orderItemsLoading = ref(false)

// Selected details for modals
const selectedPrescriptionDetail = ref(null)
const selectedOrderDetail = ref(null)

// CHAT TESTING (if needed)
const chatSessionId = ref('')
const chatMessages = ref([])
const chatInput = ref('')

// STATUS MESSAGES
const statusMessage = ref('')
const statusType = ref('success')

// UTILITY: show status
const showStatus = (message, type = 'success') => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 8080)
}

// USERS API
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
    // register new user via auth
    await axios.post('/api/auth/register', {
      username: newUser.value.username,
      email: newUser.value.email,
      password: newUser.value.password,
    })
    // if different role, update using admin route
    if (newUser.value.role !== 'USER') {
      const allUsers = await axios.get('/ai-sihat/user')
      const createdUser = allUsers.data.find((u) => u.email === newUser.value.email)
      if (createdUser) {
        await axios.put('/api/auth/change-role', {
          adminEmail: 'admin@gmail.com',
          adminPassword: 'admin@123',
          targetEmail: newUser.value.email,
          newRole: newUser.value.role,
        })
      }
    }
    showStatus('✅ User added successfully!', 'success')
    newUser.value = { username: '', email: '', password: '', role: 'USER' }
    await loadUsers()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to add user', 'error')
  }
}

const deleteUser = async (id) => {
  // Find user to check role
  const user = users.value.find(u => u.userId === id);
  if (user && user.role === 'PHARMACIST') {
    alert('PHARMACIST accounts must be deleted from the "Pharmacy Branches" section.');
    return;
  }
  
  if (!confirm('Delete this user? This will also delete all their orders and chats.')) return
  try {
    await axios.post('/ai-sihat/user/delete', { id })
    showStatus('✅ User deleted successfully!', 'success')
    await loadUsers()
    await loadOrders()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to delete user', 'error')
  }
}

// BRANCH FUNCTIONS
const loadBranches = async () => {
  branchesLoading.value = true
  try {
    const response = await axios.get('/ai-sihat/pharmacy')
    branches.value = response.data
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load branches', 'error')
  } finally {
    branchesLoading.value = false
  }
}

const addBranch = async () => {
  try {
    await axios.post('/ai-sihat/pharmacy', newBranch.value) 
    showStatus('✅ Pharmacy Branch added successfully!', 'success')
    newBranch.value = { name: '', address: '', phone: '', username: '', email: '', password: '' }
    await loadBranches()
    await loadUsers() // Refresh user list to see new pharmacist
  } catch (err) {
    const errorMsg = err.response?.data?.error || 'Failed to add branch'
    showStatus(errorMsg, 'error')
  }
}

const deleteBranch = async (id) => {
  if (!confirm('Delete this branch? This will also delete the associated pharmacist account.')) return
  try {
    await axios.delete(`/ai-sihat/pharmacy/${id}`)
    showStatus('✅ Branch deleted successfully!', 'success')
    await loadBranches()
    await loadUsers() // Refresh user list
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to delete branch', 'error')
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
    newMedicine.value = {
      medicineName: '',
      medicineType: '',
      medicineQuantity: null,
      price: null,
      imageUrl: '',
    }
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

// ORDERS API
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

const addOrder = async () => {
  try {
    await axios.post('/ai-sihat/order', newOrder.value)
    showStatus('✅ Order created successfully!', 'success')
    newOrder.value = {
      userId: '',
      medicineId: '',
      quantity: 1,
      orderType: '',
      useAi: false,
    }
    await loadOrders()
    await loadUsers() // refresh user points
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

// CHATS API
const loadChats = async () => {
  chatsLoading.value = true
  try {
    const response = await axios.get('/ai-sihat/chats')
    chats.value = response.data
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load chats', 'error')
  } finally {
    chatsLoading.value = false
  }
}

const deleteChat = async (id) => {
  if (!confirm('Delete this chat session?')) return
  try {
    await axios.delete(`/ai-sihat/chats/${id}`)
    showStatus('✅ Chat deleted successfully!', 'success')
    await loadChats()
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to delete chat', 'error')
  }
}

// Chat summary display helper (shows first 60 chars of JSON or string)
const formatChatSummary = (summary) => {
  if (!summary) return '-'
  try {
    if (typeof summary === 'string') {
      return summary.length > 60 ? summary.substring(0, 60) + '…' : summary
    }
    const s = JSON.stringify(summary)
    return s.length > 60 ? s.substring(0, 60) + '…' : s
  } catch (e) {
    return '-'
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Format status label for display (e.g., 'pending' -> 'Pending')
const formatStatus = (s) => {
  if (!s) return '-'
  return String(s).charAt(0).toUpperCase() + String(s).slice(1)
}

// Map prescription status to a CSS class used for badges
const prescriptionStatusClass = (s) => {
  if (!s) return ''
  if (s === 'pending') return 'status-pending'
  if (s === 'approved') return 'status-completed'
  if (s === 'rejected' || s === 'rejected') return 'status-cancelled'
  return 'status-' + String(s)
}

// PRESCRIPTIONS API (list all prescriptions)
const loadPrescriptions = async () => {
  prescriptionsLoading.value = true
  try {
    const resp = await axios.get('/ai-sihat/prescriptions')
    prescriptions.value = resp.data || []
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load prescriptions', 'error')
  } finally {
    prescriptionsLoading.value = false
  }
}

const fetchPrescriptionById = async (id) => {
  try {
    const resp = await axios.get(`/ai-sihat/prescriptions/${id}`)
    return resp.data
  } catch (err) {
    return null
  }
}

const viewPrescriptionDetails = async (id) => {
  if (!id) return showStatus('Invalid prescription id', 'error')
  const pres = await fetchPrescriptionById(id)
  if (pres) selectedPrescriptionDetail.value = pres
  else showStatus('Failed to fetch prescription details', 'error')
}

// PRESCRIPTION ITEMS: load by fetching all prescriptions and flattening their items
const loadPrescriptionItems = async () => {
  prescriptionItemsLoading.value = true
  try {
    const resp = await axios.get('/ai-sihat/prescriptions')
    const presList = resp.data || []
    const items = []
    presList.forEach(p => {
      if (Array.isArray(p.items)) {
        p.items.forEach(it => items.push({ ...it, prescriptionId: p.prescriptionId }))
      }
    })
    prescriptionItems.value = items
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to load prescription items', 'error')
  } finally {
    prescriptionItemsLoading.value = false
  }
}

// ORDER ITEMS: aggregate by fetching order details (limited)
const loadOrderItems = async () => {
  orderItemsLoading.value = true
  try {
    const ordersResp = (await axios.get('/ai-sihat/order')).data || []
    const list = ordersResp.slice(0, 40)
    const items = []
    await Promise.all(list.map(async (o) => {
      try {
        const detail = (await axios.get(`/ai-sihat/order/${o.orderId}`)).data
        if (detail && Array.isArray(detail.items)) {
          detail.items.forEach(it => items.push({ ...it, orderId: o.orderId }))
        }
      } catch (e) {
        // skip
      }
    }))
    orderItems.value = items
  } catch (err) {
    showStatus('Failed to load order items', 'error')
  } finally {
    orderItemsLoading.value = false
  }
}

const viewOrderDetails = async (id) => {
  if (!id) return showStatus('Invalid order id', 'error')
  try {
    const resp = await axios.get(`/ai-sihat/order/${id}`)
    selectedOrderDetail.value = resp.data
  } catch (err) {
    showStatus('Failed to fetch order details', 'error')
  }
}

// CHAT TESTING (optional, not used in UI currently)
const startChat = async () => {
  try {
    const response = await axios.post('/ai-sihat/chat/start')
    chatSessionId.value = response.data.sessionId
    chatMessages.value = []
    chatMessages.value.push({
      id: Date.now(),
      type: 'ai',
      text: response.data.currentQuestion?.prompt || 'Chat started!',
    })
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to start chat', 'error')
  }
}

const sendChat = async () => {
  if (!chatSessionId.value || !chatInput.value.trim()) return
  const userAnswer = chatInput.value
  chatMessages.value.push({ id: Date.now(), type: 'user', text: userAnswer })
  chatInput.value = ''
  try {
    const response = await axios.post('/ai-sihat/chat/ask', {
      sessionId: chatSessionId.value,
      answer: userAnswer,
    })
    const nextQ = response.data.nextQuestion
    if (nextQ) {
      chatMessages.value.push({
        id: Date.now() + 1,
        type: 'ai',
        text: nextQ.prompt,
      })
    } else {
      chatMessages.value.push({
        id: Date.now() + 1,
        type: 'ai',
        text: '✅ Chat complete! You can check recommendations.',
      })
    }
  } catch (err) {
    showStatus(err.response?.data?.error || 'Failed to send chat answer', 'error')
  }
}

// INITIAL LOAD
onMounted(async () => {
  await Promise.all([
    loadUsers(),
    loadMedicines(),
    loadOrders(),
    loadChats(),
    loadOrderItems(),
    loadPrescriptions(),
    loadPrescriptionItems(),
  ])
})

// COLLAPSE SECTIONS
const collapsedSections = ref({
  users: false,
  medicines: false,
  orders: false,
  chats: false,
  orderItems: false,
  prescriptions: false,
  prescriptionItems: false,
})

const toggleSection = (key) => {
  collapsedSections.value[key] = !collapsedSections.value[key]
}
</script>

<style scoped>
/* container for the whole page */
.db-manager {
  padding: 1rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

/* header (back arrow + title) */
.header-container {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-arrow {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2c3e50;
  transition: all 0.2s ease;
  border-radius: 8px;
  flex-shrink: 0;
}

.back-arrow:hover {
  background-color: #f3f4f6;
  color: #10b981;
}

h2 {
  color: #2c3e50;
  margin: 0;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
}

/* generic section wrapper */
.section {
  margin-bottom: 3rem;
}

/* card containing header and body (both collapsed and expanded) */
.section-card {
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
}

/* header of section card; acts like a button */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #e5e7eb;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #374151;
}

.section-body {
  padding: 1.5rem;
}

/* table container inside section body */
.table-container {
  margin-top: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* layout for inputs and selects in forms */
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
  box-sizing: border-box;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  margin: 0;
}

/* buttons */
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

.btn-view {
  background-color: #8b5cf6;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-right: 0.5rem;
  transition: background-color 0.3s;
}

.btn-view:hover {
  background-color: #7c3aed;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.btn-close:hover {
  color: #1f2937;
}

/* table styling */
.table-image-preview {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 4px;
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

/* statuses */
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

/* status message */
.status-message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
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

/* role badges */
.role-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.role-admin {
  background-color: #fee2e2;
  color: #991b1b;
}

.role-pharmacist {
  background-color: #dbeafe;
  color: #1e40af;
}

.role-user {
  background-color: #d1fae5;
  color: #065f46;
}

/* recommendation / no recommendation */
.has-recommendation {
  color: #059669;
  font-weight: 600;
}

.no-recommendation {
  color: #9ca3af;
}

/* modal overlay and content */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-body {
  padding: 1.5rem;
}

/* conversation logs */
.chat-details p {
  margin-bottom: 0.75rem;
}

.recommendation-box {
  background-color: #d1fae5;
  border: 1px solid #10b981;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
}

.recommendation-box strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #065f46;
}

.recommendation-box p {
  margin: 0;
  color: #047857;
}

.session-data {
  margin-top: 1.5rem;
}

.session-data strong {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.conversation-log {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.conversation-item {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.conversation-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.question {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.answer {
  color: #4b5563;
  padding-left: 1rem;
}

.json-data {
  background-color: #1f2937;
  color: #10b981;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.875rem;
}

/* animations */
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

/* responsive adjustments for smaller screens */
@media (max-width: 768px) {
  .db-manager {
    padding: 0.5rem;
  }
  .header-container {
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  h2 {
    font-size: 1.5rem;
  }
  .subtitle {
    font-size: 0.875rem;
  }
  .section {
    margin-bottom: 2rem;
  }
  .section-header {
    padding: 1rem;
  }
  .section-body {
    padding: 1rem;
  }
  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }
  .form-row input,
  .form-row select,
  .btn-add,
  .btn-refresh {
    width: 100%;
    min-width: unset;
    box-sizing: border-box;
  }
  /* Hide thead on small screens */
  .responsive-table thead {
    display: none;
  }
  .responsive-table,
  .responsive-table tbody,
  .responsive-table tr,
  .responsive-table td {
    display: block;
    width: 100%;
  }
  .responsive-table tr {
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.75rem;
    background: white;
  }
  .responsive-table tr:hover {
    background-color: #f9fafb;
  }
  .responsive-table td {
    text-align: right;
    padding: 0.5rem 0;
    border: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .responsive-table td::before {
    content: attr(data-label);
    font-weight: 600;
    text-align: left;
    color: #374151;
  }
  .responsive-table td:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .table-image-preview {
    width: 50px;
    height: 50px;
  }
  .card-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  .card-header h4 {
    margin: 0;
  }
  /* modal fits screen better on small devices */
  .modal-content {
    margin: 1rem;
    max-width: calc(100vw - 2rem);
  }
  .modal-header,
  .modal-body {
    padding: 1rem;
  }
  .status-message {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .db-manager {
    padding: 0.5rem;
  }
  .section-card {
    margin: 0 0.5rem 1.25rem;
    width: calc(100% - 1rem);
    max-width: 100%;
    box-sizing: border-box;
  }
  .section-header {
    padding: 1rem;
  }
  .section-body {
    padding: 0.75rem 1rem 1rem;
  }
  .table-container {
    margin-top: 0.75rem;
  }
  .table-wrapper {
    padding-bottom: 0.5rem;
  }
}

/* Additional mobile tweaks to avoid horizontal overflow and improve wrapping */
@media (max-width: 480px) {
  .db-manager {
    max-width: 100%;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
    overflow-x: hidden;
  }

  .section-card {
    margin: 0 0.25rem 1rem;
    width: calc(100% - 0.5rem);
    box-sizing: border-box;
    overflow: hidden;
    border-radius: 6px;
  }

  /* Allow table cells to wrap and avoid creating extra horizontal scroll */
  .responsive-table td {
    white-space: normal;
    word-break: break-word;
  }

  /* give the table some right padding so long content doesn't trigger viewport overflow */
  .table-wrapper {
    padding-right: 0.5rem;
  }

  .table-image-preview {
    max-width: 48px;
    max-height: 48px;
  }
}
</style>