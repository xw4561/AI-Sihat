<template>
  <div class="checkout-container">
    <h1>Checkout</h1>
    <div v-if="cart.items.length === 0" class="empty-cart">
      <p>Your cart is empty. Please add items to your cart before proceeding.</p>
      <router-link to="/checkout" class="cart-button">
        Go to Cart ({{ cart.totalItems }})
      </router-link>
    </div>
    <div v-else>
      <h2>Your Order</h2>
      <div class="order-summary">
        <div v-for="item in cart.items" :key="item.id" class="order-item">
          <img :src="item.image" :alt="item.name" class="item-image" />
          <div class="item-details">
            <h3>{{ item.name }}</h3>
            <p>Quantity: {{ item.quantity }}</p>
            <p>Total: RM {{ (item.price * item.quantity).toFixed(2) }}</p>
          </div>
        </div>
      </div>
      <div class="total-price">
        <h3>Total Price: RM {{ cart.totalPrice.toFixed(2) }}</h3>
      </div>
      <form @submit.prevent="submitOrder" class="checkout-form">
        <h3>Customer Information</h3>
        <input type="text" v-model="customerName" placeholder="Your Name" required />
        <input type="email" v-model="customerEmail" placeholder="Your Email" required />
        <button type="submit" class="submit-order">Place Order</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCartStore } from '../store/cart'
import { useRouter } from 'vue-router'

const cart = useCartStore()
const router = useRouter()
const customerName = ref('')
const customerEmail = ref('')

function submitOrder() {
  // Logic to handle order submission
  //alert(`Order placed by ${customerName.value} (${customerEmail.value})`)
  cart.clearCart() // Clear the cart after placing the order
  router.push('/order-confirmed')
}
</script>

<style scoped>
.checkout-container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}
.empty-cart {
  text-align: center;
  padding: 2rem;
  color: #666;
}
.order-summary {
  margin-bottom: 2rem;
}
.order-item {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}
.item-image {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-right: 1rem;
}
.item-details {
  flex-grow: 1;
}
.total-price {
  font-weight: bold;
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
}
.checkout-form {
  display: flex;
  flex-direction: column;
}
.checkout-form input {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.submit-order {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.7rem;
  border-radius: 4px;
  cursor: pointer;
}
.submit-order:hover {
  background: #36976e;
}
</style>