<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use Illuminate\Support\Facades\File;

class UmaAffinityService
{
    /**
     * In-memory cache for parsed affinity data.
     *
     * @var array{charMap: array<string, int>, charGroups: array<int, list<int>>, groupPoints: array<int, int>}|null
     */
    protected static ?array $affinityData = null;

    /**
     * Cache for character catalog items indexed by char_id.
     *
     * @var array<int, UmaCatalogItem>|null
     */
    protected static ?array $catalogCharMap = null;

    /**
     * Popular Japanese G1 races grouped by categories.
     *
     * @var array<string, array{category_name: string, category_name_jp: string, races: list<array<string, mixed>>}>|null
     */
    protected static ?array $cachedG1Races = null;

    /**
     * Ensure affinity dataset is loaded.
     */
    protected function ensureDataLoaded(): void
    {
        if (self::$affinityData !== null) {
            return;
        }

        $path = resource_path('data/uma_affinity_data.json');
        if (! File::exists($path)) {
            $path = storage_path('app/uma_affinity_data.json');
        }

        if (File::exists($path)) {
            $raw = json_decode((string) File::get($path), true);
            if (is_array($raw)) {
                /** @var array<int, list<int>> $charGroups */
                $charGroups = [];
                foreach ($raw['charGroups'] ?? [] as $k => $v) {
                    $charGroups[(int) $k] = is_array($v) ? array_map('intval', $v) : [];
                }

                /** @var array<int, int> $groupPoints */
                $groupPoints = [];
                foreach ($raw['groupPoints'] ?? [] as $k => $v) {
                    $groupPoints[(int) $k] = (int) $v;
                }

                /** @var array<string, int> $charMap */
                $charMap = [];
                foreach ($raw['charMap'] ?? [] as $k => $v) {
                    $charMap[(string) $k] = (int) $v;
                }

                self::$affinityData = [
                    'charMap' => $charMap,
                    'charGroups' => $charGroups,
                    'groupPoints' => $groupPoints,
                ];

                return;
            }
        }

        self::$affinityData = [
            'charMap' => [],
            'charGroups' => [],
            'groupPoints' => [],
        ];
    }

    /**
     * Get base affinity score between two characters.
     */
    public function getBaseAffinity(int $charId1, int $charId2): int
    {
        if ($charId1 <= 0 || $charId2 <= 0 || $charId1 === $charId2) {
            return 0;
        }

        $this->ensureDataLoaded();

        $groups1 = self::$affinityData['charGroups'][$charId1] ?? null;
        $groups2 = self::$affinityData['charGroups'][$charId2] ?? null;

        if (! $groups1 || ! $groups2) {
            return 0;
        }

        $set2 = array_flip($groups2);
        $pointsMap = self::$affinityData['groupPoints'] ?? [];

        $total = 0;
        foreach ($groups1 as $groupId) {
            if (isset($set2[$groupId])) {
                $total += $pointsMap[$groupId] ?? 0;
            }
        }

        return $total;
    }

    /**
     * Get 3-way affinity score between Target, Parent, and Grandparent.
     */
    public function getTripleAffinity(int $targetId, int $parentId, int $grandparentId): int
    {
        if ($targetId <= 0 || $parentId <= 0 || $grandparentId <= 0) {
            return 0;
        }

        if ($targetId === $parentId || $parentId === $grandparentId || $targetId === $grandparentId) {
            return 0;
        }

        $this->ensureDataLoaded();

        $gt = self::$affinityData['charGroups'][$targetId] ?? null;
        $gp = self::$affinityData['charGroups'][$parentId] ?? null;
        $ggp = self::$affinityData['charGroups'][$grandparentId] ?? null;

        if (! $gt || ! $gp || ! $ggp) {
            return 0;
        }

        $setP = array_flip($gp);
        $setGp = array_flip($ggp);
        $pointsMap = self::$affinityData['groupPoints'] ?? [];

        $total = 0;
        foreach ($gt as $groupId) {
            if (isset($setP[$groupId], $setGp[$groupId])) {
                $total += $pointsMap[$groupId] ?? 0;
            }
        }

        return $total;
    }

