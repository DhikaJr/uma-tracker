<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class BackupApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_backup_stats(): void
    {
        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Special Week',
            'rarity' => 'SSR',
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        CareerRun::create([
            'uma_name' => 'Silence Suzuka',
            'run_date' => now()->toDateString(),
            'scenario' => 'URA Finals',
            'final_rank' => 'A',
            'evaluation_score' => 12000,
            'fans_gained' => 350000,
        ]);

        $response = $this->getJson('/api/backup/stats');
        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('stats.gacha_pulls', 1)
            ->assertJsonPath('stats.career_runs', 1);
    }

    public function test_can_export_backup_json_structure(): void
    {
        GachaBanner::query()->delete();

        $banner = GachaBanner::create([
            'id' => 88801,
            'name' => '5th Anniversary Pretty Derby Gacha (Almond Eye)',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'start_date' => '2026-02-24',
            'end_date' => '2026-03-10',
            'featured_items' => ['Almond Eye'],
            'is_active' => true,
        ]);

        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Almond Eye',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Almond Eye [The Changer]',
            'rarity' => '3',
            'source' => 'gametora',
        ]);

        AppSetting::setValue('monthly_fans_goal', '25000000');

        $response = $this->getJson('/api/backup/export?download=0');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'version',
                'app',
                'exported_at',
                'summary' => [
                    'gacha_pulls',
                    'gacha_pities',
                    'career_runs',
                    'circle_snapshots',
                    'app_settings',
                    'uma_catalog_items',
                    'gacha_banners',
                ],
                'data' => [
                    'gacha_pulls',
                    'gacha_pities',
                    'career_runs',
                    'circle_snapshots',
                    'app_settings',
                    'uma_catalog_items',
                    'gacha_banners',
                ],
            ]);

        $this->assertEquals(1, $response->json('summary.gacha_pulls'));
        $this->assertEquals(1, $response->json('summary.gacha_banners'));
        $this->assertEquals(1, $response->json('summary.uma_catalog_items'));
    }

    public function test_can_export_as_file_download(): void
    {
        $response = $this->get('/api/backup/export?download=1');
        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json');

        $contentDisposition = $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('attachment; filename="uma-companion-backup-', $contentDisposition);
    }

    public function test_can_import_backup_in_merge_mode(): void
    {
        // Existing pull
        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Old Pull',
            'rarity' => 'R',
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        $backupPayload = [
            'version' => '1.0',
            'app' => 'Uma Musume Companion',
            'data' => [
                'app_settings' => [
                    ['key' => 'circle_goal', 'value' => '20000000'],
                ],
                'gacha_banners' => [
                    [
                        'id' => 99901,
                        'name' => 'Twinkle Banner Test',
                        'banner_type' => 'character',
                        'category' => 'twinkle',
                        'base_rate' => 3.00,
                        'start_date' => '2026-05-01',
                        'end_date' => '2026-05-05',
                        'featured_items' => ['Kitasan Black'],
                        'is_active' => true,
                    ],
                ],
                'gacha_pities' => [
                    ['banner_type' => 'character', 'current_pity' => 35, 'total_sparks' => 0],
                ],
                'gacha_pulls' => [
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 99901,
                        'pull_type' => 'single',
                        'item_name' => 'New Imported Pull',
                        'rarity' => 'SSR',
                        'is_rate_up' => true,
                        'pity_count_at_pull' => 35,
                        'pulled_at' => '2026-05-02',
                    ],
                ],
                'career_runs' => [
                    [
                        'uma_name' => 'Tokai Teio',
                        'run_date' => '2026-05-01',
                        'scenario' => 'Tracen-ken',
                        'final_rank' => 'S',
                        'evaluation_score' => 15000,
                        'fans_gained' => 450000,
                    ],
                ],
                'uma_catalog_items' => [
                    [
                        'type' => 'support_card',
                        'name' => 'SSR [Imported Card] Tazuna',
                        'rarity' => '3',
                        'card_type' => 'Friend',
                        'source' => 'gametora',
                    ],
                ],
            ],
        ];

        $jsonFile = UploadedFile::fake()->createWithContent(
            'backup.json',
            json_encode($backupPayload)
        );

        $response = $this->postJson('/api/backup/import', [
            'file' => $jsonFile,
            'mode' => 'merge',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('summary.gacha_pulls', 1)
            ->assertJsonPath('summary.career_runs', 1);

        // In merge mode, old pull should still exist
        $this->assertDatabaseHas('gacha_pulls', ['item_name' => 'Old Pull']);
        $this->assertDatabaseHas('gacha_pulls', ['item_name' => 'New Imported Pull']);
        $this->assertDatabaseHas('career_runs', ['uma_name' => 'Tokai Teio']);
        $this->assertDatabaseHas('gacha_banners', ['id' => 99901]);
        $this->assertEquals(35, GachaPity::forBanner('character')->current_pity);
    }

    public function test_can_import_backup_in_overwrite_mode(): void
    {
        // Pre-existing pull that should be wiped in overwrite
        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Existing Should Be Deleted',
            'rarity' => 'R',
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        $backupPayload = [
            'version' => '1.0',
            'data' => [
                'gacha_pulls' => [
                    [
                        'banner_type' => 'character',
                        'pull_type' => 'single',
                        'item_name' => 'Only This Pull Left',
                        'rarity' => 'SSR',
                        'is_rate_up' => false,
                        'pity_count_at_pull' => 1,
                        'pulled_at' => '2026-06-01',
                    ],
                ],
            ],
        ];

        $response = $this->postJson('/api/backup/import', [
            'data' => $backupPayload,
            'mode' => 'overwrite',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('gacha_pulls', ['item_name' => 'Existing Should Be Deleted']);
        $this->assertDatabaseHas('gacha_pulls', ['item_name' => 'Only This Pull Left']);
        $this->assertEquals(1, GachaPull::count());
    }

    public function test_import_rejects_invalid_json(): void
    {
        $invalidFile = UploadedFile::fake()->createWithContent(
            'bad.json',
            'not a valid json string { '
        );

        $response = $this->postJson('/api/backup/import', [
            'file' => $invalidFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_artisan_backup_and_restore_commands(): void
    {
        $tmpBackupPath = storage_path('app/backups/test-backup-run.json');

        $this->artisan('uma:backup', [
            '--output' => $tmpBackupPath,
            '--pretty' => true,
        ])->assertSuccessful();

        $this->assertTrue(File::exists($tmpBackupPath));

        $this->artisan('uma:restore', [
            'file' => $tmpBackupPath,
            '--mode' => 'merge',
            '--force' => true,
        ])->assertSuccessful();

        // Cleanup
        if (File::exists($tmpBackupPath)) {
            File::delete($tmpBackupPath);
        }
    }

    public function test_import_returns_unresolved_references_when_foreign_key_cannot_be_resolved(): void
    {
        $backupPayload = [
            'version' => '2.0',
            'data' => [
                'user_characters' => [
                    [
                        'name' => 'Completely Unknown Character',
                        'uma_catalog_item_id' => 99999,
                        'base_stars' => 3,
                        'current_stars' => 3,
                        'is_owned' => true,
                    ],
                ],
            ],
        ];

        $response = $this->postJson('/api/backup/import', [
            'data' => $backupPayload,
            'mode' => 'merge',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('unresolved_references.0.entity', 'user_characters')
            ->assertJsonPath('unresolved_references.0.record_name', 'Completely Unknown Character');
    }
}
