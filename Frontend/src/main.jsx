import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { IconContext } from '@phosphor-icons/react'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/press-start-2p/latin-400.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'

const ICONS = { size: 22, weight: 'bold', 'aria-hidden': true }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <IconContext.Provider value={ICONS}>
          <App />
        </IconContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
