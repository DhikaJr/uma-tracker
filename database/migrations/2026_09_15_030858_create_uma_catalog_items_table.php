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
        Schema::create('uma_catalog_items', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index(); // 'character', 'support_card', 'base_uma'
            $table->string('name')->index();
            $table->string('rarity', 10)->nullable(); // 'SSR', 'SR', 'R'
            $table->unsignedInteger('gametora_id')->nullable()->index();
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->unique(['type', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('uma_catalog_items');
    }
};
