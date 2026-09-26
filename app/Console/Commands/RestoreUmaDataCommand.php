<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\BackupService;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class RestoreUmaDataCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'uma:restore 
                            {file? : Path ke file JSON backup yang akan dipulihkan}
                            {--path= : Alias untuk path ke file JSON backup}
                            {--mode=merge : Mode pemulihan data (merge atau overwrite)}
                            {--force : Lewati dialog konfirmasi saat overwrite}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pulihkan data gacha pull, career runs, catalog, dan banner dari file backup JSON';

    /**
     * Execute the console command.
     */
    public function handle(BackupService $service): int
    {
        ini_set('memory_limit', '512M');

        $filePath = (string) ($this->option('path') ?: $this->argument('file'));

        if (! $filePath) {
            $this->error('File backup harus ditentukan via argumen atau opsi --path.');

            return Command::FAILURE;
        }

        if (! File::exists($filePath)) {
            $this->error("File backup tidak ditemukan: {$filePath}");

            return Command::FAILURE;
        }

        $content = File::get($filePath);
        $backupData = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($backupData)) {
            $this->error('File bukan JSON yang valid: '.json_last_error_msg());

            return Command::FAILURE;
        }

        $mode = strtolower((string) $this->option('mode'));
        if (! in_array($mode, ['merge', 'overwrite'], true)) {
            $this->error("Mode '{$mode}' tidak dikenal. Gunakan 'merge' atau 'overwrite'.");

            return Command::FAILURE;
        }

        if ($mode === 'overwrite' && ! $this->option('force')) {
            $confirmed = $this->confirm(
                'PERINGATAN: Mode OVERWRITE akan menghapus seluruh data yang ada saat ini dan menggantikannya dengan isi file backup. Lanjutkan?',
                false
            );

            if (! $confirmed) {
                $this->comment('Pemulihan data dibatalkan oleh pengguna.');

                return Command::SUCCESS;
            }
        }

        $this->info("Memulai pemulihan data (Mode: {$mode})...");

        try {
            $result = $service->import($backupData, $mode);

            $this->info('Pemulihan data berhasil diselesaikan!');

            $rows = [];
            foreach ($result['restored'] as $entity => $count) {
                $rows[] = [ucwords(str_replace('_', ' ', $entity)), $count];
            }

            $this->table(['Entitas Data', 'Jumlah Record Dipulihkan'], $rows);

            return Command::SUCCESS;
        } catch (Exception $e) {
            $this->error('Gagal memulihkan data: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
