import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import SignUp from '../views/SignUp.vue'
import AdminHome from '../views/AdminHome.vue'
import CustomerHome from '../views/CustomerHome.vue'
import PharmacistHome from '../views/PharmacistHome.vue'
import Chat from '../views/chat.vue'
import APITest from '../views/APITest.vue'
import DatabaseManager from '../views/DatabaseManager.vue'
import RoleSelection from '../views/RoleSelection.vue'
import Profile from '../views/Profile.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUp
  },
  {
    path: '/select-role',
    name: 'RoleSelection',
    component: RoleSelection
  },
  {
    path: '/admin',
    name: 'AdminHome',
    component: AdminHome,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/customer',
    name: 'CustomerHome',
    component: CustomerHome,
    meta: { requiresAuth: true, role: 'customer' }
  },
  {
    path: '/pharmacist',
    name: 'PharmacistHome',
    component: PharmacistHome,
    meta: { requiresAuth: true, role: 'pharmacist' }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },
  {
    path: '/api-test',
    name: 'APITest',
    component: APITest,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/database',
    name: 'DatabaseManager',
    component: DatabaseManager,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  /*
  const loggedIn = localStorage.getItem('token');

  if (to.matched.some(record => record.meta.requiresAuth) && !loggedIn) {
    next('/login');
  } else {
    next();
  }
  */
  next();
});

export default router
