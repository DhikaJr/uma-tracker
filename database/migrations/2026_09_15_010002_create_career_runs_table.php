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
        Schema::create('career_runs', function (Blueprint $table) {
            $table->id();
            $table->string('uma_name');
            $table->string('scenario');
            $table->unsignedBigInteger('starting_fans')->default(0);
            $table->unsignedBigInteger('ending_fans')->default(0);
            $table->unsignedBigInteger('fans_gained')->default(0);
            $table->string('final_rank');
            $table->text('notes')->nullable();
            $table->date('run_date');
            $table->timestamps();

            $table->index('run_date');
            $table->index('scenario');
            $table->index('uma_name');
            $table->index('final_rank');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('career_runs');
    }
};
