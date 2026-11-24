<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\UmapyoiTwinkleParser;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\TestCase;

class UmapyoiTwinkleParserTest extends TestCase
{
    #[DataProvider('observedArticles')]
    public function test_observed_formats_preserve_modern_output_and_validate_legacy_without_emitting_names(array $article): void
    {
        $result = UmapyoiTwinkleParser::parse($article['detail']);

        $this->assertSame($article['banner_id'], $result['banner_id']);
        if (isset($article['previous_characters'])) {
            $this->assertSame('extracted', $result['status']);
            $this->assertSame(8, $result['english_candidate_count']);
            $this->assertSame($article['previous_characters'], $result['characters']);
        } else {
            $this->assertSame('validated_only', $result['status']);
            $this->assertLessThan(8, $result['english_candidate_count']);
            $this->assertSame(8, $result['japanese_candidate_count']);
            $this->assertSame([], $result['characters']);
            $this->assertSame('japanese_complete_english_incomplete', $result['reason']);
        }
    }

    public static function observedArticles(): iterable
    {
        $articles = json_decode(file_get_contents(__DIR__.'/../Fixtures/umapyoi_twinkle_2026.json'), true, flags: JSON_THROW_ON_ERROR);
        foreach ($articles as $article) {
            yield (string) $article['announce_id'] => [$article];
        }
    }

    #[TestWith([7, false, false])]
    #[TestWith([9, false, false])]
    #[TestWith([8, true, false])]
    #[TestWith([8, false, true])]
    public function test_invalid_japanese_rows_cannot_validate_partial_english(int $size, bool $duplicate, bool $emptyCandidate): void
    {
        $rows = array_map(static fn (int $index): string => "★★★&nbsp;[衣装 {$index}]ウマ娘 {$index}", range(1, $size));
        if ($duplicate) {
            $rows[7] = $rows[0];
        }
        if ($emptyCandidate) {
            $rows[7] = '★★★ [衣装]&nbsp;';
        }

        $result = UmapyoiTwinkleParser::parse([
            'message_english' => '<img src="gacha_banner_30444.png"> Target Umamusume<br>★★★ [Costume] Runner<br><h2>Support Cards</h2>',
            'message' => '■対象ウマ娘<br>'.implode('<br>', $rows).'<h2>サポートカード</h2>★★★ [部外]ウマ娘',
        ]);

        $this->assertSame('invalid', $result['status']);
        $this->assertSame([], $result['characters']);
    }

    public function test_complete_legacy_english_is_preferred_over_japanese_validation(): void
    {
        $rows = array_map(static fn (int $index): string => "★★★ [Costume {$index}] Runner {$index}", range(1, 8));
        $result = UmapyoiTwinkleParser::parse([
            'message_english' => '<img src="gacha_banner_30444.png"> Target Umamusume<br/>'.implode('<br/>', $rows).'</div>',
            'message' => '■対象ウマ娘<br>★★★ [衣装]ウマ娘<br>■',
        ]);

        $this->assertSame('extracted', $result['status']);
        $this->assertSame(0, $result['japanese_candidate_count']);
        $this->assertSame(array_map(static fn (int $index): string => "Runner {$index} [Costume {$index}]", range(1, 8)), $result['characters']);
    }

    public function test_missing_banner_id_makes_even_a_complete_lineup_invalid(): void
    {
        $rows = array_map(static fn (int $index): string => "★★★ [Costume {$index}] Runner {$index}", range(1, 8));

        $result = UmapyoiTwinkleParser::parse(['message_english' => '■ Eligible Umamusume<br>'.implode('<br>', $rows)]);

        $this->assertNull($result['banner_id']);
        $this->assertSame('invalid', $result['status']);
        $this->assertSame(8, $result['english_candidate_count']);
        $this->assertSame([], $result['characters']);
        $this->assertSame('missing_banner_id', $result['reason']);
    }
}
