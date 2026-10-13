<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tambahkan kolom nullable terlebih dahulu untuk menampung data sebelum backfill
        Schema::table('competition_events', function (Blueprint $table) {
            $table->string('event_key')->nullable()->after('id');
        });

        // 2. Backfill seluruh record yang ada
        $events = DB::table('competition_events')->get();
        $assignedKeys = [];

        foreach ($events as $event) {
            $type = (string) ($event->event_type ?? '');
            $year = (int) ($event->year ?? 0);
            $month = (int) ($event->month ?? 0);

            if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12) {
                throw new RuntimeException("Tahun ({$year}) atau bulan ({$month}) tidak valid pada record id {$event->id}.");
            }

            $prefix = match ($type) {
                'champions_meeting' => 'cm',
                'league_of_heroes' => 'loh',
                default => throw new RuntimeException("Tipe event_type '{$type}' tidak dikenal pada record id {$event->id}."),
            };

            $eventKey = sprintf('%s-%04d-%02d', $prefix, $year, $month);

            if (isset($assignedKeys[$eventKey])) {
                throw new RuntimeException("Konflik duplikasi event_key '{$eventKey}' terdeteksi pada record id {$event->id}.");
            }

            $assignedKeys[$eventKey] = true;

            DB::table('competition_events')->where('id', $event->id)->update([
                'event_key' => $eventKey,
            ]);
        }

        // 3. Verifikasi ketat: pastikan tidak ada baris yang kosong atau duplikat
        $emptyCount = DB::table('competition_events')
            ->whereNull('event_key')
            ->orWhere('event_key', '')
            ->count();

        if ($emptyCount > 0) {
            throw new RuntimeException("Backfill gagal: ditemukan {$emptyCount} record dengan event_key kosong.");
        }

        $duplicateCount = DB::table('competition_events')
            ->select('event_key', DB::raw('count(*) as count'))
            ->groupBy('event_key')
            ->having('count', '>', 1)
            ->count();

        if ($duplicateCount > 0) {
            throw new RuntimeException('Backfill gagal: terdeteksi duplikasi event_key pada tabel competition_events.');
        }

        // 4. Ubah kolom menjadi NOT NULL dan terapkan unique constraint
        Schema::table('competition_events', function (Blueprint $table) {
            $table->string('event_key')->nullable(false)->change();
            $table->unique('event_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competition_events', function (Blueprint $table) {
            $table->dropUnique(['event_key']);
            $table->dropColumn('event_key');
        });
    }
};
