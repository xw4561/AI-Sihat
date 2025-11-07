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

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

function handleLogin() {
  // Bypass validation/auth for UI: navigate to role selection page.
  // This lets the user choose Admin / Customer / Pharmacist after clicking Login.
  router.push('/select-role');
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
