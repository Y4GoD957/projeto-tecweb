import '../../style.css'
import { createTraderPage } from '../../app'

const root = document.querySelector('#app')
const app = createTraderPage(root)

app.init()
