<template>
  <div class="customer-home">
    <h2>Welcome, Customer!</h2>
    <div class="chat-link">
      <router-link to="/chat">Start a new Chat</router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.customer-home {
  text-align: center;
}
.chat-link a {
  display: inline-block;
  margin-top: 2rem;
  background: #42b983;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: bold;
}
</style>
