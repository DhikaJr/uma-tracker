<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#10b981">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="UmaTracker">
    <title>Uma Musume Companion | Gacha & Fans Gain Tracker</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700,800&display=swap" rel="stylesheet" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥕</text></svg>">
    <link rel="apple-touch-icon" href="/pwa-192x192.png">
    <link rel="manifest" href="/build/manifest.webmanifest">
    <script>
        (function() {
            try {
                var saved = localStorage.getItem('uma_dark_mode');
                var isDark = saved !== null ? (saved === 'true') : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                    document.documentElement.classList.add('dark');
                }
            } catch (e) {}
        })();
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen font-['Figtree',sans-serif] antialiased selection:bg-emerald-500 selection:text-white">
    <div id="root"></div>
</body>
</html>
