<template>
  <div class="signup">
    <h2>Sign Up</h2>
    <form @submit.prevent="handleSignUp">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" v-model="name" required />
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" class="btn primary" :disabled="loading">Sign Up</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const name = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function handleSignUp() {
  loading.value = true;
  error.value = '';
  try {
    await axios.post('/api/users/signup', {
      name: name.value,
      email: email.value,
      password: password.value,
    });
    router.push('/login');
  } catch (e) {
    error.value = e.response?.data?.error || 'Sign up failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.signup {
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
</style>
