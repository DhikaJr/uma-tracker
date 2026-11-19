<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Controllers\Api\CollectionController;
use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\CircleSnapshot;
use App\Models\CompetitionEvent;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Models\UserSupportCard;
use App\Support\CharacterCatalogPlan;
use App\Support\UmaCatalog;
use Database\Seeders\CompetitionEventSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;

class BackupService
{
    public const CURRENT_SCHEMA_VERSION = '2.0';

    public const SUPPORTED_SCHEMA_VERSIONS = ['0.9', '1.0', '2.0'];

    private const OVERWRITE_V2_ENTITIES = [
        'gacha_banners', 'gacha_pulls', 'gacha_pities', 'career_runs', 'circle_snapshots',
        'app_settings', 'uma_catalog_items', 'user_characters', 'user_support_cards',
    ];

    /**
     * Get live count statistics of all backup-able tables and local backup archives.
     *
     * @return array<string, mixed>
     */
    public function stats(): array
    {
        return [
            'gacha_pulls' => GachaPull::count(),
            'gacha_pities' => GachaPity::count(),
            'career_runs' => CareerRun::count(),
            'circle_snapshots' => CircleSnapshot::count(),
            'app_settings' => AppSetting::count(),
            'uma_catalog_items' => UmaCatalogItem::withRelocatedAliases()->count(),
            'gacha_banners' => GachaBanner::count(),
            'user_characters' => UserCharacter::count(),
            'user_support_cards' => UserSupportCard::count(),
            'local_backups' => $this->getLocalBackupFilesSummary(),
        ];
    }

    /**
     * Get summary of local backup files in storage/app/backups.
     *
     * @return array{count: int, total_size_bytes: int, total_size_mb: float, files: list<array<string, mixed>>}
     */
    public function getLocalBackupFilesSummary(?string $backupDir = null): array
    {
        $backupDir = $backupDir ?: storage_path('app/backups');
        if (! File::isDirectory($backupDir)) {
            return [
                'count' => 0,
                'total_size_bytes' => 0,
                'total_size_mb' => 0.0,
                'files' => [],
            ];
        }

        $pattern = $backupDir.DIRECTORY_SEPARATOR.'uma-companion-backup-*.json';
        $found = glob($pattern) ?: [];

        $files = [];
        $totalBytes = 0;

        foreach ($found as $filepath) {
            $bytes = (int) @filesize($filepath);
            $totalBytes += $bytes;
            $mtime = (int) @filemtime($filepath);

            $files[] = [
                'filename' => basename($filepath),
                'size_bytes' => $bytes,
                'size_mb' => round($bytes / 1048576, 2),
                'modified_at' => $mtime ? date('Y-m-d H:i:s', $mtime) : null,
                'timestamp' => $mtime,
            ];
        }

        usort($files, fn ($a, $b) => $b['timestamp'] <=> $a['timestamp']);

        $cleanFiles = array_map(function ($f) {
            unset($f['timestamp']);

            return $f;
        }, $files);

        return [
            'count' => count($cleanFiles),
            'total_size_bytes' => $totalBytes,
            'total_size_mb' => round($totalBytes / 1048576, 2),
            'files' => $cleanFiles,
        ];
    }

    /**
     * Prune older backups in storage/app/backups, keeping only the most recent $keep files.
     *
     * @return array{deleted_count: int, deleted_files: list<string>, freed_bytes: int, freed_mb: float, remaining_count: int}
     */
    public function pruneOldBackups(int $keep = 1, ?string $backupDir = null): array
    {
        $backupDir = $backupDir ?: storage_path('app/backups');
        $keep = max(1, $keep);
        $summary = $this->getLocalBackupFilesSummary($backupDir);
        $files = $summary['files'];

        if (count($files) <= $keep) {
            return [
                'deleted_count' => 0,
                'deleted_files' => [],
                'freed_bytes' => 0,
                'freed_mb' => 0.0,
                'remaining_count' => count($files),
            ];
        }

        $toDelete = array_slice($files, $keep);
        $deletedFiles = [];
        $freedBytes = 0;

        foreach ($toDelete as $item) {
            $path = $backupDir.DIRECTORY_SEPARATOR.$item['filename'];
            if (File::exists($path) && @unlink($path)) {
                $deletedFiles[] = $item['filename'];
                $freedBytes += (int) ($item['size_bytes'] ?? 0);
            }
        }

        $remainingCount = count($files) - count($deletedFiles);

        return [
            'deleted_count' => count($deletedFiles),
            'deleted_files' => $deletedFiles,
            'freed_bytes' => $freedBytes,
            'freed_mb' => round($freedBytes / 1048576, 2),
            'remaining_count' => $remainingCount,
        ];
    }

    /**
     * Export all app and catalog data into a structured backup array.
     *
     * @return array<string, mixed>
     */
    public function export(): array
    {
        ini_set('memory_limit', '512M');

        $data = [
            'app_settings' => AppSetting::query()->get()->toArray(),
            'circle_snapshots' => CircleSnapshot::query()->get()->toArray(),
            'career_runs' => CareerRun::query()->get()->toArray(),
            'gacha_banners' => GachaBanner::query()->get()->toArray(),
            'gacha_pities' => GachaPity::query()->get()->toArray(),
            'gacha_pulls' => GachaPull::query()->get()->toArray(),
            'uma_catalog_items' => UmaCatalogItem::withRelocatedAliases()->get()->toArray(),
            'user_characters' => UserCharacter::query()->get()->toArray(),
            'user_support_cards' => UserSupportCard::query()->get()->toArray(),
        ];

        return [
            'version' => self::CURRENT_SCHEMA_VERSION,
            'app' => 'Uma Musume Companion',
            'exported_at' => now()->toIso8601String(),
            'summary' => [
                'gacha_pulls' => count($data['gacha_pulls']),
                'gacha_pities' => count($data['gacha_pities']),
                'career_runs' => count($data['career_runs']),
                'circle_snapshots' => count($data['circle_snapshots']),
                'app_settings' => count($data['app_settings']),
                'uma_catalog_items' => count($data['uma_catalog_items']),
                'gacha_banners' => count($data['gacha_banners']),
                'user_characters' => count($data['user_characters']),
                'user_support_cards' => count($data['user_support_cards']),
            ],
            'data' => $data,
        ];
    }

    /**
     * Validate that a given date/time string is parseable and valid.
     *
     * @throws InvalidArgumentException
     */
    protected function validateDate(?string $value, string $field, string $entity, int $index): void
    {
        if ($value === null || $value === '') {
            return;
        }

        try {
            Carbon::parse($value);
        } catch (\Throwable) {
            throw new InvalidArgumentException("Format tanggal/waktu tidak valid pada {$entity}[{$index}].{$field}: '{$value}'.");
        }
    }

