import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DealerProvider } from './contexts/DealerContext';
import { ChatProvider } from './contexts/ChatContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { router } from './router';

export default function App() {
  return (
    <AuthProvider>
      <DealerProvider>
        <ChatProvider>
          <ToastProvider>
            {/* Outermost boundary: without it a single render throw unmounts the
                whole app and every route becomes a blank page. */}
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
          </ToastProvider>
        </ChatProvider>
      </DealerProvider>
    </AuthProvider>
  );
}
