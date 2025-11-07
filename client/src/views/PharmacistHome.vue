<template>
  <div class="pharmacist-home">
    <h2>Welcome, {{ pharmacistName }}!</h2>
    <div class="options-container">
      <router-link to="/pharmacist/orders" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M19.5 3h-4.5c-0.83 0-1.5 0.67-1.5 1.5s0.67 1.5 1.5 1.5h4.5c0.83 0 1.5-0.67 1.5-1.5s-0.67-1.5-1.5-1.5zm-7.5 0h-4.5c-0.83 0-1.5 0.67-1.5 1.5s0.67 1.5 1.5 1.5h4.5c0.83 0 1.5-0.67 1.5-1.5s-0.67-1.5-1.5-1.5zm-1.5 12h-3c-0.83 0-1.5 0.67-1.5 1.5s0.67 1.5 1.5 1.5h3c0.83 0 1.5-0.67 1.5-1.5s-0.67-1.5-1.5-1.5zm12-6h-18c-0.83 0-1.5 0.67-1.5 1.5v9c0 0.83 0.67 1.5 1.5 1.5h18c0.83 0 1.5-0.67 1.5-1.5v-9c0-0.83-0.67-1.5-1.5-1.5zm-1.5 9h-15v-6h15v6z"/>
          </svg>
        </div>
        <h3>View Orders</h3>
        <p>Review and manage customer orders.</p>
      </router-link>
      <router-link to="/profile" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
        <h3>Profile</h3>
        <p>Manage your account details.</p>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const pharmacistName = ref('Pharmacist');

onMounted(() => {
  const storedName = localStorage.getItem('userName');
  if (storedName) {
    pharmacistName.value = storedName;
  }
});
</script>

<style scoped>
.pharmacist-home {
  text-align: center;
  padding-top: 3rem;
}

h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.options-container {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 3rem;
  flex-wrap: wrap;
}

.option-box {
  display: block;
  width: 250px;
  padding: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.option-box:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.symbol {
  font-size: 3rem;
  margin-bottom: 1rem;
}

h3 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  color: #2c3e50;
}

p {
  font-size: 1rem;
  color: #666;
}
</style>
