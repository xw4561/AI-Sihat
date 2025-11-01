<template>
  <div class="profile-page">
    <div class="card">
      <h2>My Profile</h2>

      <!-- Display Mode -->
      <div v-if="!isEditing && user" class="profile-details">
        <div class="detail-item">
          <label>Name:</label>
          <span>{{ user.name }}</span>
        </div>
        <div class="detail-item">
          <label>Email:</label>
          <span>{{ user.email }}</span>
        </div>
        <div class="detail-item">
          <label>Role:</label>
          <span class="role">{{ user.role }}</span>
        </div>
        <div class="profile-actions">
          <button class="btn" @click="editProfile">Edit Profile</button>
          <button class="btn primary" @click="logout">Logout</button>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-if="isEditing && editableUser" class="profile-edit">
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" v-model="editableUser.name" />
        </div>
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" v-model="editableUser.email" />
        </div>
        <div class="profile-actions">
          <button class="btn" @click="cancelEdit">Cancel</button>
          <button class="btn primary" @click="saveProfile">Save</button>
        </div>
      </div>

      <div v-if="!user">
        <p>Could not load user details.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);
const isEditing = ref(false);
const editableUser = ref(null);

onMounted(() => {
  const name = localStorage.getItem('userName');
  const email = localStorage.getItem('userEmail');
  const role = localStorage.getItem('userRole');

  if (name && role) {
    user.value = {
      name,
      email: email || 'No email provided',
      role,
    };
  }
});

function editProfile() {
  // Create a deep copy for editing to avoid mutating the original object
  editableUser.value = JSON.parse(JSON.stringify(user.value));
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editableUser.value = null;
}

function saveProfile() {
  if (editableUser.value) {
    // Update the main user object
    user.value.name = editableUser.value.name;
    user.value.email = editableUser.value.email;

    // Update localStorage
    localStorage.setItem('userName', editableUser.value.name);
    localStorage.setItem('userEmail', editableUser.value.email);

    // Exit edit mode
    isEditing.value = false;
    editableUser.value = null;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
  router.push('/login');
}
</script>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.card {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #2c3e50;
}

.profile-details, .profile-edit {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-item, .form-group {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
}

.detail-item label, .form-group label {
  font-weight: 600;
  color: #555;
  width: 100px;
}

.detail-item span {
  color: #333;
}

.detail-item .role {
  text-transform: capitalize;
  font-weight: bold;
  color: #42b983;
}

.form-group input {
  flex-grow: 1;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2.5rem;
  border-top: 1px solid #eee;
  padding-top: 1.5rem;
}

.btn {
  background: #f0f0f0;
  border: 1px solid #ddd;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn.primary {
  background: #42b983;
  color: #fff;
  border-color: #42b983;
}

/* Adjusting logout button color */
.profile-details .btn.primary {
    background: #e74c3c;
    border-color: #e74c3c;
}
</style>
