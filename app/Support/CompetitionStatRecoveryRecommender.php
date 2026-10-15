<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\CompetitionEvent;

class CompetitionStatRecoveryRecommender
{
    /**
     * Cache for guides file content.
     *
     * @var array<string, array<string, mixed>>|null
     */
    protected static ?array $guidesCache = null;

    /**
     * Cache for recovery skills catalog.
     *
     * @var array<int, array<string, mixed>>|null
     */
    protected static ?array $recoveryCatalogCache = null;

    /**
     * Determine whether the event has full official confirmed race parameters.
     * Note: Random conditions for weather and track_condition (e.g., in League of Heroes)
     * are officially known parameters, not unannounced/null values.
     */
    public static function isFullyConfirmed(CompetitionEvent $event): bool
    {
        return CompetitionGreenSkillRecommender::isFullyConfirmed($event);
    }

    /**
     * Load verified community event guides from JSON.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function getGuides(): array
    {
        if (self::$guidesCache !== null) {
            return self::$guidesCache;
        }

        $path = resource_path('js/data/competitionEventGuides.json');
        if (! file_exists($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return self::$guidesCache = (is_array($decoded) ? $decoded : []);
    }

    /**
     * Load recovery skills catalog from JSON.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getRecoveryCatalog(): array
    {
        if (self::$recoveryCatalogCache !== null) {
            return self::$recoveryCatalogCache;
        }

        $path = resource_path('js/data/recoverySkillsCatalog.json');
        if (! file_exists($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return self::$recoveryCatalogCache = (is_array($decoded) ? $decoded : []);
    }

    /**
     * Generate recommended stats and recovery guide for a competition event.
     *
     * @return array{
     *     is_fully_confirmed: bool,
     *     has_guide_reference: bool,
     *     source_name?: string,
     *     source_url?: string,
     *     verified_at?: string,
     *     is_community_recommendation?: bool,
     *     benchmark_disclaimer?: string,
     *     scenario_note?: string,
     *     stat_tiers: array<int, array<string, mixed>>,
     *     recovery_guide: ?array<string, mixed>,
     *     reference_recovery_catalog: array<int, array<string, mixed>>,
     *     disclaimer: ?string
     * }
     */
    public static function getRecommendations(CompetitionEvent $event): array
    {
        // Kasus A: Kondisi Resmi Belum Lengkap
        if (! self::isFullyConfirmed($event)) {
            return [
                'is_fully_confirmed' => false,
                'has_guide_reference' => false,
                'stat_tiers' => [],
                'recovery_guide' => null,
                'reference_recovery_catalog' => [],
                'disclaimer' => 'Rekomendasi target stats dan kebutuhan recovery belum ditampilkan karena detail lintasan dan jarak resmi belum diumumkan secara lengkap oleh Cygames.',
            ];
        }

        $guides = self::getGuides();
        $eventKey = (string) ($event->event_key ?? '');
        $guide = $eventKey !== '' ? ($guides[$eventKey] ?? null) : null;

        // Kasus B: Kondisi Resmi Lengkap, tetapi Panduan Komunitas Belum Tersedia
        if (! $guide || empty($guide['stat_tiers'])) {
            return [
                'is_fully_confirmed' => true,
                'has_guide_reference' => false,
                'stat_tiers' => [],
                'recovery_guide' => null,
                'reference_recovery_catalog' => [],
                'disclaimer' => 'Referensi rekomendasi belum tersedia',
            ];
        }

        // Kasus C: Kondisi Resmi Lengkap & Panduan Tersedia di competitionEventGuides.json
        $distCategory = (string) ($event->distance_category ?? '');
        if ($distCategory === '' && $event->distance) {
            $dist = (int) $event->distance;
            if ($dist <= 1400) {
                $distCategory = 'sprint';
            } elseif ($dist <= 1800) {
                $distCategory = 'mile';
            } elseif ($dist <= 2400) {
                $distCategory = 'middle';
            } else {
                $distCategory = 'long';
            }
        }

        $allRecoverySkills = self::getRecoveryCatalog();
        $filteredRecovery = array_values(array_filter($allRecoverySkills, function (array $skill) use ($distCategory): bool {
            if ($distCategory === '') {
                return true;
            }

            // Normalisasi kategori: 'middle' dan 'medium' dianggap ekuivalen (中距離)
            $normEventCat = in_array(strtolower($distCategory), ['medium', 'middle'], true) ? 'medium' : strtolower($distCategory);

            // 1. Periksa distance_categories array jika tersedia
            if (! empty($skill['distance_categories']) && is_array($skill['distance_categories'])) {
                if (in_array('all', $skill['distance_categories'], true)) {
                    return true;
                }
                foreach ($skill['distance_categories'] as $cat) {
                    $normCat = in_array(strtolower((string) $cat), ['medium', 'middle'], true) ? 'medium' : strtolower((string) $cat);
                    if ($normCat === $normEventCat) {
                        return true;
                    }
                }

                return false;
            }

            // 2. Fallback distance_category string
            $skillDist = strtolower((string) ($skill['distance_category'] ?? 'all'));
            if ($skillDist === 'all') {
                return true;
            }

            $normSkillDist = in_array($skillDist, ['medium', 'middle'], true) ? 'medium' : $skillDist;

            return $normSkillDist === $normEventCat;
        }));

        return [
            'is_fully_confirmed' => true,
            'has_guide_reference' => true,
            'source_name' => (string) ($guide['source_name'] ?? 'GameWith'),
            'source_url' => (string) ($guide['source_url'] ?? ''),
            'verified_at' => (string) ($guide['verified_at'] ?? ''),
            'is_community_recommendation' => (bool) ($guide['is_community_recommendation'] ?? true),
            'benchmark_disclaimer' => (string) ($guide['benchmark_disclaimer'] ?? ''),
            'scenario_note' => (string) ($guide['scenario_note'] ?? ''),
            'stat_tiers' => is_array($guide['stat_tiers'] ?? null) ? $guide['stat_tiers'] : [],
            'recovery_guide' => is_array($guide['recovery_guide'] ?? null) ? $guide['recovery_guide'] : null,
            'reference_recovery_catalog' => $filteredRecovery,
            'disclaimer' => null,
        ];
    }
}