    /**
     * Resolve a character identifier (catalog item ID, char_id, or name) to a canonical char_id.
     */
    public function resolveCharId(int|string|null $identifier): ?int
    {
        if ($identifier === null || $identifier === '' || $identifier === 0 || $identifier === '0') {
            return null;
        }

        $this->ensureDataLoaded();

        if (is_numeric($identifier)) {
            $num = (int) $identifier;

            if (isset(self::$affinityData['charGroups'][$num])) {
                return $num;
            }

            $catalogItem = UmaCatalogItem::find($num);
            if ($catalogItem && isset($catalogItem->raw_data['char_id'])) {
                return (int) $catalogItem->raw_data['char_id'];
            }

            return $num;
        }

        $name = trim((string) $identifier);
        if (isset(self::$affinityData['charMap'][$name])) {
            return self::$affinityData['charMap'][$name];
        }

        $cleanName = preg_replace('/^\[.*?\]\s*/u', '', $name);
        if ($cleanName && isset(self::$affinityData['charMap'][$cleanName])) {
            return self::$affinityData['charMap'][$cleanName];
        }

        $catalogItem = UmaCatalogItem::where('type', 'character')
            ->where(function ($query) use ($name, $cleanName) {
                $query->where('name', 'like', "%{$name}%")
                    ->orWhere('name', 'like', "%{$cleanName}%");
            })
            ->first();

        if ($catalogItem && isset($catalogItem->raw_data['char_id'])) {
            return (int) $catalogItem->raw_data['char_id'];
        }

        return null;
    }

    /**
     * Get rich character metadata for display by canonical char_id.
     *
     * @return array<string, mixed>|null
     */
    public function getCharacterMetadata(?int $charId): ?array
    {
        if (! $charId) {
            return null;
        }

        if (self::$catalogCharMap === null) {
            $items = UmaCatalogItem::where('type', 'character')->get();
            self::$catalogCharMap = [];
            foreach ($items as $item) {
                $cid = $item->raw_data['char_id'] ?? null;
                if ($cid && ! isset(self::$catalogCharMap[(int) $cid])) {
                    self::$catalogCharMap[(int) $cid] = $item;
                }
            }
        }

        $item = self::$catalogCharMap[$charId] ?? null;
        if (! $item) {
            return [
                'char_id' => $charId,
                'name' => "Uma #{$charId}",
                'name_ja' => "Uma #{$charId}",
                'title' => '',
                'image_url' => null,
                'rarity' => 3,
            ];
        }

        return [
            'id' => $item->id,
            'char_id' => $charId,
            'name' => $item->raw_data['name_en'] ?? $item->name,
            'name_ja' => $item->raw_data['name_jp'] ?? $item->name,
            'title' => $item->raw_data['title_en_gl'] ?? ($item->raw_data['title_jp'] ?? ''),
            'image_url' => $item->raw_data['thumb'] ?? ($item->raw_data['image_url'] ?? null),
            'rarity' => $item->raw_data['rarity'] ?? $item->rarity ?? 3,
        ];
    }

