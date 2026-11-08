<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\CompetitionSyncService;
use Illuminate\Console\Command;

class SyncCompetitionEventsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'uma:sync-competitions {--force : Paksa perbarui sinkronisasi tanpa menggunakan cache}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronkan jadwal turnamen resmi Cygames JP (CM/LoH) dan panduan build GameWith JP';

    /**
     * Execute the console command.
     */
    public function handle(CompetitionSyncService $service): int
    {
        $force = (bool) $this->option('force');

        $this->info('Memeriksa dan menyinkronkan data turnamen dari Cygames JP & GameWith JP...');

        $result = $service->syncAll($force);

        if (! $result['success']) {
            $this->error($result['message']);

            return Command::FAILURE;
        }

        $this->info($result['message']);

        $rows = [];
        foreach ($result['data'] as $event) {
            $hasGuide = ! empty($event['recommended_build_guide']['has_guide_reference']) ? 'Ya' : 'Belum';
            $venue = $event['venue'] ?? '-';
            $dist = ! empty($event['distance']) ? $event['distance'].'m' : '-';
            $cond = ! empty($event['is_fully_confirmed']) ? 'Dikonfirmasi' : 'Parsial / Belum';

            $rows[] = [
                $event['event_key'],
                $event['event_name'],
                $event['date_label'],
                "{$venue} {$dist}",
                $cond,
                $hasGuide,
            ];
        }

        $this->table(
            ['Key Event', 'Nama Event', 'Jadwal / Periode', 'Lintasan & Jarak', 'Status Resmi', 'Panduan Build'],
            $rows
        );

        $this->line('');
        $this->comment("Terakhir disinkronkan: {$result['last_synced_at']}");

        return Command::SUCCESS;
    }
}
