<template>
  <div class="login">
    <h2>Login</h2>
  <form @submit.prevent="handleLogin" novalidate>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" class="btn primary" :disabled="loading">Login</button>
      <p v-if="error" class="error">{{ error }}</p>
      <p class="signup-link">
        Don't have an account? <router-link to="/signup">Sign up here</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    const response = await axios.post('/api/auth/login', {
      email: email.value,
      password: password.value,
    });
    
    const user = response.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    // store useful individual values for backward compatibility
    if (user.userId) localStorage.setItem('userId', user.userId);
    if (user.username) localStorage.setItem('userName', user.username);
    if (user.email) localStorage.setItem('userEmail', user.email);
    if (user.role) localStorage.setItem('userRole', user.role);
    
    // Redirect based on role
    if (user.role === 'ADMIN') {
      router.push('/admin');
    } else if (user.role === 'PHARMACIST') {
      router.push('/pharmacist');
    } else {
      router.push('/customer');
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #ddd;
}
.btn {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn.primary {
  background: #42b983;
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  margin-top: 1rem;
  color: #c33;
}
.signup-link {
  margin-top: 1rem;
  text-align: center;
}
</style>
