<?php

declare(strict_types=1);

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
        Schema::create('competition_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type'); // 'champions_meeting', 'league_of_heroes'
            $table->string('event_name');
            $table->integer('year');
            $table->integer('month');
            $table->string('period'); // 'exact', 'early', 'mid', 'late'
            $table->string('date_label');
            $table->date('start_date')->nullable();
            $table->string('venue')->nullable();
            $table->string('surface')->nullable(); // 'turf', 'dirt'
            $table->integer('distance')->nullable();
            $table->string('distance_category')->nullable(); // 'sprint', 'mile', 'middle', 'long'
            $table->string('direction')->nullable(); // 'right', 'left', 'right_outer', 'right_inner', 'left_outer', 'left_inner'
            $table->string('season')->nullable(); // 'spring', 'summer', 'autumn', 'winter'
            $table->string('time_of_day')->nullable(); // 'day', 'night'
            $table->string('weather')->nullable(); // 'sunny', 'cloudy', 'rainy', 'snowy', 'random'
            $table->string('track_condition')->nullable(); // 'good', 'yielding', 'soft', 'heavy', 'random'
            $table->string('special_rule')->nullable();
            $table->string('source_name')->default('Cygames');
            $table->string('source_url')->nullable();
            $table->timestamps();

            $table->index(['year', 'month', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competition_events');
    }
};
