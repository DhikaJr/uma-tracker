<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\CircleSnapshot;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Models\UserSupportCard;
use App\Support\UmaCatalog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BackupService
{
    public const CURRENT_SCHEMA_VERSION = '2.0';

    public const SUPPORTED_SCHEMA_VERSIONS = ['0.9', '1.0', '2.0'];

    /**
     * Get live count statistics of all backup-able tables.
     *
     * @return array<string, int>
     */
    public function stats(): array
    {
        return [
            'gacha_pulls' => GachaPull::count(),
            'gacha_pities' => GachaPity::count(),
            'career_runs' => CareerRun::count(),
            'circle_snapshots' => CircleSnapshot::count(),
            'app_settings' => AppSetting::count(),
            'uma_catalog_items' => UmaCatalogItem::count(),
            'gacha_banners' => GachaBanner::count(),
            'user_characters' => UserCharacter::count(),
            'user_support_cards' => UserSupportCard::count(),
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
            'uma_catalog_items' => UmaCatalogItem::query()->get()->toArray(),
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
     * Validate the entire backup data payload before attempting any database operations.
     * Enforces schema constraints, range limits, type safety, and internal duplicate detection.
     *
     * @param  array<string, mixed>  $backupData
     *
     * @throws InvalidArgumentException
     */
    public function validate(array $backupData): void
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
                $this->validateJson($row['featured_items'] ?? null, 'featured_items', 'gacha_banners', $index);
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
                $this->validateJson($row['payload'] ?? null, 'payload', 'circle_snapshots', $index);
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

                $this->validateJson($row['raw_data'] ?? null, 'raw_data', 'uma_catalog_items', $index);
                $this->validateJson($row['aptitudes'] ?? null, 'aptitudes', 'uma_catalog_items', $index);
                $this->validateJson($row['skills'] ?? null, 'skills', 'uma_catalog_items', $index);
                $this->validateJson($row['objectives'] ?? null, 'objectives', 'uma_catalog_items', $index);
                $this->validateJson($row['details'] ?? null, 'details', 'uma_catalog_items', $index);
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
        array &$unresolvedReferences
    ): ?int {
        // 1. If gametora_id is provided, search by stable gametora_id first
        if ($gametoraId !== null && $gametoraId > 0) {
            $byGametora = UmaCatalogItem::where('type', $type)
                ->where('gametora_id', $gametoraId)
                ->first();
            if ($byGametora) {
                return (int) $byGametora->id;
            }
        }

        // 2. Exact match by name (['type', 'name'] is unique in uma_catalog_items)
        $byName = UmaCatalogItem::where('type', $type)
            ->where('name', $entityName)
            ->first();
        if ($byName) {
            return (int) $byName->id;
        }

        // 3. Check if providedCatalogId exists AND actually matches the same name
        if ($providedCatalogId !== null && $providedCatalogId > 0) {
            $byId = UmaCatalogItem::find($providedCatalogId);
            if ($byId && $byId->type === $type && $byId->name === $entityName) {
                return (int) $byId->id;
            }
        }

        // 4. Identity cannot be established with certainty: DO NOT auto-match!
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
        $this->validate($backupData);

        $data = $backupData['data'];
        $results = [
            'mode' => $mode,
            'restored' => [],
            'unresolved_references' => [],
            'conflicts' => [],
        ];

        DB::transaction(function () use ($data, $mode, &$results) {
            // If overwrite mode, truncate/clear tables in strict reverse dependency order
            if ($mode === 'overwrite') {
                UserCharacter::query()->delete();
                UserSupportCard::query()->delete();
                GachaPull::query()->delete();
                GachaPity::query()->delete();
                GachaBanner::query()->delete();
                UmaCatalogItem::query()->delete();
                CareerRun::query()->delete();
                CircleSnapshot::query()->delete();
                AppSetting::query()->delete();
            }

            // 1. App Settings
            if (isset($data['app_settings']) && is_array($data['app_settings'])) {
                $count = 0;
                foreach ($data['app_settings'] as $row) {
                    $key = (string) $row['key'];
                    $value = $row['value'] ?? null;

                    AppSetting::updateOrCreate(
                        ['key' => $key],
                        ['value' => $value]
                    );
                    $count++;
                }
                $results['restored']['app_settings'] = $count;
            }

            // 2. Gacha Banners (must be imported before Gacha Pulls & Pities due to foreign keys)
            if (isset($data['gacha_banners']) && is_array($data['gacha_banners'])) {
                $count = 0;
                foreach ($data['gacha_banners'] as $row) {
                    $bannerId = isset($row['id']) ? (int) $row['id'] : null;

                    $banner = null;
                    if ($bannerId) {
                        $banner = GachaBanner::find($bannerId);
                    }
                    if (! $banner && ! empty($row['name'])) {
                        $banner = GachaBanner::where('name', $row['name'])->first();
                    }
                    if (! $banner) {
                        $banner = new GachaBanner;
                        if ($bannerId) {
                            $banner->id = $bannerId;
                        }
                    }

                    $featuredItems = is_string($row['featured_items'] ?? null)
                        ? json_decode($row['featured_items'], true)
                        : ($row['featured_items'] ?? []);

                    $banner->fill([
                        'name' => $row['name'],
                        'gametora_id' => isset($row['gametora_id']) ? (int) $row['gametora_id'] : null,
                        'banner_type' => $row['banner_type'] ?? 'character',
                        'category' => $row['category'] ?? 'standard',
                        'base_rate' => (float) $row['base_rate'],
                        'start_date' => $row['start_date'] ?? (isset($row['created_at']) ? Carbon::parse($row['created_at'])->toDateString() : now()->toDateString()),
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
                    $count++;
                }
                $results['restored']['gacha_banners'] = $count;
            }

            // 3. Gacha Pities
            if (isset($data['gacha_pities']) && is_array($data['gacha_pities'])) {
                $count = 0;
                foreach ($data['gacha_pities'] as $row) {
                    $bannerType = (string) $row['banner_type'];
                    $bannerId = null;

                    if (! empty($row['gacha_banner_id'])) {
                        $bannerExists = GachaBanner::where('id', $row['gacha_banner_id'])->exists();
                        if ($bannerExists) {
                            $bannerId = (int) $row['gacha_banner_id'];
                        } else {
                            $results['unresolved_references'][] = [
                                'entity' => 'gacha_pities',
                                'record_name' => $bannerType,
                                'field' => 'gacha_banner_id',
                                'provided_id' => $row['gacha_banner_id'],
                                'reason' => "Gacha Banner ID {$row['gacha_banner_id']} tidak ditemukan. Relasi diset null.",
                            ];
                        }
                    }

                    $pity = GachaPity::where('banner_type', $bannerType)
                        ->where('gacha_banner_id', $bannerId)
                        ->first();

                    if (! $pity) {
                        $pity = new GachaPity;
                        if (isset($row['id'])) {
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
                    $bannerId = null;
                    if (! empty($row['gacha_banner_id'])) {
                        $bannerExists = GachaBanner::where('id', $row['gacha_banner_id'])->exists();
                        if ($bannerExists) {
                            $bannerId = (int) $row['gacha_banner_id'];
                        } else {
                            $results['unresolved_references'][] = [
                                'entity' => 'gacha_pulls',
                                'record_name' => $row['item_name'],
                                'field' => 'gacha_banner_id',
                                'provided_id' => $row['gacha_banner_id'],
                                'reason' => "Gacha Banner ID {$row['gacha_banner_id']} tidak ditemukan. Relasi diset null.",
                            ];
                        }
                    }

                    $pull = null;
                    if (isset($row['id'])) {
                        $pull = GachaPull::find($row['id']);
                    }
                    if (! $pull && $mode === 'merge' && isset($row['pulled_at'])) {
                        $pull = GachaPull::where('item_name', $row['item_name'])
                            ->where('banner_type', $row['banner_type'])
                            ->where('rarity', $row['rarity'])
                            ->where('pity_count_at_pull', (int) ($row['pity_count_at_pull'] ?? 0))
                            ->where('pulled_at', Carbon::parse($row['pulled_at'])->toDateTimeString())
                            ->first();
                    }

                    if (! $pull) {
                        $pull = new GachaPull;
                        if (isset($row['id'])) {
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
                        'pulled_at' => isset($row['pulled_at']) ? Carbon::parse($row['pulled_at']) : now(),
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
                    $runDate = $row['run_date'] ?? now()->toDateString();
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
                    if (isset($row['id'])) {
                        $run = CareerRun::find($row['id']);
                    }
                    if (! $run && $mode === 'merge') {
                        $query = CareerRun::where('uma_name', $umaName)
                            ->where('run_date', $runDate)
                            ->where('scenario', $scenario)
                            ->where('fans_gained', $fansGained)
                            ->where('final_rank', $finalRank);

                        if ($evalScore !== null) {
                            $query->where('evaluation_score', $evalScore);
                        }

                        $run = $query->first();
                    }

                    if (! $run) {
                        $run = new CareerRun;
                        if (isset($row['id'])) {
                            $run->id = (int) $row['id'];
                        }
                    }

                    $run->fill([
                        'uma_name' => $umaName,
                        'run_date' => $runDate,
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
                    if (isset($row['id'])) {
                        $snapshot = CircleSnapshot::find($row['id']);
                    }
                    if (! $snapshot) {
                        $snapshot = CircleSnapshot::where('circle_id', $circleId)
                            ->where('last_refreshed_at', $lastRefreshedAt->toDateTimeString())
                            ->first();
                    }

                    if (! $snapshot) {
                        $snapshot = new CircleSnapshot;
                        if (isset($row['id'])) {
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
            if (isset($data['uma_catalog_items']) && is_array($data['uma_catalog_items'])) {
                $count = 0;
                foreach ($data['uma_catalog_items'] as $row) {
                    $catalogItem = null;
                    if (isset($row['id'])) {
                        $catalogItem = UmaCatalogItem::find($row['id']);
                    }
                    if (! $catalogItem) {
                        $catalogItem = UmaCatalogItem::where('type', $row['type'])
                            ->where('name', $row['name'])
                            ->first();
                    }
                    if (! $catalogItem) {
                        $catalogItem = new UmaCatalogItem;
                        if (isset($row['id'])) {
                            $catalogItem->id = (int) $row['id'];
                        }
                    }

                    $catalogItem->fill([
                        'type' => $row['type'],
                        'name' => $row['name'],
                        'rarity' => $row['rarity'] ?? null,
                        'gametora_id' => isset($row['gametora_id']) ? (int) $row['gametora_id'] : null,
                        'raw_data' => is_string($row['raw_data'] ?? null)
                            ? json_decode($row['raw_data'], true)
                            : ($row['raw_data'] ?? null),
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
                    ]);

                    if (isset($row['created_at'])) {
                        $catalogItem->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $catalogItem->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $catalogItem->save();
                    $count++;
                }
                $results['restored']['uma_catalog_items'] = $count;
            }

            // 8. User Characters (with strict entity identity and foreign key validation)
            if (isset($data['user_characters']) && is_array($data['user_characters'])) {
                $count = 0;
                foreach ($data['user_characters'] as $row) {
                    $name = (string) $row['name'];
                    $providedCatalogId = isset($row['uma_catalog_item_id']) ? (int) $row['uma_catalog_item_id'] : null;
                    $gametoraId = isset($row['gametora_id']) ? (int) $row['gametora_id'] : null;

                    $catalogItemId = $this->resolveCatalogItem(
                        'character',
                        $name,
                        $providedCatalogId,
                        $gametoraId,
                        'user_characters',
                        $results['unresolved_references']
                    );

                    $userChar = null;
                    if (isset($row['id'])) {
                        $userChar = UserCharacter::find($row['id']);
                    }
                    if (! $userChar) {
                        $userChar = UserCharacter::where('name', $name)->first();
                    }
                    if (! $userChar) {
                        $userChar = new UserCharacter;
                        if (isset($row['id'])) {
                            $userChar->id = (int) $row['id'];
                        }
                    }

                    $userChar->fill([
                        'uma_catalog_item_id' => $catalogItemId,
                        'name' => $name,
                        'base_stars' => (int) ($row['base_stars'] ?? 3),
                        'current_stars' => (int) ($row['current_stars'] ?? ($row['base_stars'] ?? 3)),
                        'is_owned' => (bool) ($row['is_owned'] ?? true),
                        'obtained_at' => $row['obtained_at'] ?? null,
                        'notes' => $row['notes'] ?? null,
                    ]);

                    if (isset($row['created_at'])) {
                        $userChar->created_at = Carbon::parse($row['created_at']);
                    }
                    if (isset($row['updated_at'])) {
                        $userChar->updated_at = Carbon::parse($row['updated_at']);
                    }

                    $userChar->save();
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
                        $results['unresolved_references']
                    );

                    $userCard = null;
                    if (isset($row['id'])) {
                        $userCard = UserSupportCard::find($row['id']);
                    }
                    if (! $userCard) {
                        $userCard = UserSupportCard::where('name', $name)->first();
                    }
                    if (! $userCard) {
                        $userCard = new UserSupportCard;
                        if (isset($row['id'])) {
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
        });

        // Invalidate in-memory cached character rosters & star ratings
        UmaCatalog::clearCache();

        return $results;
    }
}
