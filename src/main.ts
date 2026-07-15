import { createApp } from 'vue'
import { createHead } from '@unhead/vue'
import App from './App.vue'
import router from './router'
import { ScrollTrigger } from './plugins/motion'
import 'atropos/css'
import './style.css'
import './design-system.css'

const app = createApp(App)

app.use(createHead())
app.use(router)

app.mount('#app')

// 路由切换后刷新 ScrollTrigger 位置，避免新页面的触发点错位。
router.afterEach(() => {
  requestAnimationFrame(() => ScrollTrigger.refresh())
})
