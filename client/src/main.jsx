import '@fontsource-variable/dm-sans';
import '@fontsource-variable/fraunces/opsz.css';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ClinicProvider } from './hooks/useClinic.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user": people who prefer reduced motion get fades only. */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ClinicProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </ClinicProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
