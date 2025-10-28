<template>
  <div class="home">
    <h2>API Test</h2>
    
    <div class="test-section">
      <button @click="testApi" class="test-button">Test API</button>
      
      <div v-if="loading" class="status">Loading...</div>
      
      <div v-else-if="apiResponse" class="response">
        <h3>API Response:</h3>
        <pre>{{ JSON.stringify(apiResponse, null, 2) }}</pre>
      </div>
      
      <div v-else-if="error" class="error">
        <h3>Error:</h3>
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const apiResponse = ref(null)
const loading = ref(false)
const error = ref(null)

const testApi = async () => {
  loading.value = true
  error.value = null
  apiResponse.value = null
  
  try {
    const response = await axios.get('/api/test')
    apiResponse.value = response.data
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to connect to API'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
}

h2 {
  color: #2c3e50;
  margin-bottom: 2rem;
}

.test-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 600px;
  margin: 0 auto;
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
}

.test-button:hover {
  background-color: #35a372;
}

.status {
  margin-top: 1.5rem;
  color: #666;
  font-style: italic;
}

.response {
  margin-top: 1.5rem;
  text-align: left;
}

.response h3 {
  color: #42b983;
  margin-bottom: 1rem;
}

.response pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  text-align: left;
}

.error {
  margin-top: 1.5rem;
  background-color: #fee;
  padding: 1rem;
  border-radius: 4px;
}

.error h3 {
  color: #c33;
  margin-bottom: 0.5rem;
}

.error p {
  color: #666;
}
</style>
