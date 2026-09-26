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
        Schema::create('gacha_banners', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('gametora_id')->nullable()->index();
            $table->string('banner_type')->default('character'); // character, support_card
            $table->string('category')->default('standard'); // standard, twinkle, select_rate_up, anniversary, scenario_release
            $table->string('name');
            $table->json('featured_items')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index(['banner_type', 'category']);
            $table->index('start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gacha_banners');
    }
};
