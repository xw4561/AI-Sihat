<template>
  <div class="branch-selector-overlay">
    <div class="branch-selector-modal">
      <button v-if="allowCancel" class="btn-close" @click="onCancel" title="Cancel">×</button>
      <h2>Please Select Your Pharmacy Branch</h2>
      <p>Your selection will apply to both shopping and AI chat.</p>
      
      <div v-if="isLoading" class="loader">Loading...</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div class="branch-list">
        <div 
          v-for="branch in branches" 
          :key="branch.branchId" 
          class="branch-card"
          @click="onSelectBranch(branch)"
        >
          <h3>{{ branch.name }}</h3>
          <p>{{ branch.address }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

defineProps({
  allowCancel: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['branch-selected', 'close']);
const branches = ref([]);
const isLoading = ref(false);
const error = ref(null);

function onCancel() {
  emit('close');
}

onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await axios.get('/ai-sihat/pharmacy');
    branches.value = response.data;
  } catch (e) {
    console.error("Failed to fetch branches:", e);
    error.value = "Could not load pharmacy branches. Please try refreshing.";
  } finally {
    isLoading.value = false;
  }
});

async function onSelectBranch(branch) {
  const userStr = localStorage.getItem('user');
  
  // Token is checked by the interceptor, but we still need the user.
  if (!userStr) {
    error.value = "Could not find user data. Please log out and log in again.";
    return;
  }
  
  let user;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
     error.value = "User data is corrupted. Please log out and log in again.";
     return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    // 2. Save selection to backend. Token is sent automatically by interceptor
    await axios.put(
      `/ai-sihat/user/${user.userId}/select-branch`,
      { branchId: branch.branchId }
    );
    
    // 3. Save branch to localStorage
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
    
    // 4. Update the user object in localStorage
    user.lastSelectedBranchId = branch.branchId;
    localStorage.setItem('user', JSON.stringify(user));
    
    // 5. Tell the parent page the selection is done
    emit('branch-selected', branch);

  } catch (e) {
    console.error("Failed to select branch:", e);
    error.value = "Could not save your branch selection. Please try again.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.branch-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.branch-selector-modal {
  position: relative;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.btn-close {
  position: absolute;
  top: 10px; /* Adjust as needed */
  left: 7px; /* Adjust as needed */
  background: none; /* No background by default */
  border: none;
  font-size: 2.2rem; /* Made it bigger */
  line-height: 1; /* Ensures proper vertical alignment */
  color: #888; /* Softer default color */
  cursor: pointer;
  padding: 0 0.5rem; /* Only horizontal padding for better click area */
  transition: all 0.2s ease-in-out; /* Smooth transitions for visual feedback */
  border-radius: 50%; /* Make it round */
  width: 40px; /* Give it a fixed size */
  height: 40px; /* Give it a fixed size */
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333; /* Darker on hover */
  background-color: #f0f0f0; /* Light background on hover */
}

h2 {
  margin-top: 0;
  text-align: center;
}
p {
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.branch-list {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.branch-card {
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.branch-card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0,123,255,0.2);
}

.branch-card h3 {
  margin: 0 0 0.5rem 0;
  color: #007bff;
}

.branch-card p {
  margin: 0;
  text-align: left;
  font-size: 0.85rem;
  color: #444;
}

.loader, .error {
  text-align: center;
  padding: 2rem;
  font-weight: bold;
}
.error {
  color: red;
}
</style>