import DefaultTheme from 'vitepress/theme'
import NavPage from './components/NavPage.vue'

export default {
    ...DefaultTheme,
    enhanceApp({ app }) {
        app.component('NavPage', NavPage)
    }
}