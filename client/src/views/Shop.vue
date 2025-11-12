<template>
  <div class="shopping">
    <h1>🛒 Pharmacy Store</h1>
    <div class="grid">
      <ProductCard
        v-for="p in products"
        :key="p.id"
        :product="p"
        @add-to-cart="addToCart"
      />
    </div>

    <router-link to="/checkout" class="cart-button">
      Go to Cart ({{ cart.totalItems }})
    </router-link>
  </div>
</template>

<script setup>
import ProductCard from './components/ProductCard.vue' // import file but use the name expected in template
import { useCartStore } from '../store/cart.js'
import panadol from '../assets/panadol.png'
import vitc from '../assets/vitaminC.png'
import cough from '../assets/coughSyrup.png'
import duroHerb from '../assets/duroHerb.png'
import hurix from '../assets/hurix.png'
import oral from '../assets/oralDehydrationSalt.png'
import bepanthen from '../assets/bepanthen.png'
import gasviscon from '../assets/gasviscon.png'
import gazgo from '../assets/gazgo.png'
import lactulose from '../assets/lactulose.png'
import norit from '../assets/norit.png'
import panadolExtend from '../assets/panadolExtend.png'

const cart = useCartStore()

const products = [
  { id: 1, name: 'Panadol', price: 5.0, image: panadol },
  { id: 2, name: 'Vitamin C 1000mg', price: 25.0, image: vitc },
  { id: 3, name: 'Cough Syrup', price: 12.5, image: cough },
  { id: 4, name: 'Duro Herb Dry Cough Syrup', price: 8.9, image: duroHerb },
  { id: 5, name: "Hurix's 600 Fluaway Capsule", price: 12.5, image: hurix },
  { id: 5, name: "Oral Dehydration Salt (B plus)", price: 12.5, image: oral },
  { id: 3, name: 'Antacid (Gasviscon)', price: 12.5, image: gasviscon },
  { id: 3, name: 'Paracetamol ( Panadol Extend )', price: 12.5, image: panadolExtend },
  { id: 3, name: 'Lactul Solution (Lactulose)', price: 12.5, image: lactulose },
  { id: 3, name: 'Activated Charcoal ( Norit)', price: 12.5, image: norit },
  { id: 3, name: 'Simethicone (Gazgo)', price: 12.5, image: gazgo },
  { id: 3, name: 'Bepanthen Itchy Relief Cream', price: 12.5, image: bepanthen },
]

function addToCart(product) {
  cart.addToCart(product)
}
</script>

<style scoped>
.shopping {
  padding: 1rem;
  text-align: center;
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