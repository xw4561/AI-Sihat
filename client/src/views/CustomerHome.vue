<template>
  <div class="customer-home">
    <h2>Welcome, {{ customerName }}!</h2>
    <div class="options-container">
      <router-link to="/chat" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2z"/>
          </svg>
        </div>
        <h3>Chat</h3>
        <p>Start a conversation with our AI assistant.</p>
      </router-link>
      <router-link to="/shop" class="option-box">
        <div class="symbol">
          <!-- You can use a shopping cart icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm0-2h13v-2H8.42l-.93-2H20V6H6.21l-.94-2H2v2h2l3.6 7.59-1.35 2.44C5.52 16.37 6.16 18 7 18zM17 18c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <h3>Shopping</h3>
        <p>Browse and order medicines online.</p>
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

const customerName = ref('Customer');

onMounted(() => {
  const storedName = localStorage.getItem('userName');
  if (storedName) {
    customerName.value = storedName;
  }
});
</script>

<style scoped>
.customer-home {
  text-align: center;
  padding-top: 3rem;
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
