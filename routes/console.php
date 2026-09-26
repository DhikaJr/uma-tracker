<?php

use App\Models\GachaPull;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('gacha:sanitize-rateup', function () {
    $pulls = GachaPull::with('banner')->where('is_rate_up', true)->get();
    $fixed = 0;
    foreach ($pulls as $p) {
        $valid = $p->banner ? $p->banner->isItemRateUp($p->item_name) : false;
        if (! $valid || $p->rarity === 'R') {
            $p->update(['is_rate_up' => false]);
            $this->info("Sanitized pull #{$p->id}: {$p->item_name} ({$p->rarity}) -> is_rate_up = false");
            $fixed++;
        }
    }
    $this->info("Selesai! Sebanyak {$fixed} catatan tarikan rate-up tidak valid berhasil diperbaiki.");
})->purpose('Sanitasi catatan gacha yang tersimpan sebagai rate-up padahal bukan pilihan rate-up');
