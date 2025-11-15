import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { useUserStore } from './userStore';

export const useBranchStore = defineStore('branch', () => {
  const branches = ref([]);
  const selectedBranch = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  const isBranchSelected = computed(() => !!selectedBranch.value);

  // Fetches all available branches for the list
  async function fetchBranches() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.get('http://localhost:8080/ai-sihat/pharmacy');
      branches.value = response.data;
    } catch (e) {
      console.error("Failed to fetch branches:", e);
      error.value = "Could not load pharmacy branches.";
    } finally {
      isLoading.value = false;
    }
  }

  // Saves the user's selection to the backend
  async function selectBranch(branch) {
    const userStore = useUserStore();
    if (!userStore.user?.userId) {
      error.value = "You must be logged in to select a branch.";
      return;
    }

    isLoading.value = true;
    error.value = null;
    try {
      // Update the user's profile on the backend
      await axios.put(
        `http://localhost:8080/ai-sihat/user/${userStore.user.userId}/select-branch`,
        { branchId: branch.branchId },
        { headers: { Authorization: `Bearer ${userStore.token}` } } // Assuming you use Bearer token auth
      );
      
      // If successful, update state
      selectedBranch.value = branch;
      userStore.updateSelectedBranch(branch.branchId);
    } catch (e) {
      console.error("Failed to select branch:", e);
      error.value = "Could not save your branch selection.";
    } finally {
      isLoading.value = false;
    }
  }

  // Checks if the user already has a branch selected in their profile
  async function initBranchSelection() {
    const userStore = useUserStore();
    if (userStore.user?.lastSelectedBranchId) {
      isLoading.value = true;
      try {
        // Fetch the specific branch details
        const response = await axios.get(`http://localhost:8080/ai-sihat/pharmacy/${userStore.user.lastSelectedBranchId}`);
        selectedBranch.value = response.data;
      } catch (e) {
        console.error("Failed to load user's selected branch:", e);
        // If it fails, force them to re-select
        selectedBranch.value = null;
      } finally {
        isLoading.value = false;
      }
    } else {
      // No branch saved on profile, so they must select one.
      selectedBranch.value = null;
    }
  }

  return {
    branches,
    selectedBranch,
    isLoading,
    error,
    isBranchSelected,
    fetchBranches,
    selectBranch,
    initBranchSelection
  };
});