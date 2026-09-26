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
        Schema::create('user_characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uma_catalog_item_id')->nullable()->constrained('uma_catalog_items')->nullOnDelete();
            $table->string('name')->unique()->index();
            $table->unsignedTinyInteger('base_stars')->default(3);
            $table->unsignedTinyInteger('current_stars')->default(3);
            $table->boolean('is_owned')->default(true);
            $table->date('obtained_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_characters');
    }
};
