<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\SupportCardUniqueEffectFormatter;
use PHPUnit\Framework\TestCase;

class SupportCardUniqueEffectFormatterTest extends TestCase
{
    public function test_formats_type_101_double_effect_correctly(): void
    {
        // Efforia SSR [As if Guided]
        $rawUnique = [
            'level' => 0,
            'effects' => [
                [
                    'type' => 101,
                    'value' => 80,
                    'value_1' => 5, // Power Bonus
                    'value_2' => 1, // +1
                    'value_3' => 8, // Training Effectiveness
                    'value_4' => 5, // +5%
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique, null, 'Speed');

        $this->assertNotNull($result);
        $this->assertSame(0, $result['level']);
        $this->assertStringContainsString('Gain Power Bonus (1) and Training Effectiveness (5%) when the bond gauge is at least 80', $result['description_en']);
        $this->assertStringContainsString('Mendapatkan Bonus Power (+1) dan Efektivitas Latihan (+5%) saat gauge ikatan mencapai minimal 80', $result['description_id']);
        $this->assertSame('Bond Gauge ≥ 80', $result['condition']);
        $this->assertSame('Gauge Ikatan ≥ 80', $result['condition_id']);

        $this->assertCount(2, $result['bonuses']);
        $this->assertSame('Power Bonus', $result['bonuses'][0]['name_en']);
        $this->assertSame('+1', $result['bonuses'][0]['formatted']);
        $this->assertSame('Training Effectiveness', $result['bonuses'][1]['name_en']);
        $this->assertSame('+5%', $result['bonuses'][1]['formatted']);

        $this->assertSame('Power Bonus & Training Effectiveness', $result['effects'][0]['name_en']);
        $this->assertNotSame('Type 101', $result['effects'][0]['name_en']);
    }

    public function test_formats_type_101_full_bond_single_effect(): void
    {
        $rawUnique = [
            'level' => 30,
            'effects' => [
                [
                    'type' => 101,
                    'value' => 100,
                    'value_1' => 3, // Speed Bonus
                    'value_2' => 2,
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique);

        $this->assertNotNull($result);
        $this->assertSame('Bond Gauge Full (100)', $result['condition']);
        $this->assertSame('Gauge Ikatan Penuh (100)', $result['condition_id']);
        $this->assertStringContainsString('when the bond gauge is full', $result['description_en']);
        $this->assertStringContainsString('saat gauge ikatan penuh (100)', $result['description_id']);
        $this->assertSame('Speed Bonus', $result['effects'][0]['name_en']);
    }

    public function test_formats_type_103_deck_diversity_effect(): void
    {
        // Satono Diamond SSR [Special Dreamers!]
        $rawUnique = [
            'level' => 40,
            'effects' => [
                [
                    'type' => 103,
                    'value' => 4,
                    'value_1' => 10,
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique, null, 'Intelligence');

        $this->assertNotNull($result);
        $this->assertSame(40, $result['level']);
        $this->assertSame('If there are at least 4 different types of support cards in your deck, gain Increased Training (10%)', $result['description_en']);
        $this->assertSame('Jika terdapat minimal 4 jenis kartu support berbeda di dalam dek, dapatkan Efektivitas Latihan (+10%)', $result['description_id']);
        $this->assertSame('≥ 4 Support Types in Deck', $result['condition']);
        $this->assertSame('≥ 4 Jenis Kartu di Dek', $result['condition_id']);
        $this->assertSame('Deck Diversity Increased Training', $result['effects'][0]['name_en']);
        $this->assertSame('+10%', $result['bonuses'][0]['formatted']);
    }

    public function test_formats_type_104_fan_scaling(): void
    {
        // Narita Top Road
        $rawUnique = [
            'level' => 30,
            'effects' => [
                [
                    'type' => 104,
                    'value' => 10000,
                    'value_1' => 20,
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique);

        $this->assertNotNull($result);
        $this->assertStringContainsString('10,000 fans', $result['description_en']);
        $this->assertStringContainsString('200,000 fans', $result['description_en']);
        $this->assertSame('Maks +20%', $result['bonuses'][0]['formatted']);
    }

    public function test_formats_type_112_zero_fail_rate(): void
    {
        $rawUnique = [
            'level' => 30,
            'effects' => [
                [
                    'type' => 112,
                    'value' => 20,
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique);

        $this->assertNotNull($result);
        $this->assertSame('20% chance to make the current training fail rate zero', $result['description_en']);
        $this->assertSame('Peluang 20% membuat tingkat kegagalan latihan (fail rate) menjadi 0%', $result['description_id']);
    }

    public function test_formats_type_116_skill_scaling(): void
    {
        // Mejiro Ramonu
        $rawUnique = [
            'level' => 30,
            'effects' => [
                [
                    'type' => 116,
                    'value' => 1, // Speed skills
                    'value_1' => 8, // Training Effectiveness
                    'value_2' => 4,
                    'value_3' => 5,
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique);

        $this->assertNotNull($result);
        $this->assertStringContainsString('Speed-increasing', $result['description_en']);
        $this->assertStringContainsString('up to (20%) for 5 skills', $result['description_en']);
    }

    public function test_formats_type_9991_haru_urara(): void
    {
        $rawUnique = [
            'level' => 30,
            'effects' => [
                [
                    'type' => 9991,
                    'value' => 0,
                ],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique);

        $this->assertNotNull($result);
        $this->assertSame('Increases stats from hints', $result['description_en']);
        $this->assertSame('Meningkatkan status yang didapatkan saat memperoleh hint event', $result['description_id']);
    }

    public function test_formats_basic_effect_under_100(): void
    {
        // Satono Diamond SR (Stamina Bonus +1, Specialty Priority +20)
        $rawUnique = [
            'level' => 0,
            'effects' => [
                ['type' => 4, 'value' => 1],
                ['type' => 19, 'value' => 20],
            ],
        ];

        $result = SupportCardUniqueEffectFormatter::format($rawUnique);

        $this->assertNotNull($result);
        $this->assertSame('Stamina Bonus (+1) | Specialty Priority (+20)', $result['description_en']);
        $this->assertSame('Bonus Stamina (+1) | Prioritas Spesialisasi (+20)', $result['description_id']);
        $this->assertCount(2, $result['bonuses']);
    }

    public function test_returns_null_for_empty_unique(): void
    {
        $this->assertNull(SupportCardUniqueEffectFormatter::format(null));
        $this->assertNull(SupportCardUniqueEffectFormatter::format([]));
        $this->assertNull(SupportCardUniqueEffectFormatter::format(['level' => 0, 'effects' => []]));
    }
}
