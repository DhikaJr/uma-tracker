<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\GameToraSyncService;
use Illuminate\Console\Command;

class SyncUmaCatalogCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'uma:sync-catalog {--force : Paksa perbarui katalog meskipun hash GameTora belum berubah}';

    /**
     * The aliases of the console command.
     *
     * @var array<int, string>
     */
    protected $aliases = ['uma:sync-gametora'];

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronkan katalog karakter, varian kostum, dan support card dari GameTora (server JP)';

    /**
     * Execute the console command.
     */
    public function handle(GameToraSyncService $service): int
    {
        $force = (bool) $this->option('force');

        $this->info('Memeriksa dan menyinkronkan data katalog dari GameTora...');

        $result = $service->sync($force);

        if (! $result['success']) {
            $this->error($result['message']);

            return Command::FAILURE;
        }

        if ($result['is_up_to_date']) {
            $this->comment($result['message']);
        } else {
            $this->info($result['message']);
        }

        $stats = $result['stats'] ?? $service->getStatus();

        $this->table(
            ['Kategori Data', 'Jumlah / Status'],
            [
                ['Karakter & Varian Kostum', $stats['total_characters'] ?? 0],
                ['Karakter dengan Detail Skill & Aptitude', $stats['total_with_skills'] ?? 0],
                ['Support Cards (SSR, SR, R)', $stats['total_support_cards'] ?? 0],
                ['Support Cards dengan Detail 0LB-MLB', $stats['total_with_details'] ?? 0],
                ['Base Uma Musume (Fans Tracker)', $stats['total_base_umas'] ?? 0],
                ['Banner Gacha 2026 (Server JP)', $stats['total_banners'] ?? 0],
                ['Terakhir Disinkronkan', $stats['last_synced_at'] ?? 'Belum pernah'],
            ]
        );

        return Command::SUCCESS;
    }
}
