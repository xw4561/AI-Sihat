import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import APITest from '../views/APITest.vue'
import Chat from '../views/Chat.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/api-test',
    name: 'APITest',
    component: APITest
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
