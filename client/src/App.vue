<template>
  <div id="app">
     <header v-if="showNavbar">
      <h1>🏥 AI-Sihat</h1>
    </header>

    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartStore } from './store/cart'; 

const route = useRoute();
const router = useRouter();
const cart = useCartStore(); 

const showNavbar = computed(() => {
  return !['/login', '/signup'].includes(route.path);
});

function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
  localStorage.removeItem('selectedBranch');

  router.push('/login');
}
</script>

<style scoped>
header {
  /* minimal white header with a thin branded accent */
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 0.75rem 1rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 40;
}

h1 {
  color: white;
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* hide any unused top nav markup */
.top-nav { display: none }

button {
  background: #f44336;
  color: white;
  border: none;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
}

main {
  /* mobile-first container sizing */
  max-width: 460px;
  margin: 0 auto;
  padding: 0;
  padding-bottom: 4rem; /* ensure content not hidden by bottom nav */
}

/* Bottom navigation (app-style) - visible on all screen sizes */
.bottom-nav {
  display: flex;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #42b983;
  padding: 0.45rem 0.5rem;
  gap: 0.5rem;
  justify-content: space-around;
  align-items: center;
  z-index: 60;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}
.bottom-nav .nav-item {
  color: white;
  background: rgba(255,255,255,0.08);
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
  border: none;
}

/* desktop tweaks */
@media (min-width: 900px) {
  header { padding: 1rem 2rem }
  h1 { font-size: 1.5rem }
  main { max-width: 820px; padding: 2rem; padding-bottom: 2rem }
}

.cart-link {
  position: relative;
}

.badge {
  background: red;
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  position: absolute;
  top: -6px;
  right: -10px;
}
</style>