import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),

  actions: {
    addToCart(product, qty = 1) {
      const quantityToAdd = parseInt(qty, 10) || 1
      const existing = this.items.find(i => i.id === product.id)
      if (existing) {
        existing.quantity += quantityToAdd
      } else {
        this.items.push({ 
          ...product, 
          medicineId: product.id, // Preserve medicineId for backend
          quantity: quantityToAdd 
        })
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
