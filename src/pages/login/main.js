import '../../style.css'
import { createLoginPage } from '../../app'

const root = document.querySelector('#app')
const app = createLoginPage(root)

app.init()
