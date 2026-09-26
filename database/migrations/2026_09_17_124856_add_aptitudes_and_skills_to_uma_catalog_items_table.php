<?php

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
        Schema::table('uma_catalog_items', function (Blueprint $table) {
            $table->json('aptitudes')->nullable()->after('raw_data');
            $table->json('skills')->nullable()->after('aptitudes');
        });

        // Populate existing characters' aptitudes from raw_data
        $items = DB::table('uma_catalog_items')
            ->where('type', 'character')
            ->whereNotNull('raw_data')
            ->get(['id', 'raw_data']);

        foreach ($items as $item) {
            $raw = json_decode((string) $item->raw_data, true);
            if (! empty($raw['aptitude']) && is_array($raw['aptitude'])) {
                $a = $raw['aptitude'];
                $structured = [
                    'turf' => $a[0] ?? '-',
                    'dirt' => $a[1] ?? '-',
                    'short' => $a[2] ?? '-',
                    'mile' => $a[3] ?? '-',
                    'medium' => $a[4] ?? '-',
                    'long' => $a[5] ?? '-',
                    'runner' => $a[6] ?? '-',
                    'leader' => $a[7] ?? '-',
                    'betweener' => $a[8] ?? '-',
                    'chaser' => $a[9] ?? '-',
                    'track' => [
                        'turf' => $a[0] ?? '-',
                        'dirt' => $a[1] ?? '-',
                    ],
                    'distance' => [
                        'short' => $a[2] ?? '-',
                        'mile' => $a[3] ?? '-',
                        'medium' => $a[4] ?? '-',
                        'long' => $a[5] ?? '-',
                    ],
                    'style' => [
                        'runner' => $a[6] ?? '-',
                        'leader' => $a[7] ?? '-',
                        'betweener' => $a[8] ?? '-',
                        'chaser' => $a[9] ?? '-',
                    ],
                ];

                DB::table('uma_catalog_items')
                    ->where('id', $item->id)
                    ->update(['aptitudes' => json_encode($structured)]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('uma_catalog_items', function (Blueprint $table) {
            $table->dropColumn(['aptitudes', 'skills']);
        });
    }
};
