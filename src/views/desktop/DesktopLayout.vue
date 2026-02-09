<script setup lang="ts">
import { IonPage, IonRouterOutlet } from '@ionic/vue';
import { useRoute, RouterLink } from 'vue-router';
import { HEADERS } from '@/config/localisations';

const route = useRoute();

const navItems = [
  { path: '/desktop/welcome', label: HEADERS.menu.rus },
  { path: '/desktop/rooms', label: HEADERS.rooms.rus },
  { path: '/desktop/invites', label: HEADERS.invites.rus },
];

const isActive = (navPath: string) => {
  if (navPath === '/desktop/welcome') {
    return route.path === '/desktop' || route.path === '/desktop/welcome';
  }
  return route.path.startsWith(navPath);
};
</script>

<template>
  <ion-page class="desktop-layout">
    <aside class="desktop-sidebar">
      <nav class="desktop-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="desktop-nav-link"
          :class="{ active: isActive(item.path) }"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink to="/" class="desktop-nav-link mobile-link">
          Мобильная версия
        </RouterLink>
      </nav>
    </aside>
    <main class="desktop-main">
      <ion-router-outlet />
    </main>
  </ion-page>
</template>

<style scoped>
.desktop-layout {
  display: flex;
  min-height: 100vh;
}

.desktop-sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--ion-color-medium);
  border-right: 1px solid var(--ion-color-medium-shade);
  flex-shrink: 0;
}

.desktop-nav {
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
  gap: 0.25rem;
}

.desktop-nav-link {
  padding: 0.75rem 1.25rem;
  color: var(--ion-color-medium-contrast);
  text-decoration: none;
  font-size: 0.95rem;
  transition: background-color 0.15s ease;
}

.desktop-nav-link:hover {
  background: var(--ion-color-medium-tint);
}

.desktop-nav-link.active {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.desktop-nav-link.mobile-link {
  margin-top: auto;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ion-color-medium-shade);
  font-size: 0.85rem;
  opacity: 0.9;
}

.desktop-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--ion-color-dark);
}

.desktop-main :deep(.ion-page) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
