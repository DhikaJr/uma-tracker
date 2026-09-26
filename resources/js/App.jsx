import React from 'react';
import { createRoot } from 'react-dom/client';
import AppMain from './AppMain';
import ErrorBoundary from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for offline asset caching and auto-update
registerSW({ immediate: true });

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <AppMain />
            </ErrorBoundary>
        </React.StrictMode>
    );
}

