import '../../style.css'
import { createDashboardPage } from '../../app'

const root = document.querySelector('#app')
const app = createDashboardPage(root)

app.init()
