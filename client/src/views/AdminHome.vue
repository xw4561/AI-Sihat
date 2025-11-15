<template>
  <div class="admin-home">
    <h2>Hi, {{ adminName }}!</h2>
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

.profile-box {
  grid-column: 1 / -1;
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
    grid-template-columns: repeat(3, 1fr);
    max-width: 900px;
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
