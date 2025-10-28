<template>
  <div id="app">
    <header>
      <h1>🏥 AI-Sihat</h1>
      <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/chat">Chat</router-link>
        <router-link to="/api-test">API Test</router-link>
      </nav>
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

nav {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

nav a {
  color: white;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
}

nav a.router-link-active {
  background: rgba(255, 255, 255, 0.3);
}

main {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
</style>
