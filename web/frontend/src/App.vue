<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="logo">♟ MiniShogi</h1>
      <nav class="nav">
        <RouterLink to="/" class="nav-link">對弈</RouterLink>
        <RouterLink to="/dashboard" class="nav-link">訓練監控</RouterLink>
        <RouterLink to="/replay" class="nav-link">棋譜</RouterLink>
      </nav>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
  margin: 0;
}

.nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.main {
  padding: 2rem;
}
</style>
