import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            scope: '/',
            buildBase: '/build/',
            manifest: {
                id: '/',
                start_url: '/',
                scope: '/',
                name: 'Uma Musume Companion',
                short_name: 'UmaTracker',
                description: 'Gacha & Career Fans Gain Tracker for Uma Musume Pretty Derby',
                theme_color: '#10b981',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                navigateFallback: null,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/gametora\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gametora-cdn-cache',
                            expiration: {
                                maxEntries: 1500,
                                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
        {
            name: 'pwa-build-fallback',
            closeBundle() {
                try {
                    fs.writeFileSync(
                        'public/build/index.php',
                        "<?php\n// Fallback redirect for PWA or direct requests to /build/\nheader('Location: /', true, 302);\nexit;\n"
                    );
                } catch (e) {
                    console.error('Failed to write public/build/index.php fallback:', e);
                }
            },
        },
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
