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
        Schema::create('sync_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('sync_runs')->nullOnDelete();
            $table->enum('source', ['gametora', 'cygames', 'umapyoi']);
            $table->enum('trigger', ['manual', 'embedded', 'direct']);
            $table->enum('status', ['success', 'degraded', 'failed']);
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('created_count')->nullable();
            $table->unsignedInteger('updated_count')->nullable();
            $table->unsignedInteger('unresolved_count')->default(0);
            $table->unsignedInteger('warning_count')->default(0);
            $table->string('error_summary', 1000)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('parent_id');
            $table->index(['source', 'started_at', 'id']);
            $table->index(['source', 'status', 'finished_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_runs');
    }
};