    /**
     * Calculate Pedigree Affinity for a 7-slot tree.
     *
     * @param  int  $targetId  Target Trainee Uma (catalog ID or char_id)
     * @param  array<string, mixed>|list<int>  $p1Tree  [parent => ..., gp1 => ..., gp2 => ..., wins => [...]]
     * @param  array<string, mixed>|list<int>  $p2Tree  [parent => ..., gp1 => ..., gp2 => ..., wins => [...]]
     * @param  list<int>|array<string, mixed>  $sharedG1Races  List of shared G1 race IDs or configurations
     * @param  int  $pointsPerRace  Points added per shared G1 race (standard is 3)
     * @param  string  $method  'pairwise' (default) or 'triple' (3-way for grandparents)
     * @return array<string, mixed>
     */
    public function calculatePedigreeAffinity(
        int $targetId,
        array $p1Tree,
        array $p2Tree,
        array $sharedG1Races = [],
        int $pointsPerRace = 3,
        string $method = 'pairwise'
    ): array {
        $targetCharId = $this->resolveCharId($targetId) ?? $targetId;

        $p1Id = $this->extractSlotId($p1Tree, 'parent');
        $gp1aId = $this->extractSlotId($p1Tree, 'gp1');
        $gp1bId = $this->extractSlotId($p1Tree, 'gp2');

        $p2Id = $this->extractSlotId($p2Tree, 'parent');
        $gp2aId = $this->extractSlotId($p2Tree, 'gp1');
        $gp2bId = $this->extractSlotId($p2Tree, 'gp2');

        $p1Wins = $this->extractSlotWins($p1Tree, 'parent', $sharedG1Races);
        $gp1aWins = $this->extractSlotWins($p1Tree, 'gp1', $sharedG1Races);
        $gp1bWins = $this->extractSlotWins($p1Tree, 'gp2', $sharedG1Races);

        $p2Wins = $this->extractSlotWins($p2Tree, 'parent', $sharedG1Races);
        $gp2aWins = $this->extractSlotWins($p2Tree, 'gp1', $sharedG1Races);
        $gp2bWins = $this->extractSlotWins($p2Tree, 'gp2', $sharedG1Races);

        $warnings = [];
        $lineageValid = true;

        if ($targetCharId > 0 && $p1Id > 0 && $targetCharId === $p1Id) {
            $warnings[] = 'Target Trainee dan Parent 1 tidak boleh merupakan karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($targetCharId > 0 && $p2Id > 0 && $targetCharId === $p2Id) {
            $warnings[] = 'Target Trainee dan Parent 2 tidak boleh merupakan karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($p1Id > 0 && $p2Id > 0 && $p1Id === $p2Id) {
            $warnings[] = 'Parent 1 dan Parent 2 tidak boleh berasal dari karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($p1Id > 0 && $gp1aId > 0 && $p1Id === $gp1aId) {
            $warnings[] = 'Parent 1 dan Grandparent 1A tidak boleh merupakan karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($p1Id > 0 && $gp1bId > 0 && $p1Id === $gp1bId) {
            $warnings[] = 'Parent 1 dan Grandparent 1B tidak boleh merupakan karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($p2Id > 0 && $gp2aId > 0 && $p2Id === $gp2aId) {
            $warnings[] = 'Parent 2 dan Grandparent 2A tidak boleh merupakan karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($p2Id > 0 && $gp2bId > 0 && $p2Id === $gp2bId) {
            $warnings[] = 'Parent 2 dan Grandparent 2B tidak boleh merupakan karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($gp1aId > 0 && $gp1bId > 0 && $gp1aId === $gp1bId) {
            $warnings[] = 'Grandparent 1A dan 1B pada sisi yang sama tidak boleh karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        if ($gp2aId > 0 && $gp2bId > 0 && $gp2aId === $gp2bId) {
            $warnings[] = 'Grandparent 2A dan 2B pada sisi yang sama tidak boleh karakter yang sama (termasuk variasi kostum).';
            $lineageValid = false;
        }

        $baseTargetP1 = ($targetCharId > 0 && $p1Id > 0 && $targetCharId !== $p1Id) ? $this->getBaseAffinity($targetCharId, $p1Id) : 0;
        $baseTargetP2 = ($targetCharId > 0 && $p2Id > 0 && $targetCharId !== $p2Id) ? $this->getBaseAffinity($targetCharId, $p2Id) : 0;
        $baseP1P2 = ($p1Id > 0 && $p2Id > 0 && $p1Id !== $p2Id) ? $this->getBaseAffinity($p1Id, $p2Id) : 0;

        if ($method === 'triple') {
            $baseP1Gp1a = ($targetCharId > 0 && $p1Id > 0 && $gp1aId > 0 && $p1Id !== $gp1aId && $targetCharId !== $gp1aId) ? $this->getTripleAffinity($targetCharId, $p1Id, $gp1aId) : 0;
            $baseP1Gp1b = ($targetCharId > 0 && $p1Id > 0 && $gp1bId > 0 && $p1Id !== $gp1bId && $targetCharId !== $gp1bId) ? $this->getTripleAffinity($targetCharId, $p1Id, $gp1bId) : 0;
            $baseP2Gp2a = ($targetCharId > 0 && $p2Id > 0 && $gp2aId > 0 && $p2Id !== $gp2aId && $targetCharId !== $gp2aId) ? $this->getTripleAffinity($targetCharId, $p2Id, $gp2aId) : 0;
            $baseP2Gp2b = ($targetCharId > 0 && $p2Id > 0 && $gp2bId > 0 && $p2Id !== $gp2bId && $targetCharId !== $gp2bId) ? $this->getTripleAffinity($targetCharId, $p2Id, $gp2bId) : 0;
        } else {
            $baseP1Gp1a = ($p1Id > 0 && $gp1aId > 0 && $p1Id !== $gp1aId) ? $this->getBaseAffinity($p1Id, $gp1aId) : 0;
            $baseP1Gp1b = ($p1Id > 0 && $gp1bId > 0 && $p1Id !== $gp1bId) ? $this->getBaseAffinity($p1Id, $gp1bId) : 0;
            $baseP2Gp2a = ($p2Id > 0 && $gp2aId > 0 && $p2Id !== $gp2aId) ? $this->getBaseAffinity($p2Id, $gp2aId) : 0;
            $baseP2Gp2b = ($p2Id > 0 && $gp2bId > 0 && $p2Id !== $gp2bId) ? $this->getBaseAffinity($p2Id, $gp2bId) : 0;
        }

        $tripleP1Gp1a = ($targetCharId > 0 && $p1Id > 0 && $gp1aId > 0) ? $this->getTripleAffinity($targetCharId, $p1Id, $gp1aId) : 0;
        $tripleP1Gp1b = ($targetCharId > 0 && $p1Id > 0 && $gp1bId > 0) ? $this->getTripleAffinity($targetCharId, $p1Id, $gp1bId) : 0;
        $tripleP2Gp2a = ($targetCharId > 0 && $p2Id > 0 && $gp2aId > 0) ? $this->getTripleAffinity($targetCharId, $p2Id, $gp2aId) : 0;
        $tripleP2Gp2b = ($targetCharId > 0 && $p2Id > 0 && $gp2bId > 0) ? $this->getTripleAffinity($targetCharId, $p2Id, $gp2bId) : 0;

        $g1Points = max(1, min(3, $pointsPerRace));

        $bonusP1P2 = ($p1Id > 0 && $p2Id > 0 && $p1Id !== $p2Id) ? ($this->calculateG1MatchCount($p1Wins, $p2Wins) * $g1Points) : 0;
        $bonusP1Gp1a = ($p1Id > 0 && $gp1aId > 0 && $p1Id !== $gp1aId) ? ($this->calculateG1MatchCount($p1Wins, $gp1aWins) * $g1Points) : 0;
        $bonusP1Gp1b = ($p1Id > 0 && $gp1bId > 0 && $p1Id !== $gp1bId) ? ($this->calculateG1MatchCount($p1Wins, $gp1bWins) * $g1Points) : 0;
        $bonusP2Gp2a = ($p2Id > 0 && $gp2aId > 0 && $p2Id !== $gp2aId) ? ($this->calculateG1MatchCount($p2Wins, $gp2aWins) * $g1Points) : 0;
        $bonusP2Gp2b = ($p2Id > 0 && $gp2bId > 0 && $p2Id !== $gp2bId) ? ($this->calculateG1MatchCount($p2Wins, $gp2bWins) * $g1Points) : 0;

        $totalBase = $baseTargetP1 + $baseTargetP2 + $baseP1P2 + $baseP1Gp1a + $baseP1Gp1b + $baseP2Gp2a + $baseP2Gp2b;
        $totalG1Bonus = $bonusP1P2 + $bonusP1Gp1a + $bonusP1Gp1b + $bonusP2Gp2a + $bonusP2Gp2b;
        $totalScore = $totalBase + $totalG1Bonus;

        $badge = $this->getBadge($totalScore);

        $slots = [
            'target' => $this->getCharacterMetadata($targetCharId),
            'parent1' => $this->getCharacterMetadata($p1Id),
            'grandparent11' => $this->getCharacterMetadata($gp1aId),
            'grandparent12' => $this->getCharacterMetadata($gp1bId),
            'parent2' => $this->getCharacterMetadata($p2Id),
            'grandparent21' => $this->getCharacterMetadata($gp2aId),
            'grandparent22' => $this->getCharacterMetadata($gp2bId),
        ];

        return [
            'total_score' => $totalScore,
            'base_score' => $totalBase,
            'g1_bonus_score' => $totalG1Bonus,
            'badge' => $badge['symbol'],
            'badge_info' => $badge,
            'lineage_valid' => $lineageValid,
            'warnings' => $warnings,
            'method' => $method,
            'points_per_race' => $g1Points,
            'slots' => $slots,
            'breakdown' => [
                'target_p1' => [
                    'label' => 'Target ↔ Parent 1',
                    'base' => $baseTargetP1,
                    'g1_bonus' => 0,
                    'total' => $baseTargetP1,
                ],
                'target_p2' => [
                    'label' => 'Target ↔ Parent 2',
                    'base' => $baseTargetP2,
                    'g1_bonus' => 0,
                    'total' => $baseTargetP2,
                ],
                'p1_p2' => [
                    'label' => 'Parent 1 ↔ Parent 2',
                    'base' => $baseP1P2,
                    'g1_bonus' => $bonusP1P2,
                    'total' => $baseP1P2 + $bonusP1P2,
                    'matches' => $this->calculateG1MatchCount($p1Wins, $p2Wins),
                ],
                'p1_gp1a' => [
                    'label' => 'Parent 1 ↔ Grandparent 1A',
                    'base' => $baseP1Gp1a,
                    'triple_base' => $tripleP1Gp1a,
                    'g1_bonus' => $bonusP1Gp1a,
                    'total' => $baseP1Gp1a + $bonusP1Gp1a,
                    'matches' => $this->calculateG1MatchCount($p1Wins, $gp1aWins),
                ],
                'p1_gp1b' => [
                    'label' => 'Parent 1 ↔ Grandparent 1B',
                    'base' => $baseP1Gp1b,
                    'triple_base' => $tripleP1Gp1b,
                    'g1_bonus' => $bonusP1Gp1b,
                    'total' => $baseP1Gp1b + $bonusP1Gp1b,
                    'matches' => $this->calculateG1MatchCount($p1Wins, $gp1bWins),
                ],
                'p2_gp2a' => [
                    'label' => 'Parent 2 ↔ Grandparent 2A',
                    'base' => $baseP2Gp2a,
                    'triple_base' => $tripleP2Gp2a,
                    'g1_bonus' => $bonusP2Gp2a,
                    'total' => $baseP2Gp2a + $bonusP2Gp2a,
                    'matches' => $this->calculateG1MatchCount($p2Wins, $gp2aWins),
                ],
                'p2_gp2b' => [
                    'label' => 'Parent 2 ↔ Grandparent 2B',
                    'base' => $baseP2Gp2b,
                    'triple_base' => $tripleP2Gp2b,
                    'g1_bonus' => $bonusP2Gp2b,
                    'total' => $baseP2Gp2b + $bonusP2Gp2b,
                    'matches' => $this->calculateG1MatchCount($p2Wins, $gp2bWins),
                ],
            ],
            'thresholds' => [
                'circle_needed' => max(0, 51 - $totalScore),
                'double_circle_needed' => max(0, 151 - $totalScore),
            ],
        ];
    }

