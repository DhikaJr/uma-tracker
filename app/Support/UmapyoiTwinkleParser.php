<?php

declare(strict_types=1);

namespace App\Support;

final class UmapyoiTwinkleParser
{
    private const LINEUP_SIZE = 8;

    private const ENGLISH_BLOCK = '~(?:■\h*Eligible\h+Umamusume|(?:\A|>)\h*Target\h+Umamusume)\h*(?=<br\s*/?>)(.*?)(?=■|<h2\b|</div>|\z)~isu';

    private const JAPANESE_BLOCK = '~■\h*対象ウマ娘\h*(?=<br\s*/?>)(.*?)(?=■|<h2\b|</div>|\z)~isu';

    /**
     * @param  array<string, mixed>  $detail
     * @return array{banner_id: ?int, status: 'extracted'|'validated_only'|'invalid', characters: list<string>, english_candidate_count: int, japanese_candidate_count: int, reason: ?string}
     */
    public static function parse(array $detail): array
    {
        $english = is_string($detail['message_english'] ?? null) ? $detail['message_english'] : '';
        $japanese = is_string($detail['message'] ?? null) ? $detail['message'] : '';
        $englishBannerId = self::bannerId($english);
        $japaneseBannerId = self::bannerId($japanese);
        $bannerId = $englishBannerId ?? $japaneseBannerId;
        $conflictingBannerIds = $englishBannerId !== null && $japaneseBannerId !== null && $englishBannerId !== $japaneseBannerId;
        $englishCandidates = self::candidates($english, self::ENGLISH_BLOCK);
        $japaneseCandidates = $englishCandidates['characters'] === []
            ? self::candidates($japanese, self::JAPANESE_BLOCK, decodeEntities: true)
            : ['characters' => [], 'count' => 0];

        [$status, $reason] = match (true) {
            $conflictingBannerIds => ['invalid', 'conflicting_banner_ids'],
            $bannerId === null => ['invalid', 'missing_banner_id'],
            $englishCandidates['characters'] !== [] => ['extracted', null],
            $japaneseCandidates['characters'] !== [] => ['validated_only', 'japanese_complete_english_incomplete'],
            default => ['invalid', 'incomplete_lineup'],
        };

        return [
            'banner_id' => $conflictingBannerIds ? null : $bannerId,
            'status' => $status,
            'characters' => $status === 'extracted' ? $englishCandidates['characters'] : [],
            'english_candidate_count' => $englishCandidates['count'],
            'japanese_candidate_count' => $japaneseCandidates['count'],
            'reason' => $reason,
        ];
    }

    private static function bannerId(string $message): ?int
    {
        return preg_match('/\bgacha_banner_([1-9]\d*)\b/', $message, $matches) ? (int) $matches[1] : null;
    }

    /** @return array{characters: list<string>, count: int} */
    private static function candidates(string $message, string $pattern, bool $decodeEntities = false): array
    {
        if (! preg_match($pattern, $message, $block)) {
            return ['characters' => [], 'count' => 0];
        }

        $rows = preg_split('~<br\s*/?>~i', $block[1], flags: PREG_SPLIT_NO_EMPTY);
        $characters = [];
        $rowCount = 0;
        foreach ($rows as $row) {
            $row = trim($decodeEntities ? html_entity_decode($row, ENT_QUOTES | ENT_HTML5, 'UTF-8') : $row);
            if ($row === '') {
                continue;
            }
            $rowCount++;
            if (preg_match('~\A★{3}\h*\[([^\[\]<>\r\n]+)\]\h*([^\[\]<>★\r\n]+)\z~u', $row, $candidate)
                && preg_match('/\S/u', html_entity_decode($candidate[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'))
                && preg_match('/\S/u', html_entity_decode($candidate[2], ENT_QUOTES | ENT_HTML5, 'UTF-8'))) {
                $characters[] = trim($candidate[2]).' ['.trim($candidate[1]).']';
            }
        }

        $count = count($characters);
        $unique = array_unique(array_map(static fn (string $name): string => preg_replace('/\h+/u', ' ', $name), $characters));
        $complete = $rowCount === self::LINEUP_SIZE && $count === $rowCount && count($unique) === $count;

        return ['characters' => $complete ? $characters : [], 'count' => $count];
    }
}
