import { createApp } from 'vue'
import { createHead } from '@unhead/vue'
import App from './App.vue'
import router from './router'
import './style.css'
import './design-system.css'

const app = createApp(App)

app.use(createHead())
app.use(router)

app.mount('#app')
