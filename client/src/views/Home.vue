<template>
  <div class="home">
    <h2>Welcome to AI-Sihat</h2>
    <p class="lead">Healthcare assistant with AI-powered symptom guidance and pharmacy management.</p>

    <div class="cards">
      <router-link to="/chat" class="card">
        <h3>💬 Chat Demo</h3>
        <p>Start a session and answer questions using /chat/start and /chat/ask.</p>
      </router-link>

      <router-link to="/api-test" class="card">
        <h3>🔌 API & DB Test</h3>
        <p>Check API status and PostgreSQL database connection health.</p>
      </router-link>

      <router-link to="/database" class="card">
        <h3>🗄️ Database Manager</h3>
        <p>Add, view, and manage users, medicines, and orders in your database.</p>
      </router-link>
    </div>
  </div>
  
</template>

<script setup>
// No special logic needed on the landing page
</script>

<style scoped>
.home {
  text-align: center;
  padding: 2rem;
}

.lead {
  color: #666;
  margin-bottom: 2rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin: 0 auto;
  max-width: 900px;
}

.card {
  display: block;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  color: inherit;
  text-decoration: none;
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
}

.card h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.card p {
  margin: 0;
  color: #555;
}
</style>
