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
        Schema::table('gacha_banners', function (Blueprint $table) {
            $table->decimal('base_rate', 4, 2)->default(3.00)->after('category');
        });

        // Set 4.5% base rate for Anniversary & Half-Anniversary character banners
        DB::table('gacha_banners')
            ->where('category', 'anniversary')
            ->where('banner_type', 'character')
            ->update(['base_rate' => 4.50]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gacha_banners', function (Blueprint $table) {
            $table->dropColumn('base_rate');
        });
    }
};
