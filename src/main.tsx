import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { AgentProvider } from './contexts/AgentContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MotionProvider } from './components/motion/MotionProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionProvider>
        <AuthProvider>
          <AgentProvider>
            <RouterProvider router={router} />
          </AgentProvider>
        </AuthProvider>
      </MotionProvider>
    </ErrorBoundary>
  </StrictMode>,
);
