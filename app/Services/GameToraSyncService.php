<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\UmaCatalogItem;
use App\Support\SkillConditionTranslator;
use App\Support\UmaCatalog;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GameToraSyncService
{
    public const MANIFEST_URL = 'https://gametora.com/data/manifests/umamusume.json';

    public const DATA_BASE_URL = 'https://gametora.com/data/umamusume';

    /**
     * Get the latest sync status.
     *
     * @return array<string, mixed>
     */
    public function getStatus(): array
    {
        return [
            'last_synced_at' => AppSetting::getValue('gametora_last_synced_at'),
            'total_characters' => UmaCatalogItem::where('type', 'character')->count() ?: count(UmaCatalog::getCharacters()),
            'total_with_skills' => UmaCatalogItem::where('type', 'character')->whereNotNull('skills')->count(),
            'total_support_cards' => UmaCatalogItem::where('type', 'support_card')->count() ?: count(UmaCatalog::getSupportCards()),
            'total_with_details' => UmaCatalogItem::where('type', 'support_card')->whereNotNull('details')->count(),
            'total_base_umas' => UmaCatalogItem::where('type', 'base_uma')->count() ?: count(UmaCatalog::getBaseUmaList()),
            'total_banners' => GachaBanner::count(),
        ];
    }

    /**
     * Synchronize catalog from GameTora JP production datasets.
     *
     * @return array{success: bool, is_up_to_date: bool, message: string, stats?: array<string, mixed>}
     */
    public function sync(bool $force = false): array
    {
        try {
            // 1. Fetch manifest
            $manifestRes = Http::withoutVerifying()
                ->timeout(20)
                ->get(self::MANIFEST_URL);

            if (! $manifestRes->successful()) {
                throw new Exception("Gagal mengunduh manifest GameTora: HTTP {$manifestRes->status()}");
            }

            $manifest = $manifestRes->json() ?? [];
            $charCardHash = $manifest['character-cards'] ?? null;
            $charBaseHash = $manifest['characters'] ?? null;
            $supportHash = $manifest['support-cards'] ?? null;
            $skillsHash = $manifest['skills'] ?? null;
            $objHash = $manifest['ura-objectives'] ?? null;

            if (! $charCardHash || ! $supportHash) {
                throw new Exception('Struktur manifest GameTora tidak valid.');
            }

            $charStdHash = $manifest['gacha/char-standard'] ?? '';
            $suppStdHash = $manifest['gacha/support-standard'] ?? '';
            $specialHash = $manifest['gacha/special'] ?? '';
            $charBannersHash = $manifest['gacha/char_banners'] ?? '';
            $suppBannersHash = $manifest['gacha/support_banners'] ?? '';
            $racetracksHash = $manifest['racetracks'] ?? '';
            $racetracksExtHash = $manifest['racetracks_extended'] ?? '';

            $combinedHash = "{$charBaseHash}|{$charCardHash}|{$supportHash}|{$skillsHash}|{$objHash}|{$charStdHash}|{$suppStdHash}|{$specialHash}|{$charBannersHash}|{$suppBannersHash}|{$racetracksHash}|{$racetracksExtHash}";
            $savedHash = (string) AppSetting::getValue('gametora_manifest_hash', '');

            if (! $force && $savedHash === $combinedHash && UmaCatalogItem::count() > 0 && GachaBanner::count() > 0) {
                return [
                    'success' => true,
                    'is_up_to_date' => true,
                    'message' => 'Katalog sudah yang paling baru sesuai database GameTora Jepang!',
                    'stats' => $this->getStatus(),
                ];
            }

            // 2. Fetch Playable Character Cards (Variants & Costumes)
            $charCardsUrl = self::DATA_BASE_URL."/character-cards.{$charCardHash}.json";
            $charCardsRes = Http::withoutVerifying()->timeout(30)->get($charCardsUrl);
            if (! $charCardsRes->successful()) {
                throw new Exception("Gagal mengunduh kartu karakter: HTTP {$charCardsRes->status()}");
            }
            $rawCharCards = $charCardsRes->json() ?? [];

            // 3. Fetch Base Characters
            $baseCharsUrl = self::DATA_BASE_URL."/characters.{$charBaseHash}.json";
            $baseCharsRes = Http::withoutVerifying()->timeout(30)->get($baseCharsUrl);
            $rawBaseChars = $baseCharsRes->successful() ? ($baseCharsRes->json() ?? []) : [];

            // 4. Fetch Support Cards
            $supportCardsUrl = self::DATA_BASE_URL."/support-cards.{$supportHash}.json";
            $supportCardsRes = Http::withoutVerifying()->timeout(30)->get($supportCardsUrl);
            if (! $supportCardsRes->successful()) {
                throw new Exception("Gagal mengunduh support cards: HTTP {$supportCardsRes->status()}");
            }
            $rawSupportCards = $supportCardsRes->json() ?? [];

            // 5. Fetch Skills, Evo Strings, Races, Objectives & Support Effects Datasets
            $skillsById = $this->loadSkillsLookup($skillsHash);
            $objectivesLookup = $this->loadObjectivesLookup($objHash);
            $evoHash = $manifest['static/evo_strings'] ?? null;
            $evoLookup = $this->loadEvoStringsLookup($evoHash);
            $racesHash = $manifest['races'] ?? null;
            $racesById = $this->loadRacesLookup($racesHash);
            $effHash = $manifest['support_effects'] ?? null;
            $effectsMap = $this->loadSupportEffectsLookup($effHash);

            // Build map of playable base names from character cards
            $playableBaseNames = [];
            foreach ($rawCharCards as $c) {
                $cNameEn = trim($c['name_en'] ?? '');
                if ($cNameEn !== '' && ! in_array($cNameEn, UmaCatalog::NON_PLAYABLE_NAMES, true)) {
                    $playableBaseNames[$cNameEn] = true;
                }
            }

            // Process & Upsert Base Characters (strictly for playable trainees who have character cards)
            $newBaseCount = 0;
            $processedBaseNames = [];
            foreach ($rawBaseChars as $bc) {
                $enName = trim($bc['en_name'] ?? '');
                $charId = (int) ($bc['id'] ?? 0);
                if (
                    $charId >= 9000 ||
                    in_array($enName, UmaCatalog::NON_PLAYABLE_NAMES, true) ||
                    (! empty($playableBaseNames) && ! isset($playableBaseNames[$enName]))
                ) {
                    continue;
                }
                if ($enName !== '' && ! in_array($enName, $processedBaseNames, true)) {
                    $processedBaseNames[] = $enName;
                    UmaCatalogItem::updateOrCreate(
                        ['type' => 'base_uma', 'name' => $enName],
                        ['rarity' => 'SSR', 'gametora_id' => $bc['id'] ?? null, 'raw_data' => $bc]
                    );
                    $newBaseCount++;
                }
            }

            // Ensure any non-playable characters or unreleased characters previously saved as base_uma are removed
            UmaCatalogItem::where('type', 'base_uma')
                ->where(function ($query) use ($playableBaseNames) {
                    $query->whereIn('name', UmaCatalog::NON_PLAYABLE_NAMES);
                    if (! empty($playableBaseNames)) {
                        $query->orWhereNotIn('name', array_keys($playableBaseNames));
                    }
                })
                ->delete();

            // Ensure popular newly added JP umas exist in base list
            $fallbackUmas = ['Phalaenopsis', 'Epiphaneia', 'Cesario', 'Duramente', 'Orfevre', 'Gentildonna', 'Almond Eye'];
            foreach ($fallbackUmas as $uma) {
                if (! in_array($uma, $processedBaseNames, true) && ! in_array($uma, UmaCatalog::NON_PLAYABLE_NAMES, true)) {
                    UmaCatalogItem::updateOrCreate(
                        ['type' => 'base_uma', 'name' => $uma],
                        ['rarity' => 'SSR']
                    );
                }
            }

            // Process & Upsert Character Variants (Alt Costumes)
            $newCharCount = 0;
            foreach ($rawCharCards as $c) {
                $nameEn = trim($c['name_en'] ?? '');
                if ($nameEn === '' || in_array($nameEn, UmaCatalog::NON_PLAYABLE_NAMES, true)) {
                    continue;
                }

                $title = $c['title_en_gl'] ?? $c['title'] ?? $c['title_jp'] ?? $c['title_ja'] ?? '';
                $title = trim(preg_replace('/^[\[\s]+|[\]\s]+$/u', '', $title));

                if ($title === '' && $nameEn === 'Phalaenopsis') {
                    $title = '絶佳の暁闇';
                }

                $fullName = $title !== '' ? "{$nameEn} [{$title}]" : $nameEn;
                $rarity = ($c['rarity'] ?? 3) === 3 ? 'SSR' : (($c['rarity'] ?? 2) === 2 ? 'SR' : 'R');

                $charId = $c['char_id'] ?? null;
                $cardId = $c['card_id'] ?? $c['id'] ?? null;
                $imageUrl = ($charId && $cardId)
                    ? "https://gametora.com/images/umamusume/characters/thumb/chara_stand_{$charId}_{$cardId}.png"
                    : null;
                $imageFull = ($charId && $cardId)
                    ? "https://gametora.com/images/umamusume/characters/chara_stand_{$charId}_{$cardId}.png"
                    : null;
                $c['image_url'] = $imageUrl;
                $c['image_full'] = $imageFull;
                $c['icon'] = $imageUrl;
                $c['thumb'] = $imageUrl;

                $aptitudes = $this->parseCharacterAptitudes($c);
                $skills = $this->parseCharacterSkills($c, $skillsById, $evoLookup, $racesById);
                $rawObjectives = $charId ? ($objectivesLookup[(int) $charId] ?? []) : [];
                $objectives = ! empty($rawObjectives) ? $this->formatCharacterObjectives($rawObjectives, $nameEn) : null;

                UmaCatalogItem::updateOrCreate(
                    ['type' => 'character', 'name' => $fullName],
                    [
                        'rarity' => $rarity,
                        'gametora_id' => $c['id'] ?? null,
                        'raw_data' => $c,
                        'aptitudes' => $aptitudes,
                        'skills' => $skills,
                        'objectives' => $objectives,
                    ]
                );
                $newCharCount++;
            }

            // Process & Upsert Support Cards
            $newSupportCount = 0;
            foreach ($rawSupportCards as $s) {
                $charName = trim($s['char_name'] ?? '');
                if ($charName === '') {
                    continue;
                }

                $rarityStr = ($s['rarity'] ?? 3) === 3 ? 'SSR' : (($s['rarity'] ?? 2) === 2 ? 'SR' : 'R');
                $title = $s['title_en'] ?? $s['title_ja'] ?? '';
                if ($title === '[トレセン学園]') {
                    $title = 'Tracen Academy';
                } elseif ($title === '[URA職員]') {
                    $title = 'URA Staff';
                }
                $title = trim(preg_replace('/^[\[\s]+|[\]\s]+$/u', '', $title));

                $typeStr = ucfirst(trim($s['type'] ?? ''));
                $cardFullName = "{$rarityStr} [{$title}] {$charName}".($typeStr !== '' ? " ({$typeStr})" : '');

                $supportId = $s['support_id'] ?? $s['id'] ?? null;
                $imageUrl = $supportId
                    ? "https://media.gametora.com/umamusume/supports/full/small/{$supportId}.png"
                    : null;
                $imageFull = $supportId
                    ? "https://media.gametora.com/umamusume/supports/full/{$supportId}.png"
                    : null;
                $iconUrl = $supportId
                    ? "https://gametora.com/images/umamusume/supports/support_card_s_{$supportId}.png"
                    : null;

                $s['image_url'] = $imageUrl;
                $s['image_full'] = $imageFull;
                $s['icon'] = $iconUrl;
                $s['thumb'] = $imageUrl;

                $details = $this->formatSupportCardDetails($s, $skillsById, $effectsMap);

                UmaCatalogItem::updateOrCreate(
                    ['type' => 'support_card', 'name' => $cardFullName],
                    [
                        'rarity' => $rarityStr,
                        'gametora_id' => $s['id'] ?? null,
                        'raw_data' => $s,
                        'details' => $details,
                    ]
                );
                $newSupportCount++;
            }

            // 5. Synchronize 2026 Gacha Banners
            $newBannerCount = $this->sync2026Banners($manifest, $rawCharCards, $rawSupportCards);

            // 6. Synchronize Racetracks & Courses Catalog
            $this->syncRacetracks($manifest);

            // Save sync hashes and timestamp
            AppSetting::setValue('gametora_manifest_hash', $combinedHash);
            AppSetting::setValue('gametora_last_synced_at', now()->toIso8601String());

            // Reset in-memory cache in UmaCatalog
            UmaCatalog::clearCache();

            return [
                'success' => true,
                'is_up_to_date' => false,
                'message' => "Katalog GameTora berhasil disinkronkan! ({$newCharCount} varian karakter, {$newSupportCount} support card, {$newBannerCount} banner gacha 2026).",
                'stats' => $this->getStatus(),
            ];
        } catch (Exception $e) {
            Log::error('GameTora catalog sync error: '.$e->getMessage());

            return [
                'success' => false,
                'is_up_to_date' => false,
                'message' => 'Gagal menyinkronkan data dari GameTora: '.$e->getMessage(),
                'stats' => $this->getStatus(),
            ];
        }
    }

    /**
     * Synchronize racetracks and course metadata from GameTora datasets.
     *
     * @param  array<string, mixed>  $manifest
     */
    protected function syncRacetracks(array $manifest): void
    {
        try {
            $tracksHash = $manifest['racetracks'] ?? null;
            $tracksExtHash = $manifest['racetracks_extended'] ?? null;
            if (! $tracksHash || ! $tracksExtHash) {
                return;
            }

            $tracksUrl = self::DATA_BASE_URL."/racetracks.{$tracksHash}.json";
            $tracksExtUrl = self::DATA_BASE_URL."/racetracks_extended.{$tracksExtHash}.json";

            $tracksRes = Http::withoutVerifying()->timeout(25)->get($tracksUrl);
            $tracksExtRes = Http::withoutVerifying()->timeout(25)->get($tracksExtUrl);

            if (! $tracksRes->successful() || ! $tracksExtRes->successful()) {
                return;
            }

            $rawTracks = $tracksRes->json() ?? [];
            $rawExtTracks = $tracksExtRes->json() ?? [];

            $extMap = [];
            foreach ($rawExtTracks as $et) {
                $extMap[$et['id']] = $et;
            }

            $catalog = [];
            foreach ($rawTracks as $t) {
                $tId = $t['id'];
                $info = $extMap[$tId] ?? [];
                $nameEn = $info['name_en'] ?? '';
                $nameJa = $info['name_ja'] ?? '';
                $slug = strtolower(str_replace(' ', '-', $nameEn));

                $processedCourses = [];
                foreach ($t['courses'] ?? [] as $c) {
                    $inoutStr = '';
                    if (($c['inout'] ?? 0) === 2) {
                        $inoutStr = 'inner';
                    } elseif (($c['inout'] ?? 0) === 3) {
                        $inoutStr = 'outer';
                    } elseif (($c['inout'] ?? 0) === 4) {
                        $inoutStr = 'outer-to-inner';
                    } elseif (($c['inout'] ?? 0) === 99999) {
                        $inoutStr = 'varies';
                    }

                    $surfaceStr = ($c['terrain'] ?? 1) === 1 ? 'turf' : 'dirt';
                    $gametoraHash = ($c['length'] ?? 0).'-'.$surfaceStr.($inoutStr !== '' ? '-'.$inoutStr : '');

                    $processedCourses[] = [
                        'id' => $c['id'],
                        'length' => $c['length'],
                        'terrain' => $c['terrain'],
                        'surface' => $surfaceStr,
                        'inout' => $c['inout'],
                        'inout_str' => $inoutStr,
                        'turn' => $c['turn'] ?? 1,
                        'laps' => $c['laps'] ?? [],
                        'phases' => $c['phases'] ?? [],
                        'corners' => $c['corners'] ?? [],
                        'straights' => $c['straights'] ?? [],
                        'slopes' => $c['slopes'] ?? [],
                        'positionKeepEnd' => $c['positionKeepEnd'] ?? 0,
                        'spurtStart' => $c['spurtStart'] ?? ['meters' => 0, 'location' => []],
                        'statThresholds' => $c['statThresholds'] ?? [],
                        'overlaps' => $c['overlaps'] ?? [],
                        'noMansLand' => $c['noMansLand'] ?? [],
                        'gametora_hash' => $gametoraHash,
                        'gametora_url' => "https://gametora.com/umamusume/racetracks/{$slug}#{$gametoraHash}",
                        'image_urls' => [
                            'simple' => "https://media.gametora.com/umamusume/racetrack/simple/en/{$tId}/{$c['id']}.png",
                            'full' => "https://media.gametora.com/umamusume/racetrack/full/en/{$tId}/{$c['id']}.png",
                            'laps' => array_map(function ($lap) use ($tId, $c) {
                                return [
                                    'lap' => $lap['lap'],
                                    'url' => "https://media.gametora.com/umamusume/racetrack/simple/en/{$tId}/{$c['id']}_lap{$lap['lap']}.png",
                                    'full_url' => "https://media.gametora.com/umamusume/racetrack/full/en/{$tId}/{$c['id']}_lap{$lap['lap']}.png",
                                ];
                            }, $c['laps'] ?? []),
                        ],
                    ];
                }

                $catalog[] = [
                    'id' => $tId,
                    'name_en' => $nameEn,
                    'name_ja' => $nameJa,
                    'slug' => $slug,
                    'country' => $info['country'] ?? 'jp',
                    'courses' => $processedCourses,
                ];
            }

            $outPath = resource_path('js/data/racetracksCatalog.json');
            file_put_contents($outPath, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } catch (Exception $e) {
            Log::warning('Gagal menyinkronkan racetracks GameTora: '.$e->getMessage());
        }
    }

    /**
     * Synchronize 2026 JP Gacha Banners from GameTora datasets.
     *
     * @param  array<string, mixed>  $manifest
     * @param  array<int, array<string, mixed>>  $rawCharCards
     * @param  array<int, array<string, mixed>>  $rawSupportCards
     */
    protected function sync2026Banners(array $manifest, array $rawCharCards, array $rawSupportCards): int
    {
        // Title translations mapping from English wiki / Umapyoi for known Japanese titles
        $titleTranslations = [
            'マジックナイトガーランド' => 'Magic Night Garland',
            'すまいる・まい・うぇい！' => 'sMile My Way!',
            '絶佳の暁闇' => 'Noble Fleur',
        ];

        // 1. Build lookup tables for character & support names
        $charCards = [];
        foreach ($rawCharCards as $c) {
            $cardId = $c['card_id'] ?? null;
            if ($cardId) {
                $title = $c['title_en_gl'] ?? $c['title_jp'] ?? '';
                $title = trim(preg_replace('/^[\[\s]+|[\]\s]+$/u', '', $title));
                if (isset($titleTranslations[$title])) {
                    $title = $titleTranslations[$title];
                }
                $charCards[$cardId] = $c['name_en'].($title !== '' ? " [{$title}]" : '');
            }
        }

        $suppCards = [];
        foreach ($rawSupportCards as $s) {
            $suppId = $s['support_id'] ?? null;
            if ($suppId) {
                $r = ($s['rarity'] ?? 3) === 3 ? 'SSR' : (($s['rarity'] ?? 2) === 2 ? 'SR' : 'R');
                $title = $s['title_en'] ?? $s['title_ja'] ?? '';
                $title = trim(preg_replace('/^[\[\s]+|[\]\s]+$/u', '', $title));
                $suppCards[$suppId] = "{$r} [{$title}] {$s['char_name']}";
            }
        }

        // 2. Fetch and map character & support banner relations
        $charBannerItems = [];
        $charBannersHash = $manifest['gacha/char_banners'] ?? null;
        if ($charBannersHash) {
            $url = self::DATA_BASE_URL."/gacha/char_banners.{$charBannersHash}.json";
            $res = Http::withoutVerifying()->timeout(25)->get($url);
            if ($res->successful()) {
                foreach ($res->json() ?? [] as $cb) {
                    $cardId = $cb['card_id'] ?? null;
                    foreach ($cb['banners']['ja'] ?? [] as $b) {
                        $bId = $b['id'] ?? null;
                        if ($bId && $cardId && isset($charCards[$cardId])) {
                            $charBannerItems[$bId][] = $charCards[$cardId];
                        }
                    }
                }
            }
        }

        $suppBannerItems = [];
        $suppBannersHash = $manifest['gacha/support_banners'] ?? null;
        if ($suppBannersHash) {
            $url = self::DATA_BASE_URL."/gacha/support_banners.{$suppBannersHash}.json";
            $res = Http::withoutVerifying()->timeout(25)->get($url);
            if ($res->successful()) {
                foreach ($res->json() ?? [] as $sb) {
                    $suppId = $sb['support_id'] ?? null;
                    foreach ($sb['banners']['ja'] ?? [] as $b) {
                        $bId = $b['id'] ?? null;
                        if ($bId && $suppId && isset($suppCards[$suppId])) {
                            $suppBannerItems[$bId][] = $suppCards[$suppId];
                        }
                    }
                }
            }
        }

        $syncedCount = 0;

        // 3. Process Standard Character Banners (2026)
        $charStdHash = $manifest['gacha/char-standard'] ?? null;
        if ($charStdHash) {
            $url = self::DATA_BASE_URL."/gacha/char-standard.{$charStdHash}.json";
            $res = Http::withoutVerifying()->timeout(25)->get($url);
            if ($res->successful()) {
                foreach ($res->json() ?? [] as $b) {
                    $start = $b['start'] ?? 0;
                    $is2026Active = (date('Y', $start) === '2026') || (isset($b['end']) && date('Y', $b['end']) === '2026');
                    if (! $is2026Active) {
                        continue;
                    }

                    $id = $b['id'];
                    $startDate = date('Y-m-d', $start);
                    $endDate = isset($b['end']) ? date('Y-m-d', $b['end']) : null;
                    $items = array_values(array_unique($charBannerItems[$id] ?? []));

                    // Fallback: extract featured items from pickups or lineup[7500] if char_banners has not indexed them yet
                    if (empty($items)) {
                        if (isset($b['pickups']) && is_array($b['pickups'])) {
                            foreach ($b['pickups'] as $p) {
                                $cardId = $p[0] ?? null;
                                if ($cardId && isset($charCards[$cardId])) {
                                    $items[] = $charCards[$cardId];
                                }
                            }
                        }
                        if (empty($items) && isset($b['lineup']['7500']) && is_array($b['lineup']['7500'])) {
                            foreach ($b['lineup']['7500'] as $cardId) {
                                if (isset($charCards[$cardId])) {
                                    $items[] = $charCards[$cardId];
                                }
                            }
                        }
                        $items = array_values(array_unique($items));
                    }

                    if (empty($items)) {
                        continue;
                    }

                    $cat = 'standard';
                    $prefix = 'Pretty Derby Gacha';
                    $baseRate = 3.00;

                    // Official Cygames 4.5% Premium Pretty Derby Gacha rules
                    if ($startDate === '2026-02-24') {
                        $cat = 'anniversary';
                        $prefix = '5th Anniv. Premium Pretty Derby Gacha (Almond Eye & Forever Young)';
                        $baseRate = 4.50;
                    } elseif ($startDate === '2026-08-24') {
                        $cat = 'anniversary';
                        $prefix = '5.5th Anniv. Premium Pretty Derby Gacha (Epiphaneia)';
                        $baseRate = 4.50;
                        $endDate = '2026-09-26';
                    } elseif ($startDate === '2025-12-11') {
                        $cat = 'premium';
                        $prefix = '新衣装Oguri Cap登場! Premium Pretty Derby Gacha';
                        $baseRate = 4.50;
                    } elseif ($startDate === '2025-12-21') {
                        $cat = 'premium';
                        $prefix = 'Stay Gold登場! Premium Pretty Derby Gacha';
                        $baseRate = 4.50;
                    } elseif ($startDate === '2024-06-13') {
                        $cat = 'premium';
                        $prefix = '劇場版『ウマ娘』公開記念 プリティーダービーガチャ';
                        $baseRate = 4.50;
                    } elseif ($startDate === '2024-08-24' || $startDate === '2025-02-24' || $startDate === '2025-08-24') {
                        $cat = 'anniversary';
                        $prefix = 'Premium Pretty Derby Gacha';
                        $baseRate = 4.50;
                    } elseif ($startDate === '2026-06-29') {
                        $cat = 'scenario_release';
                        $prefix = 'Scenario Release (Tracen-ken)';
                    } elseif ($id === 30468 || $id === 30470 || count($items) === 1) {
                        $prefix = 'Pickup Pretty Derby Gacha';
                    }

                    $itemText = count($items) > 0 ? implode(' & ', $items) : 'Pickup Character';
                    $title = "{$prefix}: {$itemText}";

                    GachaBanner::updateOrCreate(
                        ['gametora_id' => $id, 'banner_type' => 'character'],
                        [
                            'category' => $cat,
                            'base_rate' => $baseRate,
                            'name' => $title,
                            'featured_items' => $items,
                            'start_date' => $startDate,
                            'end_date' => $endDate,
                            'is_active' => true,
                        ]
                    );
                    $syncedCount++;
                }
            }
        }

        // 4. Process Standard Support Card Banners (2026)
        $suppStdHash = $manifest['gacha/support-standard'] ?? null;
        if ($suppStdHash) {
            $url = self::DATA_BASE_URL."/gacha/support-standard.{$suppStdHash}.json";
            $res = Http::withoutVerifying()->timeout(25)->get($url);
            if ($res->successful()) {
                foreach ($res->json() ?? [] as $b) {
                    $start = $b['start'] ?? 0;
                    if (date('Y', $start) !== '2026') {
                        continue;
                    }

                    $id = $b['id'];
                    $startDate = date('Y-m-d', $start);
                    $endDate = isset($b['end']) ? date('Y-m-d', $b['end']) : null;
                    $items = array_values(array_unique($suppBannerItems[$id] ?? []));

                    // Fallback: extract featured items from pickups or lineup[7500] if support_banners has not indexed them yet
                    if (empty($items)) {
                        if (isset($b['pickups']) && is_array($b['pickups'])) {
                            foreach ($b['pickups'] as $p) {
                                $suppId = $p[0] ?? null;
                                if ($suppId && isset($suppCards[$suppId])) {
                                    $items[] = $suppCards[$suppId];
                                }
                            }
                        }
                        if (empty($items) && isset($b['lineup']['7500']) && is_array($b['lineup']['7500'])) {
                            foreach ($b['lineup']['7500'] as $suppId) {
                                if (isset($suppCards[$suppId])) {
                                    $items[] = $suppCards[$suppId];
                                }
                            }
                        }
                        $items = array_values(array_unique($items));
                    }

                    if (empty($items)) {
                        continue;
                    }

                    $cat = 'standard';
                    $prefix = 'Support Card Gacha';
                    if ($startDate === '2026-02-24') {
                        $cat = 'anniversary';
                        $prefix = '5th Anniversary Support (Beyond Dreams)';
                    } elseif ($startDate === '2026-06-29') {
                        $cat = 'scenario_release';
                        $prefix = 'Scenario Release Support (Tracen-ken)';
                    } elseif ($startDate === '2026-08-24') {
                        $cat = 'anniversary';
                        $prefix = '5.5th Half Anniversary Support: SSR [As if Guided] Efforia & SSR [時に交わる海と空] Mr. C.B.';
                    }

                    $itemText = count($items) > 0 ? implode(' & ', array_slice($items, 0, 2)) : 'Pickup Support Card';
                    $title = "{$prefix}: {$itemText}";

                    GachaBanner::updateOrCreate(
                        ['gametora_id' => $id, 'banner_type' => 'support_card'],
                        [
                            'category' => $cat,
                            'base_rate' => 3.00,
                            'name' => $title,
                            'featured_items' => $items,
                            'start_date' => $startDate,
                            'end_date' => $endDate,
                            'is_active' => true,
                        ]
                    );
                    $syncedCount++;
                }
            }
        }

        // 5. Fetch Twinkle Collection Lineups from Umapyoi News (with GameTora rateKey 3750 fallback)
        $umapyoiTwinkle = $this->fetchUmapyoiTwinkleLineups();

        // 6. Process Special Banners (Twinkle Collection & Select Rate Up) (2026 non-paid)
        $specialHash = $manifest['gacha/special'] ?? null;
        if ($specialHash) {
            $url = self::DATA_BASE_URL."/gacha/special.{$specialHash}.json";
            $res = Http::withoutVerifying()->timeout(25)->get($url);
            if ($res->successful()) {
                foreach ($res->json() ?? [] as $b) {
                    $start = $b['start'] ?? 0;
                    if (date('Y', $start) !== '2026') {
                        continue;
                    }
                    // Filter out paid-only gacha (scam_gacha / premium restriction)
                    if (! empty($b['scam_gacha']) || ($b['restriction'] ?? '') === 'premium') {
                        continue;
                    }

                    $id = $b['id'];
                    $startDate = date('Y-m-d', $start);
                    $endDate = isset($b['end']) ? date('Y-m-d', $b['end']) : null;
                    if ($endDate === null || str_starts_with($endDate, '2050')) {
                        $endDate = date('Y-m-t', $start);
                    }
                    $monthName = date('M Y', $start);
                    $monthKey = date('Y-m', $start);

                    $charItems = array_values(array_unique($charBannerItems[$id] ?? []));
                    $suppItems = array_values(array_unique($suppBannerItems[$id] ?? []));

                    if (isset($b['lineup']) && is_array($b['lineup'])) {
                        foreach ($b['lineup'] as $ids) {
                            if (is_array($ids)) {
                                foreach ($ids as $cardId) {
                                    if (isset($charCards[$cardId]) && ! in_array($charCards[$cardId], $charItems, true)) {
                                        $charItems[] = $charCards[$cardId];
                                    }
                                    if (isset($suppCards[$cardId]) && ! in_array($suppCards[$cardId], $suppItems, true)) {
                                        $suppItems[] = $suppCards[$cardId];
                                    }
                                }
                            }
                        }
                    }

                    $day = (int) date('d', $start);
                    $isTwinkle = ($day <= 5 && (count($charItems) > 0 || isset($b['lineup']['3750'])));

                    if ($isTwinkle) {
                        $cat = 'twinkle';
                        $bannerType = 'character';
                        $title = "The Twinkle Collection Pretty Derby Gacha ({$monthName})";

                        // Priority 1: Umapyoi news extraction
                        $featuredItems = $umapyoiTwinkle[$id] ?? $umapyoiTwinkle[$monthKey] ?? [];

                        // Priority 2: GameTora rateKey 3750 fallback (contains the 8 featured card IDs)
                        if (empty($featuredItems) && isset($b['lineup']['3750']) && is_array($b['lineup']['3750'])) {
                            foreach ($b['lineup']['3750'] as $cardId) {
                                if (isset($charCards[$cardId])) {
                                    $featuredItems[] = $charCards[$cardId];
                                }
                            }
                        }

                        // Priority 3: Fallback list of 8 characters for September 2026
                        if (empty($featuredItems) && $monthKey === '2026-09') {
                            $featuredItems = [
                                'Hishi Akebono [Magic Night Garland]',
                                'Sakura Chiyono O [Fleur Enneigée]',
                                'Daiichi Ruby [Flowing Blue]',
                                'Mejiro Ramonu [Untouchable Eden]',
                                'Verxina [Le Beau Sommet]',
                                'Buena Vista [Heroína Inocente]',
                                'Durandal [Chevalier Fidèle]',
                                'Gran Alegria [sMile My Way!]',
                            ];
                        }

                        if (empty($featuredItems)) {
                            $featuredItems = array_slice($charItems, 0, 8);
                        }
                    } else {
                        $cat = 'select_rate_up';
                        $bannerType = 'support_card'; // Select Pick Up is strictly for support cards in 2026
                        $prefix = "Select Pick Up ({$monthName})";

                        $canonicalSelect = UmaCatalog::getSelectPickupCandidates2026();
                        $featuredItems = $canonicalSelect[$startDate]['candidates'] ?? [];

                        if (empty($featuredItems)) {
                            foreach ($canonicalSelect as $sDate => $info) {
                                if (substr($sDate, 0, 7) === $monthKey) {
                                    $featuredItems = $info['candidates'];
                                    break;
                                }
                            }
                        }

                        if (empty($featuredItems) && isset($b['lineup']['7500']) && is_array($b['lineup']['7500'])) {
                            foreach ($b['lineup']['7500'] as $cardId) {
                                if (isset($suppCards[$cardId])) {
                                    $featuredItems[] = $suppCards[$cardId];
                                }
                            }
                        }

                        if (empty($featuredItems)) {
                            $featuredItems = array_slice($suppItems, 0, 10);
                        }

                        $title = $prefix;
                    }

                    GachaBanner::updateOrCreate(
                        ['gametora_id' => $id, 'banner_type' => $bannerType],
                        [
                            'category' => $cat,
                            'base_rate' => 3.00,
                            'name' => $title,
                            'featured_items' => $featuredItems,
                            'start_date' => $startDate,
                            'end_date' => $endDate,
                            'is_active' => true,
                        ]
                    );
                    $syncedCount++;
                }
            }
        }

        // Clean up: delete any select_rate_up banners assigned to character
        GachaBanner::where('category', 'select_rate_up')
            ->where('banner_type', 'character')
            ->delete();

        // Delete stale duplicate Feb 2026 support banner (20031)
        GachaBanner::where('gametora_id', 20031)->delete();

        // Ensure all 9 official 2026 Select Pick Up Support Card banners are seeded
        foreach (UmaCatalog::getSelectPickupCandidates2026() as $sp) {
            GachaBanner::updateOrCreate(
                ['gametora_id' => $sp['gametora_id'], 'banner_type' => 'support_card'],
                [
                    'category' => 'select_rate_up',
                    'base_rate' => 3.00,
                    'name' => $sp['name'],
                    'featured_items' => $sp['candidates'],
                    'start_date' => $sp['start_date'],
                    'end_date' => $sp['end_date'],
                    'is_active' => true,
                ]
            );
        }

        // Normalize any existing Select Pick Up banner titles in database to remove appended item lists
        GachaBanner::where('category', 'select_rate_up')
            ->orWhere('name', 'LIKE', 'Select Pick Up%')
            ->get()
            ->each(function (GachaBanner $banner) {
                if (preg_match('/^(Select Pick Up \([A-Za-z]+ \d{4}\))/i', $banner->name, $matches)) {
                    if ($banner->name !== $matches[1]) {
                        $banner->update(['name' => $matches[1]]);
                    }
                }
            });

        return $syncedCount;
    }

    /**
     * Fetch Twinkle Collection announcements from Umapyoi and extract Eligible Umamusume lineups.
     *
     * @return array<string|int, array<int, string>> Maps banner ID (or 'YYYY-MM') to array of eligible character strings
     */
    protected function fetchUmapyoiTwinkleLineups(): array
    {
        $lineups = [];
        try {
            $searchRes = Http::withoutVerifying()->timeout(8)->get('https://umapyoi.net/api/v1/news/search/twinkle');
            if (! $searchRes->successful()) {
                return [];
            }

            $newsList = $searchRes->json() ?? [];
            foreach ($newsList as $n) {
                $title = $n['title_english'] ?? $n['title'] ?? '';
                if (stripos($title, 'Twinkle Collection') === false) {
                    continue;
                }
                if (stripos($title, 'Preview') !== false || stripos($title, 'Announcement') !== false) {
                    continue;
                }

                $announceId = $n['announce_id'] ?? null;
                $postAt = $n['post_at'] ?? 0;
                if (! $announceId || ($postAt > 0 && date('Y', $postAt) < '2026')) {
                    continue;
                }

                $detailRes = Http::withoutVerifying()->timeout(6)->get("https://umapyoi.net/api/v1/news/{$announceId}");
                if (! $detailRes->successful()) {
                    continue;
                }

                $detail = $detailRes->json() ?? [];
                $msgEn = $detail['message_english'] ?? '';
                if (empty($msgEn)) {
                    continue;
                }

                if (preg_match('/■\s*Eligible\s+Umamusume(.*?)(?:■|\*|<h2|<\/div|\z)/is', $msgEn, $matches)) {
                    preg_match_all('/★+\s*\[(.*?)\]\s*([^<]+)/u', $matches[1], $charMatches, PREG_SET_ORDER);
                    $chars = [];
                    foreach ($charMatches as $cm) {
                        $chars[] = trim($cm[2]).' ['.trim($cm[1]).']';
                    }

                    if (! empty($chars)) {
                        if (preg_match('/gacha_banner_(\d+)/', $msgEn, $bm)) {
                            $lineups[(int) $bm[1]] = $chars;
                        }
                        if ($postAt > 0) {
                            $lineups[date('Y-m', $postAt)] = $chars;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Gagal mengambil data Twinkle Collection dari Umapyoi: '.$e->getMessage());
        }

        return $lineups;
    }

    /**
     * Load skills dataset from GameTora CDN or local storage cache, indexed by ID.
     *
     * @return array<int, array<string, mixed>>
     */
    public function loadSkillsLookup(?string $skillsHash = null): array
    {
        try {
            if (! $skillsHash) {
                $manifestRes = Http::withoutVerifying()->timeout(15)->get(self::MANIFEST_URL);
                if ($manifestRes->successful()) {
                    $manifest = $manifestRes->json() ?? [];
                    $skillsHash = $manifest['skills'] ?? null;
                }
            }

            if (! $skillsHash) {
                return [];
            }

            $cacheFile = storage_path("app/gametora_skills_{$skillsHash}.json");
            if (file_exists($cacheFile)) {
                $raw = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($raw)) {
                    $lookup = [];
                    foreach ($raw as $s) {
                        if (isset($s['id'])) {
                            $lookup[(int) $s['id']] = $s;
                        }
                    }

                    return $lookup;
                }
            }

            $skillsUrl = self::DATA_BASE_URL."/skills.{$skillsHash}.json";
            $res = Http::withoutVerifying()->timeout(45)->get($skillsUrl);
            if (! $res->successful()) {
                return [];
            }

            $skillsData = $res->json() ?? [];
            if (! empty($skillsData)) {
                @file_put_contents($cacheFile, json_encode($skillsData));
            }

            $lookup = [];
            foreach ($skillsData as $s) {
                if (isset($s['id'])) {
                    $lookup[(int) $s['id']] = $s;
                }
            }

            return $lookup;
        } catch (\Throwable $e) {
            Log::warning('Gagal memuat dataset skills GameTora: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Load evolution strings dataset from GameTora CDN or storage cache, indexed by card_id.
     *
     * @return array<int, array<int, array<string, mixed>>>
     */
    public function loadEvoStringsLookup(?string $evoHash = null): array
    {
        try {
            if (! $evoHash) {
                $manifestRes = Http::withoutVerifying()->timeout(15)->get(self::MANIFEST_URL);
                if ($manifestRes->successful()) {
                    $manifest = $manifestRes->json() ?? [];
                    $evoHash = $manifest['static/evo_strings'] ?? null;
                }
            }

            if (! $evoHash) {
                return [];
            }

            $cacheFile = storage_path("app/gametora_evo_strings_{$evoHash}.json");
            if (file_exists($cacheFile)) {
                $raw = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($raw)) {
                    $lookup = [];
                    foreach ($raw as $entry) {
                        $cId = $entry['card_id'] ?? null;
                        if ($cId && isset($entry['skills'])) {
                            $lookup[(int) $cId] = $entry['skills'];
                        }
                    }

                    return $lookup;
                }
            }

            $evoUrl = self::DATA_BASE_URL."/static/evo_strings.{$evoHash}.json";
            $res = Http::withoutVerifying()->timeout(30)->get($evoUrl);
            if (! $res->successful()) {
                return [];
            }

            $evoData = $res->json() ?? [];
            if (! empty($evoData)) {
                @file_put_contents($cacheFile, json_encode($evoData));
            }

            $lookup = [];
            foreach ($evoData as $entry) {
                $cId = $entry['card_id'] ?? null;
                if ($cId && isset($entry['skills'])) {
                    $lookup[(int) $cId] = $entry['skills'];
                }
            }

            return $lookup;
        } catch (\Throwable $e) {
            Log::warning('Gagal memuat dataset evo_strings GameTora: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Load races dataset from GameTora CDN or storage cache, indexed by race ID.
     *
     * @return array<int, array<string, mixed>>
     */
    public function loadRacesLookup(?string $racesHash = null): array
    {
        try {
            if (! $racesHash) {
                $manifestRes = Http::withoutVerifying()->timeout(15)->get(self::MANIFEST_URL);
                if ($manifestRes->successful()) {
                    $manifest = $manifestRes->json() ?? [];
                    $racesHash = $manifest['races'] ?? null;
                }
            }

            if (! $racesHash) {
                return [];
            }

            $cacheFile = storage_path("app/gametora_races_{$racesHash}.json");
            if (file_exists($cacheFile)) {
                $raw = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($raw)) {
                    $lookup = [];
                    foreach ($raw as $r) {
                        if (isset($r['id'])) {
                            $lookup[(int) $r['id']] = $r;
                        }
                        if (isset($r['race_id'])) {
                            $lookup[(int) $r['race_id']] = $r;
                        }
                    }

                    return $lookup;
                }
            }

            $racesUrl = self::DATA_BASE_URL."/races.{$racesHash}.json";
            $res = Http::withoutVerifying()->timeout(30)->get($racesUrl);
            if (! $res->successful()) {
                return [];
            }

            $racesData = $res->json() ?? [];
            if (! empty($racesData)) {
                @file_put_contents($cacheFile, json_encode($racesData));
            }

            $lookup = [];
            foreach ($racesData as $r) {
                if (isset($r['id'])) {
                    $lookup[(int) $r['id']] = $r;
                }
                if (isset($r['race_id'])) {
                    $lookup[(int) $r['race_id']] = $r;
                }
            }

            return $lookup;
        } catch (\Throwable $e) {
            Log::warning('Gagal memuat dataset races GameTora: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Format a single condition array into human-readable English text matching GameTora.
     *
     * @param  array<int|string, mixed>  $c
     * @param  array<int, array<string, mixed>>  $racesById
     * @param  array<int, array<string, mixed>>  $skillsById
     */
    public function formatEvolutionCondition(array $c, array $racesById = [], array $skillsById = []): string
    {
        $type = (string) ($c[0] ?? '');
        switch ($type) {
            case 'stat':
                $statNames = [
                    1 => 'Speed', 'speed' => 'Speed',
                    2 => 'Stamina', 'stamina' => 'Stamina',
                    3 => 'Power', 'power' => 'Power',
                    4 => 'Guts', 'guts' => 'Guts',
                    5 => 'Wit', 'wisdom' => 'Wit', 'wit' => 'Wit',
                ];
                $statName = $statNames[$c[1] ?? ''] ?? 'Unknown Stat';
                $num = $c[2] ?? 0;

                return "Have at least {$num} {$statName}";

            case 'a_skill':
                $cat = $c[1] ?? '';
                $id = (int) ($c[2] ?? 0);
                $amount = (int) ($c[3] ?? 1);
                $aptName = '???';
                if ($cat === 'dist' || $cat === 1) {
                    $aptName = [0 => 'Short', 1 => 'Mile', 2 => 'Medium', 3 => 'Long', 4 => 'Dirt'][$id] ?? 'Unknown Distance';
                } elseif ($cat === 'strat' || $cat === 2) {
                    $aptName = [1 => 'Runner', 2 => 'Leader', 3 => 'Betweener', 4 => 'Chaser'][$id] ?? 'Unknown Strategy';
                } elseif ($cat === 'trn' || $cat === 0) {
                    $aptName = [1 => 'Turf', 2 => 'Dirt'][$id] ?? 'Unknown Surface';
                }

                return $amount === 1
                    ? "Get any skill for {$aptName} aptitude"
                    : "Get at least {$amount} skills for {$aptName} aptitude";

            case 'e_skill':
                $sType = (string) ($c[1] ?? '');
                $amount = (int) ($c[2] ?? 1);
                $sTypeName = [
                    'speed' => 'Speed-type',
                    'accel' => 'Acceleration-type',
                    'reco' => 'Recovery-type',
                    'lane' => 'Lane Movement-type',
                    'green' => 'Green',
                ][$sType] ?? ucfirst($sType);

                return $amount === 1
                    ? "Get any {$sTypeName} skill"
                    : "Get at least {$amount} {$sTypeName} skills";

            case 'fan':
                $fans = number_format((int) ($c[1] ?? 0));

                return "Have at least {$fans} fans";

            case 'race_w2':
                $raceId = (int) explode('|', (string) ($c[1] ?? 0))[0];
                $raceName = $racesById[$raceId]['name_en'] ?? $racesById[$raceId]['name_jp'] ?? "Race {$raceId}";

                return "Win the {$raceName} twice";

            case 'win':
                $raceId = (int) explode('|', (string) ($c[1] ?? 0))[0];
                $raceName = $racesById[$raceId]['name_en'] ?? $racesById[$raceId]['name_jp'] ?? "Race {$raceId}";

                return "Win the {$raceName}";

            case 'race_pn':
                $raceId = (int) explode('|', (string) ($c[1] ?? 0))[0];
                $pos = (int) ($c[2] ?? 1);
                $raceName = $racesById[$raceId]['name_en'] ?? $racesById[$raceId]['name_jp'] ?? "Race {$raceId}";

                return "Place {$pos} or better in the {$raceName}";

            case 'win_all':
                $rList = [];
                foreach ((array) ($c[1] ?? []) as $rEntry) {
                    $rId = (int) explode('|', (string) $rEntry)[0];
                    $rList[] = $racesById[$rId]['name_en'] ?? $racesById[$rId]['name_jp'] ?? "Race {$rId}";
                }

                return 'Win the following races: '.implode(', ', $rList);

            case 'participate':
                $raceId = (int) explode('|', (string) ($c[1] ?? 0))[0];
                $raceName = $racesById[$raceId]['name_en'] ?? $racesById[$raceId]['name_jp'] ?? "Race {$raceId}";

                return "Participate in the {$raceName}";

            case 'dt_gn_race_w':
                $cat = $c[1] ?? '';
                $id = (int) ($c[2] ?? 0);
                $grade = ($c[3] ?? '') == 100 ? 'G1' : (($c[3] ?? '') == 200 ? 'G2' : (($c[3] ?? '') == 300 ? 'G3' : 'graded'));
                $count = (int) ($c[4] ?? 1);
                $dtName = '';
                if ($cat === 'dist' || $cat === 1) {
                    $dtName = [0 => 'Short', 1 => 'Mile', 2 => 'Medium', 3 => 'Long', 4 => 'Dirt'][$id] ?? '';
                } elseif ($cat === 'trn' || $cat === 0) {
                    $dtName = [1 => 'Turf', 2 => 'Dirt'][$id] ?? '';
                }

                return $count === 1
                    ? "Win any {$grade} {$dtName} race"
                    : "Win {$count} {$grade} {$dtName} races";

            case 'gn_race_w':
                $grade = ($c[1] ?? '') == 100 ? 'G1' : (($c[1] ?? '') == 200 ? 'G2' : (($c[1] ?? '') == 300 ? 'G3' : 'graded'));
                $count = (int) ($c[2] ?? 1);

                return $count === 1
                    ? "Win any {$grade} race"
                    : "Win {$count} {$grade} races";

            case 's_gn_race_w':
                $strat = [1 => 'Runner', 2 => 'Leader', 3 => 'Betweener', 4 => 'Chaser'][(int) ($c[1] ?? 0)] ?? 'strategy';
                $grade = ($c[2] ?? '') == 100 ? 'G1' : (($c[2] ?? '') == 200 ? 'G2' : (($c[2] ?? '') == 300 ? 'G3' : 'graded'));
                $count = (int) ($c[3] ?? 1);

                return $count === 1
                    ? "Win any {$grade} race as {$strat}"
                    : "Win {$count} {$grade} races as {$strat}";

            case 's_gn2_race_w':
                $strat = [1 => 'Runner', 2 => 'Leader', 3 => 'Betweener', 4 => 'Chaser'][(int) ($c[1] ?? 0)] ?? 'strategy';
                $g1 = ($c[2] ?? '') == 100 ? 'G1' : (($c[2] ?? '') == 200 ? 'G2' : 'graded');
                $g2 = ($c[3] ?? '') == 100 ? 'G1' : (($c[3] ?? '') == 200 ? 'G2' : 'graded');
                $count = (int) ($c[4] ?? 1);

                return $count === 1
                    ? "Win any {$g1} or {$g2} race as {$strat}"
                    : "Win {$count} {$g1} or {$g2} races as {$strat}";

            case 'dt_race_w':
                $cat = $c[1] ?? '';
                $id = (int) ($c[2] ?? 0);
                $count = (int) ($c[3] ?? 1);
                $dtName = [0 => 'Short', 1 => 'Mile', 2 => 'Medium', 3 => 'Long', 4 => 'Dirt'][$id] ?? '';

                return $count === 1
                    ? "Win any {$dtName} race"
                    : "Win at least {$count} {$dtName} races";

            case 'rt_race_w':
                $trackId = (int) ($c[1] ?? 0);
                $count = (int) ($c[2] ?? 1);
                $trackNames = [
                    10001 => 'Tokyo', 10002 => 'Nakayama', 10003 => 'Kyoto', 10004 => 'Hanshin',
                    10005 => 'Chukyo', 10006 => 'Sapporo', 10007 => 'Hakodate', 10008 => 'Fukushima',
                    10009 => 'Niigata', 10010 => 'Kokura', 10011 => 'Oi', 10012 => 'Kawasaki',
                    10013 => 'Funabashi', 10014 => 'Morioka',
                ];
                $tName = $trackNames[$trackId] ?? "track {$trackId}";

                return $count === 1
                    ? "Win any race on the {$tName} racetrack"
                    : "Win any race on the {$tName} racetrack {$count} times";

            case 'l_gn_race_w':
                $len = $c[1] ?? 0;
                $grade = ($c[2] ?? '') == 100 ? 'G1' : (($c[2] ?? '') == 200 ? 'G2' : 'graded');
                $count = (int) ($c[3] ?? 1);

                return $count === 1
                    ? "Win any {$len}m {$grade} race"
                    : "Win {$count} {$len}m {$grade} races";

            case 's_fn_dt_gn_race_w':
                $strat = [1 => 'Runner', 2 => 'Leader', 3 => 'Betweener', 4 => 'Chaser'][(int) ($c[1] ?? 0)] ?? 'strategy';
                $pop = $c[2] ?? 1;
                $id = (int) ($c[4] ?? 0);
                $dtName = [0 => 'Short', 1 => 'Mile', 2 => 'Medium', 3 => 'Long', 4 => 'Dirt'][$id] ?? '';
                $grade = ($c[5] ?? '') == 100 ? 'G1' : 'graded';
                $count = (int) ($c[6] ?? 1);

                return $count === 1
                    ? "Win a {$grade} {$dtName} race as {$strat} being #{$pop} favorite"
                    : "Win {$count} {$grade} {$dtName} races as {$strat} being #{$pop} favorite";

            case 's_fn_gn_race_w':
                $strat = [1 => 'Runner', 2 => 'Leader', 3 => 'Betweener', 4 => 'Chaser'][(int) ($c[1] ?? 0)] ?? 'strategy';
                $pop = $c[2] ?? 1;
                $grade = ($c[3] ?? '') == 100 ? 'G1' : 'graded';
                $count = (int) ($c[4] ?? 1);

                return $count === 1
                    ? "Win any {$grade} race as {$strat} being #{$pop} favorite"
                    : "Win {$count} {$grade} races as {$strat} being #{$pop} favorite";

            case 's_dt_gn_race_w':
                $strat = [1 => 'Runner', 2 => 'Leader', 3 => 'Betweener', 4 => 'Chaser'][(int) ($c[1] ?? 0)] ?? 'strategy';
                $id = (int) ($c[3] ?? 0);
                $dtName = [0 => 'Short', 1 => 'Mile', 2 => 'Medium', 3 => 'Long', 4 => 'Dirt'][$id] ?? '';
                $grade = ($c[4] ?? '') == 100 ? 'G1' : 'graded';
                $count = (int) ($c[5] ?? 1);

                return $count === 1
                    ? "Win any {$grade} {$dtName} race as {$strat}"
                    : "Win {$count} {$grade} {$dtName} races as {$strat}";

            case 'gn_race_pn':
                $grade = ($c[1] ?? '') == 100 ? 'G1' : 'graded';
                $pos = (int) ($c[2] ?? 1);
                $count = (int) ($c[3] ?? 1);

                return $count === 1
                    ? "Place {$pos} or better in any {$grade} race"
                    : "Place {$pos} or better in any {$grade} race {$count} times";

            case 'any_race_pn':
                $pos = (int) ($c[1] ?? 1);
                $count = (int) ($c[2] ?? 1);

                return $count === 1
                    ? "Place {$pos} in any race"
                    : "Place {$pos} in any race {$count} times";

            case 'y_gn_race_w':
                $year = $c[1] ?? '';
                $grade = ($c[2] ?? '') == 100 ? 'G1' : 'graded';
                $count = (int) ($c[3] ?? 1);

                return $count === 1
                    ? "Win any {$grade} race in year {$year}"
                    : "Win {$count} {$grade} races in year {$year}";

            case 'skill':
                $sId = (int) ($c[1] ?? 0);
                $sName = $skillsById[$sId]['name_en'] ?? $skillsById[$sId]['jpname'] ?? "Skill {$sId}";

                return "Get the {$sName} skill";

            case 'ev':
            case 'ev_cn_on':
            case 'ev_ac_on':
            case 'evn':
            case 'p_ev_s':
            case 'ev_trc_t':
                $evName = $c[1] ?? 'training';

                return "Trigger the 「{$evName}」 training event";

            case 'mo_ev':
                $evName = $c[2] ?? 'training';

                return "Trigger the 「{$evName}」 training event with high mood";

            case 'cond_e':
            case 'cond':
                $condName = $c[1] ?? 'status';

                return "Have status effect {$condName} at end of training";

            case 'out_c':
                $count = (int) ($c[1] ?? 1);

                return $count === 1
                    ? 'Go on an outing with your character'
                    : "Go on an outing with your character {$count} times";

            case 'out_s':
                $count = (int) ($c[1] ?? 1);

                return $count === 1
                    ? 'Go on a date with any Friend or Group support'
                    : "Go on a date with any Friend or Group support {$count} times";

            case 'sc_out':
                $count = (int) ($c[1] ?? 1);

                return $count === 1
                    ? 'Go on an outing during summer camp'
                    : "Go on an outing during summer camp {$count} times";

            case 'rest':
                $count = (int) ($c[1] ?? 1);

                return $count === 1
                    ? 'Rest at least once'
                    : "Rest a total of {$count} or more times";

            case 'train_nf':
                return 'Train without failing';

            case 'tc_gn_race_w':
                $grade = ($c[2] ?? '') == 100 ? 'G1' : 'graded';
                $count = (int) ($c[3] ?? 1);

                return $count === 1
                    ? 'Win any '.$grade.' race in specified track conditions'
                    : "Win {$count} {$grade} races in specified track conditions";

            case 'scen_gff_sa':
                return 'Get an S rank in all 3 Cook-off disciplines';

            case 'scen_uaf_wf':
            case 'scen_uaf_wa':
                return 'Win the U.A.F. tournament';

            case 'scen_island_ef':
            case 'scen_island_ea':
                return 'Successfully clear the Great Harvest festival';

            case 'scen_mecha_u5':
            case 'scen_mecha_ua':
                return 'Achieve highest performance with Mecha-Uma';

            case 'scen_yukoma_b3':
            case 'scen_yukoma_ba':
                return 'Master running style in the legends scenario';

            case 'scen_dreams_r5':
            case 'scen_dreams_ra':
                return 'Fulfill dreams in the final race showcase';

            default:
                return '';
        }
    }

    /**
     * Format complete evolution conditions matrix into human-readable English strings.
     *
     * @param  array<int, array<int, mixed>>  $evoCond
     * @param  array<int, array<string, mixed>>  $racesById
     * @param  array<int, array<string, mixed>>  $skillsById
     * @param  array<int, array<int, string>>|null  $jaFallback
     * @return array<int, array<int, string>>
     */
    public function formatEvolutionConditions(array $evoCond, array $racesById = [], array $skillsById = [], ?array $jaFallback = null): array
    {
        if (empty($evoCond)) {
            return $jaFallback ?? [];
        }

        $formattedGroups = [];
        foreach ($evoCond as $gIdx => $group) {
            $formattedGroup = [];
            if (is_array($group)) {
                foreach ($group as $cIdx => $c) {
                    if (is_array($c)) {
                        $text = $this->formatEvolutionCondition($c, $racesById, $skillsById);
                        if ($text !== '') {
                            $formattedGroup[] = $text;
                        } elseif (isset($jaFallback[$gIdx][$cIdx])) {
                            $formattedGroup[] = $jaFallback[$gIdx][$cIdx];
                        }
                    } elseif (is_string($c)) {
                        $formattedGroup[] = $c;
                    }
                }
            }
            if (! empty($formattedGroup)) {
                $formattedGroups[] = $formattedGroup;
            } elseif (isset($jaFallback[$gIdx])) {
                $formattedGroups[] = $jaFallback[$gIdx];
            }
        }

        return ! empty($formattedGroups) ? $formattedGroups : ($jaFallback ?? []);
    }

    /**
     * Load support card effects definitions dataset from GameTora, indexed by effect ID.
     *
     * @return array<int, array<string, mixed>>
     */
    public function loadSupportEffectsLookup(?string $effHash = null): array
    {
        try {
            if (! $effHash) {
                $manifestRes = Http::withoutVerifying()->timeout(15)->get(self::MANIFEST_URL);
                if ($manifestRes->successful()) {
                    $manifest = $manifestRes->json() ?? [];
                    $effHash = $manifest['support_effects'] ?? null;
                }
            }

            if (! $effHash) {
                return [];
            }

            $cacheFile = storage_path("app/gametora_support_effects_{$effHash}.json");
            if (file_exists($cacheFile)) {
                $raw = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($raw)) {
                    $lookup = [];
                    foreach ($raw as $ed) {
                        if (isset($ed['id'])) {
                            $ed['name_en'] = $ed['name_en'] ?? $ed['name_en_eon'] ?? null;
                            $ed['desc_en'] = $ed['desc_en'] ?? $ed['desc_en_eon'] ?? null;
                            if ((int) $ed['id'] === 32) {
                                $ed['name_en'] = 'Initial Skill Points Up';
                            }
                            $lookup[(int) $ed['id']] = $ed;
                        }
                    }

                    return $lookup;
                }
            }

            $effUrl = self::DATA_BASE_URL."/support_effects.{$effHash}.json";
            $res = Http::withoutVerifying()->timeout(30)->get($effUrl);
            if (! $res->successful()) {
                return [];
            }

            $effData = $res->json() ?? [];
            if (! empty($effData)) {
                @file_put_contents($cacheFile, json_encode($effData));
            }

            $lookup = [];
            foreach ($effData as $ed) {
                if (isset($ed['id'])) {
                    $ed['name_en'] = $ed['name_en'] ?? $ed['name_en_eon'] ?? null;
                    $ed['desc_en'] = $ed['desc_en'] ?? $ed['desc_en_eon'] ?? null;
                    if ((int) $ed['id'] === 32) {
                        $ed['name_en'] = 'Initial Skill Points Up';
                    }
                    $lookup[(int) $ed['id']] = $ed;
                }
            }

            return $lookup;
        } catch (\Throwable $e) {
            Log::warning('Gagal memuat dataset support_effects GameTora: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Load URA career training objectives dataset from GameTora CDN or storage cache, indexed by char_id.
     *
     * @return array<int, array<int, array<string, mixed>>>
     */
    public function loadObjectivesLookup(?string $objHash = null): array
    {
        try {
            if (! $objHash) {
                $manifestRes = Http::withoutVerifying()->timeout(15)->get(self::MANIFEST_URL);
                if ($manifestRes->successful()) {
                    $manifest = $manifestRes->json() ?? [];
                    $objHash = $manifest['ura-objectives'] ?? null;
                }
            }

            if (! $objHash) {
                return [];
            }

            $cacheFile = storage_path("app/gametora_ura_objectives_{$objHash}.json");
            if (file_exists($cacheFile)) {
                $raw = json_decode((string) file_get_contents($cacheFile), true);
                if (is_array($raw)) {
                    $lookup = [];
                    foreach ($raw as $entry) {
                        $charId = $entry['char_id'] ?? null;
                        if ($charId && isset($entry['objectives'])) {
                            $lookup[(int) $charId] = $entry['objectives'];
                        }
                    }

                    return $lookup;
                }
            }

            $objUrl = self::DATA_BASE_URL."/ura-objectives.{$objHash}.json";
            $res = Http::withoutVerifying()->timeout(30)->get($objUrl);
            if (! $res->successful()) {
                return [];
            }

            $objData = $res->json() ?? [];
            if (! empty($objData)) {
                @file_put_contents($cacheFile, json_encode($objData));
            }

            $lookup = [];
            foreach ($objData as $entry) {
                $charId = $entry['char_id'] ?? null;
                if ($charId && isset($entry['objectives'])) {
                    $lookup[(int) $charId] = $entry['objectives'];
                }
            }

            return $lookup;
        } catch (\Throwable $e) {
            Log::warning('Gagal memuat dataset ura-objectives GameTora: '.$e->getMessage());

            return [];
        }
    }

    /**
     * Format turn number into career year, month, and half period.
     *
     * @return array{year: int, year_label: string, month: int, month_name: string, half: string, period_label: string}
     */
    public function formatTurnTiming(int $turn): array
    {
        $year = (int) floor(($turn - 1) / 24) + 1;
        $turnInYear = (($turn - 1) % 24) + 1;
        $month = (int) floor(($turnInYear - 1) / 2) + 1;
        $half = ($turn % 2 === 1) ? 'Early' : 'Late';

        $yearLabel = match ($year) {
            1 => 'Junior Class',
            2 => 'Classic Class',
            3 => 'Senior Class',
            default => 'Finals',
        };

        $months = [
            1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April',
            5 => 'May', 6 => 'June', 7 => 'July', 8 => 'August',
            9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December',
        ];
        $monthName = $months[$month] ?? 'Unknown';

        return [
            'year' => $year,
            'year_label' => $yearLabel,
            'month' => $month,
            'month_name' => $monthName,
            'half' => $half,
            'period_label' => "{$yearLabel}, {$half} {$monthName}",
        ];
    }

    /**
     * Format number with English ordinal suffix (1st, 2nd, 3rd, 5th, etc.).
     */
    public function ordinalSuffix(int $number): string
    {
        $ends = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
        if ((($number % 100) >= 11) && (($number % 100) <= 13)) {
            return $number.'th';
        }

        return $number.($ends[$number % 10] ?? 'th');
    }

    /**
     * Format character's URA career training objectives into structured items matching GameTora.
     *
     * @param  array<int, array<string, mixed>>  $rawObjectives
     * @return array<int, array<string, mixed>>
     */
    public function formatCharacterObjectives(array $rawObjectives, ?string $charName = null): array
    {
        $formatted = [];
        $prevTurn = null;

        foreach ($rawObjectives as $o) {
            if (($o['target_type'] ?? 1) !== 1) {
                continue;
            }

            $order = (int) ($o['order'] ?? (count($formatted) + 1));
            $turn = (int) ($o['turn'] ?? 0);
            $turnGap = $prevTurn !== null ? max(0, $turn - $prevTurn - 1) : null;
            $prevTurn = $turn;

            $timing = $this->formatTurnTiming($turn);
            $condType = (int) ($o['cond_type'] ?? 1);
            $condVal = (int) ($o['cond_value'] ?? 0);
            $condVal2 = (int) ($o['cond_value_2'] ?? 0);
            $condId = (int) ($o['cond_id'] ?? 0);
            $races = $o['races'] ?? [];
            $race = $races[0] ?? null;
            $raceName = $race['name_en'] ?? $race['name_jp'] ?? 'Race';

            $title = '';
            if ($condType === 1) {
                if ($condVal === 0) {
                    $title = "Participate in the {$raceName}";
                } elseif ($condVal === 1) {
                    $title = "Place 1st in the {$raceName}";
                } else {
                    $title = 'Place '.$this->ordinalSuffix($condVal)." or better in the {$raceName}";
                }
            } elseif ($condType === 2) {
                $amount = $condVal2 > 0 ? $condVal2 : 1;
                if ($condId < 200) {
                    if ($condVal === 0) {
                        $title = "Participate in {$amount} G1 races";
                    } elseif ($condVal === 1) {
                        $title = "Place 1st in {$amount} G1 races";
                    } else {
                        $title = 'Place '.$this->ordinalSuffix($condVal)." or better in {$amount} G1 races";
                    }
                } else {
                    $gradeName = match ($condId) {
                        200 => 'G2',
                        300 => 'G3',
                        default => 'graded',
                    };
                    if ($condVal === 0) {
                        $title = "Participate in {$amount} {$gradeName} or higher races";
                    } elseif ($condVal === 1) {
                        $title = "Place 1st in {$amount} {$gradeName} or higher races";
                    } else {
                        $title = 'Place '.$this->ordinalSuffix($condVal)." or better in {$amount} {$gradeName} or higher races";
                    }
                }
            } elseif ($condType === 3) {
                $title = 'Have at least '.number_format($condVal).' fans';
            } else {
                $title = $raceName ? "Participate in the {$raceName}" : "Career Objective {$order}";
            }

            $fullTitle = "{$order}. {$title}";
            $turnText = ($turnGap !== null && $turnGap > 0) ? "Turn {$turn} (previous + {$turnGap})" : "Turn {$turn}";

            $trackCondition = '';
            $bannerUrl = null;
            $gradeBadge = null;

            if ($race) {
                $grade = (int) ($race['grade'] ?? 0);
                $gradeLabel = match ($grade) {
                    100 => 'G1',
                    200 => 'G2',
                    300 => 'G3',
                    400 => 'OP',
                    700 => 'Pre-OP',
                    default => null,
                };
                $terrain = (int) ($race['terrain'] ?? 1) === 2 ? 'Dirt' : 'Turf';
                $dist = (int) ($race['distance'] ?? 0);
                $distType = match (true) {
                    $dist < 1400 => 'Short',
                    $dist <= 1800 => 'Mile',
                    $dist <= 2400 => 'Medium',
                    default => 'Long',
                };
                $parts = [];
                if ($gradeLabel) {
                    $parts[] = $gradeLabel;
                }
                $parts[] = $terrain;
                if ($dist > 0) {
                    $parts[] = "{$dist}m";
                    $parts[] = $distType;
                }
                $trackCondition = implode(' - ', $parts);

                $iconId = $race['icon_id'] ?? $race['id'] ?? null;
                if ($iconId) {
                    $bannerUrl = "https://media.gametora.com/umamusume/races/banners/{$iconId}.png";
                }
            } elseif ($condType === 2) {
                $gradeBadge = $condId < 200 ? 'G I' : ($condId === 200 ? 'G II' : 'G III');
            } elseif ($condType === 3) {
                $gradeBadge = 'Fans';
            }

            $formatted[] = [
                'order' => $order,
                'title' => $title,
                'full_title' => $fullTitle,
                'short_title' => $title,
                'turn' => $turn,
                'turn_gap' => $turnGap,
                'turn_text' => $turnText,
                'period' => $timing['period_label'],
                'timing' => $timing,
                'track_condition' => $trackCondition,
                'banner_url' => $bannerUrl,
                'grade_badge' => $gradeBadge,
                'cond_type' => $condType,
                'cond_value' => $condVal,
                'race' => $race,
            ];
        }

        return $formatted;
    }

    /**
     * Format skill base duration into human-readable string.
     */
    public function formatBaseDuration(int $baseTime): string
    {
        if ($baseTime === -1) {
            return 'none';
        }
        if ($baseTime === 0) {
            return 'Instant effect';
        }

        return ($baseTime / 10000).' s';
    }

    /**
     * Map effect type number and value to English effect name matching GameTora.
     */
    public function getEffectTypeName(int $type, int $value): string
    {
        $isNegative = $value < 0;

        return match ($type) {
            1 => $isNegative ? 'Speed Down' : 'Speed Up',
            2 => $isNegative ? 'Stamina Down' : 'Stamina Up',
            3 => $isNegative ? 'Power Down' : 'Power Up',
            4 => $isNegative ? 'Guts Down' : 'Guts Up',
            5 => $isNegative ? 'Wit Down' : 'Wit Up',
            6 => 'Change Strategy',
            8 => $isNegative ? 'Decrease Field of View' : 'Increase Field of View',
            9 => $isNegative ? 'Stamina Drain' : 'Recover Stamina',
            10 => $value >= 10000 ? 'Worse Start Reaction Time' : 'Better Start Reaction Time',
            13 => $isNegative ? 'Decrease Rush Time' : 'Increase Rush Time',
            14 => $value >= 0 ? 'Add Start Delay' : 'Reduce Start Delay',
            21, 22 => $isNegative ? 'Decrease Current Speed' : 'Increase Current Speed',
            27 => $isNegative ? 'Decrease Target Speed' : 'Increase Target Speed',
            28 => $isNegative ? 'Decrease Lane Movement Speed' : 'Increase Lane Movement Speed',
            29 => $isNegative ? 'Decreased Rush Chance' : 'Increased Rush Chance',
            31 => $isNegative ? 'Decrease Acceleration' : 'Increase Acceleration',
            32 => $isNegative ? 'All Stats Down' : 'All Stats Up',
            35 => 'Change Lane',
            37 => 'Use Random Rare Skills',
            38 => 'Debuff Immunity',
            48 => 'Zenkai Spurt Acceleration',
            49 => 'Reactivate Unique Skill',
            501 => $isNegative ? 'Decrease Carnival Point Gain' : 'Increase Carnival Point Gain',
            502 => 'All Stats Increased During Carnival',
            503 => 'Mood Maxed During Carnival',
            default => "Effect {$type}",
        };
    }

    /**
     * Format effect value based on its type.
     */
    public function formatEffectValue(int $type, int $value): string
    {
        if ($type === 6) {
            return $value === 0 ? 'Runaway' : 'Unknown';
        }
        if ($type === 35) {
            return ($value / 100).'% of the track';
        }
        $val = $value / 10000;

        return (string) round($val, 4);
    }

    /**
     * Map skill target code and target details to readable English target string.
     */
    public function getTargetName(?int $target, ?int $targetDetails): ?string
    {
        if ($target === null) {
            return null;
        }

        return match ($target) {
            1 => 'Self',
            4 => $targetDetails === 18 ? 'All enemies within the field of view' : 'All enemies',
            7 => $targetDetails === 5 ? 'Five closest girls' : ($targetDetails ? "{$targetDetails} closest girls" : 'Closest girls'),
            9 => match ($targetDetails) {
                1 => 'Closest girl ahead of you',
                2 => 'Two closest girls ahead of you',
                3 => 'Three closest girls ahead of you',
                5 => 'Five closest girls ahead of you',
                18 => 'All enemy girls ahead of you',
                default => $targetDetails ? "{$targetDetails} closest girls ahead of you" : 'All enemy girls ahead of you',
            },
            10 => match ($targetDetails) {
                1 => 'Closest girl behind you',
                2 => 'Two closest girls behind you',
                3 => 'Three closest girls behind you',
                5 => 'Five closest girls behind you',
                18 => 'All enemy girls behind you',
                default => $targetDetails ? "{$targetDetails} closest girls behind you" : 'All enemy girls behind you',
            },
            11 => 'All teammates and you',
            18 => match ($targetDetails) {
                1 => 'All enemy Front Runners',
                2 => 'All enemy Pace Chasers',
                3 => 'All enemy Late Surgers',
                4 => 'All enemy End Closers',
                default => 'All enemies',
            },
            19 => 'Rushing enemies ahead of you',
            20 => 'Rushing enemies behind you',
            21 => match ($targetDetails) {
                1 => 'Rushing enemy Front Runners',
                2 => 'Rushing enemy Pace Chasers',
                3 => 'Rushing enemy Late Surgers',
                4 => 'Rushing enemy End Closers',
                default => 'Rushing enemies',
            },
            22 => 'Specific character',
            23 => 'Girl who triggered this skill',
            default => 'Opponents',
        };
    }

    /**
     * Format special scaling rules and table matching GameTora value_scale definitions.
     *
     * @return array<string, mixed>|null
     */
    public function formatSpecialScaling(int $scaleId, float $baseValue): ?array
    {
        $baseText = 'The base value for this effect is '.round($baseValue, 4).'.';
        $text = '';
        $header = null;
        $rawRows = [];

        switch ($scaleId) {
            case 2:
                $text = 'The multiplier scales linearly with your distance behind first place: 0.8 + distance ÷ 62.5, up to 1.6 at 50 metres. The resulting base duration ranges from '.round(0.8 * $baseValue, 3).' to '.round(1.6 * $baseValue, 3).' seconds.';
                $header = 'Distance';
                break;
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                $stats = [3 => 'Speed', 4 => 'Stamina', 5 => 'Power', 6 => 'Guts', 7 => 'Wit'];
                $statType = $stats[$scaleId];
                $text = "The multiplier scales with your team's total {$statType} stat.";
                $header = 'Stat';
                $rawRows = [['x < 1200', 0.8], ['1200 <= x < 1800', 0.9], ['1800 <= x < 2600', 1.0], ['2600 <= x < 3600', 1.1], ['3600 <= x', 1.2]];
                break;
            case 8:
                $text = 'The multiplier is selected randomly.';
                $header = 'Chance';
                $rawRows = [['60%', 0], ['30%', 0.02], ['10%', 0.04]];
                break;
            case 10:
                $text = 'The multiplier scales with the number of races won during training.';
                $header = 'Wins';
                $rawRows = [['x < 6', 0.8], ['6 <= x < 14', 0.9], ['14 <= x < 18', 1.0], ['18 <= x < 25', 1.1], ['25 <= x', 1.2]];
                break;
            case 11:
                $text = 'The multiplier depends on how many times you overtake someone during Final Leg corners.';
                $header = 'Overtakes';
                $rawRows = [['x < 2', 1.0], ['x = 2', 1.1], ['x = 3', 1.2], ['4 <= x', 1.25]];
                break;
            case 12:
                $text = 'The multiplier scales with your fan count.';
                $header = 'Fans';
                $rawRows = [['x < 20000', 0.8], ['20000 <= x < 50000', 0.9], ['50000 <= x < 100000', 1.0], ['100000 <= x < 160000', 1.1], ['160000 <= x', 1.2]];
                break;
            case 13:
                $text = 'The multiplier scales with the highest base value among your five stats.';
                $header = 'Highest Stat';
                $rawRows = [['x < 600', 0.8], ['600 <= x < 800', 0.9], ['800 <= x < 1000', 1.0], ['1000 <= x < 1100', 1.1], ['1100 <= x', 1.2]];
                break;
            case 14:
                $text = 'The multiplier scales with the number of green skills activated during the race.';
                $header = 'Skills';
                $rawRows = [['x < 3', 0], ['3 <= x < 5', 1.0], ['x = 5', 2.0], ['6 <= x', 3.0]];
                break;
            case 19:
                $text = 'If you are at least 20 metres behind first place, add 0.1 to the effect value.';
                break;
            case 20:
                $text = 'The multiplier scales with the longest continuous time spent blocked from either side during the Middle Leg.';
                $header = 'Time';
                $rawRows = [['x < 2s', 1.0], ['2s <= x < 4s', 2.0], ['4s <= x < 6s', 3.0], ['6s <= x', 4.0]];
                break;
            case 22:
            case 23:
                $text = 'The multiplier scales with your final Speed stat: base Speed plus modifiers from Mood, track condition, racecourse, and skills.';
                $header = 'Final Speed';
                $rawRows = $scaleId === 22
                    ? [['x < 1700', 0], ['1700 <= x < 1800', 1.0], ['1800 <= x < 1900', 2.0], ['1900 <= x < 2000', 3.0], ['2000 <= x', 4.0]]
                    : [['x < 1400', 1.0], ['1400 <= x < 1600', 2.0], ['1600 <= x', 3.0]];
                break;
            case 24:
                $text = "The multiplier scales with the sum of your Overseas Aptitude levels in Project L'Arc.";
                $header = 'Total Level';
                $rawRows = [['x < 10', 1.0], ['10 <= x < 20', 1.1], ['20 <= x', 1.2]];
                break;
            case 25:
                $text = 'The multiplier scales with your maximum lead achieved before the Final Leg begins.';
                $header = 'Lead';
                $rawRows = [['x < 10m', 1.0], ['10m <= x < 25m', 1.4], ['25m <= x', 1.8]];
                break;
            case 26:
                $text = 'The multiplier scales with the number of disciplines won in the U.A.F. Showdown.';
                $header = 'Wins';
                $rawRows = [['x < 10', 1.0], ['10 <= x < 15', 1.1], ['15 <= x', 1.2]];
                break;
            case 27:
                $text = 'The multiplier scales with the total Cooking Points earned in the Great Food Festival scenario.';
                $header = 'Cooking Points';
                $rawRows = [['x < 10000', 1.0], ['10000 <= x < 16000', 1.1], ['16000 <= x', 1.2]];
                break;
            case 28:
                $text = 'The multiplier scales with the total Research Level earned in the Run, Mecha Umamusume! scenario.';
                $header = 'Research Level';
                $rawRows = [['x < 1000', 1.0], ['1000 <= x < 2000', 1.1], ['2000 <= x', 1.2]];
                break;
            case 30:
                $text = 'The multiplier scales with Love received from fans.';
                $header = 'Love';
                $rawRows = [['x < 3000', 1.0], ['3000 <= x < 50000', 1.4], ['50000 <= x < 250000', 1.8], ['250000 <= x < 750000', 2.2], ['750000 <= x < 1500000', 2.6], ['1500000 <= x < 3000000', 2.8], ['3000000 <= x', 3.0]];
                break;
            case 31:
                $text = 'The multiplier scales with the total Development Points earned in the Design Your Island scenario.';
                $header = 'Development Points';
                $rawRows = [['x < 2500', 1.0], ['2500 <= x < 3500', 1.1], ['3500 <= x', 1.2]];
                break;
            case 32:
                $text = 'The multiplier is 1.2 if your inn has reached Legendary Inn rank; otherwise, it is 1.0.';
                $header = 'Legendary Inn';
                $rawRows = [['x = 0', 1.0], ['x = 1', 1.2]];
                break;
            case 34:
                $text = 'If you are at least 8 horse lengths (20 metres) behind first place, add 0.2 to the effect value.';
                break;
            case 37:
                $text = "The multiplier scales with your team's rank.";
                $header = 'Rank';
                $rawRows = [['x < S', 1.0], ['S <= x', 1.2]];
                break;
            default:
                $text = "Special scaling rule {$scaleId}.";
                break;
        }

        $rows = [];
        foreach ($rawRows as $r) {
            $mult = (float) $r[1];
            $total = round($baseValue * $mult, 3);
            $rows[] = [
                'condition' => (string) $r[0],
                'mult' => ($mult == (int) $mult ? (int) $mult : $mult).'x',
                'mult_val' => $mult,
                'total' => $total,
            ];
        }

        return [
            'scale_id' => $scaleId,
            'base_value' => $baseValue,
            'base_text' => $baseText,
            'text' => $text,
            'header' => $header,
            'rows' => $rows,
        ];
    }

    /**
     * Enrich raw skill array with full metadata (rarity, activation, cost, conditions, duration, effects, special scaling).
     *
     * @param  array<string, mixed>  $raw
     * @param  array<int, array<string, mixed>>  $skillsById
     * @return array<string, mixed>
     */
    public function enrichSkillData(array $raw, array $skillsById = []): array
    {
        $id = (int) ($raw['id'] ?? 0);
        $cost = isset($raw['cost']) ? (int) $raw['cost'] : null;
        $activation = isset($raw['activation']) ? (int) $raw['activation'] : null;
        $rarity = (int) ($raw['rarity'] ?? 1);

        $rarityLabel = match ($rarity) {
            1 => 'Normal',
            2 => 'Rare',
            3 => 'Unique',
            4 => 'Upgraded unique',
            5 => 'Unique',
            6 => 'Evolved',
            default => 'Normal',
        };

        $activationLabel = match ($activation) {
            0 => 'Guaranteed',
            1 => 'Wit check',
            default => null,
        };

        $conditionGroups = [];
        $firstDuration = null;
        $firstCondition = null;
        $allEffects = [];

        foreach ($raw['condition_groups'] ?? [] as $cg) {
            $baseTime = (int) ($cg['base_time'] ?? 0);
            $durationStr = $this->formatBaseDuration($baseTime);
            if ($firstDuration === null) {
                $firstDuration = $durationStr;
            }

            $condStr = $cg['condition'] ?? '';
            if ($firstCondition === null && $condStr !== '') {
                $firstCondition = $condStr;
            }

            $formattedEffects = [];
            foreach ($cg['effects'] ?? [] as $eff) {
                $eType = (int) ($eff['type'] ?? 0);
                $eVal = (int) ($eff['value'] ?? 0);
                $typeName = $this->getEffectTypeName($eType, $eVal);
                $valStr = $this->formatEffectValue($eType, $eVal);
                $scaleId = isset($eff['value_scale']) ? (int) $eff['value_scale'] : null;
                $baseVal = $eVal / 10000;
                $scaling = $scaleId ? $this->formatSpecialScaling($scaleId, $baseVal) : null;
                $tCode = isset($eff['target']) ? (int) $eff['target'] : null;
                $tdCode = isset($eff['target_details']) ? (int) $eff['target_details'] : null;
                $targetName = $this->getTargetName($tCode, $tdCode);

                $effectItem = [
                    'type' => $eType,
                    'name' => $typeName,
                    'value' => $eVal,
                    'formatted_value' => $valStr,
                    'display_text' => "{$typeName} ({$valStr})",
                    'target' => $tCode,
                    'target_details' => $tdCode,
                    'target_name' => $targetName,
                    'value_scale' => $scaleId,
                    'special_scaling' => $scaling,
                ];

                $formattedEffects[] = $effectItem;
                $allEffects[] = [
                    'type' => $eType,
                    'name' => $typeName,
                    'formatted_value' => $valStr,
                    'display_text' => "{$typeName} ({$valStr})",
                    'target' => $tCode,
                    'target_details' => $tdCode,
                    'target_name' => $targetName,
                    'special_scaling' => $scaling,
                ];
            }

            $condTranslation = SkillConditionTranslator::translate($condStr);
            $precondTranslation = ! empty($cg['precondition']) ? SkillConditionTranslator::translate($cg['precondition']) : null;

            $conditionGroups[] = [
                'condition' => $condStr,
                'condition_translated' => $condTranslation['summary'],
                'precondition' => $cg['precondition'] ?? null,
                'precondition_translated' => $precondTranslation ? $precondTranslation['summary'] : null,
                'base_time' => $baseTime,
                'base_duration' => $durationStr,
                'cd' => isset($cg['cd']) ? ($cg['cd'] / 10000).' s' : null,
                'effects' => $formattedEffects,
            ];
        }

        return [
            'id' => $id,
            'name' => $raw['name_en'] ?? $raw['enname'] ?? $raw['jpname'] ?? "Skill {$id}",
            'name_en' => $raw['name_en'] ?? $raw['enname'] ?? null,
            'name_jp' => $raw['jpname'] ?? null,
            'description' => $raw['desc_en'] ?? $raw['endesc'] ?? $raw['jpdesc'] ?? '',
            'desc_en' => $raw['desc_en'] ?? $raw['endesc'] ?? null,
            'desc_jp' => $raw['jpdesc'] ?? null,
            'icon_id' => $raw['iconid'] ?? null,
            'icon_url' => isset($raw['iconid']) ? "https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_{$raw['iconid']}.png" : null,
            'rarity' => $rarity,
            'rarity_label' => $rarityLabel,
            'activation' => $activation,
            'activation_label' => $activationLabel,
            'base_cost' => $cost,
            'cost' => $cost,
            'conditions' => $firstCondition,
            'condition' => $firstCondition,
            'condition_translated' => $conditionGroups[0]['condition_translated'] ?? null,
            'precondition' => $conditionGroups[0]['precondition'] ?? null,
            'precondition_translated' => $conditionGroups[0]['precondition_translated'] ?? null,
            'base_duration' => $firstDuration ?? 'Instant effect',
            'effects' => $allEffects,
            'condition_groups' => $conditionGroups,
        ];
    }

    /**
     * Parse character aptitudes into structured dictionary with letter grades.
     *
     * @param  array<string, mixed>  $c
     * @return array<string, mixed>|null
     */
    public function parseCharacterAptitudes(array $c): ?array
    {
        if (empty($c['aptitude']) || ! is_array($c['aptitude'])) {
            return null;
        }

        $a = $c['aptitude'];

        return [
            'turf' => $a[0] ?? '-',
            'dirt' => $a[1] ?? '-',
            'short' => $a[2] ?? '-',
            'mile' => $a[3] ?? '-',
            'medium' => $a[4] ?? '-',
            'long' => $a[5] ?? '-',
            'runner' => $a[6] ?? '-',
            'leader' => $a[7] ?? '-',
            'betweener' => $a[8] ?? '-',
            'chaser' => $a[9] ?? '-',
            'track' => [
                'turf' => $a[0] ?? '-',
                'dirt' => $a[1] ?? '-',
            ],
            'distance' => [
                'short' => $a[2] ?? '-',
                'mile' => $a[3] ?? '-',
                'medium' => $a[4] ?? '-',
                'long' => $a[5] ?? '-',
            ],
            'style' => [
                'runner' => $a[6] ?? '-',
                'leader' => $a[7] ?? '-',
                'betweener' => $a[8] ?? '-',
                'chaser' => $a[9] ?? '-',
            ],
        ];
    }

    /**
     * Parse complete character skills tree (unique, innate, awakening Lv 2-5, and JP evolved skills).
     *
     * @param  array<string, mixed>  $c
     * @param  array<int, array<string, mixed>>  $skillsById
     * @param  array<int, array<int, array<string, mixed>>>  $evoLookup
     * @param  array<int, array<string, mixed>>  $racesById
     * @return array<string, mixed>
     */
    public function parseCharacterSkills(array $c, array $skillsById, array $evoLookup = [], array $racesById = []): array
    {
        // 1. Unique Skill(s) (supports 1-2 star dual versions: ☆ and ☆☆ vs ☆☆☆+)
        $unique = null;
        $uniqueVersions = [];
        $uniqueIds = $c['skills_unique'] ?? [];
        if (! empty($uniqueIds)) {
            $ids = is_array($uniqueIds) ? $uniqueIds : [$uniqueIds];
            foreach ($ids as $uIdx => $uId) {
                $uId = (int) $uId;
                if ($uId && isset($skillsById[$uId])) {
                    $raw = $skillsById[$uId];
                    $versionLabel = (count($ids) > 1 && $uIdx === 0) ? '☆ and ☆☆' : '☆☆☆+';
                    $enriched = $this->enrichSkillData($raw, $skillsById);
                    $enriched['version_label'] = $versionLabel;
                    $uniqueVersions[] = $enriched;
                }
            }

            if (! empty($uniqueVersions)) {
                $unique = count($uniqueVersions) > 1 ? $uniqueVersions[1] : $uniqueVersions[0];
            }
        }

        // 2. Innate Skills (Lv 1 default skills)
        $innate = [];
        foreach ($c['skills_innate'] ?? [] as $id) {
            $sId = (int) $id;
            $raw = $skillsById[$sId] ?? null;
            if ($raw) {
                $innate[] = $this->enrichSkillData($raw, $skillsById);
            }
        }

        // 3. Awakening Skills (Lv 2 to Lv 5)
        $awakening = [];
        $awakeningIds = $c['skills_awakening'] ?? [];
        foreach ($awakeningIds as $idx => $id) {
            $sId = (int) $id;
            $raw = $skillsById[$sId] ?? null;
            $level = $idx + 2;
            if ($raw) {
                $enriched = $this->enrichSkillData($raw, $skillsById);
                $enriched['level'] = $level;
                $awakening[] = $enriched;
            }
        }

        // 4. Evolved Skills (JP special feature)
        $evolve = [];
        $cardId = (int) ($c['card_id'] ?? $c['id'] ?? 0);
        foreach ($c['skills_evo'] ?? [] as $evo) {
            $newId = (int) ($evo['new'] ?? 0);
            $oldId = (int) ($evo['old'] ?? 0);
            $newRaw = $skillsById[$newId] ?? null;
            $oldRaw = $skillsById[$oldId] ?? null;

            if ($newRaw) {
                $jaConditions = $evoLookup[$cardId][$newId]['ja'] ?? null;
                $rawEvoCond = $newRaw['evo_cond'] ?? [];

                $conditionsEn = $this->formatEvolutionConditions($rawEvoCond, $racesById, $skillsById, $jaConditions);
                $conditions = ! empty($conditionsEn) ? $conditionsEn : ($jaConditions ?? []);

                $enriched = $this->enrichSkillData($newRaw, $skillsById);
                $enriched['rarity_label'] = 'Evolved';
                $enriched['base_skill_id'] = $oldId;
                $enriched['base_skill_name'] = $oldRaw ? ($oldRaw['name_en'] ?? $oldRaw['enname'] ?? $oldRaw['jpname'] ?? "Skill {$oldId}") : "Skill {$oldId}";
                $enriched['base_skill_name_jp'] = $oldRaw['jpname'] ?? null;
                $enriched['conditions'] = $conditions;
                $enriched['evolution_conditions'] = $conditions;
                $enriched['conditions_ja'] = $jaConditions;

                $evolve[] = $enriched;
            }
        }

        return [
            'unique' => $unique,
            'unique_versions' => $uniqueVersions,
            'unique_low' => (count($uniqueVersions) > 1) ? $uniqueVersions[0] : null,
            'unique_high' => (count($uniqueVersions) > 1) ? $uniqueVersions[1] : (count($uniqueVersions) === 1 ? $uniqueVersions[0] : null),
            'innate' => $innate,
            'awakening' => $awakening,
            'evolve' => $evolve,
        ];
    }

    /**
     * Calculate 51-level interpolated array for a support effect row.
     *
     * @param  array<int, int>  $e
     * @return array{type: int, unlock_level: int, levels: array<int, int>}
     */
    public function calculateEffectLevels(array $e): array
    {
        $n = array_fill(0, 51, null);
        $a = array_slice($e, 1);
        $t = -1;
        $s = -1;
        $i = -1;

        for ($idx = 0; $idx < count($a); $idx++) {
            if ($a[$idx] === -1 && $s === -1) {
                for ($x = 5 * $idx; $x < ($idx + 1) * 5 - 1; $x++) {
                    $n[$x] = 0;
                }

                continue;
            }
            if ($a[$idx] !== -1 && $t === -1) {
                $t = $idx > 0 ? 5 * $idx : 1;
                $n[5 * $idx] = $a[$idx];
                $s = $a[$idx];
                $i = $idx;

                continue;
            }
            if ($a[$idx] === -1) {
                continue;
            }
            $step = ($i === 0) ? ($a[$idx] - $s) / (5 * $idx - 5 * $i - 1) : ($a[$idx] - $s) / (5 * $idx - 5 * $i);
            $c = $s;
            for ($x = 5 * $i + 1; $x < 5 * $idx; $x++) {
                if ($x === 1) {
                    $n[$x] = $s;
                    $x = 2;
                }
                $c += $step;
                $n[$x] = (int) floor(round($c, 10));
            }
            $n[5 * $idx] = $a[$idx];
            $s = $a[$idx];
            $i = $idx;
        }
        $last = 0;
        for ($lvl = 0; $lvl < 51; $lvl++) {
            if ($n[$lvl] === null) {
                $n[$lvl] = $last;
            } else {
                $last = $n[$lvl];
            }
        }

        return [
            'type' => (int) $e[0],
            'unlock_level' => $t,
            'levels' => $n,
        ];
    }

    /**
     * Format comprehensive support card details (0LB-MLB effects table, unique effect, hints, event skills).
     *
     * @param  array<string, mixed>  $s
     * @param  array<int, array<string, mixed>>  $skillsById
     * @param  array<int, array<string, mixed>>  $effectsMap
     * @return array<string, mixed>
     */
    public function formatSupportCardDetails(array $s, array $skillsById, array $effectsMap): array
    {
        $rarity = (int) ($s['rarity'] ?? 3);
        $levelCols = $rarity === 3 ? [30, 35, 40, 45, 50] : ($rarity === 2 ? [25, 30, 35, 40, 45] : [20, 25, 30, 35, 40]);

        $effectsTable = [];
        foreach ($s['effects'] ?? [] as $row) {
            $calc = $this->calculateEffectLevels($row);
            $typeId = (int) $calc['type'];
            $def = $effectsMap[$typeId] ?? [];
            $nameEn = $def['name_en'] ?? $def['name_en_eon'] ?? ($typeId === 32 ? 'Initial Skill Points Up' : "Effect {$typeId}");
            $descEn = $def['desc_en'] ?? $def['desc_en_eon'] ?? null;
            $effectsTable[] = [
                'id' => $typeId,
                'name_en' => $nameEn,
                'name_ja' => $def['name_ja'] ?? null,
                'desc_en' => $descEn,
                'desc_ja' => $def['desc_ja'] ?? null,
                'symbol' => $def['symbol'] ?? 'none',
                'levels' => [
                    '0lb' => $calc['levels'][$levelCols[0]] ?? 0,
                    '1lb' => $calc['levels'][$levelCols[1]] ?? 0,
                    '2lb' => $calc['levels'][$levelCols[2]] ?? 0,
                    '3lb' => $calc['levels'][$levelCols[3]] ?? 0,
                    'mlb' => $calc['levels'][$levelCols[4]] ?? 0,
                ],
                'unlock_level' => $calc['unlock_level'],
            ];
        }

        // Unique effect
        $uniqueEffect = null;
        if (! empty($s['unique'])) {
            $uLevel = (int) ($s['unique']['level'] ?? ($rarity === 3 ? 30 : 0));
            $uEffects = [];
            foreach ($s['unique']['effects'] ?? [] as $ue) {
                $ueType = (int) ($ue['type'] ?? 0);
                $def = $effectsMap[$ueType] ?? [];
                $uNameEn = $def['name_en'] ?? $def['name_en_eon'] ?? ($ueType === 32 ? 'Initial Skill Points Up' : "Type {$ueType}");
                $uEffects[] = [
                    'type' => $ueType,
                    'name_en' => $uNameEn,
                    'name_ja' => $def['name_ja'] ?? null,
                    'value' => $ue['value'] ?? null,
                    'value_1' => $ue['value_1'] ?? null,
                    'value_2' => $ue['value_2'] ?? null,
                ];
            }
            $uniqueEffect = [
                'level' => $uLevel,
                'effects' => $uEffects,
            ];
        }

        // Hints
        $hintSkills = [];
        foreach ($s['hints']['hint_skills'] ?? [] as $skId) {
            $id = (int) $skId;
            $raw = $skillsById[$id] ?? null;
            if ($raw) {
                $hintSkills[] = $this->enrichSkillData($raw, $skillsById);
            }
        }

        $hintOthers = [];
        $hintOtherLabels = [
            1 => 'Hint Level Up',
            2 => 'Hint Event Chance',
            3 => 'Hint Chance Up',
            4 => 'Initial Bond Gauge',
        ];
        foreach ($s['hints']['hint_others'] ?? [] as $ho) {
            $type = (int) ($ho['hint_type'] ?? 0);
            $val = (int) ($ho['hint_value'] ?? 0);
            $hintOthers[] = [
                'type' => $type,
                'label' => $hintOtherLabels[$type] ?? "Hint Type {$type}",
                'value' => $val,
            ];
        }

        // Event Skills
        $eventSkills = [];
        foreach ($s['event_skills'] ?? [] as $skId) {
            $id = (int) $skId;
            $raw = $skillsById[$id] ?? null;
            if ($raw) {
                $eventSkills[] = $this->enrichSkillData($raw, $skillsById);
            }
        }

        return [
            'rarity' => $rarity,
            'level_headers' => $levelCols,
            'effects_table' => $effectsTable,
            'unique_effect' => $uniqueEffect,
            'hints' => [
                'skills' => $hintSkills,
                'others' => $hintOthers,
            ],
            'event_skills' => $eventSkills,
            'url_name' => $s['url_name'] ?? null,
            'support_id' => $s['support_id'] ?? $s['id'] ?? null,
        ];
    }

    /**
     * Fetch continuous chain training events with choices and rewards for a support card from GameTora.
     *
     * @return array<int, array<string, mixed>>|null
     */
    public function fetchSupportCardTrainingEvents(string|int|null $supportId = null, ?string $urlName = null, array $skillsById = []): ?array
    {
        try {
            if (empty($skillsById)) {
                $skillsById = $this->loadSkillsLookup();
            }

            // If urlName not given, find card in catalog
            if (! $urlName) {
                $item = UmaCatalogItem::where('type', 'support_card')
                    ->where(function ($q) use ($supportId) {
                        $q->where('gametora_id', $supportId)
                            ->orWhere('raw_data->support_id', $supportId);
                    })->first();

                if ($item && isset($item->raw_data['url_name'])) {
                    $urlName = $item->raw_data['url_name'];
                }
            }

            if (! $urlName) {
                return null;
            }

            // Get Next.js buildId from GameTora homepage/supports
            $buildId = cache()->remember('gametora_next_build_id', 3600, function () {
                $htmlRes = Http::withoutVerifying()->timeout(15)->get('https://gametora.com/umamusume/supports');
                if ($htmlRes->successful() && preg_match('/"buildId":"([^"]+)"/', $htmlRes->body(), $m)) {
                    return $m[1];
                }

                return 'Nzrlxx63ru-CKZ_L6FQ1J'; // Fallback to current build ID
            });

            $pageUrl = "https://gametora.com/_next/data/{$buildId}/umamusume/supports/{$urlName}.json";
            $res = Http::withoutVerifying()->timeout(20)->get($pageUrl);

            // If 404, bust cache once and retry with fresh buildId
            if ($res->status() === 404) {
                cache()->forget('gametora_next_build_id');
                $htmlRes = Http::withoutVerifying()->timeout(15)->get('https://gametora.com/umamusume/supports');
                if ($htmlRes->successful() && preg_match('/"buildId":"([^"]+)"/', $htmlRes->body(), $m)) {
                    $buildId = $m[1];
                    cache()->put('gametora_next_build_id', $buildId, 3600);
                    $pageUrl = "https://gametora.com/_next/data/{$buildId}/umamusume/supports/{$urlName}.json";
                    $res = Http::withoutVerifying()->timeout(20)->get($pageUrl);
                }
            }

            if (! $res->successful()) {
                return null;
            }

            $pageData = $res->json() ?? [];
            $eventData = $pageData['pageProps']['eventData'] ?? [];

            $en = is_string($eventData['en'] ?? null) ? json_decode($eventData['en'], true) : ($eventData['en'] ?? []);
            $ja = is_string($eventData['ja'] ?? null) ? json_decode($eventData['ja'], true) : ($eventData['ja'] ?? []);

            $rawArrows = $en['arrows'] ?? $ja['arrows'] ?? [];
            $rawDates = $en['dates'] ?? $ja['dates'] ?? [];
            $isDate = empty($rawArrows) && ! empty($rawDates);
            $eventList = ! empty($rawArrows) ? $rawArrows : $rawDates;
            $formattedEvents = [];

            foreach ($eventList as $idx => $ev) {
                $evId = $ev['i'] ?? $idx;
                $jaEv = null;
                $targetJa = $isDate ? ($ja['dates'] ?? []) : ($ja['arrows'] ?? []);
                foreach ($targetJa as $je) {
                    if (($je['i'] ?? null) === $evId) {
                        $jaEv = $je;
                        break;
                    }
                }

                $choices = [];
                foreach ($ev['c'] ?? [] as $cIdx => $c) {
                    $optEn = $c['o'] ?? '';
                    $optJa = $jaEv['c'][$cIdx]['o'] ?? $optEn;

                    $rewards = [];
                    $rewardGroups = [];
                    $currentGroup = [];
                    $hasRandom = false;

                    foreach ($c['r'] ?? [] as $r) {
                        $type = $r['t'] ?? '';
                        if ($type === 'di') {
                            $hasRandom = true;
                            if (! empty($currentGroup)) {
                                $rewardGroups[] = $currentGroup;
                                $currentGroup = [];
                            }
                            $rewards[] = ['type' => 'di'];

                            continue;
                        }

                        $val = $r['v'] ?? '';
                        $desc = $r['d'] ?? null;

                        $rewardObj = [
                            'type' => $type,
                            'value' => $val,
                        ];

                        if ($type === 'sk' && $desc && isset($skillsById[$desc])) {
                            $sk = $skillsById[$desc];
                            $rewardObj['skill'] = $this->enrichSkillData($sk, $skillsById);
                        }
                        $rewards[] = $rewardObj;
                        $currentGroup[] = $rewardObj;
                    }

                    if (! empty($currentGroup)) {
                        $rewardGroups[] = $currentGroup;
                    }

                    $choices[] = [
                        'option_en' => $optEn,
                        'option_ja' => $optJa,
                        'rewards' => $rewards,
                        'reward_groups' => $hasRandom && count($rewardGroups) > 1 ? $rewardGroups : null,
                        'has_random_outcome' => $hasRandom && count($rewardGroups) > 1,
                    ];
                }

                $formattedEvents[] = [
                    'id' => $evId,
                    'step' => $idx + 1,
                    'step_symbol' => $isDate ? str_repeat('>', $idx + 1) : null,
                    'is_date' => $isDate,
                    'name' => $ev['n'] ?? ($isDate ? 'Date '.($idx + 1) : 'Chain Event '.($idx + 1)),
                    'name_ja' => $jaEv['n'] ?? null,
                    'choices' => $choices,
                ];
            }

            return $formattedEvents;
        } catch (\Throwable $e) {
            Log::warning("Gagal mengambil training events support {$urlName}: ".$e->getMessage());

            return null;
        }
    }

    /**
     * Populate skills tree for all existing characters in uma_catalog_items.
     */
    public function populateSkillsForExistingCharacters(?string $skillsHash = null, ?string $evoHash = null, ?string $racesHash = null, ?string $objHash = null): int
    {
        $skillsById = $this->loadSkillsLookup($skillsHash);
        if (empty($skillsById)) {
            return 0;
        }

        $objectivesLookup = $this->loadObjectivesLookup($objHash);
        $evoLookup = $this->loadEvoStringsLookup($evoHash);
        $racesById = $this->loadRacesLookup($racesHash);

        $items = UmaCatalogItem::where('type', 'character')
            ->whereNotNull('raw_data')
            ->get();

        $updated = 0;
        foreach ($items as $item) {
            $raw = $item->raw_data;
            if (is_array($raw)) {
                $skills = $this->parseCharacterSkills($raw, $skillsById, $evoLookup, $racesById);
                $aptitudes = $item->aptitudes ?? $this->parseCharacterAptitudes($raw);
                $charId = (int) ($raw['char_id'] ?? 0);
                $rawObjectives = $charId ? ($objectivesLookup[$charId] ?? []) : [];
                $objectives = ! empty($rawObjectives) ? $this->formatCharacterObjectives($rawObjectives, $raw['name_en'] ?? null) : null;

                $item->update([
                    'skills' => $skills,
                    'aptitudes' => $aptitudes,
                    'objectives' => $objectives,
                ]);
                $updated++;
            }
        }

        return $updated;
    }

    /**
     * Populate details (effects 0LB-MLB, hints, event skills) for all existing support cards in uma_catalog_items.
     */
    public function populateDetailsForExistingSupportCards(?string $skillsHash = null, ?string $effHash = null): int
    {
        $skillsById = $this->loadSkillsLookup($skillsHash);
        $effectsMap = $this->loadSupportEffectsLookup($effHash);

        if (empty($effectsMap)) {
            return 0;
        }

        $items = UmaCatalogItem::where('type', 'support_card')
            ->whereNotNull('raw_data')
            ->get();

        $updated = 0;
        foreach ($items as $item) {
            $raw = $item->raw_data;
            if (is_array($raw)) {
                $details = $this->formatSupportCardDetails($raw, $skillsById, $effectsMap);
                $item->update(['details' => $details]);
                $updated++;
            }
        }

        return $updated;
    }
}
