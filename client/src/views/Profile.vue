<template>
  <div class="profile-page">
    <div class="card">
      <h2>My Profile</h2>

      <!-- Display Mode -->
      <div v-if="!isEditing && user" class="profile-details">
        <div class="detail-item">
          <label>Name:</label>
          <span>{{ user.username }}</span>
        </div>
        <div class="detail-item">
          <label>Email:</label>
          <span>{{ user.email }}</span>
        </div>
        <div class="detail-item">
          <label>Role:</label>
          <span class="role">{{ user.role }}</span>
        </div>
        <div class="detail-item">
          <label>User ID:</label>
          <span>{{ user.userId ? (user.userId.substring ? user.userId.substring(0, 12) + '...' : user.userId) : '—' }}</span>
        </div>
        <div class="detail-item">
          <label>Points:</label>
          <span>{{ user.points ?? 0 }}</span>
        </div>
        <div class="detail-item">
          <label>Created:</label>
          <span>{{ formatDate(user.createdAt) }}</span>
        </div>
        <div class="detail-item">
          <label>Updated:</label>
          <span>{{ formatDate(user.updatedAt) }}</span>
        </div>
        <div class="profile-actions">
          <button class="btn" @click="editProfile">Edit Profile</button>
          <button class="btn primary" @click="logout">Logout</button>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-if="isEditing && editableUser" class="profile-edit">
        <div class="form-group">
          <label for="username">Name:</label>
          <input type="text" id="username" v-model="editableUser.username" />
        </div>
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" v-model="editableUser.email" />
        </div>
        <div class="form-group">
          <label for="newPassword">New Password (optional):</label>
          <input type="password" id="newPassword" v-model="editableUser.newPassword" placeholder="Leave blank to keep current password" />
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm Password:</label>
          <input type="password" id="confirmPassword" v-model="editableUser.confirmPassword" placeholder="Re-enter new password" />
        </div>
        <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
        <div class="profile-actions">
          <button class="btn" @click="cancelEdit">Cancel</button>
          <button class="btn primary" @click="saveProfile" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
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
import { computed } from 'vue';

const router = useRouter();
const user = ref(null);
const isEditing = ref(false);
const editableUser = ref(null);
const saving = ref(false);
const passwordError = ref('');

onMounted(async () => {
  try {
    // The app stores the full user object under `user` at login
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      user.value = parsed;

      // If we have a userId, try to refresh from server for latest data
      if (parsed.userId) {
        try {
          const res = await fetch(`http://localhost:3000/ai-sihat/user/${parsed.userId}`);
          if (res.ok) {
            user.value = await res.json();
          }
        } catch (e) {
          // refresh failed, keep local copy
          console.warn('Could not refresh user from server', e);
        }
      }
    } else {
      // Fallback: if `userId` was stored separately (older clients)
      const userId = localStorage.getItem('userId');
      if (userId) {
        const res = await fetch(`http://localhost:3000/ai-sihat/user/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch user');
        user.value = await res.json();
        // Save to localStorage for future use
        localStorage.setItem('user', JSON.stringify(user.value));
      }
    }
  } catch (err) {
    console.error(err);
    user.value = null;
  }
});

function formatDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return d.toLocaleString();
  } catch (e) {
    return String(val);
  }
}


function editProfile() {
  // Create a deep copy for editing to avoid mutating the original object
  editableUser.value = JSON.parse(JSON.stringify(user.value));
  editableUser.value.newPassword = '';
  editableUser.value.confirmPassword = '';
  passwordError.value = '';
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editableUser.value = null;
}

async function saveProfile() {
  if (!editableUser.value || !user.value) return;
  
  // Validate passwords if provided
  passwordError.value = '';
  if (editableUser.value.newPassword || editableUser.value.confirmPassword) {
    if (editableUser.value.newPassword !== editableUser.value.confirmPassword) {
      passwordError.value = 'Passwords do not match';
      return;
    }
    if (editableUser.value.newPassword.length < 6) {
      passwordError.value = 'Password must be at least 6 characters';
      return;
    }
  }
  
  saving.value = true;
  try {
    const payload = {
      username: editableUser.value.username,
      email: editableUser.value.email
    };
    
    if (editableUser.value.newPassword) {
      payload.password = editableUser.value.newPassword;
    }
    
    const res = await fetch(`http://localhost:3000/ai-sihat/user/${user.value.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update profile');
    }
    
    const updatedUser = await res.json();
    user.value = updatedUser;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('userName', updatedUser.username);
    localStorage.setItem('userEmail', updatedUser.email);
    
    isEditing.value = false;
    editableUser.value = null;
    alert('Profile updated successfully!');
  } catch (err) {
    console.error('Save profile error:', err);
    passwordError.value = err.message || 'Failed to save profile';
  } finally {
    saving.value = false;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-text {
  color: #e74c3c;
  font-size: 0.9rem;
  margin: -1rem 0 1rem 0;
}

/* Adjusting logout button color */
.profile-details .btn.primary {
    background: #e74c3c;
    border-color: #e74c3c;
}
</style>
