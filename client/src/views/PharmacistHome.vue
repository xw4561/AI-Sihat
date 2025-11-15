<template>
  <div class="pharmacist-home">
    <h2>Hi, {{ pharmacistName }}!</h2>
    <div class="options-container">
      <router-link to="/profile" class="option-box profile-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
        <h3>Profile</h3>
        <p>Manage your account details.</p>
      </router-link>

      <router-link to="/pharmacist/orders" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M19.5 3h-4.5c-0.83 0-1.5 0.67-1.5 1.5s0.67 1.5 1.5 1.5h4.5c0.83 0 1.5-0.67 1.5-1.5s-0.67-1.5-1.5-1.5zm-7.5 0h-4.5c-0.83 0-1.5 0.67-1.5 1.5s0.67 1.5 1.5 1.5h4.5c0.83 0 1.5-0.67 1.5-1.5s-0.67-1.5-1.5-1.5zm-1.5 12h-3c-0.83 0-1.5 0.67-1.5 1.5s0.67 1.5 1.5 1.5h3c0.83 0 1.5-0.67 1.5-1.5s-0.67-1.5-1.5-1.5zm12-6h-18c-0.83 0-1.5 0.67-1.5 1.5v9c0 0.83 0.67 1.5 1.5 1.5h18c0.83 0 1.5-0.67 1.5-1.5v-9c0-0.83-0.67-1.5-1.5-1.5zm-1.5 9h-15v-6h15v6z"/>
          </svg>
        </div>
        <h3>View Prescriptions</h3>
        <p>Review and manage customer prescriptions and their orders.</p>
      </router-link>

      <router-link to="/pharmacist/confirm" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
          </svg>
        </div>
        <h3>Confirm Orders</h3>
        <p>Mark orders as picked up or delivered for your branch.</p>
        <div v-if="loadingCount" class="count">Loading...</div>
        <div v-else class="count">Pending: <strong>{{ pendingCount }}</strong></div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const pharmacistName = ref('Pharmacist');
const pendingCount = ref(0);
const loadingCount = ref(true);

async function fetchPendingCount() {
  loadingCount.value = true;
  try {
    const userStr = localStorage.getItem('user');
    let userId = null;
    try { userId = userStr ? JSON.parse(userStr).userId : null } catch(e) { userId = null }

    if (!userId) {
      pendingCount.value = 0;
    } else {
      // Call branch-limited orders endpoint and count pending
      const res = await axios.post('/ai-sihat/order/branch', { userId });
      const orders = res.data || [];
      pendingCount.value = orders.filter(o => String(o.status).toLowerCase() === 'pending').length;
    }
  } catch (e) {
    console.error('Failed to fetch pending count', e);
    pendingCount.value = 0;
  } finally {
    loadingCount.value = false;
  }
}

onMounted(() => {
  const storedName = localStorage.getItem('userName');
  if (storedName) {
    pharmacistName.value = storedName;
  }
  fetchPendingCount();
});
</script>

<style scoped>
.pharmacist-home {
  text-align: center;
  padding-top: 3rem;
}

h2 {
  margin-bottom: 2rem;
  color: #2c3e50;
  font-weight: 700;
}

.options-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
}

.option-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.75rem 1rem;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  min-height: 160px;
  position: relative;
  overflow: hidden;
}

/* --- ADDED THIS CLASS --- */
.profile-box {
  grid-column: 1 / -1;
}
/* ---------------------- */

.option-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.option-box:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
  border-color: #10b981;
}

.option-box:hover::before {
  opacity: 1;
}

.symbol {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  filter: grayscale(50%);
  transition: filter 0.3s ease;
}

.option-box:hover .symbol {
  filter: grayscale(0%);
}

h3 {
  margin-bottom: 0.4rem;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 700;
}

p {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  line-height: 1.4;
  margin: 0;
}

/* --- UPDATED MEDIA QUERY --- */
@media (min-width: 768px) {
  .options-container {
    grid-template-columns: repeat(3, 1fr); /* Changed from 2 */
    max-width: 900px; /* Changed from 700px */
    gap: 1.5rem;
  }
  
  .option-box {
    padding: 2rem 1.5rem;
    min-height: 200px;
  }
  
  .symbol {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  h3 {
    font-size: 1.3rem;
  }
  
  p {
    font-size: 0.95rem;
  }
}
</style>