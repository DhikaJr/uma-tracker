<?php

use App\Http\Controllers\Api\AffinityController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\CareerController;
use App\Http\Controllers\Api\ChangelogController;
use App\Http\Controllers\Api\CircleTrackerController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\CompetitionEventController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GachaController;
use App\Http\Controllers\Api\PlannerController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for Uma Musume Companion
|--------------------------------------------------------------------------
*/

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// App Settings (Persistent across browsers)
Route::prefix('settings')->group(function () {
    Route::get('/', [SettingController::class, 'index']);
    Route::post('/', [SettingController::class, 'update']);
});

// Circle Tracker (Muxueuma.com Fans Club Integration)
Route::prefix('circle-tracker')->group(function () {
    Route::get('/status', [CircleTrackerController::class, 'status']);
    Route::get('/pace', [CircleTrackerController::class, 'pace']);
    Route::post('/refresh', [CircleTrackerController::class, 'refresh']);
    Route::post('/set-circle', [CircleTrackerController::class, 'setCircle']);
    Route::post('/clear-circle', [CircleTrackerController::class, 'clearCircle']);
    Route::post('/track-player', [CircleTrackerController::class, 'trackPlayer']);
});

// Dashboard Overview
Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

// Gacha Tracker Endpoints
Route::prefix('gacha')->group(function () {
    Route::get('/banners', [GachaController::class, 'banners']);
    Route::get('/pulls', [GachaController::class, 'index']);
    Route::post('/pulls', [GachaController::class, 'store']);
    Route::post('/pulls/batch', [GachaController::class, 'batchStore']);
    Route::post('/bulk-delete', [GachaController::class, 'bulkDestroy']);
    Route::post('/pulls/bulk-delete', [GachaController::class, 'bulkDestroy']);
    Route::post('/pulls/bulk-update', [GachaController::class, 'bulkUpdate']);
    Route::delete('/pulls/{id}', [GachaController::class, 'destroy']);
    Route::put('/pulls/{id}', [GachaController::class, 'update']);
    Route::get('/stats', [GachaController::class, 'stats']);
    Route::get('/luck-percentile', [GachaController::class, 'luckPercentile']);
    Route::get('/metadata', [GachaController::class, 'metadata']);
    Route::post('/reset-pity', [GachaController::class, 'resetPity']);
    Route::get('/sync-status', [GachaController::class, 'syncStatus']);
    Route::post('/sync-catalog', [GachaController::class, 'syncCatalog']);
    Route::post('/sync-gametora', [GachaController::class, 'syncCatalog']);
});

// Career Runs / Fans Gain Tracker Endpoints
Route::prefix('career')->group(function () {
    Route::get('/runs', [CareerController::class, 'index']);
    Route::post('/runs', [CareerController::class, 'store']);
    Route::post('/bulk-delete', [CareerController::class, 'bulkDestroy']);
    Route::post('/runs/bulk-delete', [CareerController::class, 'bulkDestroy']);
    Route::put('/runs/{id}', [CareerController::class, 'update']);
    Route::delete('/runs/{id}', [CareerController::class, 'destroy']);
    Route::get('/stats', [CareerController::class, 'stats']);
    Route::get('/scenario-detail', [CareerController::class, 'scenarioDetail']);
    Route::get('/metadata', [CareerController::class, 'metadata']);
    Route::post('/sync-gametora', [GachaController::class, 'syncCatalog']);
});

// Backup & Restore Endpoints
Route::prefix('backup')->group(function () {
    Route::get('/stats', [BackupController::class, 'stats']);
    Route::get('/export', [BackupController::class, 'export']);
    Route::post('/import', [BackupController::class, 'import']);
});

// Jewel & Spark Planner Endpoints
Route::prefix('planner')->group(function () {
    Route::get('/config', [PlannerController::class, 'getConfig']);
    Route::post('/config', [PlannerController::class, 'saveConfig']);
});

// Character & Support Card Collection Endpoints
Route::prefix('collection')->group(function () {
    Route::get('/characters', [CollectionController::class, 'getCharacters']);
    Route::get('/characters/detail', [CollectionController::class, 'getCharacterDetail']);
    Route::post('/characters/toggle', [CollectionController::class, 'toggleCharacter']);
    Route::post('/characters/stars', [CollectionController::class, 'updateCharacterStars']);
    Route::post('/characters/batch', [CollectionController::class, 'batchCharacters']);

    Route::get('/support-cards', [CollectionController::class, 'getSupportCards']);
    Route::get('/support-cards/detail', [CollectionController::class, 'getSupportCardDetail']);
    Route::post('/support-cards/toggle', [CollectionController::class, 'toggleSupportCard']);
    Route::post('/support-cards/limit-break', [CollectionController::class, 'updateSupportCardLimitBreak']);
    Route::post('/support-cards/batch', [CollectionController::class, 'batchSupportCards']);

    Route::get('/skill-detail', [CollectionController::class, 'getSkillDetail']);
});

// Inheritance Affinity & Compatibility Calculator Endpoints
Route::prefix('affinity')->group(function () {
    Route::post('/calculate', [AffinityController::class, 'calculate']);
    Route::get('/recommendations/{targetId}', [AffinityController::class, 'recommendations']);
    Route::get('/races', [AffinityController::class, 'races']);
    Route::get('/career-runs', [AffinityController::class, 'careerRuns']);
});

// Changelog Endpoint
Route::get('/changelog', [ChangelogController::class, 'index']);

// Upcoming Competition Events (CM / LoH Planner)
Route::prefix('competition-events')->group(function () {
    Route::get('/', [CompetitionEventController::class, 'index']);
    Route::get('/{id}', [CompetitionEventController::class, 'show']);
});
