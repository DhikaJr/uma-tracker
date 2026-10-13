<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\UmaCatalogItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CygamesNewsService
{
    public const NEWS_INDEX_URL = 'https://umamusume.jp/api/ajax/pr_info_index';

    public const NEWS_DETAIL_URL = 'https://umamusume.jp/api/ajax/pr_info_detail';

    public const NEWS_WEB_BASE_URL = 'https://umamusume.jp/news/detail?id=';

    public const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    /**
     * Fetch news index from official Cygames JP news API.
     *
     * @return array<int, array<string, mixed>>
     */
    public function fetchNewsIndex(): array
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENT,
                'Referer' => 'https://umamusume.jp/news/',
            ])->timeout(10)->get(self::NEWS_INDEX_URL, [
                'format' => 'json',
            ]);

            if (! $response->successful()) {
                Log::warning('Cygames news index returned non-200 status', [
                    'status' => $response->status(),
                ]);

                return [];
            }

            $data = $response->json();

            return is_array($data['information_list'] ?? null) ? $data['information_list'] : [];
        } catch (Throwable $e) {
            Log::warning('Failed to fetch Cygames news index', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Filter relevant Select Pickup Support Card Gacha announcement articles.
     * Handles both previews (予告) and commencement announcements (開催).
     *
     * @param  array<int, array<string, mixed>>  $informationList
     * @return array<int, array<string, mixed>>
     */
    public function filterSelectPickupArticles(array $informationList): array
    {
        $filtered = array_filter($informationList, function (array $item): bool {
            $title = (string) ($item['title'] ?? '');

            return str_contains($title, 'セレクトピックアップ')
                && str_contains($title, 'サポートカード');
        });

        // Sort descending by announce_id (newest announcements first)
        usort($filtered, fn (array $a, array $b): int => ((int) ($b['announce_id'] ?? 0)) <=> ((int) ($a['announce_id'] ?? 0)));

        return array_values($filtered);
    }

    /**
     * Fetch full announcement article detail by announce_id.
     *
     * @return array<string, mixed>|null
     */
    public function fetchArticleDetail(int $announceId): ?array
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENT,
                'Referer' => 'https://umamusume.jp/news/',
            ])->timeout(10)->get(self::NEWS_DETAIL_URL, [
                'format' => 'json',
                'announce_id' => $announceId,
            ]);

            if (! $response->successful()) {
                Log::warning('Cygames news detail returned non-200 status', [
                    'announce_id' => $announceId,
                    'status' => $response->status(),
                ]);

                return null;
            }

            $data = $response->json();

            return is_array($data['detail'] ?? null) ? $data['detail'] : null;
        } catch (Throwable $e) {
            Log::warning('Failed to fetch Cygames news detail', [
                'announce_id' => $announceId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Parse article message HTML to extract banner metadata and candidate cards.
     *
     * @param  array<string, mixed>  $detail
     * @return array{announce_id: int, title: string, provenance_url: string, gametora_id: ?int, start_date: ?string, end_date: ?string, raw_candidates: array<int, array{title: string, character: string}>}|null
     */
    public function parseArticle(array $detail): ?array
    {
        $announceId = (int) ($detail['announce_id'] ?? 0);
        $title = (string) ($detail['title'] ?? '');
        $message = (string) ($detail['message'] ?? '');

        if ($announceId <= 0 || $message === '') {
            return null;
        }

        $provenanceUrl = self::NEWS_WEB_BASE_URL.$announceId;

        // 1. Extract GameTora banner ID from support card banner image (e.g. gacha_banner_30477.png)
        $gametoraId = null;
        if (preg_match('/<h2[^>]*?>\s*サポートカード\s*<\/h2>.*?gacha_banner_(\d+)\.png/isu', $message, $bannerMatch)) {
            $gametoraId = (int) $bannerMatch[1];
        } elseif (preg_match('/gacha_banner_(\d+)\.png(?:[^<]|<(?!\/figure))*?<\/figure>\s*■\s*ピックアップサポートカード候補/isu', $message, $bannerMatch)) {
            $gametoraId = (int) $bannerMatch[1];
        } elseif (preg_match_all('/gacha_banner_(\d+)\.png/i', $message, $allBanners)) {
            $gametoraId = (int) end($allBanners[1]);
        }

        // 2. Extract date period if available in message HTML (e.g. 10/13 12:00 ～ 10/26 11:59)
        $startDate = null;
        $endDate = null;
        $postAt = (string) ($detail['post_at'] ?? '');
        $postYear = $postAt !== '' ? (int) Carbon::parse($postAt)->year : (int) date('Y');

        if (preg_match('/(?:開催期間|期間)[^<]*?<\/h2>\s*(\d{1,2})\/(\d{1,2})(?:\s+\d{1,2}:\d{1,2})?\s*(?:～|~|-)\s*(\d{1,2})\/(\d{1,2})/u', $message, $dateMatch)) {
            $startMonth = (int) $dateMatch[1];
            $startDay = (int) $dateMatch[2];
            $endMonth = (int) $dateMatch[3];
            $endDay = (int) $dateMatch[4];

            $startDate = sprintf('%04d-%02d-%02d', $postYear, $startMonth, $startDay);
            $endYear = ($endMonth < $startMonth) ? $postYear + 1 : $postYear;
            $endDate = sprintf('%04d-%02d-%02d', $endYear, $endMonth, $endDay);
        } elseif ($postAt !== '') {
            $startDate = Carbon::parse($postAt)->toDateString();
        }

        // 3. Extract the candidates section: ■ピックアップサポートカード候補
        $candidateSectionContent = null;
        if (preg_match_all('/(?:^|[>\s])■\s*ピックアップサポートカード候補(?:<br\s*\/?>|\r?\n)(.*?)(?:■|<h2|<\/div|\z)/isu', $message, $allSecMatches)) {
            foreach ($allSecMatches[1] as $candidateBlock) {
                if (str_contains($candidateBlock, 'SSR')) {
                    $candidateSectionContent = $candidateBlock;
                    break;
                }
            }
        }

        if (! $candidateSectionContent) {
            Log::info('No pickup candidate section found in Cygames announcement', [
                'announce_id' => $announceId,
            ]);

            return null;
        }

        // 4. Extract bullet items: ・SSR [Title]CharacterName
        if (! preg_match_all('/(?:・|\*|-)?\s*SSR\s*\[(.*?)\]\s*([^<\r\n]+)/u', $candidateSectionContent, $itemMatches, PREG_SET_ORDER)) {
            Log::warning('Failed to parse candidate lines in candidate section', [
                'announce_id' => $announceId,
            ]);

            return null;
        }

        if (count($itemMatches) !== 10) {
            Log::warning('Candidate item count is not exactly 10', [
                'announce_id' => $announceId,
                'count' => count($itemMatches),
            ]);

            return null;
        }

        $rawCandidates = [];
        foreach ($itemMatches as $match) {
            $rawCandidates[] = [
                'title' => trim($match[1]),
                'character' => trim($match[2]),
            ];
        }

        return [
            'announce_id' => $announceId,
            'title' => $title,
            'provenance_url' => $provenanceUrl,
            'gametora_id' => $gametoraId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'raw_candidates' => $rawCandidates,
        ];
    }

    /**
     * Resolve raw parsed candidates against the local support card catalog.
     * Enforces strict validation: exactly 10 distinct, valid SSR support cards.
     * Returns null if any candidate cannot be resolved or validation fails.
     *
     * @param  array<int, array{title: string, character: string}>  $rawCandidates
     * @return array<int, string>|null
     */
    public function resolveCandidates(array $rawCandidates): ?array
    {
        if (count($rawCandidates) !== 10) {
            return null;
        }

        $supportCards = UmaCatalogItem::where('type', 'support_card')->get();
        if ($supportCards->isEmpty()) {
            return null;
        }

        $resolved = [];

        foreach ($rawCandidates as $item) {
            $title = trim($item['title'] ?? '');
            if ($title === '') {
                return null;
            }

            // Normalize Japanese punctuation for robust matching
            $normTitle = str_replace(['！', '？', '，', '、', '～'], ['!', '?', ',', ',', '~'], $title);

            $matchedCard = $supportCards->first(function (UmaCatalogItem $card) use ($title, $normTitle): bool {
                $rawTitle = (string) ($card->raw_data['title_ja'] ?? '');
                $normRawTitle = str_replace(['！', '？', '，', '、', '～'], ['!', '?', ',', ',', '~'], $rawTitle);

                if ($rawTitle !== '' && ($rawTitle === $title || $normRawTitle === $normTitle)) {
                    return true;
                }

                if (str_contains($card->name, "[{$title}]")) {
                    return true;
                }

                $normCardName = str_replace(['！', '？', '，', '、', '～'], ['!', '?', ',', ',', '~'], $card->name);

                return str_contains($normCardName, "[{$normTitle}]");
            });

            if (! $matchedCard) {
                Log::warning('Failed to resolve Cygames candidate support card against catalog', [
                    'raw_title' => $title,
                    'raw_character' => $item['character'] ?? '',
                ]);

                return null;
            }

            // Ensure card is SSR
            if ($matchedCard->rarity !== 'SSR' && ! str_starts_with($matchedCard->name, 'SSR ')) {
                Log::warning('Resolved candidate card is not SSR', [
                    'card_name' => $matchedCard->name,
                ]);

                return null;
            }

            $resolved[] = $matchedCard->name;
        }

        // Must be exactly 10 unique cards
        $unique = array_unique($resolved);
        if (count($unique) !== 10) {
            Log::warning('Resolved candidate list has duplicate cards or is incomplete', [
                'count' => count($unique),
            ]);

            return null;
        }

        return array_values($unique);
    }

    /**
     * Determine whether an announcement article has already been successfully processed.
     */
    public function isArticleProcessed(int $announceId): bool
    {
        if (AppSetting::getValue("cygames_article_processed_{$announceId}") === '1') {
            return true;
        }

        if (AppSetting::where('key', 'like', 'select_pickup_provenance_id_%')->where('value', (string) $announceId)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Mark an announcement article as successfully processed.
     */
    public function markArticleProcessed(int $announceId): void
    {
        AppSetting::setValue("cygames_article_processed_{$announceId}", '1');
    }

    /**
     * Synchronize Select Pickup Support Card banners using canonical official Cygames announcements.
     *
     * @return array{success: bool, updated_count: int, articles_processed: int}
     */
    public function syncSelectPickupBanners(bool $force = false): array
    {
        $articles = $this->fetchNewsIndex();
        if (empty($articles)) {
            return ['success' => false, 'updated_count' => 0, 'articles_processed' => 0];
        }

        $relevantArticles = $this->filterSelectPickupArticles($articles);
        if (empty($relevantArticles)) {
            return ['success' => true, 'updated_count' => 0, 'articles_processed' => 0];
        }

        $highestProcessedAnnounceId = (int) AppSetting::getValue('last_processed_cygames_announce_id', 0);
        $maxAnnounceIdInBatch = $highestProcessedAnnounceId;
        $updatedCount = 0;
        $processedCount = 0;

        foreach ($relevantArticles as $articleSummary) {
            $announceId = (int) ($articleSummary['announce_id'] ?? 0);
            if ($announceId <= 0) {
                continue;
            }

            // Safe per-article / per-banner deduplication:
            // Do not use a scalar global checkpoint to blanket-skip articles with lower IDs.
            if (! $force && $this->isArticleProcessed($announceId)) {
                continue;
            }

            $detail = $this->fetchArticleDetail($announceId);
            if (! $detail) {
                continue;
            }

            $processedCount++;
            $parsed = $this->parseArticle($detail);
            if (! $parsed) {
                continue;
            }

            $resolvedCandidates = $this->resolveCandidates($parsed['raw_candidates']);
            if (! $resolvedCandidates || count($resolvedCandidates) !== 10) {
                // Safety Guard: NEVER overwrite valid banner data if candidate resolution fails
                continue;
            }

            // Banner matching:
            // 1. Try matching by GameTora banner ID extracted from image
            $banner = null;
            if ($parsed['gametora_id'] !== null) {
                $banner = GachaBanner::where('gametora_id', $parsed['gametora_id'])
                    ->where('banner_type', 'support_card')
                    ->first();
            }

            // 2. Fallback: match by start_date and category
            if (! $banner && ! empty($parsed['start_date'])) {
                $banner = GachaBanner::where('banner_type', 'support_card')
                    ->where('start_date', $parsed['start_date'])
                    ->where(function ($q) {
                        $q->where('category', 'select_rate_up')
                            ->orWhere('name', 'like', '%Select Pick Up%');
                    })
                    ->first();
            }

            $applied = false;

            if ($banner) {
                // Provenance Precedence Guard:
                // Ensure an older announcement (e.g. preview 予告) never overwrites a newer announcement (e.g. commencement 開催)
                $existingProvAnnounceId = (int) AppSetting::getValue("select_pickup_provenance_id_{$banner->gametora_id}", 0);
                if ($existingProvAnnounceId > 0 && $announceId < $existingProvAnnounceId) {
                    $this->markArticleProcessed($announceId);
                    $applied = true;
                } else {
                    $banner->category = 'select_rate_up';
                    $banner->featured_items = $resolvedCandidates;
                    if (! empty($parsed['end_date']) && ! $banner->end_date) {
                        $banner->end_date = $parsed['end_date'];
                    }
                    $banner->save();

                    AppSetting::setValue("select_pickup_provenance_{$banner->gametora_id}", $parsed['provenance_url']);
                    AppSetting::setValue("select_pickup_provenance_id_{$banner->gametora_id}", (string) $announceId);
                    $this->markArticleProcessed($announceId);
                    $updatedCount++;
                    $applied = true;
                }
            } elseif ($parsed['gametora_id'] !== null && ! empty($parsed['start_date'])) {
                // Banner does not exist in local DB yet; create it proactively
                $bannerDate = Carbon::parse($parsed['start_date']);
                $banner = GachaBanner::create([
                    'gametora_id' => $parsed['gametora_id'],
                    'banner_type' => 'support_card',
                    'category' => 'select_rate_up',
                    'base_rate' => GachaBanner::DEFAULT_BASE_RATE,
                    'name' => sprintf('Select Pick Up (%s %d)', $bannerDate->format('M'), $bannerDate->year),
                    'featured_items' => $resolvedCandidates,
                    'start_date' => $parsed['start_date'],
                    'end_date' => $parsed['end_date'],
                    'is_active' => true,
                ]);

                AppSetting::setValue("select_pickup_provenance_{$banner->gametora_id}", $parsed['provenance_url']);
                AppSetting::setValue("select_pickup_provenance_id_{$banner->gametora_id}", (string) $announceId);
                $this->markArticleProcessed($announceId);
                $updatedCount++;
                $applied = true;
            }

            if ($applied && $announceId > $maxAnnounceIdInBatch) {
                $maxAnnounceIdInBatch = $announceId;
            }
        }

        if ($maxAnnounceIdInBatch > $highestProcessedAnnounceId) {
            AppSetting::setValue('last_processed_cygames_announce_id', (string) $maxAnnounceIdInBatch);
        }

        return [
            'success' => true,
            'updated_count' => $updatedCount,
            'articles_processed' => $processedCount,
        ];
    }
}
