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
        Schema::create('gacha_pulls', function (Blueprint $table) {
            $table->id();
            $table->string('banner_type')->default('character'); // character, support_card
            $table->string('pull_type')->default('single'); // single, multi_10, ticket
            $table->string('item_name');
            $table->string('rarity'); // R, SR, SSR
            $table->boolean('is_rate_up')->default(false);
            $table->unsignedInteger('pity_count_at_pull')->default(0);
            $table->timestamp('pulled_at')->useCurrent();
            $table->timestamps();

            $table->index(['banner_type', 'rarity']);
            $table->index('pulled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gacha_pulls');
    }
};
