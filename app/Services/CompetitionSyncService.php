<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CompetitionEvent;
use App\Support\AtomicJsonFile;
use App\Support\CompetitionRacetrackHelper;
use App\Support\CompetitionStatRecoveryRecommender;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CompetitionSyncService
{
    public const CYGAMES_INDEX_URL = 'https://umamusume.jp/api/ajax/pr_info_index';

    public const CYGAMES_DETAIL_URL = 'https://umamusume.jp/api/ajax/pr_info_detail';

    public const GAMEWITH_SUMMARY_URL = 'https://gamewith.jp/uma-musume/article/show/272329';

    public const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    protected static ?string $storagePath = null;

    protected static ?array $cachedLiveSyncData = null;

    /**
     * Override live sync storage file path (primarily for isolated test suites).
     */
    public static function setStoragePath(?string $path): void
    {
        self::$storagePath = $path;
        self::$cachedLiveSyncData = null;
    }

    /**
     * Get live sync storage file path.
     */
    public static function getStoragePath(): string
    {
        return self::$storagePath ?? storage_path('app/competition_events_live_sync.json');
    }

    /**
     * Clear in-memory cache of live sync data.
     */
    public static function clearCache(): void
    {
        self::$cachedLiveSyncData = null;
    }

    /**
     * Read and decode live sync JSON data.
     *
     * @return array{
     *     last_synced_at: ?string,
     *     status: string,
     *     events: array<string, array<string, mixed>>,
     *     guides: array<string, array<string, mixed>>
     * }
     */
    public static function getLiveSyncData(): array
    {
        if (self::$cachedLiveSyncData !== null) {
            return self::$cachedLiveSyncData;
        }

        $path = self::getStoragePath();
        if (! file_exists($path)) {
            return self::$cachedLiveSyncData = [
                'last_synced_at' => null,
                'status' => 'idle',
                'events' => [],
                'guides' => [],
            ];
        }

        try {
            $content = (string) file_get_contents($path);
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                return self::$cachedLiveSyncData = [
                    'last_synced_at' => $decoded['last_synced_at'] ?? null,
                    'status' => $decoded['status'] ?? 'success',
                    'events' => is_array($decoded['events'] ?? null) ? $decoded['events'] : [],
                    'guides' => is_array($decoded['guides'] ?? null) ? $decoded['guides'] : [],
                ];
            }
        } catch (Throwable $e) {
            Log::warning('Failed reading competition live sync data', ['error' => $e->getMessage()]);
        }

        return self::$cachedLiveSyncData = [
            'last_synced_at' => null,
            'status' => 'error',
            'events' => [],
            'guides' => [],
        ];
    }

    /**
     * Save live sync data into storage.
     *
     * @param  array{last_synced_at: ?string, status: string, events: array<string, array<string, mixed>>, guides: array<string, array<string, mixed>>}  $data
     */
    public static function saveLiveSyncData(array $data): bool
    {
        try {
            AtomicJsonFile::write(self::getStoragePath(), $data);
        } catch (Throwable $e) {
            Log::warning('Gagal menyimpan snapshot kompetisi', ['error' => $e->getMessage()]);

            return false;
        }

        self::$cachedLiveSyncData = $data;
        CompetitionStatRecoveryRecommender::clearGuidesCache();

        return true;
    }

    /**
     * Synchronize events and guides from official Cygames JP news and GameWith JP.
     *
     * @return array{
     *     success: bool,
     *     status: string,
     *     message: string,
     *     last_synced_at: ?string,
     *     updated_events: array<int, string>,
     *     events_checked: int,
     *     data: array<int, array<string, mixed>>
     * }
     */
    public function syncAll(bool $force = false): array
    {
        $current = self::getLiveSyncData();
        $previous = $current;
        $updatedKeys = [];

        // 1. Sync from Cygames News
        ['status' => $cygamesStatus, 'data' => $cygamesResults] = $this->syncFromCygamesNews($force);
        foreach ($cygamesResults as $eventKey => $eventData) {
            $existing = $current['events'][$eventKey] ?? [];
            $hasDiff = false;

            // Apply non-downgrade rule: only overwrite if new value is non-null and differs
            foreach ($eventData as $k => $v) {
                if ($v !== null && ($existing[$k] ?? null) !== $v) {
                    $hasDiff = true;
                    $existing[$k] = $v;
                }
            }

            if ($hasDiff) {
                $current['events'][$eventKey] = $existing;
                $updatedKeys[] = $eventKey;
            }
        }

        // 2. Sync from GameWith Guides
        ['status' => $gamewithStatus, 'data' => $gamewithResults] = $this->syncFromGameWithGuides($force);
        foreach ($gamewithResults as $eventKey => $guideData) {
            $existingGuide = $current['guides'][$eventKey] ?? [];
            if ($existingGuide !== $guideData) {
                $current['guides'][$eventKey] = $guideData;
                if (! in_array($eventKey, $updatedKeys, true)) {
                    $updatedKeys[] = $eventKey;
                }
            }
        }

        $status = match (true) {
            $cygamesStatus === 'error' && $gamewithStatus === 'error' => 'error',
            $cygamesStatus !== 'success' || $gamewithStatus !== 'success' => 'partial',
            $updatedKeys === [] => 'unchanged',
            default => 'success',
        };
        if ($status === 'success' || $status === 'unchanged') {
            $current['last_synced_at'] = Carbon::now()->toIso8601String();
        }
        $current['status'] = $status;
        if (! self::saveLiveSyncData($current)) {
            $status = 'error';
            $current = $previous;
            $updatedKeys = [];
            $saveFailed = true;
        }

        // Fetch all events chronologically (overlay is applied automatically via booted() retrieval)
        $events = CompetitionEvent::chronological()->get()->map(function (CompetitionEvent $event) {
            $arr = $event->toArray();
            $arr['racetrack_course'] = CompetitionRacetrackHelper::findCourse($event);

            return $arr;
        })->values()->all();

        $eventsCount = count($events);
        $updateCount = count(array_unique($updatedKeys));

        $message = match ($status) {
            'success' => "Sinkronisasi kompetisi berhasil. {$updateCount} event diperbarui.",
            'unchanged' => 'Sinkronisasi kompetisi berhasil. Data sudah mutakhir.',
            'partial' => "Sinkronisasi kompetisi sebagian berhasil. {$updateCount} event diperbarui.",
            default => isset($saveFailed) ? 'Gagal menyimpan snapshot kompetisi.' : 'Gagal memuat sumber sinkronisasi kompetisi.',
        };

        return [
            'success' => $status !== 'error',
            'status' => $status,
            'message' => $message,
            'last_synced_at' => $current['last_synced_at'],
            'updated_events' => array_values(array_unique($updatedKeys)),
            'events_checked' => $eventsCount,
            'data' => $events,
        ];
    }

    /**
     * Synchronize official event announcements from Cygames JP.
     *
     * @return array{status: string, data: array<string, array<string, mixed>>}
     */
    public function syncFromCygamesNews(bool $force = false): array
    {
        $events = [];
        $status = 'error';

        try {
            $indexResponse = Http::withHeaders([
                'User-Agent' => self::USER_AGENT,
                'Referer' => 'https://umamusume.jp/news/',
            ])->timeout(10)->get(self::CYGAMES_INDEX_URL, [
                'format' => 'json',
                'page' => 1,
            ]);

            if (! $indexResponse->successful()) {
                Log::warning('Cygames news index returned non-200 status', [
                    'status' => $indexResponse->status(),
                ]);

                return ['status' => 'error', 'data' => []];
            }

            $infoList = $indexResponse->json('information_list');
            if (! is_array($infoList)) {
                return ['status' => 'error', 'data' => []];
            }

            $status = 'success';
            // Filter relevant articles: multi-event overview or single event announcements
            $relevantArticles = array_filter($infoList, function (array $item): bool {
                $title = (string) ($item['title'] ?? '');

                return str_contains($title, '対戦レースイベント')
                    || str_contains($title, 'チャンピオンズミーティング')
                    || str_contains($title, 'リーグ オブ ヒーローズ')
                    || str_contains($title, 'リーグ・オブ・ヒーローズ')
                    || str_contains($title, 'リーグオブヒーローズ');
            });

            foreach ($relevantArticles as $article) {
                $announceId = (int) ($article['announce_id'] ?? 0);
                if ($announceId <= 0) {
                    $status = 'partial';

                    continue;
                }

                try {
                    $detailResponse = Http::withHeaders([
                        'User-Agent' => self::USER_AGENT,
                        'Referer' => 'https://umamusume.jp/news/',
                    ])->timeout(10)->get(self::CYGAMES_DETAIL_URL, [
                        'format' => 'json',
                        'announce_id' => $announceId,
                    ]);

                } catch (Throwable $e) {
                    $status = 'partial';
                    Log::warning('Gagal mengambil detail Cygames', ['error' => $e->getMessage()]);

                    continue;
                }

                if (! $detailResponse->successful()) {
                    $status = 'partial';

                    continue;
                }

                $detailMessage = (string) ($detailResponse->json('detail.message') ?? '');
                if ($detailMessage === '') {
                    $status = 'partial';

                    continue;
                }

                $parsed = $this->parseCygamesAnnouncement(
                    $detailMessage,
                    (string) ($article['title'] ?? ''),
                    $announceId,
                    (string) ($article['post_at'] ?? '')
                );

                foreach ($parsed as $item) {
                    $key = $item['event_key'] ?? null;
                    if ($key) {
                        $events[$key] = $item;
                    }
                }
            }
        } catch (Throwable $e) {
            if ($status !== 'error') {
                $status = 'partial';
            }
            Log::warning('Error during syncFromCygamesNews', ['error' => $e->getMessage()]);
        }

        return ['status' => $status, 'data' => $events];
    }

    /**
     * Parse Cygames announcement HTML message into structured event records.
     *
     * @return array<int, array<string, mixed>>
     */
    public function parseCygamesAnnouncement(string $html, string $title, int $announceId, string $postAt): array
    {
        $events = [];
        $sourceUrl = "https://umamusume.jp/news/detail?id={$announceId}";
        $postYear = 2026;
        $postMonth = 10;
        if ($postAt !== '' && preg_match('/^(\d{4})-(\d{2})/', $postAt, $m)) {
            $postYear = (int) $m[1];
            $postMonth = (int) $m[2];
        }

        // Normalize HTML: replace tags with newlines and decode entities
        $text = html_entity_decode(strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</div>'], "\n", $html)));
        $lines = array_values(array_filter(array_map('trim', explode("\n", $text)), fn ($l) => $l !== ''));

        // Case 1: Multi-event overview style (e.g. "■11/22：リーグ オブ ヒーローズ" or "■2027年1月下旬：チャンピオンズミーティングCLASSIC")
        $currentEventHeader = null;
        $currentLines = [];

        foreach ($lines as $line) {
            if (preg_match('/^■\s*(\d{4}年)?\s*(\d{1,2})[\/月]([^\n：:]+)?[：:]\s*(.+)$/u', $line, $matches)
                || preg_match('/^■\s*(\d{4}年)?\s*(\d{1,2})月(上旬|中旬|下旬)[：:]\s*(.+)$/u', $line, $matches)) {
                if ($currentEventHeader !== null) {
                    $item = $this->parseOverviewBlock($currentEventHeader, $currentLines, $postYear, $postMonth, $sourceUrl);
                    if ($item !== null) {
                        $events[] = $item;
                    }
                }
                $currentEventHeader = $line;
                $currentLines = [];
            } elseif ($currentEventHeader !== null) {
                // If another major heading begins that is not an event block, finalize current
                if (str_starts_with($line, '■') && ! preg_match('/^■\s*(\d{4}年)?\s*(\d{1,2})/u', $line)) {
                    $item = $this->parseOverviewBlock($currentEventHeader, $currentLines, $postYear, $postMonth, $sourceUrl);
                    if ($item !== null) {
                        $events[] = $item;
                    }
                    $currentEventHeader = null;
                    $currentLines = [];
                } else {
                    $currentLines[] = $line;
                }
            }
        }

        if ($currentEventHeader !== null) {
            $item = $this->parseOverviewBlock($currentEventHeader, $currentLines, $postYear, $postMonth, $sourceUrl);
            if ($item !== null) {
                $events[] = $item;
            }
        }

        // Case 2: Single event announcement style (e.g. "■イベント開催期間" & "■対象レース")
        if (empty($events) && (str_contains($title, 'チャンピオンズミーティング') || str_contains($title, 'リーグ オブ ヒーローズ') || str_contains($title, 'リーグ・オブ・ヒーローズ'))) {
            $single = $this->parseSingleEventAnnouncement($text, $title, $postYear, $postMonth, $sourceUrl);
            if ($single !== null) {
                $events[] = $single;
            }
        }

        return $events;
    }

    /**
     * Parse an individual overview block from multi-event announcement.
     *
     * @param  array<int, string>  $bodyLines
     * @return array<string, mixed>|null
     */
    protected function parseOverviewBlock(string $header, array $bodyLines, int $postYear, int $postMonth, string $sourceUrl): ?array
    {
        $year = $postYear;
        $month = null;
        $day = null;
        $period = 'late';

        // Extract year if explicitly stated: e.g. "2027年"
        if (preg_match('/(\d{4})年/u', $header, $yMatch)) {
            $year = (int) $yMatch[1];
        }

        // Extract month & period/day: e.g. "11/22", "12月下旬", "1月中旬", "3月上旬"
        if (preg_match('/(\d{1,2})\/(\d{1,2})/u', $header, $dMatch)) {
            $month = (int) $dMatch[1];
            $day = (int) $dMatch[2];
            $period = 'exact';
        } elseif (preg_match('/(\d{1,2})月(上旬|中旬|下旬)/u', $header, $pMatch)) {
            $month = (int) $pMatch[1];
            $period = match ($pMatch[2]) {
                '上旬' => 'early',
                '中旬' => 'mid',
                '下旬' => 'late',
                default => 'late',
            };
        } elseif (preg_match('/(\d{1,2})月/u', $header, $mMatch)) {
            $month = (int) $mMatch[1];
        }

        if ($month === null) {
            return null;
        }

        // Determine year if not explicitly stated
        if (! preg_match('/(\d{4})年/u', $header)) {
            $year = ($month < $postMonth) ? ($postYear + 1) : $postYear;
        }

        // Event type & name
        $isLoh = str_contains($header, 'リーグ オブ ヒーローズ')
            || str_contains($header, 'リーグ・オブ・ヒーローズ')
            || str_contains($header, 'リーグオブヒーローズ');

        $eventType = $isLoh ? 'league_of_heroes' : 'champions_meeting';
        $keyPrefix = $isLoh ? 'loh' : 'cm';
        $eventKey = sprintf('%s-%04d-%02d', $keyPrefix, $year, $month);

        $eventName = 'League of Heroes';
        if (! $isLoh) {
            if (stripos($header, 'CLASSIC') !== false) {
                $eventName = 'Champions Meeting CLASSIC';
            } elseif (stripos($header, 'LONG') !== false) {
                $eventName = 'Champions Meeting LONG';
            } elseif (stripos($header, 'MILE') !== false) {
                $eventName = 'Champions Meeting MILE';
            } elseif (stripos($header, 'DIRT') !== false) {
                $eventName = 'Champions Meeting DIRT';
            } elseif (stripos($header, 'SPRINT') !== false) {
                $eventName = 'Champions Meeting SPRINT';
            } else {
                $eventName = 'Champions Meeting';
            }
        }

        $bodyText = implode(' ', $bodyLines);
        $conditions = $this->parseRaceConditions($bodyText);

        $dateLabel = match ($period) {
            'exact' => sprintf('%d %s %d', $day, self::indonesianMonth($month), $year),
            'early' => sprintf('Awal %s %d', self::indonesianMonth($month), $year),
            'mid' => sprintf('Pertengahan %s %d', self::indonesianMonth($month), $year),
            default => sprintf('Akhir %s %d', self::indonesianMonth($month), $year),
        };

        $startDate = $period === 'exact' && $day !== null
            ? sprintf('%04d-%02d-%02d', $year, $month, $day)
            : null;

        return array_merge([
            'event_key' => $eventKey,
            'event_type' => $eventType,
            'event_name' => $eventName,
            'year' => $year,
            'month' => $month,
            'period' => $period,
            'date_label' => $dateLabel,
            'start_date' => $startDate,
            'source_name' => 'Cygames',
            'source_url' => $sourceUrl,
        ], $conditions);
    }

    /**
     * Parse single event announcement style (such as detail articles).
     *
     * @return array<string, mixed>|null
     */
    protected function parseSingleEventAnnouncement(string $text, string $title, int $postYear, int $postMonth, string $sourceUrl): ?array
    {
        $isLoh = str_contains($title, 'リーグ オブ ヒーローズ')
            || str_contains($title, 'リーグ・オブ・ヒーローズ')
            || str_contains($title, 'リーグオブヒーローズ');

        $eventType = $isLoh ? 'league_of_heroes' : 'champions_meeting';
        $keyPrefix = $isLoh ? 'loh' : 'cm';

        // Extract dates from "イベント開催期間"
        // e.g. "10/20 12:00 ～ 10/26 11:59" or "2026/10/20"
        $month = null;
        $day = null;
        $year = $postYear;

        if (preg_match('/イベント開催期間.*?(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})/us', $text, $dMatch)) {
            if (! empty($dMatch[1])) {
                $year = (int) $dMatch[1];
            }
            $month = (int) $dMatch[2];
            $day = (int) $dMatch[3];
        }

        if ($month === null) {
            return null;
        }

        if (empty($dMatch[1])) {
            $year = ($month < $postMonth) ? ($postYear + 1) : $postYear;
        }

        $eventKey = sprintf('%s-%04d-%02d', $keyPrefix, $year, $month);

        $eventName = 'League of Heroes';
        if (! $isLoh) {
            if (stripos($title, 'CLASSIC') !== false) {
                $eventName = 'Champions Meeting CLASSIC';
            } elseif (stripos($title, 'LONG') !== false) {
                $eventName = 'Champions Meeting LONG';
            } elseif (stripos($title, 'MILE') !== false) {
                $eventName = 'Champions Meeting MILE';
            } elseif (stripos($title, 'DIRT') !== false) {
                $eventName = 'Champions Meeting DIRT';
            } elseif (stripos($title, 'SPRINT') !== false) {
                $eventName = 'Champions Meeting SPRINT';
            } else {
                $eventName = 'Champions Meeting';
            }
        }

        $raceSection = '';
        if (preg_match('/対象レース.*?(?=\n■|\n\n|$)/us', $text, $rMatch)) {
            $raceSection = $rMatch[0];
        }

        $conditions = $this->parseRaceConditions($raceSection !== '' ? $raceSection : $text);

        return array_merge([
            'event_key' => $eventKey,
            'event_type' => $eventType,
            'event_name' => $eventName,
            'year' => $year,
            'month' => $month,
            'period' => 'exact',
            'date_label' => sprintf('%d %s %d', $day, self::indonesianMonth($month), $year),
            'start_date' => sprintf('%04d-%02d-%02d', $year, $month, $day),
            'source_name' => 'Cygames',
            'source_url' => $sourceUrl,
        ], $conditions);
    }

    /**
     * Parse race conditions text into normalized attributes.
     *
     * @return array<string, mixed>
     */
    public function parseRaceConditions(string $text): array
    {
        $venues = [
            '東京' => 'Tokyo',
            '阪神' => 'Hanshin',
            '京都' => 'Kyoto',
            '中山' => 'Nakayama',
            '中京' => 'Chukyo',
            '大井' => 'Oi',
            '川崎' => 'Kawasaki',
            '盛岡' => 'Morioka',
            '新潟' => 'Niigata',
            '福島' => 'Fukushima',
            '小倉' => 'Kokura',
            '札幌' => 'Sapporo',
            '函館' => 'Hakodate',
            '船橋' => 'Funabashi',
            '門別' => 'Mombetsu',
        ];

        $venue = null;
        foreach ($venues as $jp => $en) {
            if (str_contains($text, $jp)) {
                $venue = $en;
                break;
            }
        }

        $surface = null;
        if (str_contains($text, '芝')) {
            $surface = 'turf';
        } elseif (str_contains($text, 'ダート')) {
            $surface = 'dirt';
        }

        $distance = null;
        if (preg_match('/(\d{3,4})\s*m/i', $text, $distMatch)) {
            $distance = (int) $distMatch[1];
        }

        $distCategory = null;
        if (preg_match('/短距離|スプリント/u', $text)) {
            $distCategory = 'sprint';
        } elseif (preg_match('/マイル/u', $text)) {
            $distCategory = 'mile';
        } elseif (preg_match('/中距離/u', $text)) {
            $distCategory = 'middle';
        } elseif (preg_match('/長距離/u', $text)) {
            $distCategory = 'long';
        } elseif ($distance !== null) {
            if ($distance <= 1400) {
                $distCategory = 'sprint';
            } elseif ($distance <= 1800) {
                $distCategory = 'mile';
            } elseif ($distance <= 2400) {
                $distCategory = 'middle';
            } else {
                $distCategory = 'long';
            }
        }

        $direction = null;
        if (str_contains($text, '右・外')) {
            $direction = 'right_outer';
        } elseif (str_contains($text, '右・内')) {
            $direction = 'right_inner';
        } elseif (str_contains($text, '右')) {
            $direction = 'right';
        } elseif (str_contains($text, '左')) {
            $direction = 'left';
        } elseif (str_contains($text, '直線')) {
            $direction = 'straight';
        }

        $season = null;
        if (str_contains($text, '春')) {
            $season = 'spring';
        } elseif (str_contains($text, '夏')) {
            $season = 'summer';
        } elseif (str_contains($text, '秋')) {
            $season = 'autumn';
        } elseif (str_contains($text, '冬')) {
            $season = 'winter';
        }

        $timeOfDay = null;
        if (str_contains($text, '昼')) {
            $timeOfDay = 'day';
        } elseif (str_contains($text, '夕')) {
            $timeOfDay = 'sunset';
        } elseif (str_contains($text, '夜')) {
            $timeOfDay = 'night';
        }

        $weather = null;
        if (preg_match('/天候.*?ランダム/u', $text) || (str_contains($text, 'ランダム') && ! preg_match('/晴|曇|雨|雪/u', $text))) {
            $weather = 'random';
        } elseif (preg_match('/晴れ?/u', $text)) {
            $weather = 'sunny';
        } elseif (preg_match('/曇り?/u', $text)) {
            $weather = 'cloudy';
        } elseif (str_contains($text, '雨')) {
            $weather = 'rainy';
        } elseif (str_contains($text, '雪')) {
            $weather = 'snowy';
        }

        $trackCondition = null;
        if (preg_match('/バ場状態.*?ランダム/u', $text) || (str_contains($text, 'ランダム') && ! preg_match('/良|稍重|重|不良/u', $text))) {
            $trackCondition = 'random';
        } elseif (str_contains($text, '稍重')) {
            $trackCondition = 'yielding';
        } elseif (str_contains($text, '不良')) {
            $trackCondition = 'bad';
        } elseif (preg_match('/(?<!稍)重/u', $text)) {
            $trackCondition = 'soft';
        } elseif (str_contains($text, '良')) {
            $trackCondition = 'good';
        }

        $specialRule = null;
        if (str_contains($text, 'デバフなし')) {
            $specialRule = 'no_debuff';
        }

        return [
            'venue' => $venue,
            'surface' => $surface,
            'distance' => $distance,
            'distance_category' => $distCategory,
            'direction' => $direction,
            'season' => $season,
            'time_of_day' => $timeOfDay,
            'weather' => $weather,
            'track_condition' => $trackCondition,
            'special_rule' => $specialRule,
        ];
    }

    /**
     * Synchronize event build guides from GameWith JP articles.
     *
     * @return array{status: string, data: array<string, array<string, mixed>>}
     */
    public function syncFromGameWithGuides(bool $force = false): array
    {
        $guides = [];
        $status = 'error';

        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENT,
            ])->timeout(10)->get(self::GAMEWITH_SUMMARY_URL);

            if (! $response->successful()) {
                Log::warning('GameWith summary returned non-200 status', [
                    'status' => $response->status(),
                ]);

                return ['status' => 'error', 'data' => []];
            }

            $html = $response->body();
            if (trim($html) === '') {
                return ['status' => 'error', 'data' => []];
            }
            $status = 'success';

            // Extract articles matching competition guide links:
            // e.g. <a href="https://gamewith.jp/uma-musume/article/show/586061">...1月チャンミ...</a>
            preg_match_all('/<a[^>]+href=["\'](?:https:\/\/gamewith\.jp)?\/uma-musume\/article\/show\/(\d+)["\'][^>]*>(.*?)<\/a>/usi', $html, $matches, PREG_SET_ORDER);

            $seenIds = [];
            foreach ($matches as $match) {
                $articleId = (int) $match[1];
                $linkText = strip_tags($match[2]);

                if (isset($seenIds[$articleId])) {
                    continue;
                }
                $seenIds[$articleId] = true;

                // Check if link mentions upcoming CM/LoH
                if (! preg_match('/(\d{1,2})月\s*(チャンミ|LoH|チャンピオンズミーティング|リーグオブヒーローズ|中距離|長距離|マイル|短距離|ダート)/ui', $linkText)) {
                    continue;
                }

                $guide = $this->fetchGameWithArticleGuide($articleId);
                if ($guide !== null && ! empty($guide['event_key'])) {
                    $guides[$guide['event_key']] = $guide;
                } else {
                    $status = 'partial';
                }
            }
        } catch (Throwable $e) {
            if ($status !== 'error') {
                $status = 'partial';
            }
            Log::warning('Error during syncFromGameWithGuides', ['error' => $e->getMessage()]);
        }

        return ['status' => $status, 'data' => $guides];
    }

    /**
     * Fetch and parse an individual GameWith guide article.
     *
     * @return array<string, mixed>|null
     */
    public function fetchGameWithArticleGuide(int $articleId): ?array
    {
        $url = "https://gamewith.jp/uma-musume/article/show/{$articleId}";

        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENT,
            ])->timeout(10)->get($url);

            if (! $response->successful()) {
                return null;
            }

            return $this->parseGameWithArticleHtml((string) $response->body(), $url);
        } catch (Throwable $e) {
            Log::warning('Failed fetching GameWith article', ['url' => $url, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Parse GameWith article HTML into structured guide record.
     *
     * @return array<string, mixed>|null
     */
    public function parseGameWithArticleHtml(string $html, string $url): ?array
    {
        // 1. Identify Target Event Month & Type
        // e.g. "2027年1月", "チャンミ中距離"
        $year = 2026;
        $month = null;
        $isLoh = str_contains($html, 'リーグオブヒーローズ') || str_contains($html, 'リーグ オブ ヒーローズ');

        if (preg_match('/(\d{4})年(\d{1,2})月/u', $html, $m)) {
            $year = (int) $m[1];
            $month = (int) $m[2];
        } elseif (preg_match('/(\d{1,2})月(チャンミ|LoH|チャンピオンズミーティング)/u', $html, $m)) {
            $month = (int) $m[1];
            $year = ($month <= 4) ? 2027 : 2026;
        }

        if ($month === null) {
            return null;
        }

        $keyPrefix = $isLoh ? 'loh' : 'cm';
        $eventKey = sprintf('%s-%04d-%02d', $keyPrefix, $year, $month);

        // 2. Parse Stat Tiers from recommendation tables
        // Find rows matching intermediate/advanced stats
        $statTiers = [];

        // Search table rows for numbers: speed, stamina, power, guts, wisdom
        // e.g. 初~中級者 ... 2100 ... 1600 ... 1400 ... 1000 ... 1400
        if (preg_match('/(?:初~?中級|初級)[^<]*?<\/t[dh]>.*?(\d{4})[^\d]+(\d{3,4})[^\d]+(\d{3,4})[^\d]+(\d{3,4})[^\d]+(\d{3,4})/us', $html, $tierInter)) {
            $statTiers[] = [
                'tier_key' => 'intermediate',
                'tier_label' => 'Pemula / Intermediate',
                'is_provisional' => false,
                'speed' => (string) $tierInter[1],
                'stamina' => (string) $tierInter[2],
                'power' => (string) $tierInter[3],
                'guts' => (string) $tierInter[4],
                'wisdom' => (string) $tierInter[5],
                'stats' => [
                    'speed' => (string) $tierInter[1],
                    'stamina' => (string) $tierInter[2],
                    'power' => (string) $tierInter[3],
                    'guts' => (string) $tierInter[4],
                    'wisdom' => (string) $tierInter[5],
                ],
            ];
        }

        if (preg_match('/(?:上級)[^<]*?<\/t[dh]>.*?(\d{4})[^\d]+(\d{3,4})[^\d]+(\d{3,4})[^\d]+(\d{3,4})[^\d]+(\d{3,4})/us', $html, $tierAdv)) {
            $statTiers[] = [
                'tier_key' => 'advanced',
                'tier_label' => 'Advanced',
                'is_provisional' => false,
                'speed' => (string) $tierAdv[1],
                'stamina' => (string) $tierAdv[2],
                'power' => (string) $tierAdv[3],
                'guts' => (string) $tierAdv[4],
                'wisdom' => (string) $tierAdv[5],
                'stats' => [
                    'speed' => (string) $tierAdv[1],
                    'stamina' => (string) $tierAdv[2],
                    'power' => (string) $tierAdv[3],
                    'guts' => (string) $tierAdv[4],
                    'wisdom' => (string) $tierAdv[5],
                ],
            ];
        }

        if (empty($statTiers)) {
            return null;
        }

        // 3. Recovery guide & notes
        $summaryLabel = 'Rekomendasi Penyesuaian Stamina & Recovery Komunitas GameWith';
        $recs = [
            'Patokan stats di atas merujuk pada analisis komunitas GameWith JP untuk lintasan target.',
            'Kebutuhan skill pemulihan (recovery) dapat disesuaikan dengan pencapaian stamina akhir, gaya lari, serta evolusi skill karakter.',
        ];

        if (str_contains($html, 'スタミナ勝負')) {
            $summaryLabel = 'Aktivasi Mekanisme Stamina Competition (スタミナ勝負)';
            $recs = [
                'Lintasan mengaktifkan mekanisme Stamina Competition (スタミナ勝負), di mana semakin tinggi Stamina dan Power, semakin tinggi pula peningkatan kecepatan saat fase Last Spurt.',
                'Disarankan membawa skill recovery untuk menjamin ketahanan stamina penuh dan mengantisipasi debuff stamina maupun kondisi kakari (rushing).',
            ];
        }

        return [
            'event_key' => $eventKey,
            'source_name' => 'GameWith',
            'source_url' => $url,
            'verified_at' => Carbon::today()->toDateString(),
            'is_community_recommendation' => true,
            'benchmark_disclaimer' => 'Angka di bawah adalah contoh patokan rekomendasi komunitas dari GameWith, bukan persyaratan resmi Cygames maupun jaminan kemenangan.',
            'scenario_note' => 'Acuan rekomendasi resmi GameWith JP hasil sinkronisasi otomatis.',
            'stat_tiers' => $statTiers,
            'recovery_guide' => [
                'summary_label' => $summaryLabel,
                'recommendations' => $recs,
            ],
        ];
    }

    /**
     * Indonesian month names helper.
     */
    public static function indonesianMonth(int $month): string
    {
        $months = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember',
        ];

        return $months[$month] ?? '';
    }
}
