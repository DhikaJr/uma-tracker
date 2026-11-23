<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\SyncRun;
use App\Models\UmaCatalogItem;
use App\Services\CygamesNewsService;
use App\Services\DataHealthService;
use App\Services\GameToraSyncService;
use App\Support\UmaCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class FebruarySelectPickupCanonicalizationTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith([20030])]
    #[TestWith([20031])]
    public function test_empty_legacy_alias_is_removed_after_the_canonical_lineup_is_saved(int $legacyId): void
    {
        $legacy = $this->februaryBanner($legacyId);
        $canonical = $this->februaryBanner(30415);
        $historicalRun = SyncRun::factory()->create(['status' => SyncRun::STATUS_DEGRADED, 'unresolved_count' => 1]);
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');

        UmaCatalog::syncCanonical2026SelectPickupBanners();
        UmaCatalog::syncCanonical2026SelectPickupBanners();

        $this->assertModelMissing($legacy);
        $this->assertModelExists($canonical);
        $this->assertSame('2026-02-24', $canonical->refresh()->end_date->toDateString());
        $this->assertCount(10, $canonical->featured_items);
        $this->assertSame(UmaCatalog::getSelectPickupCandidates2026()['2026-02-14']['candidates'], $canonical->featured_items);
        $snapshot = app(DataHealthService::class)->snapshot();
        $this->assertSame([], $snapshot['issues']['unresolved_select_pickup_ids']);
        $this->assertSame('healthy', $snapshot['overall_status']);
        $this->assertSame(SyncRun::STATUS_DEGRADED, $historicalRun->refresh()->status);
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_history_is_moved_only_if_the_canonical_banner_has_no_history(bool $canonicalHasHistory): void
    {
        Log::spy();
        $legacy = $this->februaryBanner(20030);
        $canonical = $this->februaryBanner(30415);
        [$legacyPull, $legacyPity] = $this->addHistory($legacy);
        $canonicalHistory = $canonicalHasHistory ? $this->addHistory($canonical) : [];
        $expectedBanner = $canonicalHasHistory ? $legacy : $canonical;
        $legacyPullAttributes = $legacyPull->getAttributes();
        $legacyPityAttributes = $legacyPity->getAttributes();
        $legacyPullAttributes['gacha_banner_id'] = $expectedBanner->id;
        $legacyPityAttributes['gacha_banner_id'] = $expectedBanner->id;

        UmaCatalog::syncCanonical2026SelectPickupBanners();

        $this->assertSame($legacyPullAttributes, $legacyPull->refresh()->getAttributes());
        $this->assertSame($legacyPityAttributes, $legacyPity->refresh()->getAttributes());
        if ($canonicalHasHistory) {
            $this->assertModelExists($legacy);
            foreach ($canonicalHistory as $record) {
                $this->assertSame($canonical->id, $record->refresh()->gacha_banner_id);
            }
            Log::shouldHaveReceived('warning')->with(
                'Banner Select Pick Up Februari legacy dan kanonis sama-sama memiliki riwayat. Kedua banner dipertahankan.',
                ['gametora_id' => 20030, 'legacy_banner_id' => $legacy->id, 'canonical_banner_id' => $canonical->id],
            )->once();
        } else {
            $this->assertModelMissing($legacy);
        }
        $this->assertSame([], GachaBanner::unresolvedSelectPickup()->pluck('gametora_id')->all());
    }

    #[TestWith([['name' => 'Select Pick Up (Feb 2026): bukan identitas alias'], true])]
    #[TestWith([['start_date' => '2026-02-15'], true])]
    #[TestWith([['banner_type' => 'character'], false])]
    #[TestWith([['category' => 'standard'], false])]
    public function test_alias_id_with_different_identity_is_preserved_and_logged(array $overrides, bool $actionable): void
    {
        Log::spy();
        $legacy = $this->februaryBanner(20031, $overrides);
        $original = $legacy->refresh()->getAttributes();

        UmaCatalog::syncCanonical2026SelectPickupBanners();

        $this->assertSame($original, $legacy->refresh()->getAttributes());
        $this->assertSame($actionable, GachaBanner::unresolvedSelectPickup()->whereKey($legacy->id)->exists());
        Log::shouldHaveReceived('warning')->with(
            'Identitas banner Select Pick Up Februari legacy tidak cocok. Banner dipertahankan.',
            ['gametora_id' => 20031, 'legacy_banner_id' => $legacy->id],
        )->once();
    }

    public function test_empty_canonical_banner_remains_actionable_alongside_a_recognized_alias(): void
    {
        $this->februaryBanner(20030);
        $this->februaryBanner(30415);
        SyncRun::factory()->create();
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');

        $snapshot = app(DataHealthService::class)->snapshot();

        $this->assertSame([30415], $snapshot['issues']['unresolved_select_pickup_ids']);
        $this->assertSame(1, $snapshot['issues']['unresolved_select_pickup_count']);
        $this->assertSame('degraded', $snapshot['overall_status']);
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_direct_cygames_recheck_ignores_retained_alias_in_telemetry_and_date_matching(bool $hasAnnouncement): void
    {
        $legacy = $this->februaryBanner(20030);
        $canonical = $this->februaryBanner(30415, [
            'featured_items' => UmaCatalog::getSelectPickupCandidates2026()['2026-02-14']['candidates'],
        ]);
        $this->addHistory($legacy);
        $this->addHistory($canonical);
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $historicalRun = SyncRun::factory()->create(['status' => SyncRun::STATUS_DEGRADED, 'unresolved_count' => 1]);
        $article = [
            'announce_id' => 9010, 'title' => 'セレクトピックアップ サポートカードガチャ',
            'post_at' => '2026-02-14 12:00:00',
            'message' => '<h2>開催期間</h2>2/14 12:00 ～ 2/24 11:59<br>■ピックアップサポートカード候補<br>',
        ];
        if ($hasAnnouncement) {
            foreach (range(1, 10) as $index) {
                $name = "SSR [Fixture {$index}] Card {$index}";
                UmaCatalogItem::create(['type' => 'support_card', 'name' => $name, 'rarity' => 'SSR']);
                $article['message'] .= "・{$name}<br>";
            }
        }
        Http::fake([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(['information_list' => $hasAnnouncement ? [$article] : []]),
            CygamesNewsService::NEWS_DETAIL_URL.'*announce_id=9010' => Http::response(['detail' => $article]),
        ]);

        $response = $this->postJson('/api/data-health/actions/recheck-cygames')->assertOk();

        $response->assertJsonPath('source_status', SyncRun::STATUS_SUCCESS);
        $run = SyncRun::findOrFail($response->json('run_id'));
        $this->assertSame(0, $run->unresolved_count);
        $this->assertSame(SyncRun::TRIGGER_DIRECT, $run->trigger);
        $this->assertSame([], $legacy->refresh()->featured_items);
        $this->assertSame($hasAnnouncement ? CygamesNewsService::NEWS_WEB_BASE_URL.'9010' : null, $canonical->refresh()->getProvenanceUrl());
        $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('health.overall_status', 'healthy')
            ->assertJsonPath('health.issues.unresolved_select_pickup_ids', [])
            ->assertJsonPath('health.sources.gametora.status', $historicalRun->status);
        Http::assertSentCount($hasAnnouncement ? 2 : 1);
    }

    /** @param array<string, mixed> $overrides */
    private function februaryBanner(int $gameToraId, array $overrides = []): GachaBanner
    {
        return GachaBanner::create($overrides + [
            'gametora_id' => $gameToraId, 'banner_type' => 'support_card', 'category' => 'select_rate_up',
            'name' => 'Select Pick Up (Feb 2026)', 'start_date' => '2026-02-14',
            'end_date' => '2026-02-28', 'featured_items' => [],
        ]);
    }

    /** @return array{GachaPull, GachaPity} */
    private function addHistory(GachaBanner $banner): array
    {
        $pull = $banner->pulls()->create([
            'banner_type' => 'support_card', 'pull_type' => 'single', 'item_name' => 'Historical card',
            'rarity' => 'SSR', 'is_rate_up' => false, 'pity_count_at_pull' => 12, 'pulled_at' => now(),
        ]);
        $pity = $banner->pity()->create(['banner_type' => 'support_card', 'current_pity' => 12, 'total_sparks' => 1]);

        return [$pull->refresh(), $pity->refresh()];
    }
}