    /**
     * Find best parent pairs from user's owned character collection.
     *
     * @param  int  $targetId  Target Uma catalog item ID or char_id
     * @param  int  $limit  Number of top parent pairs to return
     * @return array<string, mixed>
     */
    public function findBestParents(int $targetId, int $limit = 5): array
    {
        $targetCharId = $this->resolveCharId($targetId) ?? $targetId;
        $targetMeta = $this->getCharacterMetadata($targetCharId);

        $ownedUserChars = UserCharacter::where('is_owned', true)
            ->with('catalogItem')
            ->get();

        /** @var array<int, array<string, mixed>> $pool */
        $pool = [];
        foreach ($ownedUserChars as $uc) {
            $cid = $uc->catalogItem?->raw_data['char_id'] ?? null;
            if (! $cid) {
                $cid = $this->resolveCharId($uc->name);
            }

            if (! $cid || (int) $cid === $targetCharId) {
                continue;
            }

            $cid = (int) $cid;
            if (! isset($pool[$cid])) {
                $pool[$cid] = [
                    'char_id' => $cid,
                    'user_character_id' => $uc->id,
                    'catalog_id' => $uc->uma_catalog_item_id,
                    'name' => $uc->catalogItem?->raw_data['name_en'] ?? $uc->name,
                    'name_ja' => $uc->catalogItem?->raw_data['name_jp'] ?? $uc->name,
                    'title' => $uc->catalogItem?->raw_data['title_en_gl'] ?? ($uc->catalogItem?->raw_data['title_jp'] ?? ''),
                    'image_url' => $uc->catalogItem?->raw_data['thumb'] ?? ($uc->catalogItem?->raw_data['image_url'] ?? null),
                    'rarity' => $uc->current_stars ?: ($uc->base_stars ?: 3),
                ];
            }
        }

        $charIds = array_keys($pool);
        $count = count($charIds);
        $pairs = [];

        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $c1 = $charIds[$i];
                $c2 = $charIds[$j];

                $scoreT1 = $this->getBaseAffinity($targetCharId, $c1);
                $scoreT2 = $this->getBaseAffinity($targetCharId, $c2);
                $scoreP1P2 = $this->getBaseAffinity($c1, $c2);
                $totalBase = $scoreT1 + $scoreT2 + $scoreP1P2;

                $pairs[] = [
                    'parent1' => $pool[$c1],
                    'parent2' => $pool[$c2],
                    'total_base_score' => $totalBase,
                    'breakdown' => [
                        'target_p1' => $scoreT1,
                        'target_p2' => $scoreT2,
                        'p1_p2' => $scoreP1P2,
                    ],
                    'badge' => $this->getBadge($totalBase),
                ];
            }
        }

        usort($pairs, static function ($a, $b) {
            return $b['total_base_score'] <=> $a['total_base_score'];
        });

        $topPairs = array_slice($pairs, 0, max(1, $limit));

        return [
            'target' => $targetMeta,
            'owned_count' => $count,
            'recommendations' => $topPairs,
        ];
    }

    /**
     * Get classification badge info by total affinity score.
     *
     * @return array{symbol: string, tier: string, label: string, color: string, description: string}
     */
    public function getBadge(int $totalScore): array
    {
        if ($totalScore < 51) {
            return [
                'symbol' => '△',
                'tier' => 'low',
                'label' => 'Peluang Rendah (△)',
                'color' => 'slate',
                'description' => 'Peluang pewarisan faktor rendah (< 51 poin).',
            ];
        }

        if ($totalScore <= 150) {
            return [
                'symbol' => '○',
                'tier' => 'normal',
                'label' => 'Peluang Normal (○)',
                'color' => 'emerald',
                'description' => 'Peluang pewarisan faktor standar/cukup (51 - 150 poin).',
            ];
        }

        return [
            'symbol' => '◎',
            'tier' => 'maximum',
            'label' => 'Peluang Maksimal (◎)',
            'color' => 'gold',
            'description' => 'Peluang pewarisan faktor tertinggi / Double Circle (≥ 151 poin).',
        ];
    }

    /**
     * Get structured list of popular JP G1 races.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getG1Races(): array
    {
        if (self::$cachedG1Races !== null) {
            return self::$cachedG1Races;
        }

        self::$cachedG1Races = [
            'classic_triple_crown' => [
                'category_name' => 'Classic Triple Crown (クラシック三冠)',
                'category_name_jp' => 'クラシック三冠',
                'description' => 'Tiga balapan prestisius utama tahun kedua (Classic Class)',
                'races' => [
                    ['id' => 1005, 'name_en' => 'Satsuki Sho', 'name_ja' => '皐月賞', 'distance' => 2000, 'surface' => 'Turf', 'track' => 'Nakayama', 'period' => 'Classic Apr 1st half'],
                    ['id' => 1010, 'name_en' => 'Tokyo Yushun (Japanese Derby)', 'name_ja' => '日本ダービー（東京優駿）', 'distance' => 2400, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Classic May 2nd half'],
                    ['id' => 1015, 'name_en' => 'Kikuka Sho', 'name_ja' => '菊花賞', 'distance' => 3000, 'surface' => 'Turf', 'track' => 'Kyoto', 'period' => 'Classic Oct 2nd half'],
                ],
            ],
            'tiara_triple_crown' => [
                'category_name' => 'Tiara Triple Crown (牝馬三冠 / トリプルティアラ)',
                'category_name_jp' => '牝馬三冠（トリプルティアラ）',
                'description' => 'Tiga balapan puncak divisi Filly/Mare Classic',
                'races' => [
                    ['id' => 1004, 'name_en' => 'Oka Sho (Japanese 1000 Guineas)', 'name_ja' => '桜花賞', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Hanshin', 'period' => 'Classic Apr 1st half'],
                    ['id' => 1009, 'name_en' => 'Yushun Himba (Japanese Oaks)', 'name_ja' => '優駿牝馬（オークス）', 'distance' => 2400, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Classic May 2nd half'],
                    ['id' => 1014, 'name_en' => 'Shuka Sho', 'name_ja' => '秋華賞', 'distance' => 2000, 'surface' => 'Turf', 'track' => 'Kyoto', 'period' => 'Classic Oct 2nd half'],
                ],
            ],
            'spring_senior_g1' => [
                'category_name' => 'Spring Senior G1 (春古馬三冠)',
                'category_name_jp' => '春シニア三冠',
                'description' => 'Tiga balapan puncak Senior musim semi (Spring Triple Crown)',
                'races' => [
                    ['id' => 1003, 'name_en' => 'Osaka Hai', 'name_ja' => '大阪杯', 'distance' => 2000, 'surface' => 'Turf', 'track' => 'Hanshin', 'period' => 'Senior Mar 2nd half'],
                    ['id' => 1006, 'name_en' => 'Tenno Sho (Spring)', 'name_ja' => '天皇賞（春）', 'distance' => 3200, 'surface' => 'Turf', 'track' => 'Kyoto', 'period' => 'Senior Apr 2nd half'],
                    ['id' => 1012, 'name_en' => 'Takarazuka Kinen', 'name_ja' => '宝塚記念', 'distance' => 2200, 'surface' => 'Turf', 'track' => 'Hanshin', 'period' => 'Classic/Senior Jun 2nd half'],
                ],
            ],
            'autumn_senior_g1' => [
                'category_name' => 'Autumn Senior G1 (秋古馬三冠)',
                'category_name_jp' => '秋シニア三冠',
                'description' => 'Tiga balapan puncak Senior musim gugur (Autumn Triple Crown)',
                'races' => [
                    ['id' => 1016, 'name_en' => 'Tenno Sho (Autumn)', 'name_ja' => '天皇賞（秋）', 'distance' => 2000, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Classic/Senior Oct 2nd half'],
                    ['id' => 1019, 'name_en' => 'Japan Cup', 'name_ja' => 'ジャパンカップ', 'distance' => 2400, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Classic/Senior Nov 2nd half'],
                    ['id' => 1023, 'name_en' => 'Arima Kinen', 'name_ja' => '有馬記念', 'distance' => 2500, 'surface' => 'Turf', 'track' => 'Nakayama', 'period' => 'Classic/Senior Dec 2nd half'],
                ],
            ],
            'sprint_mile_g1' => [
                'category_name' => 'Sprint & Mile G1 (短距離・マイルG1)',
                'category_name_jp' => 'スプリント・マイルG1',
                'description' => 'Balapan kecepatan tinggi jarak 1200m - 1600m',
                'races' => [
                    ['id' => 1002, 'name_en' => 'Takamatsunomiya Kinen', 'name_ja' => '高松宮記念', 'distance' => 1200, 'surface' => 'Turf', 'track' => 'Chukyo', 'period' => 'Senior Mar 2nd half'],
                    ['id' => 1008, 'name_en' => 'Victoria Mile', 'name_ja' => 'ヴィクトリアマイル', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Senior May 1st half'],
                    ['id' => 1007, 'name_en' => 'NHK Mile Cup', 'name_ja' => 'NHKマイルカップ', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Classic May 1st half'],
                    ['id' => 1011, 'name_en' => 'Yasuda Kinen', 'name_ja' => '安田記念', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Tokyo', 'period' => 'Classic/Senior Jun 1st half'],
                    ['id' => 1013, 'name_en' => 'Sprinters Stakes', 'name_ja' => 'スプリンターズステークス', 'distance' => 1200, 'surface' => 'Turf', 'track' => 'Nakayama', 'period' => 'Classic/Senior Sep 2nd half'],
                    ['id' => 1018, 'name_en' => 'Mile Championship', 'name_ja' => 'マイルチャンピオンシップ', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Kyoto', 'period' => 'Classic/Senior Nov 2nd half'],
                    ['id' => 1017, 'name_en' => 'Queen Elizabeth II Cup', 'name_ja' => 'エリザベス女王杯', 'distance' => 2200, 'surface' => 'Turf', 'track' => 'Kyoto', 'period' => 'Classic/Senior Nov 1st half'],
                    ['id' => 1021, 'name_en' => 'Hanshin Juvenile Fillies', 'name_ja' => '阪神ジュベナイルフィリーズ', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Hanshin', 'period' => 'Junior Dec 1st half'],
                    ['id' => 1022, 'name_en' => 'Asahi Hai Futurity Stakes', 'name_ja' => '朝日杯フューチュリティステークス', 'distance' => 1600, 'surface' => 'Turf', 'track' => 'Hanshin', 'period' => 'Junior Dec 1st half'],
                    ['id' => 1024, 'name_en' => 'Hopeful Stakes', 'name_ja' => 'ホープフルステークス', 'distance' => 2000, 'surface' => 'Turf', 'track' => 'Nakayama', 'period' => 'Junior Dec 2nd half'],
                ],
            ],
            'dirt_g1' => [
                'category_name' => 'Dirt G1 & Jpn1 (ダート交流重賞)',
                'category_name_jp' => 'ダートG1・Jpn1',
                'description' => 'Balapan lintasan tanah (Dirt) JRA dan NAR',
                'races' => [
                    ['id' => 1001, 'name_en' => 'February Stakes', 'name_ja' => 'フェブラリーステークス', 'distance' => 1600, 'surface' => 'Dirt', 'track' => 'Tokyo', 'period' => 'Senior Feb 2nd half'],
                    ['id' => 1107, 'name_en' => 'Kawasaki Kinen', 'name_ja' => '川崎記念', 'distance' => 2100, 'surface' => 'Dirt', 'track' => 'Kawasaki', 'period' => 'Senior Apr 1st half'],
                    ['id' => 1109, 'name_en' => 'Kashiwa Kinen', 'name_ja' => 'かしわ記念', 'distance' => 1600, 'surface' => 'Dirt', 'track' => 'Funabashi', 'period' => 'Senior May 1st half'],
                    ['id' => 1101, 'name_en' => 'Teio Sho', 'name_ja' => '帝王賞', 'distance' => 2000, 'surface' => 'Dirt', 'track' => 'Oi', 'period' => 'Classic/Senior Jun 2nd half'],
                    ['id' => 1102, 'name_en' => 'Japan Dirt Classic (JDC)', 'name_ja' => 'ジャパンダートクラシック', 'distance' => 2000, 'surface' => 'Dirt', 'track' => 'Oi', 'period' => 'Classic Oct 1st half'],
                    ['id' => 1110, 'name_en' => 'Mile Championship Nambu Hai', 'name_ja' => 'マイルCS南部杯', 'distance' => 1600, 'surface' => 'Dirt', 'track' => 'Morioka', 'period' => 'Classic/Senior Oct 1st half'],
                    ['id' => 1105, 'name_en' => 'JBC Classic', 'name_ja' => 'JBCクラシック', 'distance' => 2000, 'surface' => 'Dirt', 'track' => 'Various', 'period' => 'Classic/Senior Nov 1st half'],
                    ['id' => 1104, 'name_en' => 'JBC Sprint', 'name_ja' => 'JBCスプリント', 'distance' => 1200, 'surface' => 'Dirt', 'track' => 'Various', 'period' => 'Classic/Senior Nov 1st half'],
                    ['id' => 1020, 'name_en' => 'Champions Cup', 'name_ja' => 'チャンピオンズカップ', 'distance' => 1800, 'surface' => 'Dirt', 'track' => 'Chukyo', 'period' => 'Classic/Senior Dec 1st half'],
                    ['id' => 1108, 'name_en' => 'Zen-Nihon Nisai Yushun', 'name_ja' => '全日本2歳優駿', 'distance' => 1600, 'surface' => 'Dirt', 'track' => 'Kawasaki', 'period' => 'Junior Dec 2nd half'],
                    ['id' => 1106, 'name_en' => 'Tokyo Daishoten', 'name_ja' => '東京大賞典', 'distance' => 2000, 'surface' => 'Dirt', 'track' => 'Oi', 'period' => 'Classic/Senior Dec 2nd half'],
                ],
            ],
        ];

        return self::$cachedG1Races;
    }

    /**
     * Extract character ID from tree input.
     *
     * @param  array<string, mixed>|list<int>  $tree
     */
    protected function extractSlotId(array $tree, string $key): ?int
    {
        $val = null;
        if ($key === 'parent') {
            $val = $tree['char_id'] ?? ($tree['parent_id'] ?? ($tree['parent']['char_id'] ?? ($tree['parent']['id'] ?? ($tree['parent'] ?? ($tree['id'] ?? ($tree[0] ?? null))))));
        } elseif ($key === 'gp1') {
            $val = $tree['gp1_char_id'] ?? ($tree['gp1_id'] ?? ($tree['gp1']['char_id'] ?? ($tree['gp1']['id'] ?? ($tree['gp1'] ?? ($tree['grandparent1'] ?? ($tree[1] ?? null))))));
        } elseif ($key === 'gp2') {
            $val = $tree['gp2_char_id'] ?? ($tree['gp2_id'] ?? ($tree['gp2']['char_id'] ?? ($tree['gp2']['id'] ?? ($tree['gp2'] ?? ($tree['grandparent2'] ?? ($tree[2] ?? null))))));
        }

        if ($val === null || $val === 0 || $val === '0' || $val === '') {
            return null;
        }

        return $this->resolveCharId($val);
    }

    /**
     * Extract won race IDs for a slot, falling back to shared list.
     *
     * @param  array<string, mixed>|list<int>  $tree
     * @param  list<int>|array<string, mixed>  $sharedG1Races
     * @return list<int>
     */
    protected function extractSlotWins(array $tree, string $key, array $sharedG1Races): array
    {
        $slotWins = null;
        if ($key === 'parent') {
            $slotWins = $tree['wins'] ?? ($tree['parent']['wins'] ?? null);
        } elseif ($key === 'gp1') {
            $slotWins = $tree['gp1_wins'] ?? ($tree['gp1']['wins'] ?? null);
        } elseif ($key === 'gp2') {
            $slotWins = $tree['gp2_wins'] ?? ($tree['gp2']['wins'] ?? null);
        }

        if (is_array($slotWins) && ! empty($slotWins)) {
            return array_values(array_unique(array_map('intval', $slotWins)));
        }

        if (array_is_list($sharedG1Races)) {
            return array_values(array_unique(array_map('intval', $sharedG1Races)));
        }

        $racesList = $sharedG1Races['races'] ?? ($sharedG1Races[$key] ?? []);
        if (is_array($racesList)) {
            return array_values(array_unique(array_map('intval', $racesList)));
        }

        return [];
    }

    /**
     * Count shared matching G1 race wins between two lists.
     *
     * @param  list<int>  $wins1
     * @param  list<int>  $wins2
     */
    protected function calculateG1MatchCount(array $wins1, array $wins2): int
    {
        if (empty($wins1) || empty($wins2)) {
            return 0;
        }

        return count(array_intersect($wins1, $wins2));
    }
}
