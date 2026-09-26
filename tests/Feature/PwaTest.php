<?php

namespace Tests\Feature;

use Tests\TestCase;

class PwaTest extends TestCase
{
    public function test_manifest_webmanifest_has_root_start_url_and_scope(): void
    {
        $response = $this->get('/manifest.webmanifest');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/manifest+json');

        $manifest = json_decode($response->streamedContent(), true);
        $this->assertSame('/', $manifest['start_url'] ?? null);
        $this->assertSame('/', $manifest['scope'] ?? null);
        $this->assertSame('/', $manifest['id'] ?? null);
        $this->assertSame('UmaTracker', $manifest['short_name'] ?? null);
    }

    public function test_build_manifest_webmanifest_endpoint(): void
    {
        $path = public_path('build/manifest.webmanifest');
        $this->assertFileExists($path);

        $manifest = json_decode(file_get_contents($path), true);
        $this->assertSame('/', $manifest['start_url'] ?? null);
        $this->assertSame('/', $manifest['scope'] ?? null);
    }

    public function test_sw_js_returns_service_worker_allowed_header(): void
    {
        $response = $this->get('/sw.js');
        $response->assertStatus(200);
        $response->assertHeader('Service-Worker-Allowed', '/');

        $buildResponse = $this->get('/build/sw.js');
        $buildResponse->assertStatus(200);
        $buildResponse->assertHeader('Service-Worker-Allowed', '/');
    }

    public function test_build_redirects_to_root(): void
    {
        $response = $this->get('/build');
        $response->assertRedirect('/');
    }

    public function test_pwa_icons_exist(): void
    {
        $this->assertFileExists(public_path('pwa-192x192.png'));
        $this->assertFileExists(public_path('pwa-512x512.png'));
    }

    public function test_app_blade_renders_pwa_manifest_and_apple_touch_icon(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertSee('rel="manifest"', false);
        $response->assertSee('rel="apple-touch-icon"', false);
    }
}
