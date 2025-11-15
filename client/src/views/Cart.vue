<template>
  <div class="cart-page">
    <div class="page-header">
      <button class="btn-back" @click="goBack" title="Go back">
        <span class="back-arrow">←</span>
      </button>
      <h1>🛒 Your Cart</h1>
    </div>

    <div v-if="cart.items.length === 0" class="empty-cart">
      <p>Your cart is empty. Go back to shop to add items.</p>
      <router-link to="/shop" class="back-shop">Back to Shop</router-link>
    </div>

    <div v-else>
      <div class="cart-item" v-for="item in cart.items" :key="item.id">
        <img :src="item.image" :alt="item.name" class="item-image" />
        <div class="item-details">
          <h3>{{ item.name }}</h3>
          <p>Price: RM {{ item.price.toFixed(2) }}</p>
          <p>
            Quantity:
            <input type="number" v-model.number="item.quantity" min="1" />
          </p>
          <p>Total: RM {{ (item.price * item.quantity).toFixed(2) }}</p>
          <button @click="removeItem(item.id)" class="delete-btn">Delete</button>
        </div>
      </div>

      <div class="cart-footer">
        <h3>Total Price: RM {{ cart.totalPrice.toFixed(2) }}</h3>
        <router-link to="/checkout" class="checkout-btn">Checkout</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../store/cart'
import { useRouter } from 'vue-router'

const cart = useCartStore()
const router = useRouter()

function removeItem(id) {
  cart.removeFromCart(id)
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.cart-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
.cart-item {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  padding: 1rem;
  background: #f9fff7; /* very light green background */
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.1);
}
.item-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-right: 1rem;
  border-radius: 8px;
}
.item-details {
  flex-grow: 1;
}
.item-details input[type="number"] {
  width: 70px;
  padding: 0.4rem;
  border: 1px solid #42b983;
  border-radius: 4px;
  font-weight: bold;
  text-align: center;
}
.delete-btn {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 999px; /* pill shape like your buttons */
  cursor: pointer;
  font-weight: bold;
  margin-top: 0.5rem;
  transition: background 0.3s ease, transform 0.2s ease;
}
.delete-btn:hover {
  background: #d9363e;
  transform: translateY(-2px);
}
.cart-footer {
  margin-top: 2rem;
  text-align: right;
}
.checkout-btn {
  display: inline-block;
  margin-top: 1rem;
  background: #42b983;
  color: white;
  padding: 0.7rem 1.5rem;
  border-radius: 999px; /* pill shape */
  text-decoration: none;
  font-weight: bold;
  transition: background 0.3s ease, transform 0.2s ease;
}
.checkout-btn:hover {
  background: #36976e;
  transform: translateY(-2px);
}
.empty-cart {
  text-align: center;
  color: #666;
}
.back-shop {
  display: inline-block;
  margin-top: 1rem;
  background: #a8e6cf; /* light green like pickup/delivery */
  color: #2c6b4e;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: bold;
  transition: background 0.3s ease, transform 0.2s ease;
}
.back-shop:hover {
  background: #86d9b5;
  transform: translateY(-2px);
}

/* Header back button styles (kept small and consistent) */
.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.btn-back {
  background: none;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.btn-back:hover { transform: translateX(-2px); background-color: rgba(0,0,0,0.03); }
.back-arrow { font-size: 1.2rem; color: #333; line-height: 1; font-weight: 600; }
</style>
