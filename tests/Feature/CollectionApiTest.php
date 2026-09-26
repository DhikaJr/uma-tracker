<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Models\UserSupportCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_characters_collection_list_and_stats(): void
    {
        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'rarity' => 'SSR',
            'raw_data' => [
                'rarity' => 3,
                'name_en' => 'Epiphaneia',
                'char_id' => 1100,
                'card_id' => 110001,
            ],
        ]);

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Sakura Bakushin O [Spring-Thunder Speedster]',
            'rarity' => 'R',
            'raw_data' => ['rarity' => 1, 'name_en' => 'Sakura Bakushin O'],
        ]);

        UserCharacter::create([
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'base_stars' => 3,
            'current_stars' => 4,
            'is_owned' => true,
        ]);

        $response = $this->getJson('/api/collection/characters');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('stats.total_owned', 1)
            ->assertJsonPath('stats.count_4_star', 1)
            ->assertJsonPath('characters.0.image_url', 'https://gametora.com/images/umamusume/characters/thumb/chara_stand_1100_110001.png');
    }

    public function test_can_toggle_character_ownership(): void
    {
        $charName = 'Silence Suzuka [Innocent Silence]';

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => $charName,
            'rarity' => 'SSR',
            'raw_data' => ['rarity' => 3],
        ]);

        // 1. Toggle ON
        $resOn = $this->postJson('/api/collection/characters/toggle', ['name' => $charName]);
        $resOn->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('character.is_owned', true)
            ->assertJsonPath('character.base_stars', 3)
            ->assertJsonPath('character.current_stars', 3);

        $this->assertDatabaseHas('user_characters', [
            'name' => $charName,
            'is_owned' => true,
        ]);

        // 2. Toggle OFF
        $resOff = $this->postJson('/api/collection/characters/toggle', ['name' => $charName]);
        $resOff->assertStatus(200)
            ->assertJsonPath('character.is_owned', false);

        $this->assertDatabaseHas('user_characters', [
            'name' => $charName,
            'is_owned' => false,
        ]);
    }

    public function test_can_upgrade_character_stars_from_3_to_4_and_5(): void
    {
        $charName = 'Epiphaneia [Fate\'s Chosen Star]';

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => $charName,
            'rarity' => 'SSR',
            'raw_data' => ['rarity' => 3],
        ]);

        // Upgrade to 4 stars
        $res4 = $this->postJson('/api/collection/characters/stars', [
            'name' => $charName,
            'stars' => 4,
        ]);

        $res4->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('character.current_stars', 4)
            ->assertJsonPath('character.is_owned', true);

        // Upgrade to 5 stars
        $res5 = $this->postJson('/api/collection/characters/stars', [
            'name' => $charName,
            'stars' => 5,
        ]);

        $res5->assertStatus(200)
            ->assertJsonPath('character.current_stars', 5);

        $this->assertDatabaseHas('user_characters', [
            'name' => $charName,
            'current_stars' => 5,
        ]);
    }

    public function test_cannot_lower_character_stars_below_base_stars(): void
    {
        $charName = 'Epiphaneia [Fate\'s Chosen Star]';

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => $charName,
            'rarity' => 'SSR',
            'raw_data' => ['rarity' => 3],
        ]);

        // Attempt to set base 3-star character to 2 stars (Must Fail with 422)
        $resInvalid2 = $this->postJson('/api/collection/characters/stars', [
            'name' => $charName,
            'stars' => 2,
        ]);

        $resInvalid2->assertStatus(422)
            ->assertJsonPath('success', false);

        // Attempt to set to 1 star (Must Fail with 422)
        $resInvalid1 = $this->postJson('/api/collection/characters/stars', [
            'name' => $charName,
            'stars' => 1,
        ]);

        $resInvalid1->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_base_1_star_character_allows_all_stars_from_1_to_5(): void
    {
        $charName = 'Haru Urara [Bestest Prize ♪]';

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => $charName,
            'rarity' => 'R',
            'raw_data' => ['rarity' => 1],
        ]);

        $res1 = $this->postJson('/api/collection/characters/stars', ['name' => $charName, 'stars' => 1]);
        $res1->assertStatus(200)->assertJsonPath('character.current_stars', 1);

        $res3 = $this->postJson('/api/collection/characters/stars', ['name' => $charName, 'stars' => 3]);
        $res3->assertStatus(200)->assertJsonPath('character.current_stars', 3);

        $res5 = $this->postJson('/api/collection/characters/stars', ['name' => $charName, 'stars' => 5]);
        $res5->assertStatus(200)->assertJsonPath('character.current_stars', 5);
    }

    public function test_can_batch_own_base_1_and_2_star_characters(): void
    {
        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Sakura Bakushin O [Blossom in Learning]',
            'rarity' => 'R',
            'raw_data' => ['rarity' => 1],
        ]);

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Vodka [Wild Top Gear]',
            'rarity' => 'SR',
            'raw_data' => ['rarity' => 2],
        ]);

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'rarity' => 'SSR',
            'raw_data' => ['rarity' => 3],
        ]);

        $res = $this->postJson('/api/collection/characters/batch', [
            'action' => 'own_all_base_1_2',
        ]);

        $res->assertStatus(200)->assertJsonPath('success', true);

        $this->assertDatabaseHas('user_characters', [
            'name' => 'Sakura Bakushin O [Blossom in Learning]',
            'is_owned' => true,
        ]);

        $this->assertDatabaseHas('user_characters', [
            'name' => 'Vodka [Wild Top Gear]',
            'is_owned' => true,
        ]);

        // Base 3 character was not affected
        $this->assertDatabaseMissing('user_characters', [
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
        ]);
    }

    public function test_can_get_support_cards_collection_list_and_stats(): void
    {
        UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => 'SSR [Innovator] Forever Young (Speed)',
            'rarity' => 'SSR',
            'raw_data' => [
                'rarity' => 3,
                'char_name' => 'Forever Young',
                'type' => 'speed',
                'support_id' => 30097,
            ],
        ]);

        UserSupportCard::create([
            'name' => 'SSR [Innovator] Forever Young (Speed)',
            'char_name' => 'Forever Young',
            'rarity' => 'SSR',
            'card_type' => 'Speed',
            'limit_break' => 4,
            'is_owned' => true,
        ]);

        $res = $this->getJson('/api/collection/support-cards');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('stats.total_owned', 1)
            ->assertJsonPath('stats.count_mlb', 1)
            ->assertJsonPath('cards.0.image_url', 'https://media.gametora.com/umamusume/supports/full/small/30097.png')
            ->assertJsonPath('cards.0.image_full', 'https://media.gametora.com/umamusume/supports/full/30097.png');
    }

    public function test_can_toggle_support_card_ownership(): void
    {
        $cardName = 'SSR [Tracen Academy] Special Week (Guts)';

        UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => $cardName,
            'rarity' => 'SSR',
            'raw_data' => ['rarity' => 3, 'char_name' => 'Special Week', 'type' => 'guts'],
        ]);

        // Toggle ON
        $resOn = $this->postJson('/api/collection/support-cards/toggle', ['name' => $cardName]);
        $resOn->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('card.is_owned', true)
            ->assertJsonPath('card.limit_break', 0);

        $this->assertDatabaseHas('user_support_cards', [
            'name' => $cardName,
            'is_owned' => true,
        ]);

        // Toggle OFF
        $resOff = $this->postJson('/api/collection/support-cards/toggle', ['name' => $cardName]);
        $resOff->assertStatus(200)
            ->assertJsonPath('card.is_owned', false);
    }

    public function test_can_update_support_card_limit_break_up_to_mlb(): void
    {
        $cardName = 'SSR [Innovator] Forever Young (Speed)';

        UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => $cardName,
            'rarity' => 'SSR',
            'raw_data' => ['rarity' => 3, 'char_name' => 'Forever Young', 'type' => 'speed'],
        ]);

        // Update to 2LB
        $res2 = $this->postJson('/api/collection/support-cards/limit-break', [
            'name' => $cardName,
            'limit_break' => 2,
        ]);

        $res2->assertStatus(200)
            ->assertJsonPath('card.limit_break', 2)
            ->assertJsonPath('card.is_mlb', false);

        // Update to 4LB (MLB)
        $resMlb = $this->postJson('/api/collection/support-cards/limit-break', [
            'name' => $cardName,
            'limit_break' => 4,
        ]);

        $resMlb->assertStatus(200)
            ->assertJsonPath('card.limit_break', 4)
            ->assertJsonPath('card.is_mlb', true);

        $this->assertDatabaseHas('user_support_cards', [
            'name' => $cardName,
            'limit_break' => 4,
            'is_owned' => true,
        ]);
    }

    public function test_cannot_set_support_card_limit_break_above_4(): void
    {
        $cardName = 'SSR [Innovator] Forever Young (Speed)';

        $res = $this->postJson('/api/collection/support-cards/limit-break', [
            'name' => $cardName,
            'limit_break' => 5,
        ]);

        $res->assertStatus(422);
    }

    public function test_backup_includes_user_characters_and_support_cards(): void
    {
        UserCharacter::create([
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'base_stars' => 3,
            'current_stars' => 5,
            'is_owned' => true,
        ]);

        UserSupportCard::create([
            'name' => 'SSR [Innovator] Forever Young (Speed)',
            'char_name' => 'Forever Young',
            'rarity' => 'SSR',
            'card_type' => 'Speed',
            'limit_break' => 4,
            'is_owned' => true,
        ]);

        // 1. Check stats endpoint
        $statsRes = $this->getJson('/api/backup/stats');
        $statsRes->assertStatus(200)
            ->assertJsonPath('stats.user_characters', 1)
            ->assertJsonPath('stats.user_support_cards', 1);

        // 2. Check export endpoint
        $exportRes = $this->getJson('/api/backup/export?download=0');
        $exportRes->assertStatus(200)
            ->assertJsonPath('summary.user_characters', 1)
            ->assertJsonPath('summary.user_support_cards', 1);

        $payload = $exportRes->json();

        // 3. Test overwrite import
        $importRes = $this->postJson('/api/backup/import', [
            'data' => $payload,
            'mode' => 'overwrite',
        ]);

        $importRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('user_characters', [
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'current_stars' => 5,
        ]);

        $this->assertDatabaseHas('user_support_cards', [
            'name' => 'SSR [Innovator] Forever Young (Speed)',
            'limit_break' => 4,
        ]);
    }

    public function test_can_get_support_card_detail_with_0lb_to_mlb_effects_and_events(): void
    {
        $item = UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => 'SSR [Top of the World] Duramente (Speed)',
            'rarity' => 'SSR',
            'raw_data' => [
                'card_id' => 30100,
                'char_id' => 1080,
                'type' => 'speed',
                'url_name' => 'duramente-speed',
            ],
            'details' => [
                'max_level' => 50,
                'effects' => [
                    [
                        'name' => 'Friendship Bonus',
                        'icon' => '🤝',
                        '0lb' => 20,
                        '1lb' => 25,
                        '2lb' => 30,
                        '3lb' => 35,
                        'mlb' => 40,
                    ],
                ],
                'hints' => [
                    'skills' => [
                        ['name' => 'Tailwind Rush', 'rarity' => 'white'],
                    ],
                ],
                'training_events' => [
                    [
                        'title' => 'Challenger\'s Heart',
                        'title_jp' => '挑戦者の心',
                        'choices' => [
                            [
                                'option_ja' => '頑張れ',
                                'rewards' => [
                                    ['type' => 'sp', 'value' => '+15'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $res = $this->getJson('/api/collection/support-cards/detail?id='.$item->id);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('card.name', 'SSR [Top of the World] Duramente (Speed)')
            ->assertJsonPath('card.details.effects.0.name', 'Friendship Bonus')
            ->assertJsonPath('card.details.effects.0.mlb', 40)
            ->assertJsonPath('card.details.training_events.0.title', 'Challenger\'s Heart');
    }

    public function test_support_card_detail_returns_dates_and_is_friend_or_group_for_friend_card(): void
    {
        $item = UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => 'SSR [Tracen Reception] Tazuna Hayakawa (Friend)',
            'rarity' => 'SSR',
            'raw_data' => [
                'rarity' => 3,
                'char_name' => 'Tazuna Hayakawa',
                'type' => 'friend',
                'support_id' => 30021,
                'url_name' => '30021-tazuna-hayakawa',
            ],
            'details' => [
                'rarity' => 'SSR',
                'dates' => [
                    [
                        'id' => 1,
                        'step' => 1,
                        'step_symbol' => '>',
                        'is_date' => true,
                        'name' => 'Milk with a Chance of Apples',
                        'choices' => [
                            [
                                'option_en' => 'Default',
                                'rewards' => [
                                    ['type' => 'en', 'value' => '+25'],
                                    ['type' => 'sp', 'value' => '+5'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $res = $this->getJson('/api/collection/support-cards/detail?id='.$item->id);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('card.is_friend_or_group', true)
            ->assertJsonPath('card.card_type', 'Friend')
            ->assertJsonPath('card.details.dates.0.name', 'Milk with a Chance of Apples')
            ->assertJsonPath('card.details.dates.0.step_symbol', '>')
            ->assertJsonPath('card.details.dates.0.is_date', true);
    }

    public function test_can_get_character_base_stats_and_dual_unique_skills(): void
    {
        $item = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Agnes Tachyon [tach-nology]',
            'rarity' => 'R',
            'raw_data' => [
                'rarity' => 1,
                'name_en' => 'Agnes Tachyon',
                'char_id' => 1032,
                'card_id' => 103201,
                'base_stats' => [82, 76, 76, 79, 87],
                'five_star_stats' => [112, 104, 104, 108, 122],
                'stat_bonus' => [20, 0, 0, 10, 0],
                'skills_unique' => [10321, 100321],
            ],
            'skills' => [
                'unique' => [
                    'id' => 100321,
                    'name' => 'U=ma2',
                    'name_jp' => 'U=ma2',
                    'rarity' => 4,
                ],
                'unique_versions' => [
                    [
                        'id' => 10321,
                        'name' => 'Introduction to Physiology',
                        'name_jp' => 'introduction：My body',
                        'rarity' => 3,
                        'version_label' => '☆ and ☆☆',
                    ],
                    [
                        'id' => 100321,
                        'name' => 'U=ma2',
                        'name_jp' => 'U=ma2',
                        'rarity' => 4,
                        'version_label' => '☆☆☆+',
                    ],
                ],
                'unique_low' => [
                    'id' => 10321,
                    'name' => 'Introduction to Physiology',
                ],
                'unique_high' => [
                    'id' => 100321,
                    'name' => 'U=ma2',
                ],
            ],
        ]);

        $resList = $this->getJson('/api/collection/characters');
        $resList->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('characters.0.base_stats', [82, 76, 76, 79, 87])
            ->assertJsonPath('characters.0.five_star_stats', [112, 104, 104, 108, 122])
            ->assertJsonPath('characters.0.stat_bonus', [20, 0, 0, 10, 0])
            ->assertJsonPath('characters.0.skills.unique_versions.0.name', 'Introduction to Physiology')
            ->assertJsonPath('characters.0.skills.unique_versions.1.name', 'U=ma2');

        $resDetail = $this->getJson('/api/collection/characters/detail?name='.urlencode('Agnes Tachyon [tach-nology]'));
        $resDetail->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('character.base_stats', [82, 76, 76, 79, 87])
            ->assertJsonPath('character.five_star_stats', [112, 104, 104, 108, 122])
            ->assertJsonPath('character.stat_bonus', [20, 0, 0, 10, 0])
            ->assertJsonPath('character.skills.unique_versions.0.version_label', '☆ and ☆☆')
            ->assertJsonPath('character.skills.unique_versions.1.version_label', '☆☆☆+');
    }

    public function test_character_collection_and_detail_returns_career_objectives_and_enriched_skills(): void
    {
        $objectives = [
            [
                'order' => 1,
                'title' => 'Participate in the Junior Make Debut',
                'turn' => 12,
                'turn_text' => 'Turn 12',
                'class_period' => 'Junior Class, Late June',
                'track_condition' => 'Dirt - 1600m - Mile',
                'grade' => 'OP',
                'banner_url' => 'https://media.gametora.com/umamusume/races/banners/1001.png',
            ],
            [
                'order' => 6,
                'title' => 'Place 3rd or better in 3 G1 races',
                'turn' => 60,
                'turn_text' => 'Turn 60 (previous + 13)',
                'class_period' => 'Senior Class, Late June',
                'track_condition' => null,
                'grade' => 'G1',
                'banner_url' => null,
            ],
        ];

        $enrichedSkill = [
            'id' => 1001,
            'name' => 'Tail Nine',
            'name_jp' => '末脚',
            'rarity' => 2,
            'rarity_label' => 'Rare',
            'activation' => 1,
            'activation_label' => 'Wit check',
            'base_cost' => 180,
            'conditions' => 'activate_count_middle>=3',
            'base_duration' => '3 s',
            'effects' => [
                [
                    'type' => 1,
                    'type_name' => 'Target Speed',
                    'value' => 3500,
                    'formatted_value' => '0.35',
                    'special_scaling' => [
                        'scale_id' => 12,
                        'base_value' => 0.15,
                        'scale_type' => 'fan_count',
                        'description' => 'The multiplier scales with your fan count.',
                        'header' => 'Fans',
                        'tiers' => [
                            ['label' => 'x < 20000', 'mult' => '0.8x', 'total' => 0.12],
                            ['label' => '20000 <= x < 50000', 'mult' => '0.9x', 'total' => 0.135],
                            ['label' => '50000 <= x < 100000', 'mult' => '1x', 'total' => 0.15],
                            ['label' => '100000 <= x < 160000', 'mult' => '1.1x', 'total' => 0.165],
                            ['label' => '160000 <= x', 'mult' => '1.2x', 'total' => 0.18],
                        ],
                    ],
                ],
            ],
        ];

        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Agnes Digital [Ultra Digital]',
            'rarity' => 'SSR',
            'objectives' => $objectives,
            'skills' => [
                'unique' => $enrichedSkill,
                'innate' => [$enrichedSkill],
            ],
            'raw_data' => [
                'rarity' => 3,
                'name_en' => 'Agnes Digital',
                'char_id' => 1019,
                'card_id' => 101901,
            ],
        ]);

        $resList = $this->getJson('/api/collection/characters');
        $resList->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('characters.0.objectives.0.title', 'Participate in the Junior Make Debut')
            ->assertJsonPath('characters.0.objectives.1.grade', 'G1')
            ->assertJsonPath('characters.0.skills.unique.rarity_label', 'Rare')
            ->assertJsonPath('characters.0.skills.unique.effects.0.special_scaling.scale_type', 'fan_count');

        $resDetail = $this->getJson('/api/collection/characters/detail?name='.urlencode('Agnes Digital [Ultra Digital]'));
        $resDetail->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('character.objectives.0.title', 'Participate in the Junior Make Debut')
            ->assertJsonPath('character.objectives.0.turn_text', 'Turn 12')
            ->assertJsonPath('character.objectives.1.turn_text', 'Turn 60 (previous + 13)')
            ->assertJsonPath('character.skills.unique.effects.0.special_scaling.tiers.4.total', 0.18);
    }
}
