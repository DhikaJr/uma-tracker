<?php

namespace Tests\Feature;

use Tests\TestCase;

class ChangelogApiTest extends TestCase
{
    /**
     * Test fetching the parsed changelog via API.
     */
    public function test_can_fetch_parsed_changelog(): void
    {
        $response = $this->getJson('/api/changelog');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'latest_version',
                'total_versions',
                'header_intro_html',
                'versions' => [
                    '*' => [
                        'version',
                        'title',
                        'date',
                        'highlights',
                        'raw_markdown',
                        'html',
                    ],
                ],
            ]);

        $data = $response->json();

        $this->assertTrue($data['success']);
        $this->assertSame('3.0.0', $data['latest_version']);
        $this->assertGreaterThanOrEqual(23, $data['total_versions']);
        $this->assertNotEmpty($data['versions']);

        // Check latest version details
        $latest = $data['versions'][0];
        $this->assertSame('3.0.0', $latest['version']);
        $this->assertSame('Versi 3.0.0', $latest['title']);
        $this->assertNotEmpty($latest['date']);
        $this->assertNotEmpty($latest['html']);
        $this->assertIsArray($latest['highlights']);
    }
}
