<template>
  <!-- Show Branch Selector if showSelector is true -->
  <BranchSelector 
    v-if="showSelector" 
    @branch-selected="handleBranchSelected" 
  />

  <!-- Show Shop Content only if a branch is selected -->
  <div v-else-if="selectedBranch" class="shopping">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/customer')" title="Go back">
        <span class="back-arrow">←</span>
      </button>
      <h1>Pharmacy Store</h1>
      <p class="branch-info clickable" @click="showSelector = true" title="Click to change branch">
        Shopping at: <strong>{{ selectedBranch.name }} ▾</strong>
      </p>

    </div>

    <div class="products-area">
      <div v-if="loadingProducts" class="loader">Loading products...</div>
      <div v-else class="grid">
        <ProductCard
          v-for="p in products"
          :key="p.id"
          :product="p"
          @add-to-cart="addToCart"
        />
      </div>
    </div>

    <router-link to="/cart" class="cart-button">
      Go to Cart ({{ cart.totalItems }})
    </router-link>
  </div>
  
  <!-- Show a loader while checking localStorage -->
  <div v-else class="loader">
    Loading...
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue' 
import axios from 'axios'
import ProductCard from './components/ProductCard.vue'
import BranchSelector from './components/BranchSelector.vue' // Import the modal
import { useCartStore } from '../store/cart.js' // Still use cart store

const cart = useCartStore();
const products = ref([]);
const loadingProducts = ref(false);

// Local state for branch
const selectedBranch = ref(null);
const showSelector = ref(false);

async function fetchProducts() {
  loadingProducts.value = true;
  try {
    const response = await axios.get('/ai-sihat/medicines')
    
    // Map the backend data to the format your ProductCard expects
    products.value = response.data.map(medicine => ({
      id: medicine.medicineId,
      name: medicine.medicineName,
      price: medicine.price ? parseFloat(medicine.price) : 0.00,
      image: medicine.imageUrl ? medicine.imageUrl : 'https://via.placeholder.com/150.png?text=No+Image',
      quantityInStock: medicine.medicineQuantity 
    }));
  } catch (error) {
    console.error("Failed to fetch products:", error);
  } finally {
    loadingProducts.value = false;
  }
}

// Check localStorage on load
onMounted(() => {
  const storedBranch = localStorage.getItem('selectedBranch');
  if (storedBranch) {
    try {
      selectedBranch.value = JSON.parse(storedBranch);
      fetchProducts(); // Branch exists, fetch products
    } catch (e) {
      console.error("Failed to parse branch, forcing re-selection:", e);
      localStorage.removeItem('selectedBranch');
      showSelector.value = true; // Data was bad, force selection
    }
  } else {
    // No branch saved, show the modal
    showSelector.value = true;
  }
});

// Handle event from BranchSelector
function handleBranchSelected(branch) {
  selectedBranch.value = branch;
  showSelector.value = false;
  fetchProducts(); // Now that branch is selected, fetch products
}

function addToCart(product) {
  cart.addToCart(product);
}
</script>

<style scoped>
.branch-info {
  text-align: center;
  font-size: 1rem;
  color: #555;
  background: #f4f4f4;
  padding: 0.5rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}
.loader {
  text-align: center;
  font-size: 1.2rem;
  padding: 3rem;
}
.shopping {
  padding: 1rem;
  text-align: center;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0;
}

.page-header h1 {
  margin: 0;
  flex: 1;
}

.btn-back {
  background: none;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0.4rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-back:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  transform: translateX(-2px);
}

.back-arrow {
  font-size: 1.5rem;
  color: #333;
  line-height: 1;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.cart-button {
  display: inline-block;
  margin-top: 1.5rem;
  background: #42b983;
  color: white;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: bold;
}
</style>