<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\SyncRun;
use App\Models\UmaCatalogItem;
use App\Support\VerifiedHttp;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class CygamesNewsService
{
    public const NEWS_INDEX_URL = 'https://umamusume.jp/api/ajax/pr_info_index';

    public const NEWS_DETAIL_URL = 'https://umamusume.jp/api/ajax/pr_info_detail';

    public const NEWS_WEB_BASE_URL = 'https://umamusume.jp/news/detail?id=';

    public const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    private const ARCHIVED_SELECT_PICKUP_ARTICLES = [30485 => 3547];

    private const ARTICLE_BANNER_KEY_PREFIX = 'cygames_article_banner_id_';

    /**
     * Fetch news index from official Cygames JP news API.
     *
     * @return array<int, array<string, mixed>>
     */
    public function fetchNewsIndex(): array
    {
        return $this->requestNewsIndex() ?? [];
    }

    /** @return array<int, array<string, mixed>>|null */
    private function requestNewsIndex(): ?array
    {
        try {
            $response = VerifiedHttp::request()->withHeaders([
                'User-Agent' => self::USER_AGENT,
                'Referer' => 'https://umamusume.jp/news/',
            ])->timeout(10)->get(self::NEWS_INDEX_URL, [
                'format' => 'json',
            ]);

            if (! $response->successful()) {
                Log::warning('Cygames news index returned non-200 status', [
                    'status' => $response->status(),
                ]);

                return null;
            }

            $data = $response->json();

            return is_array($data['information_list'] ?? null) ? $data['information_list'] : null;
        } catch (Throwable $e) {
            Log::warning('Failed to fetch Cygames news index', [
                'error' => VerifiedHttp::errorMessage($e),
            ]);

            return null;
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
            $response = VerifiedHttp::request()->withHeaders([
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
                'error' => VerifiedHttp::errorMessage($e),
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
        if (preg_match('/<h2[^>]*?>\s*サポートカード\s*<\/h2>(?:(?!<h2\b).)*?gacha_banner_(\d+)\.png/isu', $message, $bannerMatch)) {
            $gametoraId = (int) $bannerMatch[1];
        } elseif (preg_match('/gacha_banner_(\d+)\.png(?:[^<]|<(?!\/figure))*?<\/figure>\s*■\s*ピックアップサポートカード候補/isu', $message, $bannerMatch)) {
            $gametoraId = (int) $bannerMatch[1];
        }

        // 2. Extract date period if available in message HTML (e.g. 10/13 12:00 ～ 10/26 11:59)
        $startDate = null;
        $endDate = null;
        $postAt = (string) ($detail['post_at'] ?? '');
        $postYear = $postAt !== '' ? (int) Carbon::parse($postAt)->year : (int) date('Y');

        $periodHeading = '(?:開催期間|期間)[^<]*?<\/h2>\s*';
        $dateRange = '(\d{1,2})\/(\d{1,2})(?:\s+\d{1,2}:\d{1,2})?\s*(?:～|~|-)\s*(\d{1,2})\/(\d{1,2})';
        $supportPeriod = '(?:(?!<h[1-6]\b).)*?セレクトピックアップ\s*サポートカードガチャ\s*<br\s*\/?>\s*';
        if (preg_match('/'.$periodHeading.$supportPeriod.$dateRange.'/isu', $message, $dateMatch)
            || preg_match('/'.$periodHeading.$dateRange.'/u', $message, $dateMatch)) {
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
     * Check whether the article's banner still has a valid lineup from this announcement or a later one.
     */
    public function isArticleProcessed(int $announceId): bool
    {
        $gameToraId = (int) AppSetting::getValue(self::ARTICLE_BANNER_KEY_PREFIX.$announceId, 0);
        if ($gameToraId <= 0) {
            return false;
        }

        $banner = GachaBanner::where('gametora_id', $gameToraId)->where('banner_type', 'support_card')->first();
        $sourceId = (int) AppSetting::getValue("select_pickup_provenance_id_{$gameToraId}", 0);

        return $sourceId >= $announceId
            && $banner?->hasOfficialSelectPickupCandidates()
            && $banner->getProvenanceUrl() === self::NEWS_WEB_BASE_URL.$sourceId;
    }

    /**
     * Mark an announcement article as successfully processed.
     */
    private function markArticleProcessed(int $announceId, int $gameToraId): void
    {
        AppSetting::setValue(self::ARTICLE_BANNER_KEY_PREFIX.$announceId, (string) $gameToraId);
        AppSetting::setValue("cygames_article_processed_{$announceId}", '1');
    }

    /**
     * @param  array<int, array<string, mixed>>  $articles
     * @return list<int>
     */
    private function selectPickupArticleIds(array $articles): array
    {
        $articleIds = array_column($this->filterSelectPickupArticles($articles), 'announce_id');
        $knownArticleKeys = AppSetting::where('key', 'like', self::ARTICLE_BANNER_KEY_PREFIX.'%')->pluck('key');
        foreach ($knownArticleKeys as $key) {
            if (str_starts_with($key, self::ARTICLE_BANNER_KEY_PREFIX)) {
                $articleIds[] = substr($key, strlen(self::ARTICLE_BANNER_KEY_PREFIX));
            }
        }
        foreach (self::ARCHIVED_SELECT_PICKUP_ARTICLES as $gameToraId => $announceId) {
            if (AppSetting::getValue("cygames_article_processed_{$announceId}") === '1'
                || GachaBanner::where('gametora_id', $gameToraId)->where('banner_type', 'support_card')->exists()) {
                $articleIds[] = $announceId;
            }
        }

        $articleIds = array_unique(array_map('intval', $articleIds));
        rsort($articleIds, SORT_NUMERIC);

        return $articleIds;
    }

    /**
     * Synchronize Select Pickup Support Card banners using canonical official Cygames announcements.
     *
     * @return array{success: bool, updated_count: int, articles_processed: int}
     */
    public function syncSelectPickupBanners(bool $force = false, ?SyncRunRecorder $parent = null): array
    {
        $run = SyncRunRecorder::start(SyncRun::SOURCE_CYGAMES, $parent ? SyncRun::TRIGGER_EMBEDDED : SyncRun::TRIGGER_DIRECT, $parent, ['force' => $force]);
        $observations = [
            'index_fetch_ok' => false,
            'detail_fetch_failures' => 0,
            'parse_failures' => 0,
            'resolution_failures' => 0,
            'unmatched_articles' => 0,
            'articles_processed' => 0,
            'official_banners_updated' => 0,
            'created_banners' => 0,
        ];
        $error = null;
        try {
            return $this->syncArticles($force, $observations);
        } catch (Throwable $e) {
            $error = $e;

            throw $e;
        } finally {
            $this->finishRun($run, $observations, $error);
        }
    }

    /**
     * @param  array{index_fetch_ok: bool, detail_fetch_failures: int, parse_failures: int, resolution_failures: int, unmatched_articles: int, articles_processed: int, official_banners_updated: int, created_banners: int}  $observations
     */
    private function finishRun(SyncRunRecorder $run, array $observations, ?Throwable $error): void
    {
        $unresolvedCount = SyncRunRecorder::bestEffort(fn () => GachaBanner::unresolvedSelectPickup()->distinct()->count('gametora_id')) ?? 0;
        $warningCount = (int) ! $observations['index_fetch_ok'] + $observations['detail_fetch_failures']
            + $observations['parse_failures'] + $observations['resolution_failures'] + $observations['unmatched_articles'];
        $appliedCount = $observations['official_banners_updated'];
        $status = SyncRun::STATUS_SUCCESS;
        if ($error !== null) {
            $status = SyncRun::STATUS_FAILED;
        } elseif ($warningCount > 0 || $unresolvedCount > 0) {
            $retainedOfficial = $appliedCount === 0 && $unresolvedCount === 0 && SyncRunRecorder::bestEffort(
                fn () => GachaBanner::gameToraSelectPickup()->get()->contains(fn (GachaBanner $banner) => $banner->hasOfficialSelectPickupCandidates()),
            );
            $status = $appliedCount > 0 || $retainedOfficial ? SyncRun::STATUS_DEGRADED : SyncRun::STATUS_FAILED;
        }

        $run->finish(
            $status,
            $observations,
            createdCount: $observations['created_banners'],
            updatedCount: $appliedCount - $observations['created_banners'],
            unresolvedCount: $unresolvedCount,
            warningCount: $warningCount,
            error: $error,
        );
    }

    /**
     * @param  array{index_fetch_ok: bool, detail_fetch_failures: int, parse_failures: int, resolution_failures: int, unmatched_articles: int, articles_processed: int, official_banners_updated: int, created_banners: int}  $observations
     * @return array{success: bool, updated_count: int, articles_processed: int}
     */
    private function syncArticles(bool $force, array &$observations): array
    {
        $index = $this->requestNewsIndex();
        $observations['index_fetch_ok'] = $index !== null;
        $articles = $index ?? [];
        $highestProcessedAnnounceId = (int) AppSetting::getValue('last_processed_cygames_announce_id', 0);
        $maxAnnounceIdInBatch = $highestProcessedAnnounceId;

        foreach ($this->selectPickupArticleIds($articles) as $announceId) {
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
                $observations['detail_fetch_failures']++;

                continue;
            }

            $observations['articles_processed']++;
            $parsed = $this->parseArticle($detail);
            if (! $parsed || $parsed['announce_id'] !== $announceId) {
                $observations['parse_failures']++;

                continue;
            }

            $resolvedCandidates = $this->resolveCandidates($parsed['raw_candidates']);
            if (! $resolvedCandidates || count($resolvedCandidates) !== 10) {
                $observations['resolution_failures']++;

                continue;
            }

            $banner = null;
            if ($parsed['gametora_id'] !== null) {
                $banner = GachaBanner::where('gametora_id', $parsed['gametora_id'])
                    ->where('banner_type', 'support_card')
                    ->first();
            } elseif (! empty($parsed['start_date'])) {
                $matches = GachaBanner::gameToraSelectPickup()
                    ->withoutLegacyFebruarySelectPickup()
                    ->whereDate('start_date', $parsed['start_date'])
                    ->limit(2)->get();
                $banner = $matches->count() === 1 ? $matches->first() : null;
            }

            if (! $banner) {
                if ($parsed['gametora_id'] === null || $parsed['start_date'] === null) {
                    $observations['unmatched_articles']++;

                    continue;
                }

                $banner = new GachaBanner([
                    'gametora_id' => $parsed['gametora_id'],
                    'banner_type' => 'support_card',
                    'base_rate' => GachaBanner::DEFAULT_BASE_RATE,
                    'name' => 'Select Pick Up ('.Carbon::parse($parsed['start_date'])->format('M Y').')',
                    'start_date' => $parsed['start_date'],
                    'is_active' => true,
                ]);
            }

            $updated = DB::transaction(function () use ($banner, $announceId, $parsed, $resolvedCandidates): bool {
                $gameToraId = (int) $banner->gametora_id;
                $existingSourceId = (int) AppSetting::getValue("select_pickup_provenance_id_{$gameToraId}", 0);
                if ($announceId < $existingSourceId) {
                    $this->markArticleProcessed($announceId, $gameToraId);

                    return false;
                }

                $banner->category = 'select_rate_up';
                $banner->featured_items = $resolvedCandidates;
                if ($parsed['end_date'] !== null) {
                    $banner->start_date = $parsed['start_date'];
                    $banner->end_date = $parsed['end_date'];
                }
                $banner->save();

                AppSetting::setValue("select_pickup_provenance_{$gameToraId}", $parsed['provenance_url']);
                AppSetting::setValue("select_pickup_provenance_id_{$gameToraId}", (string) $announceId);
                $this->markArticleProcessed($announceId, $gameToraId);

                return true;
            });

            if ($updated) {
                $observations['official_banners_updated']++;
                $observations['created_banners'] += (int) $banner->wasRecentlyCreated;
            }
            $maxAnnounceIdInBatch = max($maxAnnounceIdInBatch, $announceId);
        }

        if ($maxAnnounceIdInBatch > $highestProcessedAnnounceId) {
            AppSetting::setValue('last_processed_cygames_announce_id', (string) $maxAnnounceIdInBatch);
        }

        return [
            'success' => $articles !== [] || $observations['official_banners_updated'] > 0,
            'updated_count' => $observations['official_banners_updated'],
            'articles_processed' => $observations['articles_processed'],
        ];
    }
}