    /**
     * Validate that a given string is valid JSON if provided as string.
     *
     * @throws InvalidArgumentException
     */
    protected function validateJson(mixed $value, string $field, string $entity, int $index): void
    {
        if (! is_string($value)) {
            return;
        }

        json_decode($value);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException("Format JSON tidak valid pada {$entity}[{$index}].{$field}: ".json_last_error_msg());
        }
    }

    /**
     * Validate structured JSON columns across backup entities.
     * Rejects raw PHP scalars and scalar JSON strings ('12345', 'true', 'false', 'null', '"teks"').
     * Only accepts PHP arrays, or valid JSON strings that decode into an array/object.
     * Accepts null ONLY if $nullable is true.
     *
     * @throws InvalidArgumentException
     */
    protected function validateStructuredJson(mixed $value, string $field, string $entity, int $index, bool $nullable = true): void
    {
        if ($value === null) {
            if (! $nullable) {
                throw new InvalidArgumentException("Kolom {$field} pada {$entity}[{$index}] wajib diisi dan tidak boleh null.");
            }

            return;
        }

        if (is_array($value)) {
            return;
        }

        if (! is_string($value)) {
            throw new InvalidArgumentException("Nilai {$field} pada {$entity}[{$index}] tidak valid (harus berupa array atau string JSON array/objek).");
        }

        $decoded = json_decode($value, true);
        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            $jsonError = json_last_error() !== JSON_ERROR_NONE ? ': '.json_last_error_msg() : ' (harus berupa array atau objek terstruktur).';
            throw new InvalidArgumentException("Format JSON tidak valid pada {$entity}[{$index}].{$field}{$jsonError}");
        }
    }

    /**
     * Validate the entire backup data payload before attempting any database operations.
     * Enforces schema constraints, range limits, type safety, and internal duplicate detection.
     *
     * @param  array<string, mixed>  $backupData
     *
     * @throws InvalidArgumentException
     */
    public function validate(array $backupData, string $mode = 'merge'): void
    {
        ini_set('memory_limit', '512M');

        // 0. Strict Schema Version Whitelist Validation
        if (! array_key_exists('version', $backupData) || $backupData['version'] === null || $backupData['version'] === '') {
            throw new InvalidArgumentException('Versi skema backup wajib dicantumkan.');
        }

        if (! is_string($backupData['version']) && ! is_numeric($backupData['version'])) {
            throw new InvalidArgumentException('Format versi skema backup tidak valid (harus berupa string).');
        }

        $version = (string) $backupData['version'];
        if (! in_array($version, self::SUPPORTED_SCHEMA_VERSIONS, true)) {
            $supported = implode(', ', self::SUPPORTED_SCHEMA_VERSIONS);
            throw new InvalidArgumentException("Versi skema backup '{$version}' tidak didukung oleh aplikasi saat ini. Versi yang didukung: {$supported}.");
        }

        if (! isset($backupData['data']) || ! is_array($backupData['data'])) {
            throw new InvalidArgumentException('Format file backup tidak valid: atribut data tidak ditemukan atau bukan objek/array.');
        }

        $data = $backupData['data'];

        if ($mode === 'overwrite' && $version === '2.0') {
            foreach (self::OVERWRITE_V2_ENTITIES as $entity) {
                if (! is_array($data[$entity] ?? null)) {
                    throw new InvalidArgumentException("Mode overwrite untuk skema 2.0 mewajibkan '{$entity}' berupa array.");
                }
            }
        }

        // 1. app_settings
        if (isset($data['app_settings'])) {
            if (! is_array($data['app_settings'])) {
                throw new InvalidArgumentException('Format app_settings tidak valid: harus berupa array.');
            }
            $seenKeys = [];
            foreach ($data['app_settings'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record app_settings pada index {$index} bukan array yang valid.");
                }
                if (empty($row['key']) || ! is_string($row['key'])) {
                    throw new InvalidArgumentException("Record app_settings pada index {$index} tidak memiliki atribut 'key' yang valid.");
                }
                if (isset($seenKeys[$row['key']])) {
                    throw new InvalidArgumentException("Duplikasi kunci '{$row['key']}' terdeteksi pada app_settings dalam payload backup (index {$index}).");
                }
                $seenKeys[$row['key']] = true;
            }
        }

        // 2. gacha_banners
        if (isset($data['gacha_banners'])) {
            if (! is_array($data['gacha_banners'])) {
                throw new InvalidArgumentException('Format gacha_banners tidak valid: harus berupa array.');
            }
            $seenBannerIds = [];
            foreach ($data['gacha_banners'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record gacha_banners pada index {$index} bukan array yang valid.");
                }
                if (empty($row['name']) || ! is_string($row['name'])) {
                    throw new InvalidArgumentException("Record gacha_banners pada index {$index} tidak memiliki atribut 'name' yang valid.");
                }
                if (isset($row['id'])) {
                    if (isset($seenBannerIds[$row['id']])) {
                        throw new InvalidArgumentException("Duplikasi ID '{$row['id']}' terdeteksi pada gacha_banners dalam payload backup (index {$index}).");
                    }
                    $seenBannerIds[$row['id']] = true;
                }
                if (! array_key_exists('base_rate', $row)) {
                    throw new InvalidArgumentException("Record gacha_banners pada index {$index} tidak memiliki atribut 'base_rate' yang valid (kolom non-nullable).");
                }
                if ($row['base_rate'] === null) {
                    throw new InvalidArgumentException("Nilai base_rate pada gacha_banners[{$index}] tidak boleh bernilai NULL (kolom non-nullable).");
                }
                if (! is_numeric($row['base_rate'])) {
                    throw new InvalidArgumentException("Nilai base_rate pada gacha_banners[{$index}] harus berupa angka.");
                }
                $rate = (float) $row['base_rate'];
                if ($rate <= 0.0 || $rate > 100.0) {
                    throw new InvalidArgumentException("Nilai base_rate '{$rate}' pada gacha_banners[{$index}] di luar rentang valid (0.0 - 100.0).");
                }
                if (isset($row['banner_type']) && ! in_array($row['banner_type'], ['character', 'support', 'support_card'], true)) {
                    throw new InvalidArgumentException("Nilai banner_type '{$row['banner_type']}' pada gacha_banners[{$index}] tidak valid.");
                }
                $this->validateDate($row['start_date'] ?? null, 'start_date', 'gacha_banners', $index);
                $this->validateDate($row['end_date'] ?? null, 'end_date', 'gacha_banners', $index);
                $this->validateStructuredJson($row['featured_items'] ?? null, 'featured_items', 'gacha_banners', $index, true);
            }
        }

        // 3. gacha_pities
        if (isset($data['gacha_pities'])) {
            if (! is_array($data['gacha_pities'])) {
                throw new InvalidArgumentException('Format gacha_pities tidak valid: harus berupa array.');
            }
            $seenPities = [];
            foreach ($data['gacha_pities'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record gacha_pities pada index {$index} bukan array yang valid.");
                }
                if (empty($row['banner_type']) || ! is_string($row['banner_type'])) {
                    throw new InvalidArgumentException("Record gacha_pities pada index {$index} tidak memiliki atribut 'banner_type' yang valid.");
                }
                if (! in_array($row['banner_type'], ['character', 'support', 'support_card'], true)) {
                    throw new InvalidArgumentException("Nilai banner_type '{$row['banner_type']}' pada gacha_pities[{$index}] tidak valid.");
                }
                $pityKey = $row['banner_type'].':'.($row['gacha_banner_id'] ?? 'null');
                if (isset($seenPities[$pityKey])) {
                    throw new InvalidArgumentException("Duplikasi entri pity untuk '{$pityKey}' terdeteksi pada gacha_pities (index {$index}).");
                }
                $seenPities[$pityKey] = true;

                if (isset($row['current_pity']) && ((int) $row['current_pity'] < 0 || (int) $row['current_pity'] > 500)) {
                    throw new InvalidArgumentException("Nilai current_pity pada gacha_pities[{$index}] di luar rentang valid (0 - 500).");
                }
                $this->validateDate($row['last_reset_at'] ?? null, 'last_reset_at', 'gacha_pities', $index);
            }
        }

        // 4. gacha_pulls
        if (isset($data['gacha_pulls'])) {
            if (! is_array($data['gacha_pulls'])) {
                throw new InvalidArgumentException('Format gacha_pulls tidak valid: harus berupa array.');
            }
            foreach ($data['gacha_pulls'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record gacha_pulls pada index {$index} bukan array yang valid.");
                }
                if (empty($row['item_name']) || ! is_string($row['item_name'])) {
                    throw new InvalidArgumentException("Record gacha_pulls pada index {$index} tidak memiliki atribut 'item_name' yang valid.");
                }
                if (empty($row['banner_type']) || ! is_string($row['banner_type'])) {
                    throw new InvalidArgumentException("Record gacha_pulls pada index {$index} tidak memiliki atribut 'banner_type' yang valid.");
                }
                if (! in_array($row['banner_type'], ['character', 'support', 'support_card'], true)) {
                    throw new InvalidArgumentException("Nilai banner_type '{$row['banner_type']}' pada gacha_pulls[{$index}] tidak valid.");
                }
                if (empty($row['rarity']) || ! is_string($row['rarity'])) {
                    throw new InvalidArgumentException("Record gacha_pulls pada index {$index} tidak memiliki atribut 'rarity' yang valid.");
                }
                if (! in_array($row['rarity'], ['SSR', 'SR', 'R'], true)) {
                    throw new InvalidArgumentException("Nilai rarity '{$row['rarity']}' pada gacha_pulls[{$index}] tidak valid (harus SSR, SR, atau R).");
                }
                if (isset($row['pity_count_at_pull']) && (int) $row['pity_count_at_pull'] < 0) {
                    throw new InvalidArgumentException("Nilai pity_count_at_pull pada gacha_pulls[{$index}] tidak boleh negatif.");
                }
                $this->validateDate($row['pulled_at'] ?? null, 'pulled_at', 'gacha_pulls', $index);
            }
        }

        // 5. career_runs
        if (isset($data['career_runs'])) {
            if (! is_array($data['career_runs'])) {
                throw new InvalidArgumentException('Format career_runs tidak valid: harus berupa array.');
            }
            foreach ($data['career_runs'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record career_runs pada index {$index} bukan array yang valid.");
                }
                $umaName = $row['uma_name'] ?? $row['character_name'] ?? null;
                if (empty($umaName) || ! is_string($umaName)) {
                    throw new InvalidArgumentException("Record career_runs pada index {$index} tidak memiliki atribut 'uma_name' yang valid.");
                }
                if (empty($row['scenario']) || ! is_string($row['scenario'])) {
                    throw new InvalidArgumentException("Record career_runs pada index {$index} tidak memiliki atribut 'scenario' yang valid.");
                }
                if (isset($row['training_type']) && ! in_array($row['training_type'], ['manual', 'independent'], true)) {
                    throw new InvalidArgumentException("Nilai training_type '{$row['training_type']}' pada career_runs[{$index}] tidak valid (harus manual atau independent).");
                }
                if (isset($row['starting_fans']) && (int) $row['starting_fans'] < 0) {
                    throw new InvalidArgumentException("Nilai starting_fans pada career_runs[{$index}] tidak boleh negatif.");
                }
                if (isset($row['fans_gained']) && (int) $row['fans_gained'] < 0) {
                    throw new InvalidArgumentException("Nilai fans_gained pada career_runs[{$index}] tidak boleh negatif.");
                }
                if (isset($row['evaluation_score']) && (int) $row['evaluation_score'] < 0) {
                    throw new InvalidArgumentException("Nilai evaluation_score pada career_runs[{$index}] tidak boleh negatif.");
                }
                $this->validateDate($row['run_date'] ?? null, 'run_date', 'career_runs', $index);
            }
        }

        // 6. circle_snapshots
        if (isset($data['circle_snapshots'])) {
            if (! is_array($data['circle_snapshots'])) {
                throw new InvalidArgumentException('Format circle_snapshots tidak valid: harus berupa array.');
            }
            $seenSnapshots = [];
            foreach ($data['circle_snapshots'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record circle_snapshots pada index {$index} bukan array yang valid.");
                }
                if (empty($row['circle_id'])) {
                    throw new InvalidArgumentException("Record circle_snapshots pada index {$index} tidak memiliki atribut 'circle_id' yang valid.");
                }
                $timeMarker = $row['last_refreshed_at'] ?? $row['snapshot_date'] ?? $row['created_at'] ?? null;
                if (empty($timeMarker)) {
                    throw new InvalidArgumentException("Record circle_snapshots pada index {$index} tidak memiliki penanda waktu ('last_refreshed_at' atau 'snapshot_date').");
                }
                $this->validateDate($timeMarker, 'last_refreshed_at', 'circle_snapshots', $index);

                $snapshotKey = (string) $row['circle_id'].':'.Carbon::parse($timeMarker)->toDateTimeString();
                if (isset($seenSnapshots[$snapshotKey])) {
                    throw new InvalidArgumentException("Duplikasi snapshot untuk '{$snapshotKey}' terdeteksi pada circle_snapshots (index {$index}).");
                }
                $seenSnapshots[$snapshotKey] = true;

                if (isset($row['member_count'])) {
                    $mCount = (int) $row['member_count'];
                    if ($mCount < 0 || $mCount > 30) {
                        throw new InvalidArgumentException("Jumlah anggota circle '{$mCount}' pada circle_snapshots[{$index}] di luar batas valid (0 - 30).");
                    }
                }
                if (array_key_exists('payload', $row)) {
                    $this->validateStructuredJson($row['payload'], 'payload', 'circle_snapshots', $index, false);
                } elseif (isset($row['members_data'])) {
                    $this->validateStructuredJson($row['members_data'], 'members_data', 'circle_snapshots', $index, true);
                }
            }
        }

        // 7. uma_catalog_items
        if (isset($data['uma_catalog_items'])) {
            if (! is_array($data['uma_catalog_items'])) {
                throw new InvalidArgumentException('Format uma_catalog_items tidak valid: harus berupa array.');
            }
            $seenCatalog = [];
            foreach ($data['uma_catalog_items'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record uma_catalog_items pada index {$index} bukan array yang valid.");
                }
                if (empty($row['type']) || ! is_string($row['type'])) {
                    throw new InvalidArgumentException("Record uma_catalog_items pada index {$index} tidak memiliki atribut 'type' yang valid.");
                }
                if (! in_array($row['type'], ['character', 'support_card', 'base_uma'], true)) {
                    throw new InvalidArgumentException("Nilai type '{$row['type']}' pada uma_catalog_items[{$index}] tidak valid.");
                }
                if (empty($row['name']) || ! is_string($row['name'])) {
                    throw new InvalidArgumentException("Record uma_catalog_items pada index {$index} tidak memiliki atribut 'name' yang valid.");
                }

                $catalogKey = $row['type'].':'.$row['name'];
                if (isset($seenCatalog[$catalogKey])) {
                    throw new InvalidArgumentException("Duplikasi entri katalog untuk '{$catalogKey}' terdeteksi pada uma_catalog_items (index {$index}).");
                }
                $seenCatalog[$catalogKey] = true;

                $this->validateStructuredJson($row['raw_data'] ?? null, 'raw_data', 'uma_catalog_items', $index, true);
                $this->validateStructuredJson($row['aptitudes'] ?? null, 'aptitudes', 'uma_catalog_items', $index, true);
                $this->validateStructuredJson($row['skills'] ?? null, 'skills', 'uma_catalog_items', $index, true);
                $this->validateStructuredJson($row['objectives'] ?? null, 'objectives', 'uma_catalog_items', $index, true);
                $this->validateStructuredJson($row['details'] ?? null, 'details', 'uma_catalog_items', $index, true);
            }
        }

        // 8. user_characters
        if (isset($data['user_characters'])) {
            if (! is_array($data['user_characters'])) {
                throw new InvalidArgumentException('Format user_characters tidak valid: harus berupa array.');
            }
            $seenCharacters = [];
            foreach ($data['user_characters'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record user_characters pada index {$index} bukan array yang valid.");
                }
                if (empty($row['name']) || ! is_string($row['name'])) {
                    throw new InvalidArgumentException("Record user_characters pada index {$index} tidak memiliki atribut 'name' yang valid.");
                }
                if (isset($seenCharacters[$row['name']])) {
                    throw new InvalidArgumentException("Duplikasi karakter '{$row['name']}' terdeteksi pada user_characters dalam payload backup (index {$index}).");
                }
                $seenCharacters[$row['name']] = true;

                if (isset($row['base_stars'])) {
                    $bStars = (int) $row['base_stars'];
                    if ($bStars < 1 || $bStars > 5) {
                        throw new InvalidArgumentException("Nilai base_stars '{$bStars}' pada user_characters[{$index}] di luar rentang valid (1 - 5).");
                    }
                }
                if (isset($row['current_stars'])) {
                    $cStars = (int) $row['current_stars'];
                    if ($cStars < 1 || $cStars > 5) {
                        throw new InvalidArgumentException("Nilai current_stars '{$cStars}' pada user_characters[{$index}] di luar rentang valid (1 - 5).");
                    }
                }
                $this->validateDate($row['obtained_at'] ?? null, 'obtained_at', 'user_characters', $index);
            }
        }

        // 9. user_support_cards
        if (isset($data['user_support_cards'])) {
            if (! is_array($data['user_support_cards'])) {
                throw new InvalidArgumentException('Format user_support_cards tidak valid: harus berupa array.');
            }
            $seenCards = [];
            foreach ($data['user_support_cards'] as $index => $row) {
                if (! is_array($row)) {
                    throw new InvalidArgumentException("Record user_support_cards pada index {$index} bukan array yang valid.");
                }
                if (empty($row['name']) || ! is_string($row['name'])) {
                    throw new InvalidArgumentException("Record user_support_cards pada index {$index} tidak memiliki atribut 'name' yang valid.");
                }
                if (isset($seenCards[$row['name']])) {
                    throw new InvalidArgumentException("Duplikasi kartu '{$row['name']}' terdeteksi pada user_support_cards dalam payload backup (index {$index}).");
                }
                $seenCards[$row['name']] = true;

                if (isset($row['rarity']) && ! in_array($row['rarity'], ['SSR', 'SR', 'R'], true)) {
                    throw new InvalidArgumentException("Nilai rarity '{$row['rarity']}' pada user_support_cards[{$index}] tidak valid.");
                }
                if (isset($row['limit_break'])) {
                    $lb = (int) $row['limit_break'];
                    if ($lb < 0 || $lb > 4) {
                        throw new InvalidArgumentException("Nilai limit_break '{$lb}' pada user_support_cards[{$index}] di luar rentang valid (0 - 4).");
                    }
                }
                $this->validateDate($row['obtained_at'] ?? null, 'obtained_at', 'user_support_cards', $index);
            }
        }
    }

    /**
     * Resolve catalog item foreign key relation safely without cross-linking to incorrect entities.
     * Prioritizes gametora_id and exact unique ['type', 'name']. If identity cannot be proven,
     * sets null and records an explicit unresolved reference.
     *
     * @param  array<int, array<string, mixed>>  $unresolvedReferences
     */
    protected function resolveCatalogItem(
        string $type,
        string $entityName,
        ?int $providedCatalogId,
        ?int $gametoraId,
        string $parentEntity,
        array $catalogIds,
        array &$unresolvedReferences,
        bool $allowNameFallback = true,
        bool $mappedHasStableIdentity = true,
        ?UmaCatalogItem $characterNameMatch = null,
        bool $trustCharacterSourceForeignKey = false,
    ): ?int {
        $mapped = $catalogIds[$providedCatalogId] ?? null;
        $isCharacter = $type === 'character';
        $hasExternalId = $gametoraId !== null && $gametoraId > 0;
        $mappedExternalId = null;
        if ($mapped && $mapped->type === $type) {
            $mappedExternalId = $isCharacter ? $mapped->characterExternalId() : $mapped->gametora_id;
            $matches = $isCharacter
                ? ($hasExternalId ? $mappedExternalId === $gametoraId
                    : ($trustCharacterSourceForeignKey || ($mappedHasStableIdentity && $mappedExternalId !== null) || ($allowNameFallback && $mapped->name === $entityName)))
                : ($mapped->name === $entityName || ($gametoraId !== null && $mappedExternalId === $gametoraId));
            if ($matches) {
                return (int) $mapped->id;
            }
        }

        if ($hasExternalId && (! $isCharacter || $mappedExternalId === null)) {
            $byGametora = $isCharacter
                ? UmaCatalogItem::charactersWithExternalId($gametoraId)->first()
                : UmaCatalogItem::where('type', $type)->where('gametora_id', $gametoraId)->first();
            if ($byGametora) {
                return (int) $byGametora->id;
            }
        }

        if ($allowNameFallback && (! $isCharacter || ! $hasExternalId)) {
            $byName = $isCharacter ? $characterNameMatch : UmaCatalogItem::where('type', $type)->where('name', $entityName)->first();
            if ($byName) {
                return (int) $byName->id;
            }
        }

        // Identity cannot be established with certainty.
        $unresolvedReferences[] = [
            'entity' => $parentEntity,
            'record_name' => $entityName,
            'field' => 'uma_catalog_item_id',
            'provided_id' => $providedCatalogId,
            'gametora_id' => $gametoraId,
            'reason' => "Tidak dapat memverifikasi identitas katalog untuk '{$entityName}' (tipe: {$type}). Relasi diset null untuk mencegah cross-linking.",
        ];

        return null;
    }

    /** @param array<string, mixed> $row */
    private function backupCharacterExternalId(array $row): ?int
    {
        $externalId = (int) ($row['gametora_id'] ?? 0);

        return $externalId > 0 ? $externalId : UmaCatalogItem::gameToraCharacterId($this->backupRawData($row) ?? []);
    }

    /** @param array<string, mixed> $row */
    private function backupRawData(array $row): ?array
    {
        $raw = $row['raw_data'] ?? null;

        return is_string($raw) ? json_decode($raw, true) : $raw;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  Collection<int, UmaCatalogItem>  $catalog
     * @param  array<string, array<string, true>>  $nameClaims
     * @param  list<array<string, mixed>>  $conflicts
     * @return array{list<array{row: array<string, mixed>, fullName: string, externalId: ?int, sourceRows: list<array<string, mixed>>, claimNames: list<string>}>, array<int, UmaCatalogItem>, int}
     */
    private function backupCharacterEntries(array $rows, Collection $catalog, array $nameClaims, array &$conflicts): array
    {
        $groups = collect($rows)->where('type', 'character')->groupBy(function (array $row): string {
            $externalId = $this->backupCharacterExternalId($row);

            return $externalId === null ? 'name-'.$row['name'] : 'gametora-'.$externalId;
        });
        $entries = [];
        $historicalIds = [];
        $historicalCount = 0;
        $byName = $catalog->keyBy('name');
        $byIdentity = $catalog->groupBy(fn (UmaCatalogItem $item) => $item->characterIdentityKey());
        foreach ($groups->sortKeys() as $aliases) {
            $sourceRows = $aliases->sortBy('name', SORT_STRING)->values()->all();
            $row = array_find($sourceRows, fn (array $source) => ! UmaCatalogItem::isRelocatedAliasData($this->backupRawData($source))) ?? $sourceRows[0];
            $fullName = $row['name'];
            $externalId = $this->backupCharacterExternalId($row);
            $claims = $nameClaims[$fullName] ?? [];
            if ($externalId === null && count($claims) > 1) {
                $conflicts[] = [
                    'entity' => 'uma_catalog_items',
                    'record_name' => $fullName,
                    'reason' => 'Entri katalog lama dilewati karena namanya pernah dipakai kartu lain.',
                ];

                continue;
            }
            if ($externalId === null && ! $byName->has($fullName) && count($claims) === 1) {
                $existing = $byIdentity->get(array_key_first($claims))->first();
                if (isset($row['id'])) {
                    $historicalIds[(int) $row['id']] = $existing;
                }
                $historicalCount++;

                continue;
            }
            $claimNames = [];
            foreach ($sourceRows as $sourceRow) {
                $sourceRaw = $this->backupRawData($sourceRow);
                if (! UmaCatalogItem::isRelocatedAliasData($sourceRaw)) {
                    $claimNames[] = $sourceRow['name'];
                }
                array_push($claimNames, ...UmaCatalogItem::characterNameHistory($sourceRaw));
            }
            $claimNames = array_values(array_unique($claimNames));
            $entries[] = compact('row', 'fullName', 'externalId', 'sourceRows', 'claimNames');
        }

        return [$entries, $historicalIds, $historicalCount];
    }

    /**
     * @param  list<array<string, mixed>>  $sources
     * @param  list<UmaCatalogItem>  $storedAliases
     */
    private function preserveBackupCharacterEvolutions(UmaCatalogItem $item, array $sources, array $storedAliases): void
    {
        foreach (['raw_data' => ['skills_evo', 'new'], 'skills' => ['evolve', 'id']] as $column => [$field, $id]) {
            $data = $item->{$column} ?? [];
            $stored = [];
            foreach (array_reverse($storedAliases) as $alias) {
                $stored = $this->overlayBackupEvolutionRelations($stored, $alias->getOriginal($column)[$field] ?? [], $id);
            }
            $stored = $this->overlayBackupEvolutionRelations($stored, $item->getOriginal($column)[$field] ?? [], $id);
            $relations = $stored;
            foreach (array_reverse($sources) as $sourceRow) {
                $source = $sourceRow[$column] ?? null;
                $source = is_string($source) ? json_decode($source, true) : $source;
                $relations = $this->overlayBackupEvolutionRelations($relations, $source[$field] ?? [], $id);
            }
            $relations = $this->overlayBackupEvolutionRelations($relations, $data[$field] ?? [], $id);
            if ($relations !== []) {
                $data[$field] = array_values($relations);
                $item->{$column} = $data;
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $stored
     * @return array<int, array<string, mixed>>
     */
    private function overlayBackupEvolutionRelations(array $stored, mixed $incoming, string $identity): array
    {
        if (! is_array($incoming)) {
            return $stored;
        }
        foreach ($incoming as $relation) {
            $id = filter_var($relation[$identity] ?? null, FILTER_VALIDATE_INT);
            if ($id > 0) {
                $stored[$id] = $this->mergeBackupEvolutionFields($stored[$id] ?? [], $relation);
            }
        }

        return $stored;
    }

    /**
     * @param  array<string, mixed>  $stored
     * @param  array<string, mixed>  $incoming
     * @return array<string, mixed>
     */
    private function mergeBackupEvolutionFields(array $stored, array $incoming): array
    {
        foreach ($incoming as $field => $value) {
            $previous = $stored[$field] ?? null;
            // Objects support sparse updates. Lists are ordered values, including an explicit empty list.
            $stored[$field] = is_array($previous) && ! array_is_list($previous)
                && is_array($value) && ! array_is_list($value)
                ? $this->mergeBackupEvolutionFields($previous, $value)
                : $value;
        }

        return $stored;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{catalog: list<string>, banners: list<string>}
     */
    private function gameToraManifestSnapshot(array $data): array
    {
        return [
            'catalog' => empty($data['uma_catalog_items']) ? [] : $this->gameToraCatalogSnapshot(),
            'banners' => empty($data['gacha_banners']) ? [] : $this->gameToraBannerSnapshot(),
        ];
    }

    /** @return list<string> */
    private function gameToraCatalogSnapshot(): array
    {
        $state = [];
        $catalog = UmaCatalogItem::withoutGlobalScopes()->whereIn('type', ['character', 'base_uma', 'support_card']);
        foreach ($catalog->cursor() as $item) {
            $raw = $item->upstreamRawData();
            $projection = [
                'type' => $item->type,
                'name' => $item->name,
                'external_id' => $item->gametora_id,
                'rarity' => $item->rarity,
                'raw_data' => $raw,
            ];
            if ($item->type === 'character') {
                $projection = $this->gameToraCharacterProjection($item, $raw, $projection);
            } elseif ($item->type === 'support_card') {
                $projection['details'] = $item->details;
            }
            $state[] = hash('sha256', serialize(GameToraSyncService::canonicalizeCatalogJson($projection)));
        }
        sort($state, SORT_STRING);

        return $state;
    }

    /** @return list<string> */
    private function gameToraBannerSnapshot(): array
    {
        $state = [];
        foreach (GachaBanner::where('gametora_id', '>', 0)->cursor() as $banner) {
            $projection = [
                'gametora_id' => $banner->gametora_id,
                'banner_type' => $banner->banner_type,
                'category' => $banner->getRawOriginal('category'),
                'name' => $banner->name,
                'base_rate' => $banner->base_rate,
                'start_date' => $banner->start_date?->toDateString(),
                'end_date' => $banner->end_date?->toDateString(),
                'featured_items' => $banner->featured_items ?? [],
                'is_active' => $banner->is_active,
            ];
            $state[] = hash('sha256', serialize(GameToraSyncService::canonicalizeCatalogJson($projection)));
        }
        sort($state, SORT_STRING);

        return $state;
    }

    /**
     * @param  array<string, mixed>|null  $raw
     * @param  array<string, mixed>  $projection
     * @return array<string, mixed>
     */
    private function gameToraCharacterProjection(UmaCatalogItem $item, ?array $raw, array $projection): array
    {
        $externalId = $item->characterExternalId();
        foreach (['id', 'card_id'] as $key) {
            if ($externalId !== null && UmaCatalogItem::gameToraCharacterId([$key => $raw[$key] ?? null]) === $externalId) {
                unset($raw[$key]);
            }
        }

        $skills = $item->skills;
        if (is_array($skills['evolve'] ?? null)) {
            foreach ($skills['evolve'] as $index => $skill) {
                if (is_array($skill)) {
                    // Supplemental backup metadata is outside the skill fields published by sync.
                    unset($skills['evolve'][$index]['metadata']);
                }
            }
        }

        if ($item->isRelocatedAlias()) {
            // Sync refreshes evolution on these aliases without publishing their storage names.
            return [
                'type' => $item->type,
                'external_id' => $externalId,
                'raw_evolution' => $raw['skills_evo'] ?? null,
                'evolution' => $skills['evolve'] ?? null,
            ];
        }

        return array_replace($projection, [
            'external_id' => $externalId,
            'raw_data' => $raw ?: null,
            'aptitudes' => $item->aptitudes,
            'skills' => $skills,
            'objectives' => $item->objectives,
        ]);
    }

    /**
     * @param  list<array{row: array<string, mixed>, catalog: ?UmaCatalogItem}>  $records
     * @param  list<array<string, mixed>>  $conflicts
     * @return list<array{row: array<string, mixed>, catalog: ?UmaCatalogItem}>
     */
    private function reconcileBackupCharacterOwnership(array $records, array &$conflicts): array
    {
        $groups = collect($records)->groupBy(fn (array $record) => $record['catalog']?->characterIdentityKey() ?? 'legacy-'.$record['row']['name'])->sortKeys();
        $selected = [];
        foreach ($groups as $group) {
            $ranked = $group->sortBy(fn (array $record) => [
                ! (bool) ($record['row']['is_owned'] ?? true),
                -max((int) ($record['row']['current_stars'] ?? 0), (int) ($record['row']['base_stars'] ?? 3)),
                $record['row']['name'],
            ]);
            $winner = $ranked->first();
            if ($group->count() > 1) {
                $starMaximum = $group->max(fn (array $record) => max((int) ($record['row']['current_stars'] ?? 0), (int) ($record['row']['base_stars'] ?? 0)));
                if ($starMaximum > 0) {
                    $winner['row']['current_stars'] = $starMaximum;
                }
                $ownedStates = array_column($group->pluck('row')->all(), 'is_owned');
                if ($ownedStates !== []) {
                    $winner['row']['is_owned'] = array_any($ownedStates, fn (mixed $owned) => (bool) $owned);
                }
                $conflicts[] = [
                    'entity' => 'user_characters',
                    'gametora_id' => $winner['catalog']?->characterExternalId(),
                    'selected_name' => $winner['row']['name'],
                    'record_names' => $ranked->pluck('row.name')->values()->all(),
                    'reason' => 'Beberapa catatan backup merujuk kartu yang sama. Status dimiliki dan bintang tertinggi digabungkan dari seluruh catatan.',
                ];
            }
            $selected[] = $winner;
        }

        return $selected;
    }

    /** @param array<string, mixed> $row */
    private function backupBannerStartDate(array $row): ?string
    {
        return $row['start_date'] ?? (isset($row['created_at']) ? Carbon::parse($row['created_at'])->toDateString() : null);
    }

    /**
     * @param  array<array-key, array<string, mixed>>  $legacy
     * @param  array<array-key, array<string, mixed>>  $identified
     * @param  list<array<string, mixed>>  $conflicts
     * @return array<array-key, ?GachaBanner>
     */
    private function planLegacyBannerMatches(array $legacy, array $identified, bool $isV2, array &$conflicts): array
    {
        $sourceGameToraIds = [];
        foreach ($identified as $row) {
            $sourceGameToraIds[$row['banner_type'] ?? 'character'][(int) $row['gametora_id']] = true;
        }

        $matches = [];
        $claims = [];
        foreach ($legacy as $index => $row) {
            $bannerType = $row['banner_type'] ?? 'character';
            $query = GachaBanner::where('banner_type', $bannerType)->where('name', $row['name']);
            if ($isV2 || array_key_exists('gametora_id', $row)) {
                $query->where(fn ($candidate) => $candidate->whereNull('gametora_id')->orWhere('gametora_id', '<=', 0));
            }
            $startDate = $this->backupBannerStartDate($row);
            if ($startDate !== null) {
                $query->whereDate('start_date', Carbon::parse($startDate)->toDateString());
            }
            $candidates = $query->limit(2)->get();
            if ($candidates->count() > 1) {
                $conflicts[] = [
                    'entity' => 'gacha_banners',
                    'record_name' => $row['name'],
                    'provided_id' => isset($row['id']) ? (int) $row['id'] : null,
                    'reason' => 'Nama banner tanpa ID GameTora cocok dengan lebih dari satu banner.',
                ];

                continue;
            }

            $match = $candidates->first();
            if ($match?->gametora_id > 0 && isset($sourceGameToraIds[$bannerType][$match->gametora_id])) {
                $match = null;
            }
            $matches[$index] = $match;
            if ($match !== null) {
                $claims[$match->id][] = $index;
            }
        }

        foreach ($claims as $indices) {
            if (count($indices) > 1) {
                foreach ($indices as $index) {
                    $matches[$index] = null;
                }
            }
        }

        return $matches;
    }

    /**
     * @param  array<int, int>  $bannerIds
     * @param  array<int, array<string, mixed>>  $unresolvedReferences
     */
    private function resolveBannerId(?int $sourceId, array $bannerIds, string $entity, string $recordName, array &$unresolvedReferences): ?int
    {
        if ($sourceId === null) {
            return null;
        }

        if (isset($bannerIds[$sourceId])) {
            return $bannerIds[$sourceId];
        }

        $unresolvedReferences[] = [
            'entity' => $entity,
            'record_name' => $recordName,
            'field' => 'gacha_banner_id',
            'provided_id' => $sourceId,
            'reason' => "Gacha Banner ID {$sourceId} tidak dapat dipetakan dari backup.",
        ];

        return null;
    }

    /**
     * Import and restore data from a backup array.
     * Fully atomic: rolled back on any exception during import.
     *
     * @param  array<string, mixed>  $backupData
     * @param  string  $mode  'merge' or 'overwrite'
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public function import(array $backupData, string $mode = 'merge'): array
    {
        $mode = strtolower($mode);
        if (! in_array($mode, ['merge', 'overwrite'], true)) {
            throw new InvalidArgumentException("Mode restore '{$mode}' tidak valid. Gunakan 'merge' atau 'overwrite'.");
        }

        // Explicit validation schema upfront to prevent silent skipping or partial corruptions
        $this->validate($backupData, $mode);

        $data = $backupData['data'];
        $isV2 = $backupData['version'] === '2.0';
        $results = [
            'mode' => $mode,
            'restored' => [],
            'unresolved_references' => [],
            'conflicts' => [],
        ];

        DB::transaction(function () use ($data, $mode, $isV2, &$results) {
            $manifestSnapshot = $mode === 'merge'
                && (! empty($data['uma_catalog_items']) || ! empty($data['gacha_banners']))
                && AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY) !== null
                    ? $this->gameToraManifestSnapshot($data)
                    : null;

            // If overwrite mode, truncate/clear tables in strict reverse dependency order
            if ($mode === 'overwrite') {
                UserCharacter::query()->delete();
                UserSupportCard::query()->delete();
                GachaPull::query()->delete();
                GachaPity::query()->delete();
                GachaBanner::query()->delete();
                UmaCatalogItem::withRelocatedAliases()->delete();
                CareerRun::query()->delete();
                CircleSnapshot::query()->delete();
                AppSetting::query()->delete();
            }

            // 1. App Settings
            if (isset($data['app_settings']) && is_array($data['app_settings'])) {
                $count = 0;
                foreach ($data['app_settings'] as $row) {
                    $key = (string) $row['key'];
                    if ($key === GameToraSyncService::MANIFEST_CHECKPOINT_KEY) {
                        continue;
                    }
                    $value = $row['value'] ?? null;

                    AppSetting::updateOrCreate(
                        ['key' => $key],
                        ['value' => $value]
                    );
                    $count++;
                }
                $results['restored']['app_settings'] = $count;
            }

            $bannerIds = [];
            $catalogIds = [];

            // 2. Gacha Banners (must be imported before Gacha Pulls & Pities due to foreign keys)
            if (isset($data['gacha_banners']) && is_array($data['gacha_banners'])) {
                $count = 0;
                [$identified, $legacy] = collect($data['gacha_banners'])->partition(fn (array $row) => (int) ($row['gametora_id'] ?? 0) > 0);
                $legacyMatches = $mode === 'merge' && $legacy->isNotEmpty()
                    ? $this->planLegacyBannerMatches($legacy->all(), $identified->all(), $isV2, $results['conflicts'])
                    : [];
                foreach ($identified->union($legacy) as $index => $row) {
                    $sourceId = isset($row['id']) ? (int) $row['id'] : null;
                    $externalId = isset($row['gametora_id']) ? (int) $row['gametora_id'] : null;
                    $bannerType = $row['banner_type'] ?? 'character';
                    $startDate = $this->backupBannerStartDate($row);
                    $banner = null;

                    if ($externalId > 0) {
                        $banner = GachaBanner::where('banner_type', $bannerType)->where('gametora_id', $externalId)->first();
                    } elseif ($mode === 'merge') {
                        if (! array_key_exists($index, $legacyMatches)) {
                            continue;
                        }
                        $banner = $legacyMatches[$index];
                    }

                    if (! $banner) {
                        $banner = new GachaBanner;
                        if ($mode === 'overwrite' && $sourceId && ! GachaBanner::whereKey($sourceId)->exists()) {
                            $banner->id = $sourceId;
                        }
                    }

                    $featuredItems = is_string($row['featured_items'] ?? null)
                        ? json_decode($row['featured_items'], true)
                        : ($row['featured_items'] ?? []);

                    $banner->fill([
                        'name' => $row['name'],
                        'gametora_id' => $externalId > 0 ? $externalId : ($banner->gametora_id ?? $externalId),
                        'banner_type' => $bannerType,
                        'category' => $row['category'] ?? 'standard',
                        'base_rate' => (float) $row['base_rate'],
                        'start_date' => $startDate ?? $banner->start_date ?? now()->toDateString(),
                        'end_date' => $row['end_date'] ?? null,
                        'featured_items' => $featuredItems,
                        'is_active' => (bool) ($row['is_active'] ?? true),
                    ]);

                    if (isset($row['created_at'])) {
                        $banner->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $banner->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $banner->save();
                    if ($sourceId !== null) {
                        $bannerIds[$sourceId] = $banner->id;
                    }
                    $count++;
                }
                $results['restored']['gacha_banners'] = $count;
            }

            // 3. Gacha Pities
            if (isset($data['gacha_pities']) && is_array($data['gacha_pities'])) {
                $count = 0;
                foreach ($data['gacha_pities'] as $row) {
                    $bannerType = (string) $row['banner_type'];
                    $sourceBannerId = isset($row['gacha_banner_id']) ? (int) $row['gacha_banner_id'] : null;
                    $bannerId = $this->resolveBannerId($sourceBannerId, $bannerIds, 'gacha_pities', $bannerType, $results['unresolved_references']);
                    if ($sourceBannerId !== null && $bannerId === null) {
                        continue;
                    }

                    $pity = GachaPity::where('banner_type', $bannerType)
                        ->where('gacha_banner_id', $bannerId)
                        ->first();

                    if (! $pity) {
                        $pity = new GachaPity;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $pity->id = (int) $row['id'];
                        }
                    }

                    $pity->fill([
                        'banner_type' => $bannerType,
                        'gacha_banner_id' => $bannerId,
                        'current_pity' => (int) ($row['current_pity'] ?? 0),
                        'total_sparks' => (int) ($row['total_sparks'] ?? 0),
                        'last_reset_at' => isset($row['last_reset_at']) ? Carbon::parse($row['last_reset_at']) : null,
                    ]);

                    if (isset($row['created_at'])) {
                        $pity->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $pity->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $pity->save();
                    $count++;
                }
                $results['restored']['gacha_pities'] = $count;
            }

            // 4. Gacha Pulls
            if (isset($data['gacha_pulls']) && is_array($data['gacha_pulls'])) {
                $count = 0;
                foreach ($data['gacha_pulls'] as $row) {
                    $sourceBannerId = isset($row['gacha_banner_id']) ? (int) $row['gacha_banner_id'] : null;
                    $bannerId = $this->resolveBannerId($sourceBannerId, $bannerIds, 'gacha_pulls', $row['item_name'], $results['unresolved_references']);
                    if ($sourceBannerId !== null && $bannerId === null) {
                        continue;
                    }

                    $pull = null;
                    if ($mode === 'overwrite' && isset($row['id'])) {
                        $pull = GachaPull::find($row['id']);
                    }
                    $pulledAt = $row['pulled_at'] ?? $row['created_at'] ?? null;
                    if ($mode === 'merge') {
                        $query = GachaPull::where('item_name', $row['item_name'])
                            ->where('banner_type', $row['banner_type'])
                            ->where('gacha_banner_id', $bannerId)
                            ->where('rarity', $row['rarity'])
                            ->where('pull_type', $row['pull_type'] ?? 'single')
                            ->where('is_rate_up', (bool) ($row['is_rate_up'] ?? false))
                            ->where('pity_count_at_pull', (int) ($row['pity_count_at_pull'] ?? 0));
                        if ($pulledAt !== null) {
                            $query->where('pulled_at', Carbon::parse($pulledAt)->toDateTimeString());
                        }
                        $pull = $query->first();
                    }

                    if (! $pull) {
                        $pull = new GachaPull;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $pull->id = (int) $row['id'];
                        }
                    }

                    $pull->fill([
                        'banner_type' => $row['banner_type'],
                        'gacha_banner_id' => $bannerId,
                        'pull_type' => $row['pull_type'] ?? 'single',
                        'item_name' => $row['item_name'],
                        'rarity' => $row['rarity'],
                        'is_rate_up' => (bool) ($row['is_rate_up'] ?? false),
                        'pity_count_at_pull' => (int) ($row['pity_count_at_pull'] ?? 0),
                        'pulled_at' => $pulledAt !== null ? Carbon::parse($pulledAt) : ($pull->pulled_at ?? now()),
                    ]);

                    if (isset($row['created_at'])) {
                        $pull->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $pull->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $pull->save();
                    $count++;
                }
                $results['restored']['gacha_pulls'] = $count;
            }

            // 5. Career Runs (Fans Gain)
            if (isset($data['career_runs']) && is_array($data['career_runs'])) {
                $count = 0;
                foreach ($data['career_runs'] as $row) {
                    $umaName = (string) ($row['uma_name'] ?? $row['character_name'] ?? '');
                    $runDate = isset($row['run_date']) || isset($row['created_at'])
                        ? Carbon::parse($row['run_date'] ?? $row['created_at'])->toDateString()
                        : null;
                    $scenario = (string) $row['scenario'];
                    $trainingType = (string) ($row['training_type'] ?? 'manual');
                    $startingFans = (int) ($row['starting_fans'] ?? 0);
                    $fansGained = (int) ($row['fans_gained'] ?? 0);
                    $endingFans = (int) ($row['ending_fans'] ?? ($startingFans + $fansGained));
                    $finalRank = (string) ($row['final_rank'] ?? $row['rank'] ?? 'A');
                    $evalScore = isset($row['evaluation_score']) || isset($row['score'])
                        ? (int) ($row['evaluation_score'] ?? $row['score'])
                        : null;

                    $run = null;
                    if ($mode === 'overwrite' && isset($row['id'])) {
                        $run = CareerRun::find($row['id']);
                    }
                    if (! $run && $mode === 'merge') {
                        $query = CareerRun::where('uma_name', $umaName)
                            ->where('scenario', $scenario)
                            ->where('training_type', $trainingType)
                            ->where('fans_gained', $fansGained)
                            ->where('final_rank', $finalRank)
                            ->where('evaluation_score', $evalScore);

                        if ($runDate !== null) {
                            $query->whereDate('run_date', $runDate);
                        }
                        if (isset($row['starting_fans'])) {
                            $query->where('starting_fans', $startingFans);
                        }
                        if (isset($row['ending_fans'])) {
                            $query->where('ending_fans', $endingFans);
                        }

                        $run = $query->first();
                    }

                    if (! $run) {
                        $run = new CareerRun;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $run->id = (int) $row['id'];
                        }
                    }

                    $run->fill([
                        'uma_name' => $umaName,
                        'run_date' => $runDate ?? $run->run_date ?? now()->toDateString(),
                        'scenario' => $scenario,
                        'training_type' => $trainingType,
                        'starting_fans' => $startingFans,
                        'ending_fans' => $endingFans,
                        'final_rank' => $finalRank,
                        'evaluation_score' => $evalScore,
                        'fans_gained' => $fansGained,
                        'notes' => $row['notes'] ?? null,
                    ]);

                    if (isset($row['created_at'])) {
                        $run->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $run->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $run->save();
                    $count++;
                }
                $results['restored']['career_runs'] = $count;
            }

            // 6. Circle Snapshots (active schema with legacy support)
            if (isset($data['circle_snapshots']) && is_array($data['circle_snapshots'])) {
                $count = 0;
                foreach ($data['circle_snapshots'] as $row) {
                    $circleId = (string) $row['circle_id'];
                    $circleName = (string) ($row['circle_name'] ?? '');
                    $rank = isset($row['rank']) ? (int) $row['rank'] : null;
                    $point = isset($row['point'])
                        ? (int) $row['point']
                        : (isset($row['total_fans']) ? (int) $row['total_fans'] : null);
                    $memberCount = isset($row['member_count']) ? (int) $row['member_count'] : null;
                    $activeTotal = isset($row['active_total']) ? (int) $row['active_total'] : null;
                    $period = isset($row['period']) ? (string) $row['period'] : null;

                    $refreshedAtRaw = $row['last_refreshed_at'] ?? $row['snapshot_date'] ?? $row['created_at'] ?? now();
                    $lastRefreshedAt = Carbon::parse($refreshedAtRaw);

                    $payload = is_string($row['payload'] ?? null)
                        ? json_decode($row['payload'], true)
                        : ($row['payload'] ?? null);

                    if (! is_array($payload)) {
                        $payload = [
                            'contributions' => [
                                'circle' => [
                                    'id' => $circleId,
                                    'name' => $circleName,
                                    'memberCount' => $memberCount,
                                ],
                                'rows' => is_string($row['members_data'] ?? null)
                                    ? json_decode($row['members_data'], true)
                                    : ($row['members_data'] ?? []),
                            ],
                            'total_fans' => $point,
                            'tracked_player_name' => $row['tracked_player_name'] ?? null,
                            'tracked_player_fans' => $row['tracked_player_fans'] ?? null,
                        ];
                    }

                    $snapshot = null;
                    if ($mode === 'overwrite' && isset($row['id'])) {
                        $snapshot = CircleSnapshot::find($row['id']);
                    }
                    if (! $snapshot) {
                        $snapshot = CircleSnapshot::where('circle_id', $circleId)
                            ->where('last_refreshed_at', $lastRefreshedAt->toDateTimeString())
                            ->first();
                    }

                    if (! $snapshot) {
                        $snapshot = new CircleSnapshot;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $snapshot->id = (int) $row['id'];
                        }
                    }

                    $snapshot->fill([
                        'circle_id' => $circleId,
                        'circle_name' => $circleName,
                        'rank' => $rank,
                        'point' => $point,
                        'member_count' => $memberCount,
                        'active_total' => $activeTotal,
                        'period' => $period,
                        'payload' => $payload,
                        'last_refreshed_at' => $lastRefreshedAt,
                    ]);

                    if (isset($row['created_at'])) {
                        $snapshot->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $snapshot->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $snapshot->save();
                    $count++;
                }
                $results['restored']['circle_snapshots'] = $count;
            }

            // 7. Uma Catalog Items (Characters & Support Cards - full json fields: raw_data, aptitudes, skills, details)
            $sourcesWithStableId = [];
            if (isset($data['uma_catalog_items']) && is_array($data['uma_catalog_items'])) {
                $count = 0;
                $rows = $data['uma_catalog_items'];
                $renames = [];
                if ($mode === 'merge') {
                    $catalog = UmaCatalogItem::characterCatalog()->orderBy('id')->get();
                    $nameClaims = UmaCatalogItem::characterNameClaims($catalog);
                    [$entries, $historicalIds, $count] = $this->backupCharacterEntries($rows, $catalog, $nameClaims, $results['conflicts']);
                    $catalogIds += $historicalIds;
                    $plan = CharacterCatalogPlan::resolve($entries, $catalog, $nameClaims);
                    $renames = CharacterCatalogPlan::stageRenames($plan, $catalog, $nameClaims);
                    $writes = [...$plan, ...collect($rows)->where('type', '!=', 'character')->map(fn (array $row) => ['row' => $row])->values()->all()];
                } else {
                    $writes = array_map(fn (array $row) => ['row' => $row], $rows);
                }

                foreach ($writes as $write) {
                    $row = $write['row'];
                    $rawData = $this->backupRawData($row);
                    $externalId = isset($row['gametora_id']) ? (int) $row['gametora_id'] : null;
                    $catalogItem = $write['item'] ?? null;
                    $sourceRows = $write['sourceRows'] ?? [$row];
                    if ($catalogItem) {
                        $externalId = $write['externalId'] ?? $catalogItem->characterExternalId();
                    } elseif ($mode === 'overwrite' && isset($row['id'])) {
                        $catalogItem = UmaCatalogItem::withRelocatedAliases()->find($row['id']);
                    }
                    if (! $catalogItem) {
                        $catalogItem = UmaCatalogItem::where('type', $row['type'])
                            ->where('name', $row['name'])
                            ->first();
                    }
                    if (! $catalogItem && $mode === 'merge' && ! empty($row['gametora_id'])) {
                        $catalogItem = UmaCatalogItem::where('type', $row['type'])
                            ->where('gametora_id', $row['gametora_id'])
                            ->first();
                    }
                    if (! $catalogItem) {
                        $catalogItem = new UmaCatalogItem;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $catalogItem->id = (int) $row['id'];
                        }
                    }

                    $attributes = [
                        'type' => $row['type'],
                        'name' => $row['name'],
                        'rarity' => $row['rarity'] ?? null,
                        'gametora_id' => $externalId,
                        'raw_data' => $rawData,
                        'aptitudes' => is_string($row['aptitudes'] ?? null)
                            ? json_decode($row['aptitudes'], true)
                            : ($row['aptitudes'] ?? null),
                        'skills' => is_string($row['skills'] ?? null)
                            ? json_decode($row['skills'], true)
                            : ($row['skills'] ?? null),
                        'objectives' => is_string($row['objectives'] ?? null)
                            ? json_decode($row['objectives'], true)
                            : ($row['objectives'] ?? null),
                        'details' => is_string($row['details'] ?? null)
                            ? json_decode($row['details'], true)
                            : ($row['details'] ?? null),
                    ];
                    if ($mode === 'merge') {
                        $attributes = array_intersect_key($attributes, $row);
                        if ($externalId !== null) {
                            $attributes['gametora_id'] = $externalId;
                        }
                        if (! array_key_exists('raw_data', $attributes) && $catalogItem->isRelocatedAlias()) {
                            $attributes['raw_data'] = $catalogItem->upstreamRawData();
                        }
                        $skills = $attributes['skills'] ?? null;
                        if ($row['type'] === 'character' && is_array($skills) && ! array_is_list($skills)) {
                            $attributes['skills'] = array_replace($catalogItem->skills ?? [], $skills);
                        }
                    }
                    $catalogItem->fill($attributes);

                    if (isset($row['created_at'])) {
                        $catalogItem->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $catalogItem->updated_at = Carbon::parse($row['updated_at']);
                    }

                    if (isset($write['item'])) {
                        $this->preserveBackupCharacterEvolutions($catalogItem, $sourceRows, $write['aliases']);
                        $catalogItem->rememberCharacterNames($write['claimNames']);
                    }
                    $catalogItem->save();
                    foreach ($sourceRows as $sourceRow) {
                        if (isset($sourceRow['id'])) {
                            $catalogIds[(int) $sourceRow['id']] = $catalogItem;
                            if ($row['type'] === 'character' && $this->backupCharacterExternalId($sourceRow) !== null) {
                                $sourcesWithStableId[(int) $sourceRow['id']] = true;
                            }
                        }
                    }
                    $count += count($sourceRows);
                }
                CharacterCatalogPlan::finishRenames($renames);
                $results['restored']['uma_catalog_items'] = $count;
            }

            // 8. User Characters (with strict entity identity and foreign key validation)
            if (isset($data['user_characters']) && is_array($data['user_characters'])) {
                $count = 0;
                $catalog = UmaCatalogItem::characterCatalog()->get(['id', 'name', 'gametora_id', 'raw_data'])->keyBy('id');
                $catalogByName = $catalog->keyBy('name');
                $catalogByIdentity = $catalog->groupBy(fn (UmaCatalogItem $item) => $item->characterIdentityKey());
                $nameClaims = UmaCatalogItem::characterNameClaims($catalog);
                $records = [];
                foreach ($data['user_characters'] as $row) {
                    $name = (string) $row['name'];
                    $providedCatalogId = isset($row['uma_catalog_item_id']) ? (int) $row['uma_catalog_item_id'] : null;
                    $gametoraId = isset($row['gametora_id']) ? (int) $row['gametora_id'] : null;
                    $claims = $nameClaims[$name] ?? [];
                    $ambiguousName = count($claims) > 1;
                    $nameMatch = $ambiguousName ? null
                        : ($catalogByName->get($name) ?? $catalogByIdentity->get(array_key_first($claims))?->first());

                    $catalogItemId = $this->resolveCatalogItem(
                        'character',
                        $name,
                        $providedCatalogId,
                        $gametoraId,
                        'user_characters',
                        $catalogIds,
                        $results['unresolved_references'],
                        allowNameFallback: ! $ambiguousName,
                        mappedHasStableIdentity: isset($sourcesWithStableId[$providedCatalogId]),
                        characterNameMatch: $nameMatch,
                        trustCharacterSourceForeignKey: $isV2,
                    );
                    if ($catalogItemId === null && ($gametoraId > 0 || $ambiguousName)) {
                        $last = array_key_last($results['unresolved_references']);
                        $results['unresolved_references'][$last]['reason'] = "Kepemilikan '{$name}' dilewati karena identitas GameTora tidak terverifikasi atau nama telah dipakai kartu lain.";

                        continue;
                    }

                    $records[] = ['row' => $row, 'catalog' => $catalog->get($catalogItemId)];
                }

                if ($mode === 'merge') {
                    $records = $this->reconcileBackupCharacterOwnership($records, $results['conflicts']);
                }
                [$ownershipByIdentity, $legacyByName, , $localStarsByIdentity] = UserCharacter::characterOwnershipIndexes($catalog);
                foreach ($records as ['row' => $row, 'catalog' => $catalogItem]) {
                    $name = (string) $row['name'];
                    $catalogItemId = $catalogItem?->id;
                    $userChar = null;
                    if ($mode === 'overwrite' && isset($row['id'])) {
                        $userChar = UserCharacter::find($row['id']);
                    }
                    if ($mode === 'merge') {
                        $userChar = $catalogItem ? $ownershipByIdentity->get($catalogItem->characterIdentityKey()) : $legacyByName->get($name);
                        $name = $catalogItem?->name ?? $name;
                        if ($catalogItem === null && $userChar === null && UserCharacter::where('name', $name)->exists()) {
                            throw new InvalidArgumentException("Konflik identitas kepemilikan karakter '{$name}' pada backup.");
                        }
                    } elseif (! $userChar) {
                        $userChar = UserCharacter::where('name', $name)->first();
                    }
                    if (! $userChar) {
                        $userChar = new UserCharacter;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $userChar->id = (int) $row['id'];
                        }
                    }

                    $baseStars = (int) ($row['base_stars'] ?? $userChar->base_stars ?? 3);
                    $currentStars = (int) ($row['current_stars'] ?? $userChar->current_stars ?? $baseStars);
                    $isOwned = (bool) ($row['is_owned'] ?? $userChar->is_owned ?? true);
                    if ($mode === 'merge' && $userChar->exists) {
                        $localMaximum = $catalogItem === null ? 0 : $localStarsByIdentity->get($catalogItem->characterIdentityKey(), 0);
                        $currentStars = max($currentStars, $userChar->current_stars, $userChar->base_stars, $baseStars, $localMaximum);
                        $isOwned = $isOwned || $userChar->is_owned;
                    }
                    $userChar->fill([
                        'uma_catalog_item_id' => $mode === 'merge' ? ($userChar->uma_catalog_item_id ?? $catalogItemId) : $catalogItemId,
                        'name' => $mode === 'merge' ? ($userChar->name ?? $name) : $name,
                        'base_stars' => $baseStars,
                        'current_stars' => $currentStars,
                        'is_owned' => $isOwned,
                        'obtained_at' => array_key_exists('obtained_at', $row) ? $row['obtained_at'] : $userChar->obtained_at,
                        'notes' => array_key_exists('notes', $row) ? $row['notes'] : $userChar->notes,
                    ]);

                    if (isset($row['created_at'])) {
                        $userChar->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $userChar->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $userChar->saveForCatalogCharacter($mode === 'merge' ? $catalogItem : null);
                    $count++;
                }
                $results['restored']['user_characters'] = $count;
            }

            // 9. User Support Cards (with strict entity identity and foreign key validation)
            if (isset($data['user_support_cards']) && is_array($data['user_support_cards'])) {
                $count = 0;
                foreach ($data['user_support_cards'] as $row) {
                    $name = (string) $row['name'];
                    $providedCatalogId = isset($row['uma_catalog_item_id']) ? (int) $row['uma_catalog_item_id'] : null;
                    $gametoraId = isset($row['gametora_id']) ? (int) $row['gametora_id'] : null;

                    $catalogItemId = $this->resolveCatalogItem(
                        'support_card',
                        $name,
                        $providedCatalogId,
                        $gametoraId,
                        'user_support_cards',
                        $catalogIds,
                        $results['unresolved_references']
                    );

                    $userCard = null;
                    if ($mode === 'overwrite' && isset($row['id'])) {
                        $userCard = UserSupportCard::find($row['id']);
                    }
                    if (! $userCard) {
                        $userCard = UserSupportCard::where('name', $name)->first();
                    }
                    if (! $userCard) {
                        $userCard = new UserSupportCard;
                        if ($mode === 'overwrite' && isset($row['id'])) {
                            $userCard->id = (int) $row['id'];
                        }
                    }

                    $userCard->fill([
                        'uma_catalog_item_id' => $catalogItemId,
                        'name' => $name,
                        'char_name' => $row['char_name'] ?? null,
                        'rarity' => $row['rarity'] ?? 'SSR',
                        'card_type' => $row['card_type'] ?? null,
                        'limit_break' => (int) ($row['limit_break'] ?? 0),
                        'is_owned' => (bool) ($row['is_owned'] ?? true),
                        'obtained_at' => $row['obtained_at'] ?? null,
                        'notes' => $row['notes'] ?? null,
                    ]);

                    if (isset($row['created_at'])) {
                        $userCard->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $userCard->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $userCard->save();
                    $count++;
                }
                $results['restored']['user_support_cards'] = $count;
            }

            // Guarantee official Cygames competition schedule is never missing/empty within the same atomic transaction
            if (CompetitionEvent::count() === 0) {
                (new CompetitionEventSeeder)->run();
            }
            if ($manifestSnapshot !== null && $manifestSnapshot !== $this->gameToraManifestSnapshot($data)) {
                AppSetting::where('key', GameToraSyncService::MANIFEST_CHECKPOINT_KEY)->delete();
            }
        });

        DB::afterCommit(static function (): void {
            UmaCatalog::clearCache();
            CollectionController::clearSkillCatalogCache();
        });

        return $results;
    }
}
