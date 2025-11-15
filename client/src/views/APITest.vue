<template>
  <div class="home">
    <div class="header-container">
      <button @click="$router.push('/admin')" class="back-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h2>API & Database Test</h2>
    </div>
    
    <!-- API Test Section -->
    <div class="test-section">
      <h3>API Health Check</h3>
      <button @click="testApi" class="test-button">Test API</button>
      
      <div v-if="apiLoading" class="status">Testing API...</div>
      
      <div v-else-if="apiResponse" class="response success">
        <h4>✅ API Status:</h4>
        <pre>{{ JSON.stringify(apiResponse, null, 2) }}</pre>
      </div>
      
      <div v-else-if="apiError" class="response error">
        <h4>❌ API Error:</h4>
        <p>{{ apiError }}</p>
      </div>
    </div>

    <!-- Database Test Section -->
    <div class="test-section">
      <h3>Database Connection Check</h3>
      <button @click="testDatabase" class="test-button db-button">Test Database</button>
      
      <div v-if="dbLoading" class="status">Testing database connection...</div>
      
      <div v-else-if="dbResponse" :class="['response', dbResponse.ok ? 'success' : 'error']">
        <h4>{{ dbResponse.ok ? '✅' : '❌' }} Database Status:</h4>
        <pre>{{ JSON.stringify(dbResponse, null, 2) }}</pre>
        <div v-if="dbResponse.ok" class="info-box">
          <p><strong>Connected to:</strong> {{ dbResponse.dialect }}</p>
          <p class="hint">Your PostgreSQL database is ready!</p>
        </div>
        <div v-else class="info-box warning">
          <p><strong>Connection Failed</strong></p>
          <p class="hint">Make sure you've configured DB_URL in server/.env</p>
        </div>
      </div>
      
      <div v-else-if="dbError" class="response error">
        <h4>❌ Database Error:</h4>
        <p>{{ dbError }}</p>
        <div class="info-box warning">
          <p class="hint">Check your Supabase credentials in server/.env</p>
        </div>
      </div>
    </div>

    <!-- Test All Button -->
    <div class="test-section">
      <button @click="testAll" class="test-button test-all-button">Test Everything</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

// API Test State
const apiResponse = ref(null)
const apiLoading = ref(false)
const apiError = ref(null)

// Database Test State
const dbResponse = ref(null)
const dbLoading = ref(false)
const dbError = ref(null)

const testApi = async () => {
  apiLoading.value = true
  apiError.value = null
  apiResponse.value = null
  
  try {
    const response = await axios.get('/api/test')
    apiResponse.value = response.data
  } catch (err) {
    apiError.value = err.response?.data?.error || err.message || 'Failed to connect to API'
  } finally {
    apiLoading.value = false
  }
}

const testDatabase = async () => {
  dbLoading.value = true
  dbError.value = null
  dbResponse.value = null
  
  try {
    const response = await axios.get('/api/db/health')
    dbResponse.value = response.data
  } catch (err) {
    // Check if it's a 500/503 with error response
    if (err.response?.data) {
      dbResponse.value = err.response.data
    } else {
      dbError.value = err.response?.data?.error || err.message || 'Failed to check database'
    }
  } finally {
    dbLoading.value = false
  }
}

const testAll = async () => {
  await testApi()
  await testDatabase()
}
</script>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.back-arrow {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2c3e50;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.back-arrow:hover {
  background-color: #f3f4f6;
  color: #10b981;
}

h2 {
  color: #2c3e50;
  margin: 0;
}

h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

h4 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.test-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.test-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin: 0.5rem;
}

.test-button:hover {
  background-color: #35a372;
}

.db-button {
  background-color: #3b82f6;
}

.db-button:hover {
  background-color: #2563eb;
}

.test-all-button {
  background-color: #8b5cf6;
  font-size: 1.2rem;
  padding: 1.2rem 2.5rem;
}

.test-all-button:hover {
  background-color: #7c3aed;
}

.status {
  margin-top: 1.5rem;
  color: #666;
  font-style: italic;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.response {
  margin-top: 1.5rem;
  text-align: left;
  padding: 1.5rem;
  border-radius: 8px;
}

.response.success {
  background-color: #f0fdf4;
  border: 2px solid #86efac;
}

.response.error {
  background-color: #fef2f2;
  border: 2px solid #fca5a5;
}

.response pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  text-align: left;
  font-size: 0.9rem;
  margin: 1rem 0;
}

.info-box {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #42b983;
}

.info-box.warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.info-box p {
  margin: 0.5rem 0;
  color: #4b5563;
}

.info-box strong {
  color: #1f2937;
}

.hint {
  font-size: 0.9rem;
  font-style: italic;
  color: #6b7280;
}
</style>
