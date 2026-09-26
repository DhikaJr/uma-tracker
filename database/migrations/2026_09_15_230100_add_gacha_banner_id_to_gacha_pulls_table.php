<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('gacha_pulls', function (Blueprint $table) {
            $table->foreignId('gacha_banner_id')
                ->nullable()
                ->after('banner_type')
                ->constrained('gacha_banners')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gacha_pulls', function (Blueprint $table) {
            $table->dropConstrainedForeignId('gacha_banner_id');
        });
    }
};
