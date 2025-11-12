<!--
<template>
  <div class="cart-container">
    <h1>🛒 Shopping Cart</h1>

    <div v-if="cart.items.length === 0" class="empty">
      <p>Your cart is empty</p>
      <router-link to="/shop" class="back-link">Continue Shopping</router-link>
    </div>

    <div v-else>
      <div class="cart-items">
        <div v-for="item in cart.items" :key="item.id" class="cart-item">
          <img :src="item.image" :alt="item.name" class="item-image" />

          <div class="item-details">
            <h3>{{ item.name }}</h3>
            <p class="price">RM {{ item.price.toFixed(2) }}</p>
          </div>

          <div class="item-quantity">
            <label>Qty:</label>
            <input
              type="number"
              v-model.number="item.quantity"
              min="1"
              @change="updateQuantity(item.id, item.quantity)"
            />
          </div>

          <div class="item-total">
            <p>RM {{ (item.price * item.quantity).toFixed(2) }}</p>
          </div>

          <button @click="removeFromCart(item.id)" class="remove-btn">Remove</button>
        </div>
      </div>

      <div class="cart-summary">
        <div class="summary-row">
          <span>Total Items:</span>
          <strong>{{ cart.totalItems }}</strong>
        </div>
        <div class="summary-row total-price">
          <span>Total Price:</span>
          <strong>RM {{ cart.totalPrice.toFixed(2) }}</strong>
        </div>

        <div class="actions">
          <button @click="clearCart" class="clear-btn">Clear Cart</button>
          <router-link to="/shop" class="continue-shopping">Continue Shopping</router-link>
          <router-link to="/checkout" class="checkout-btn">Proceed to Checkout</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../store/cart'
const cart = useCartStore()

function removeFromCart(id) {
  cart.removeFromCart(id)
}

function clearCart() {
  if (confirm('Clear cart?')) cart.clearCart()
}

function updateQuantity(id, qty) {
  if (qty < 1) return
  cart.updateQuantity(id, qty)
}
</script>

<style scoped>
.cart-container { padding: 2rem; max-width: 1000px; margin: 0 auto; }
h1 { text-align: center; margin-bottom: 2rem; }
.empty { text-align: center; padding: 3rem; color: #666; }
.back-link { display: inline-block; background: #42b983; color: white; padding: 0.7rem 1.2rem; border-radius: 4px; text-decoration: none; margin-top: 1rem; }
.cart-items { background: #f9f9f9; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; }
.cart-item { display: grid; grid-template-columns: 100px 1fr 100px 120px 80px; gap: 1.5rem; align-items: center; padding: 1rem; background: white; border-bottom: 1px solid #eee; border-radius: 4px; margin-bottom: 0.5rem; }
.item-image { width: 100px; height: 100px; object-fit: contain; border-radius: 4px; border: 1px solid #ddd; }
.item-details h3 { margin: 0 0 0.5rem 0; font-size: 1rem; }
.item-details .price { color: #666; margin: 0; }
.item-quantity { display: flex; flex-direction: column; align-items: center; }
.item-quantity label { font-size: 0.85rem; margin-bottom: 0.3rem; }
.item-quantity input { width: 60px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
.item-total { text-align: right; font-weight: bold; font-size: 1.1rem; }
.remove-btn { background: #ff6b6b; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
.remove-btn:hover { background: #ff5252; }
.cart-summary { background: white; border: 2px solid #42b983; border-radius: 8px; padding: 1.5rem; text-align: right; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 1rem; }
.total-price { border-top: 2px solid #eee; padding-top: 1rem; font-size: 1.3rem; color: #42b983; }
.clear-btn { background: #999; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem; margin-top: 1rem; }
.clear-btn:hover { background: #777; }
.continue-shopping { display: inline-block; background: #6c757d; color: white; padding: 0.7rem 1.5rem; border-radius: 4px; text-decoration: none; margin: 1rem 0.5rem 1rem 0; }
.checkout-btn { background: #42b983; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: bold; margin-left: 0.5rem; margin-top: 1rem; }
@media (max-width: 768px) {
  .cart-item { grid-template-columns: 80px 1fr 60px; gap: 0.5rem; }
  .item-total, .remove-btn { display: none; }
}
</style>
-->