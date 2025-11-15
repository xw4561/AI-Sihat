<template>
  <div class="product-card">
    <img :src="product.image" :alt="product.name" />
    <h3>{{ product.name }}</h3>
    <p>RM {{ product.price.toFixed(2) }}</p>
    <button @click="openQuantityModal">Add to Cart</button>

    <!-- Quantity Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h4>Add "{{ product.name }}" to cart</h4>
        <div class="modal-body">
          <label>Quantity</label>
          <input type="number" v-model.number="quantity" min="1" :max="product.quantityInStock || 999" />
        </div>
        <div class="modal-actions">
          <button class="btn cancel" @click="closeModal">Cancel</button>
          <button class="btn confirm" @click="confirmAdd">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps(['product'])

const showModal = ref(false)
const quantity = ref(1)

function openQuantityModal() {
  quantity.value = 1
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

const emit = defineEmits(['add-to-cart'])

function confirmAdd() {
  emit('add-to-cart', { product: props.product, quantity: quantity.value })
  closeModal()
}
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

/* Modal styles */
.modal-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  width: 320px;
  max-width: 90%;
}
.modal-body { margin: 0.75rem 0; }
.modal-body input { width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #ddd; }
.modal-actions { display:flex; justify-content: flex-end; gap: 0.5rem; }
.btn.cancel { background: #eee; color: #333; padding: 0.5rem 0.75rem; border-radius:6px; border:none; }
.btn.confirm { background: #42b983; color:white; padding:0.5rem 0.75rem; border-radius:6px; border:none; }
</style>