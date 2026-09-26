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
        Schema::create('circle_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('circle_id')->index();
            $table->string('circle_name')->nullable();
            $table->unsignedInteger('rank')->nullable();
            $table->unsignedBigInteger('point')->nullable();
            $table->unsignedInteger('member_count')->nullable();
            $table->unsignedBigInteger('active_total')->nullable();
            $table->string('period')->nullable();
            $table->longText('payload');
            $table->timestamp('last_refreshed_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('circle_snapshots');
    }
};
