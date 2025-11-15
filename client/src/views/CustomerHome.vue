<template>
  <div class="customer-home">
    <div class="header-section">
      <h2>Hi, {{ customerName }}!</h2>
      <router-link to="/cart" class="cart-icon-link">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="#10b981">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm0-2h13v-2H8.42l-.93-2H20V6H6.21l-.94-2H2v2h2l3.6 7.59-1.35 2.44C5.52 16.37 6.16 18 7 18zM17 18c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2z"/>
        </svg>
        <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
      </router-link>
    </div>
    <div class="options-container">
      <router-link to="/profile" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
        <h3>Profile</h3>
        <p>Manage your account details.</p>
      </router-link>
      <router-link to="/chat" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2z"/>
          </svg>
        </div>
        <h3>Chat</h3>
        <p>Start a conversation with our AI assistant.</p>
      </router-link>
      
      <!-- Changed to <div> with @click to check login -->
      <div class="option-box" @click="navigateTo('/shop')">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm0-2h13v-2H8.42l-.93-2H20V6H6.21l-.94-2H2v2h2l3.6 7.59-1.35 2.44C5.52 16.37 6.16 18 7 18zM17 18c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <h3>Shopping</h3>
        <p>Browse and order medicines online.</p>
      </div>
      <router-link to="/orders" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
        </div>
        <h3>Order History</h3>
        <p>View your past and pending orders.</p>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router'
import { useCartStore } from '../store/cart';

const customerName = ref('Customer');
const cart = useCartStore();

const cartItemCount = computed(() => cart.items.length);

const router = useRouter();

// Safely get user name from the user *object* in localStorage
onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      customerName.value = user.username || 'Customer'; 
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      // Clear bad data if parsing fails
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      customerName.value = 'Customer';
    }
  }
});

// Handle navigation and check for login
function navigateTo(path) {
  const user = localStorage.getItem('user');
  if (!user) {
    alert("Please log in to use this feature.");
    router.push('/login'); // Redirect to your login page
  } else {
    router.push(path);
  }
}
</script>

<style scoped>
.customer-home {
  text-align: center;
  padding-top: 3rem;
}

.header-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.header-section h2 {
  margin: 0;
}

.cart-icon-link {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.cart-icon-link:hover {
  background-color: rgba(16, 185, 129, 0.1);
}

.cart-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  border-radius: 999px;
  padding: 0.15rem 0.4rem;
  min-width: 1.2rem;
  text-align: center;
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

@media (min-width: 768px) {
  .options-container {
    grid-template-columns: repeat(4, 1fr);
    max-width: 1100px;
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
