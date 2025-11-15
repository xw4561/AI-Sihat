import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  // Attempt to load user from localStorage
  const storedUser = localStorage.getItem('user');
  const user = ref(storedUser ? JSON.parse(storedUser) : null);

  const token = ref(localStorage.getItem('token') || null);

  function setUser(userData, authToken) {
    user.value = userData;
    token.value = authToken;
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  }

  function clearUser() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  function updateSelectedBranch(branchId) {
    if (user.value) {
      user.value.lastSelectedBranchId = branchId;
      localStorage.setItem('user', JSON.stringify(user.value));
    }
  }

  return { user, token, setUser, clearUser, updateSelectedBranch };
});