import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { TenantProvider } from './context/TenantContext.jsx'
import { ClientProvider } from './context/ClientContext.jsx'
import './components/utils/Interceptors/Api.js'
// Inter: 400, 500, 700
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';

// Fraunces: 600 normal + italic
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/600-italic.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TenantProvider>
      <ClientProvider>
      <App />
      </ClientProvider>
    </TenantProvider>
  </StrictMode>,
)
