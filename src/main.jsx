import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { TenantProvider } from './context/TenantContext.jsx'
import './components/utils/Interceptors/Api.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TenantProvider>
      <App />
    </TenantProvider>
  </StrictMode>,
)
