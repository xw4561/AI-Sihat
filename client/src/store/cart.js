import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),

  actions: {
    addToCart(product) {
      const existing = this.items.find(i => i.id === product.id)
      if (existing) {
        existing.quantity += 1
      } else {
        this.items.push({ ...product, quantity: 1 })
      }
    },
    removeFromCart(id) {
      this.items = this.items.filter(i => i.id !== id)
    },
    clearCart() {
      this.items = []
    },
    updateQuantity(id, qty) {
      const item = this.items.find(i => i.id === id)
      if (item) item.quantity = qty
    }
  },

  getters: {
    totalItems: (state) => state.items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    totalPrice: (state) => state.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
  }
})
