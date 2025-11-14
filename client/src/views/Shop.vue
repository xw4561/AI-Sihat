<template>
  <div class="shopping">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/customer')" title="Go back">
        <span class="back-arrow">←</span>
      </button>
      <h1>Pharmacy Store</h1>
    </div>
    <div class="grid">
      <ProductCard
        v-for="p in products"
        :key="p.id"
        :product="p"
        @add-to-cart="addToCart"
      />
    </div>

    <router-link to="/cart" class="cart-button">
      Go to Cart ({{ cart.totalItems }})
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue' // Import ref and onMounted
import axios from 'axios' // Import axios
import ProductCard from './components/ProductCard.vue'
import { useCartStore } from '../store/cart.js'

const cart = useCartStore()
const products = ref([])

async function fetchProducts() {
  try {
    const response = await axios.get('http://localhost:3000/ai-sihat/medicines')
    
    // Map the backend data to the format your ProductCard expects
    products.value = response.data.map(medicine => ({
      id: medicine.medicineId,       // Map medicineId to id
      name: medicine.medicineName,   // Map medicineName to name
      price: medicine.price ? parseFloat(medicine.price) : 0.00, // Map price (convert from Decimal/string)
      image: medicine.imageUrl ? medicine.imageUrl : 'https://via.placeholder.com/150.png?text=No+Image',      // Map imageUrl to image
      quantityInStock: medicine.medicineQuantity 
    }))
  } catch (error) {
    console.error("Failed to fetch products:", error)
  }
}

// 5. Call the fetch function when the component is mounted
onMounted(() => {
  fetchProducts()
})

// Your addToCart function remains the same
function addToCart(product) {
  // Make sure your cart.addToCart(product) logic
  // uses the 'id', 'name', 'price', and 'image' properties
  cart.addToCart(product)
}
</script>

<style scoped>
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