import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// 注册一次 ScrollTrigger，全局可用。
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
