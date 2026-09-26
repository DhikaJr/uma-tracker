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
            $table->string('training_type', 20)->default('manual')->after('scenario');
            $table->index('training_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('career_runs', function (Blueprint $table) {
            $table->dropIndex(['training_type']);
            $table->dropColumn('training_type');
        });
    }
};
