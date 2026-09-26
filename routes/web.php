<?php

use Illuminate\Support\Facades\Route;

// PWA Service Worker endpoints with Service-Worker-Allowed header
Route::get('/sw.js', function () {
    $path = public_path('build/sw.js');
    if (! file_exists($path)) {
        abort(404);
    }

    return response()->file($path, [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/',
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
});

Route::get('/build/sw.js', function () {
    $path = public_path('build/sw.js');
    if (! file_exists($path)) {
        abort(404);
    }

    return response()->file($path, [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/',
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
});

// PWA Manifest endpoints
Route::get('/manifest.webmanifest', function () {
    $path = public_path('build/manifest.webmanifest');
    if (! file_exists($path)) {
        abort(404);
    }

    return response()->file($path, [
        'Content-Type' => 'application/manifest+json',
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
});

// Fallback redirect for /build or /build/
Route::get('/build', function () {
    return redirect('/', 302);
});

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
