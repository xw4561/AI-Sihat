<template>
  <div class="role-selection">
    <h2>Select Role</h2>
    <p>Choose which role to view for UI testing:</p>
    <div class="buttons">
      <button @click="go('admin')" class="btn admin">Admin</button>
      <button @click="go('customer')" class="btn customer">Customer</button>
      <button @click="go('pharmacist')" class="btn pharmacist">Pharmacist</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
function go(role) {
  // Add a small, fake token and role to localStorage so guarded routes are reachable
  // during UI testing. Do NOT use for production authentication.
  try {
    localStorage.setItem('token', 'dev-fake-token');
    localStorage.setItem('role', role);
  } catch (e) {
    // ignore storage errors in environments that block localStorage
    console.warn('localStorage unavailable for RoleSelection', e);
  }

  if (role === 'admin') router.push('/admin');
  else if (role === 'pharmacist') router.push('/pharmacist');
  else router.push('/customer');
}
</script>

<style scoped>
.role-selection {
  max-width: 480px;
  margin: 3rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  text-align: center;
}
.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.25rem;
}
.btn {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  min-width: 120px;
}
.btn.admin { background:#2b6cb0; color:#fff }
.btn.customer { background:#48bb78; color:#fff }
.btn.pharmacist { background:#ed8936; color:#fff }
</style>
