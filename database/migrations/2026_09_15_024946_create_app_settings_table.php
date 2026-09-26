<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Insert initial default values
        DB::table('app_settings')->insert([
            ['key' => 'circle_goal', 'value' => '20000000', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'circle_id', 'value' => '441730573', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'tracked_viewer_id', 'value' => '886175385', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
