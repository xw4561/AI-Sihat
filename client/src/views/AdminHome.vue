<template>
  <div class="admin-home">
    <h2>Welcome, {{ adminName }}!</h2>
    <div class="options-container">
      <router-link to="/database" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M12 3C7.03 3 3 5.69 3 9c0 3.31 4.03 6 9 6s9-2.69 9-6c0-3.31-4.03-6-9-6zm0 2c3.86 0 7 1.79 7 4s-3.14 4-7 4-7-1.79-7-4 3.14-4 7-4zm0 10c-4.97 0-9 2.69-9 6v2h18v-2c0-3.31-4.03-6-9-6zm0 2c3.86 0 7 1.79 7 4v1H5v-1c0-2.21 3.14-4 7-4z"/>
          </svg>
        </div>
        <h3>Database Manager</h3>
        <p>Manage application data.</p>
      </router-link>
      <router-link to="/api-test" class="option-box">
        <div class="symbol">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="gray">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2H8v-2H6v-2h2V6h2v2h2v2z"/>
          </svg>
        </div>
        <h3>API Test</h3>
        <p>Test backend endpoints.</p>
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

const adminName = ref('Admin');

onMounted(() => {
  const storedName = localStorage.getItem('userName');
  if (storedName) {
    adminName.value = storedName;
  }
});
</script>

<style scoped>
.admin-home {
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
