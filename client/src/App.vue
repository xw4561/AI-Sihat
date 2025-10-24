<template>
  <div id="app">
    <header>
      <h1>🏥 AI-Sihat</h1>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
// Add any global logic here
</script>

<style scoped>
header {
  background-color: #42b983;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h1 {
  color: white;
  margin: 0;
}

main {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
</style>
