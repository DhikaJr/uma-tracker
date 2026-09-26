<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupUmaDataCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'uma:backup 
                            {--output= : Path file tujuan penyimpanan backup JSON}
                            {--path= : Alias untuk path file tujuan penyimpanan backup JSON}
                            {--pretty : Format JSON dengan indentasi rapi}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cadangkan seluruh data gacha pull, career runs, catalog, dan gacha banner ke file JSON';

    /**
     * Execute the console command.
     */
    public function handle(BackupService $service): int
    {
        ini_set('memory_limit', '512M');

        $this->info('Memulai pencadangan data Uma Musume Companion...');

        $backup = $service->export();
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        if ($this->option('pretty')) {
            $flags |= JSON_PRETTY_PRINT;
        }

        $json = json_encode($backup, $flags);
        if ($json === false) {
            $this->error('Gagal mengonversi data backup ke format JSON.');

            return Command::FAILURE;
        }

        $outputPath = $this->option('path') ?: $this->option('output');
        if (! $outputPath) {
            $backupDir = storage_path('app/backups');
            if (! File::isDirectory($backupDir)) {
                File::makeDirectory($backupDir, 0755, true);
            }
            $filename = 'uma-companion-backup-'.now()->format('Y-m-d_His').'.json';
            $outputPath = $backupDir.DIRECTORY_SEPARATOR.$filename;
        }

        File::put($outputPath, $json);

        $this->info("Pencadangan berhasil! File disimpan di: {$outputPath}");

        $rows = [];
        foreach ($backup['summary'] as $entity => $count) {
            $rows[] = [ucwords(str_replace('_', ' ', $entity)), $count];
        }

        $this->table(['Entitas Data', 'Jumlah Record'], $rows);

        return Command::SUCCESS;
    }
}
