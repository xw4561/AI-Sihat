<template>
  <div class="cart-item">
    <img :src="item.image" :alt="item.name" class="item-image" />
    <div class="item-details">
      <h3>{{ item.name }}</h3>
      <p class="price">RM {{ item.price.toFixed(2) }}</p>
      <div class="item-quantity">
        <label>Qty:</label>
        <input
          type="number"
          v-model.number="item.quantity"
          min="1"
          @change="updateQuantity(item.id, item.quantity)"
        />
      </div>
    </div>
    <div class="item-total">
      <p>RM {{ (item.price * item.quantity).toFixed(2) }}</p>
    </div>
    <button @click="removeFromCart(item.id)" class="remove-btn">Remove</button>
  </div>
</template>

<script setup>
defineProps(['item'])

function updateQuantity(id, qty) {
  if (qty < 1) return
  // Logic to update quantity in the cart store
}

function removeFromCart(id) {
  // Logic to remove item from the cart store
}
</script>

<style scoped>
.cart-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.item-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-right: 1rem;
}

.item-details {
  flex-grow: 1;
}

.item-quantity {
  display: flex;
  align-items: center;
}

.item-quantity input {
  width: 60px;
  margin-left: 0.5rem;
}

.remove-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>