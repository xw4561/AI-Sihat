<template>
  <div class="order-confirmed">
    <h1>✅ Order Confirmed!</h1>
    <p>Your order has been placed successfully.</p>
    <router-link to="/customer" class="home-btn">Go to Home
    </router-link>
  </div>
</template>

<script setup>
// No script needed for this simple page
</script>

<style scoped>
.order-confirmed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}
.home-btn {
  margin-top: 2rem;
  background: #42b983;
  color: white;
  padding: 0.7rem 1.5rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
}
</style>