<template>
  <div class="profile-page">
    <div class="card">
      <h2>My Profile</h2>
      <div v-if="user" class="profile-details">
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
      </div>
      <div v-else>
        <p>Could not load user details.</p>
      </div>
      <div class="profile-actions">
        <button class="btn" @click="editProfile">Edit Profile</button>
        <button class="btn primary" @click="logout">Logout</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);

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
  alert('Editing profile is not yet implemented.');
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

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
}

.detail-item label {
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
  background: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
}
</style>
