import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/navigator',
      name: 'navigator',
      component: () => import('../views/NavigatorView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/xai',
      name: 'xai',
      component: () => import('../views/XaiView.vue'),
    },
    {
      path: '/xai/embedding',
      name: 'lab-embedding',
      component: () => import('../views/LabEmbeddingView.vue'),
    },
    {
      path: '/xai/attention',
      name: 'lab-attention',
      component: () => import('../views/LabAttentionView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
