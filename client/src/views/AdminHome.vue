<template>
  <div class="admin-home">
    <h2>Admin Dashboard</h2>
    <nav>
      <router-link to="/database">Database Manager</router-link>
      <router-link to="/api-test">API Test</router-link>
    </nav>
  </div>
</template>

<script setup>
</script>

<style scoped>
.admin-home {
  text-align: center;
}
nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}
nav a {
  background: #42b983;
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
}
</style>
