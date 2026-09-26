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
        Schema::create('gacha_pities', function (Blueprint $table) {
            $table->id();
            $table->string('banner_type')->unique(); // character, support_card
            $table->unsignedInteger('current_pity')->default(0);
            $table->timestamp('last_reset_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gacha_pities');
    }
};
