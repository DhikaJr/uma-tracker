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
        Schema::table('gacha_pities', function (Blueprint $table) {
            $table->dropUnique(['banner_type']);
            $table->foreignId('gacha_banner_id')
                ->nullable()
                ->after('banner_type')
                ->constrained('gacha_banners')
                ->nullOnDelete();
            $table->unsignedInteger('total_sparks')->default(0)->after('current_pity');
            $table->unique(['banner_type', 'gacha_banner_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gacha_pities', function (Blueprint $table) {
            $table->dropUnique(['banner_type', 'gacha_banner_id']);
            $table->dropConstrainedForeignId('gacha_banner_id');
            $table->dropColumn('total_sparks');
            $table->unique(['banner_type']);
        });
    }
};
