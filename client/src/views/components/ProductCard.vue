<template>
  <div class="product-card">
    <img :src="product.image" :alt="product.name" />
    <h3>{{ product.name }}</h3>
    <p>RM {{ product.price.toFixed(2) }}</p>
    <button @click="$emit('add-to-cart', product)">Add to Cart</button>
  </div>
</template>

<script setup>
defineProps(['product'])
</script>

<style scoped>
.product-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  background: #fff;
}
img {
  width: 100px;
  height: 100px;
  object-fit: contain;
}
button {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
}
button:hover {
  background: #36976e;
}
</style>
