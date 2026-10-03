<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Models\UserSupportCard;
use App\Services\GameToraSyncService;
use App\Services\UmaAffinityService;
use App\Support\UmaCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    /**
     * Helper to determine base star rating (1, 2, or 3) for a character.
     */
    protected function resolveBaseStars(string $name, ?UmaCatalogItem $item = null): int
    {
        if ($item !== null) {
            $raw = $item->raw_data;
            if (is_array($raw) && isset($raw['rarity']) && is_numeric($raw['rarity'])) {
                $r = (int) $raw['rarity'];
                if ($r >= 1 && $r <= 3) {
                    return $r;
                }
            }

            if ($item->rarity === 'SSR') {
                return 3;
            }
            if ($item->rarity === 'SR') {
                return 2;
            }
            if ($item->rarity === 'R') {
                return 1;
            }
        }

        $rarities = UmaCatalog::getCharacterRarities();
        $rarityStr = $rarities[$name] ?? 'SSR';

        return match ($rarityStr) {
            'R' => 1,
            'SR' => 2,
            default => 3,
        };
    }

    /**
     * Helper to extract card rarity, type, and character name for support card.
     *
     * @return array{rarity: string, card_type: string, char_name: string}
     */
    protected function resolveSupportCardMeta(string $name, ?UmaCatalogItem $item = null): array
    {
        $rarity = 'SSR';
        $type = 'Speed';
        $charName = '';

        if ($item !== null && is_array($item->raw_data)) {
            $raw = $item->raw_data;
            $charName = (string) ($raw['char_name'] ?? '');
            $rawRarity = (int) ($raw['rarity'] ?? 3);
            $rarity = $rawRarity === 3 ? 'SSR' : ($rawRarity === 2 ? 'SR' : 'R');
            $type = ucfirst((string) ($raw['type'] ?? 'Speed'));
        }

        // Parse from string if missing
        if ($charName === '' || $type === '') {
            // Format e.g. "SSR [Innovator] Forever Young (Speed)"
            if (preg_match('/^(SSR|SR|R)\s+\[(.*?)\]\s+(.*?)(?:\s+\((.*?)\))?$/u', $name, $matches)) {
                $rarity = $matches[1];
                $charName = trim($matches[3]);
                $type = ! empty($matches[4]) ? ucfirst(trim($matches[4])) : $type;
            }
        }

        // Normalize intelligence/wit
        if (strcasecmp($type, 'Intelligence') === 0 || strcasecmp($type, 'Wit') === 0) {
            $type = 'Wit';
        }

        return [
            'rarity' => $rarity,
            'card_type' => $type,
            'char_name' => $charName,
        ];
    }

    /**
     * Helper to resolve GameTora image URL for a character variant.
     */
    protected function resolveCharacterImageUrl(?UmaCatalogItem $item): ?string
    {
        if (! $item || ! is_array($item->raw_data)) {
            return null;
        }

        $raw = $item->raw_data;
        if (! empty($raw['image_url'])) {
            return (string) $raw['image_url'];
        }

        $charId = $raw['char_id'] ?? null;
        $cardId = $raw['card_id'] ?? $item->gametora_id ?? null;
        if ($charId && $cardId) {
            return "https://gametora.com/images/umamusume/characters/thumb/chara_stand_{$charId}_{$cardId}.png";
        }

        return $raw['icon'] ?? $raw['thumb'] ?? null;
    }

    /**
     * Helper to resolve GameTora image URL for a support card (300x400 full uncropped illustration).
     */
    protected function resolveSupportCardImageUrl(?UmaCatalogItem $item): ?string
    {
        if (! $item || ! is_array($item->raw_data)) {
            return null;
        }

        $raw = $item->raw_data;
        $supportId = $raw['support_id'] ?? $item->gametora_id ?? null;
        if ($supportId) {
            return "https://media.gametora.com/umamusume/supports/full/small/{$supportId}.png";
        }

        if (! empty($raw['image_url'])) {
            return (string) $raw['image_url'];
        }

        return $raw['thumb'] ?? $raw['icon'] ?? null;
    }

    /**
     * Helper to resolve GameTora full high-resolution image URL for a support card (1536x2048).
     */
    protected function resolveSupportCardFullImageUrl(?UmaCatalogItem $item): ?string
    {
        if (! $item || ! is_array($item->raw_data)) {
            return null;
        }

        $raw = $item->raw_data;
        $supportId = $raw['support_id'] ?? $item->gametora_id ?? null;
        if ($supportId) {
            return "https://media.gametora.com/umamusume/supports/full/{$supportId}.png";
        }

        return $this->resolveSupportCardImageUrl($item);
    }

    /**
     * Retrieve full character collection with user ownership and statistics.
     */
    public function getCharacters(Request $request): JsonResponse
    {
        // 1. Fetch catalog characters
        $catalogItems = UmaCatalogItem::where('type', 'character')
            ->orderBy('name')
            ->get()
            ->keyBy('name');

        $characterNames = $catalogItems->isNotEmpty()
            ? $catalogItems->keys()->all()
            : UmaCatalog::getCharacters();

        // 2. Fetch user's saved character states
        $userCharacters = UserCharacter::all()->keyBy('name');

        // 3. Build combined collection list
        $collection = [];
        $totalOwned = 0;
        $countByStars = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];

        $affinityService = app(UmaAffinityService::class);

        foreach ($characterNames as $name) {
            $catalogItem = $catalogItems->get($name);
            $userChar = $userCharacters->get($name);

            $baseStars = $userChar?->base_stars ?? $this->resolveBaseStars($name, $catalogItem);
            $isOwned = $userChar ? (bool) $userChar->is_owned : false;
            $currentStars = $userChar ? max($baseStars, (int) $userChar->current_stars) : $baseStars;

            if ($isOwned) {
                $totalOwned++;
                $countByStars[$currentStars] = ($countByStars[$currentStars] ?? 0) + 1;
            }

            $imageUrl = $this->resolveCharacterImageUrl($catalogItem);

            $collection[] = [
                'id' => $userChar?->id,
                'char_id' => isset($catalogItem?->raw_data['char_id']) ? (int) $catalogItem->raw_data['char_id'] : $affinityService->resolveCharId($name),
                'catalog_item_id' => $catalogItem?->id,
                'uma_catalog_item_id' => $catalogItem?->id,
                'gametora_id' => $catalogItem?->gametora_id,
                'name' => $name,
                'base_stars' => $baseStars,
                'current_stars' => $currentStars,
                'is_owned' => $isOwned,
                'obtained_at' => $userChar?->obtained_at?->format('Y-m-d'),
                'notes' => $userChar?->notes,
                'image_url' => $imageUrl,
                'icon_url' => $imageUrl,
                'aptitudes' => $catalogItem?->aptitudes,
                'skills' => $catalogItem?->skills,
                'objectives' => $catalogItem?->objectives ?? [],
                'base_stats' => $catalogItem?->raw_data['base_stats'] ?? null,
                'five_star_stats' => $catalogItem?->raw_data['five_star_stats'] ?? null,
                'stat_bonus' => $catalogItem?->raw_data['stat_bonus'] ?? null,
            ];
        }

        $totalAvailable = count($collection);
        $completionRate = $totalAvailable > 0 ? round(($totalOwned / $totalAvailable) * 100, 1) : 0.0;

        return response()->json([
            'success' => true,
            'stats' => [
                'total_available' => $totalAvailable,
                'total_owned' => $totalOwned,
                'completion_rate' => $completionRate,
                'count_5_star' => $countByStars[5] ?? 0,
                'count_4_star' => $countByStars[4] ?? 0,
                'count_3_star' => $countByStars[3] ?? 0,
                'count_2_star' => $countByStars[2] ?? 0,
                'count_1_star' => $countByStars[1] ?? 0,
            ],
            'characters' => $collection,
        ]);
    }

    /**
     * Retrieve complete character detail including aptitudes and skills tree.
     */
    public function getCharacterDetail(Request $request): JsonResponse
    {
        $name = $request->query('name');
        $id = $request->query('id');

        $query = UmaCatalogItem::where('type', 'character');
        if ($id) {
            $catalogItem = (clone $query)->where('id', $id)->first();
        } elseif ($name) {
            $catalogItem = (clone $query)->where('name', $name)->first();
            if (! $catalogItem) {
                $catalogItem = (clone $query)->where('name', 'like', $name.'%')->first()
                    ?? (clone $query)->where('name', 'like', '%'.$name.'%')->first();
            }
        } else {
            return response()->json(['success' => false, 'message' => 'Parameter name atau id diperlukan.'], 400);
        }

        if (! $catalogItem) {
            return response()->json(['success' => false, 'message' => 'Karakter tidak ditemukan.'], 404);
        }

        $userChar = UserCharacter::where('name', $catalogItem->name)->first();
        $baseStars = $userChar?->base_stars ?? $this->resolveBaseStars($catalogItem->name, $catalogItem);
        $currentStars = $userChar ? max($baseStars, (int) $userChar->current_stars) : $baseStars;
        $imageUrl = $this->resolveCharacterImageUrl($catalogItem);

        return response()->json([
            'success' => true,
            'character' => [
                'id' => $userChar?->id,
                'uma_catalog_item_id' => $catalogItem->id,
                'gametora_id' => $catalogItem->gametora_id,
                'name' => $catalogItem->name,
                'base_stars' => $baseStars,
                'current_stars' => $currentStars,
                'is_owned' => $userChar ? (bool) $userChar->is_owned : false,
                'image_url' => $imageUrl,
                'aptitudes' => $catalogItem->aptitudes,
                'skills' => $catalogItem->skills,
                'objectives' => $catalogItem->objectives ?? [],
                'base_stats' => $catalogItem->raw_data['base_stats'] ?? null,
                'five_star_stats' => $catalogItem->raw_data['five_star_stats'] ?? null,
                'stat_bonus' => $catalogItem->raw_data['stat_bonus'] ?? null,
            ],
        ]);
    }

    /**
     * Toggle ownership of a character.
     */
    public function toggleCharacter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'is_owned' => 'nullable|boolean',
        ]);

        $name = $validated['name'];
        $catalogItem = UmaCatalogItem::where('type', 'character')->where('name', $name)->first();
        $baseStars = $this->resolveBaseStars($name, $catalogItem);

        $userChar = UserCharacter::firstOrNew(['name' => $name]);

        if (! $userChar->exists) {
            $userChar->uma_catalog_item_id = $catalogItem?->id;
            $userChar->base_stars = $baseStars;
            $userChar->current_stars = $baseStars;
            $userChar->is_owned = $validated['is_owned'] ?? true;
            $userChar->obtained_at = now();
        } else {
            $userChar->is_owned = array_key_exists('is_owned', $validated)
                ? (bool) $validated['is_owned']
                : ! $userChar->is_owned;

            if ($userChar->is_owned && ! $userChar->obtained_at) {
                $userChar->obtained_at = now();
            }
        }

        $userChar->save();

        return response()->json([
            'success' => true,
            'message' => $userChar->is_owned
                ? "{$name} ditambahkan ke koleksi!"
                : "{$name} dihapus dari koleksi.",
            'character' => [
                'id' => $userChar->id,
                'name' => $userChar->name,
                'base_stars' => $userChar->base_stars,
                'current_stars' => $userChar->current_stars,
                'is_owned' => $userChar->is_owned,
                'obtained_at' => $userChar->obtained_at?->format('Y-m-d'),
                'image_url' => $this->resolveCharacterImageUrl($catalogItem),
                'icon_url' => $this->resolveCharacterImageUrl($catalogItem),
            ],
        ]);
    }

    /**
     * Update character star rating with strict validation:
     * Current stars cannot be lower than base stars!
     */
    public function updateCharacterStars(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'stars' => 'required|integer|min:1|max:5',
        ]);

        $name = $validated['name'];
        $newStars = (int) $validated['stars'];

        $catalogItem = UmaCatalogItem::where('type', 'character')->where('name', $name)->first();
        $baseStars = $this->resolveBaseStars($name, $catalogItem);

        // Strict rule: Stars cannot be lower than base stars!
        if ($newStars < $baseStars) {
            return response()->json([
                'success' => false,
                'message' => "Bintang karakter {$name} tidak boleh di bawah bintang bawaan ({$baseStars}★). Pilihan yang diizinkan: {$baseStars}★ s.d. 5★.",
            ], 422);
        }

        $userChar = UserCharacter::firstOrNew(['name' => $name]);
        $userChar->uma_catalog_item_id = $catalogItem?->id;
        $userChar->base_stars = $baseStars;
        $userChar->current_stars = $newStars;
        $userChar->is_owned = true; // Setting stars automatically marks character as owned
        if (! $userChar->obtained_at) {
            $userChar->obtained_at = now();
        }
        $userChar->save();

        return response()->json([
            'success' => true,
            'message' => "Bintang {$name} berhasil diubah menjadi {$newStars}★!",
            'character' => [
                'id' => $userChar->id,
                'name' => $userChar->name,
                'base_stars' => $userChar->base_stars,
                'current_stars' => $userChar->current_stars,
                'is_owned' => $userChar->is_owned,
                'obtained_at' => $userChar->obtained_at?->format('Y-m-d'),
                'image_url' => $this->resolveCharacterImageUrl($catalogItem),
                'icon_url' => $this->resolveCharacterImageUrl($catalogItem),
            ],
        ]);
    }

    /**
     * Batch update characters (e.g. mark multiple as owned or reset).
     */
    public function batchCharacters(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|in:mark_owned,mark_unowned,own_all_base_1_2',
            'names' => 'nullable|array',
            'names.*' => 'string',
        ]);

        $action = $validated['action'];
        $names = $validated['names'] ?? [];

        if ($action === 'own_all_base_1_2') {
            // Auto mark all 1-star and 2-star characters as owned
            $catalogItems = UmaCatalogItem::where('type', 'character')->get();
            $updatedCount = 0;

            foreach ($catalogItems as $item) {
                $baseStars = $this->resolveBaseStars($item->name, $item);
                if ($baseStars <= 2) {
                    $userChar = UserCharacter::firstOrNew(['name' => $item->name]);
                    $userChar->uma_catalog_item_id = $item->id;
                    $userChar->base_stars = $baseStars;
                    if (! $userChar->exists || empty($userChar->current_stars)) {
                        $userChar->current_stars = $baseStars;
                    }
                    $userChar->is_owned = true;
                    $userChar->obtained_at ??= now();
                    $userChar->save();
                    $updatedCount++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "{$updatedCount} karakter 1★ & 2★ berhasil ditandai sebagai dimiliki!",
            ]);
        }

        if (! empty($names)) {
            $isOwned = $action === 'mark_owned';
            foreach ($names as $name) {
                $catalogItem = UmaCatalogItem::where('type', 'character')->where('name', $name)->first();
                $baseStars = $this->resolveBaseStars($name, $catalogItem);

                UserCharacter::updateOrCreate(
                    ['name' => $name],
                    [
                        'uma_catalog_item_id' => $catalogItem?->id,
                        'base_stars' => $baseStars,
                        'current_stars' => $baseStars,
                        'is_owned' => $isOwned,
                        'obtained_at' => $isOwned ? now() : null,
                    ]
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Perubahan batch koleksi karakter berhasil disimpan.',
        ]);
    }

    /**
     * Retrieve full support card collection with user ownership and statistics.
     */
    public function getSupportCards(Request $request): JsonResponse
    {
        // 1. Fetch catalog support cards
        $catalogItems = UmaCatalogItem::where('type', 'support_card')
            ->orderBy('name')
            ->get()
            ->keyBy('name');

        $cardNames = $catalogItems->isNotEmpty()
            ? $catalogItems->keys()->all()
            : UmaCatalog::getSupportCards();

        // 2. Fetch user's saved card states
        $userCards = UserSupportCard::all()->keyBy('name');

        // 3. Build combined collection list
        $collection = [];
        $totalOwned = 0;
        $countMlb = 0;
        $countByRarity = ['SSR' => 0, 'SR' => 0, 'R' => 0];
        $countByType = [
            'Speed' => 0,
            'Stamina' => 0,
            'Power' => 0,
            'Guts' => 0,
            'Wit' => 0,
            'Friend' => 0,
            'Group' => 0,
        ];

        foreach ($cardNames as $name) {
            $catalogItem = $catalogItems->get($name);
            $userCard = $userCards->get($name);
            $meta = $this->resolveSupportCardMeta($name, $catalogItem);

            $rarity = $userCard?->rarity ?? $meta['rarity'];
            $cardType = $userCard?->card_type ?? $meta['card_type'];
            $charName = $userCard?->char_name ?? $meta['char_name'];
            $limitBreak = $userCard ? (int) $userCard->limit_break : 0;
            $isOwned = $userCard ? (bool) $userCard->is_owned : false;

            if ($isOwned) {
                $totalOwned++;
                if ($limitBreak === 4) {
                    $countMlb++;
                }
                $countByRarity[$rarity] = ($countByRarity[$rarity] ?? 0) + 1;
                $countByType[$cardType] = ($countByType[$cardType] ?? 0) + 1;
            }

            $imageUrl = $this->resolveSupportCardImageUrl($catalogItem);

            $collection[] = [
                'id' => $userCard?->id,
                'uma_catalog_item_id' => $catalogItem?->id,
                'gametora_id' => $catalogItem?->gametora_id,
                'name' => $name,
                'char_name' => $charName,
                'rarity' => $rarity,
                'card_type' => $cardType,
                'limit_break' => $limitBreak,
                'is_mlb' => $limitBreak === 4,
                'is_owned' => $isOwned,
                'obtained_at' => $userCard?->obtained_at?->format('Y-m-d'),
                'notes' => $userCard?->notes,
                'image_url' => $imageUrl,
                'icon_url' => $imageUrl,
                'image_full' => $this->resolveSupportCardFullImageUrl($catalogItem),
                'details' => $catalogItem?->details,
            ];
        }

        $totalAvailable = count($collection);
        $completionRate = $totalAvailable > 0 ? round(($totalOwned / $totalAvailable) * 100, 1) : 0.0;

        return response()->json([
            'success' => true,
            'stats' => [
                'total_available' => $totalAvailable,
                'total_owned' => $totalOwned,
                'completion_rate' => $completionRate,
                'count_mlb' => $countMlb,
                'count_ssr' => $countByRarity['SSR'] ?? 0,
                'count_sr' => $countByRarity['SR'] ?? 0,
                'count_r' => $countByRarity['R'] ?? 0,
                'type_breakdown' => $countByType,
            ],
            'cards' => $collection,
        ]);
    }

    /**
     * Retrieve single support card detailed data (0LB-MLB stats, unique effect, hints, and chain training events).
     */
    public function getSupportCardDetail(Request $request, GameToraSyncService $syncService): JsonResponse
    {
        $id = $request->query('id');
        $name = $request->query('name');

        $query = UmaCatalogItem::where('type', 'support_card');
        if ($id) {
            $catalogItem = (clone $query)->where('id', $id)->first()
                ?? (clone $query)->where('gametora_id', $id)->first();
        } elseif ($name) {
            $catalogItem = (clone $query)->where('name', $name)->first()
                ?? (clone $query)->where('name', 'like', '%'.$name.'%')->first();
        } else {
            return response()->json(['success' => false, 'message' => 'Parameter id atau name diperlukan.'], 400);
        }

        if (! $catalogItem) {
            return response()->json(['success' => false, 'message' => 'Kartu support tidak ditemukan.'], 404);
        }

        $userCard = UserSupportCard::where('name', $catalogItem->name)->first();
        $meta = $this->resolveSupportCardMeta($catalogItem->name, $catalogItem);
        $cardType = $userCard?->card_type ?? $meta['card_type'];
        $isFriendOrGroup = in_array(strtolower($cardType), ['friend', 'group']);

        $details = $catalogItem->details ?? [];
        // If training events / dates not yet loaded, try fetching continuous events on-demand
        $needsFetch = $isFriendOrGroup
            ? empty($details['dates'])
            : empty($details['training_events']);

        if ($needsFetch && ! empty($catalogItem->raw_data['url_name'])) {
            $events = $syncService->fetchSupportCardTrainingEvents(
                $catalogItem->gametora_id ?? $catalogItem->raw_data['support_id'] ?? $catalogItem->id,
                $catalogItem->raw_data['url_name']
            );
            if ($events) {
                if ($isFriendOrGroup) {
                    $details['dates'] = $events;
                    $details['training_events'] = $events;
                } else {
                    $details['training_events'] = $events;
                }
                $catalogItem->update(['details' => $details]);
            }
        }

        return response()->json([
            'success' => true,
            'card' => [
                'id' => $userCard?->id,
                'uma_catalog_item_id' => $catalogItem->id,
                'gametora_id' => $catalogItem->gametora_id,
                'name' => $catalogItem->name,
                'char_name' => $userCard?->char_name ?? $meta['char_name'],
                'rarity' => $userCard?->rarity ?? $meta['rarity'],
                'card_type' => $cardType,
                'is_friend_or_group' => $isFriendOrGroup,
                'limit_break' => $userCard ? (int) $userCard->limit_break : 0,
                'is_owned' => $userCard ? (bool) $userCard->is_owned : false,
                'image_url' => $this->resolveSupportCardImageUrl($catalogItem),
                'image_full' => $this->resolveSupportCardFullImageUrl($catalogItem),
                'details' => $details,
            ],
        ]);
    }

    /**
     * Toggle ownership of a support card.
     */
    public function toggleSupportCard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'is_owned' => 'nullable|boolean',
        ]);

        $name = $validated['name'];
        $catalogItem = UmaCatalogItem::where('type', 'support_card')->where('name', $name)->first();
        $meta = $this->resolveSupportCardMeta($name, $catalogItem);

        $userCard = UserSupportCard::firstOrNew(['name' => $name]);

        if (! $userCard->exists) {
            $userCard->uma_catalog_item_id = $catalogItem?->id;
            $userCard->char_name = $meta['char_name'];
            $userCard->rarity = $meta['rarity'];
            $userCard->card_type = $meta['card_type'];
            $userCard->limit_break = 0;
            $userCard->is_owned = $validated['is_owned'] ?? true;
            $userCard->obtained_at = now();
        } else {
            $userCard->is_owned = array_key_exists('is_owned', $validated)
                ? (bool) $validated['is_owned']
                : ! $userCard->is_owned;

            if ($userCard->is_owned && ! $userCard->obtained_at) {
                $userCard->obtained_at = now();
            }
        }

        $userCard->save();

        return response()->json([
            'success' => true,
            'message' => $userCard->is_owned
                ? "{$name} ditambahkan ke koleksi!"
                : "{$name} dihapus dari koleksi.",
            'card' => [
                'id' => $userCard->id,
                'name' => $userCard->name,
                'rarity' => $userCard->rarity,
                'card_type' => $userCard->card_type,
                'limit_break' => $userCard->limit_break,
                'is_mlb' => $userCard->limit_break === 4,
                'is_owned' => $userCard->is_owned,
                'obtained_at' => $userCard->obtained_at?->format('Y-m-d'),
                'image_url' => $this->resolveSupportCardImageUrl($catalogItem),
                'icon_url' => $this->resolveSupportCardImageUrl($catalogItem),
                'image_full' => $this->resolveSupportCardFullImageUrl($catalogItem),
            ],
        ]);
    }

    /**
     * Update support card limit break (0 to 4 MLB).
     */
    public function updateSupportCardLimitBreak(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'limit_break' => 'required|integer|min:0|max:4',
        ]);

        $name = $validated['name'];
        $limitBreak = (int) $validated['limit_break'];

        $catalogItem = UmaCatalogItem::where('type', 'support_card')->where('name', $name)->first();
        $meta = $this->resolveSupportCardMeta($name, $catalogItem);

        $userCard = UserSupportCard::firstOrNew(['name' => $name]);
        $userCard->uma_catalog_item_id = $catalogItem?->id;
        $userCard->char_name = $meta['char_name'];
        $userCard->rarity = $meta['rarity'];
        $userCard->card_type = $meta['card_type'];
        $userCard->limit_break = $limitBreak;
        $userCard->is_owned = true; // Setting LB automatically marks as owned
        if (! $userCard->obtained_at) {
            $userCard->obtained_at = now();
        }
        $userCard->save();

        $lbLabel = $limitBreak === 4 ? 'MLB (Max Limit Break)' : "{$limitBreak}LB";

        return response()->json([
            'success' => true,
            'message' => "Limit break {$name} diatur ke {$lbLabel}!",
            'card' => [
                'id' => $userCard->id,
                'name' => $userCard->name,
                'rarity' => $userCard->rarity,
                'card_type' => $userCard->card_type,
                'limit_break' => $userCard->limit_break,
                'is_mlb' => $userCard->limit_break === 4,
                'is_owned' => $userCard->is_owned,
                'obtained_at' => $userCard->obtained_at?->format('Y-m-d'),
                'image_url' => $this->resolveSupportCardImageUrl($catalogItem),
                'icon_url' => $this->resolveSupportCardImageUrl($catalogItem),
                'image_full' => $this->resolveSupportCardFullImageUrl($catalogItem),
            ],
        ]);
    }

    /**
     * Batch update support cards (e.g. mark multiple as owned, max LB, etc.).
     */
    public function batchSupportCards(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|in:mark_owned,mark_unowned,set_all_mlb',
            'names' => 'nullable|array',
            'names.*' => 'string',
        ]);

        $action = $validated['action'];
        $names = $validated['names'] ?? [];

        if (! empty($names)) {
            foreach ($names as $name) {
                $catalogItem = UmaCatalogItem::where('type', 'support_card')->where('name', $name)->first();
                $meta = $this->resolveSupportCardMeta($name, $catalogItem);

                $userCard = UserSupportCard::firstOrNew(['name' => $name]);
                $userCard->uma_catalog_item_id = $catalogItem?->id;
                $userCard->char_name = $meta['char_name'];
                $userCard->rarity = $meta['rarity'];
                $userCard->card_type = $meta['card_type'];

                if ($action === 'set_all_mlb') {
                    $userCard->limit_break = 4;
                    $userCard->is_owned = true;
                    $userCard->obtained_at ??= now();
                } elseif ($action === 'mark_owned') {
                    $userCard->is_owned = true;
                    $userCard->obtained_at ??= now();
                } elseif ($action === 'mark_unowned') {
                    $userCard->is_owned = false;
                }

                $userCard->save();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Perubahan batch koleksi support card berhasil disimpan.',
        ]);
    }

    /**
     * Retrieve complete skill detail by ID or name with condition translations.
     */
    public function getSkillDetail(Request $request, GameToraSyncService $syncService): JsonResponse
    {
        $id = $request->query('id');
        $name = $request->query('name');

        if (! $id && ! $name) {
            return response()->json(['success' => false, 'message' => 'Parameter id atau name diperlukan.'], 400);
        }

        $skillsById = $syncService->loadSkillsLookup();
        $rawSkill = null;

        if ($id && isset($skillsById[(int) $id])) {
            $rawSkill = $skillsById[(int) $id];
        } elseif ($name) {
            $cleanName = strtolower(trim((string) $name));
            foreach ($skillsById as $sk) {
                $nEn = strtolower((string) ($sk['name_en'] ?? $sk['enname'] ?? ''));
                $nJp = (string) ($sk['jpname'] ?? '');
                if ($nEn === $cleanName || $nJp === $name) {
                    $rawSkill = $sk;
                    break;
                }
            }
            if (! $rawSkill) {
                foreach ($skillsById as $sk) {
                    $nEn = strtolower((string) ($sk['name_en'] ?? $sk['enname'] ?? ''));
                    if (str_contains($nEn, $cleanName)) {
                        $rawSkill = $sk;
                        break;
                    }
                }
            }
        }

        if (! $rawSkill) {
            return response()->json(['success' => false, 'message' => 'Skill tidak ditemukan.'], 404);
        }

        $enriched = $syncService->enrichSkillData($rawSkill, $skillsById);

        return response()->json([
            'success' => true,
            'skill' => $enriched,
        ]);
    }
}
