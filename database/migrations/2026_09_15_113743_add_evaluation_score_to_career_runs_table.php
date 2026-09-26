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
        Schema::table('career_runs', function (Blueprint $table) {
            $table->unsignedInteger('evaluation_score')->nullable()->after('fans_gained');
            $table->index('evaluation_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('career_runs', function (Blueprint $table) {
            $table->dropIndex(['evaluation_score']);
            $table->dropColumn('evaluation_score');
        });
    }
};
