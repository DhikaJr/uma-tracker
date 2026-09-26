<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $premiumBanners = [
            [
                'name' => '劇場版『ウマ娘』公開記念 プリティーダービーガチャ (Jungle Pocket)',
                'banner_type' => 'character',
                'category' => 'premium',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Jungle Pocket', 'Jungle Pocket [ヴァーミリオン・ヘッド]']),
                'start_date' => '2024-06-13',
                'end_date' => '2024-06-26',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => '3.5th Anniv. Premium Pretty Derby Gacha (Gentildonna)',
                'banner_type' => 'character',
                'category' => 'anniversary',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Gentildonna', 'Gentildonna [Regina dei fiori]']),
                'start_date' => '2024-08-24',
                'end_date' => '2024-09-19',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => '4th Anniv. Premium Pretty Derby Gacha (Orfevre)',
                'banner_type' => 'character',
                'category' => 'anniversary',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Orfevre', 'Orfevre [総攬]']),
                'start_date' => '2025-02-24',
                'end_date' => '2025-03-21',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => '4.5th Anniv. Premium Pretty Derby Gacha (Still in Love)',
                'banner_type' => 'character',
                'category' => 'anniversary',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Still in Love']),
                'start_date' => '2025-08-24',
                'end_date' => '2025-09-19',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => '新衣装Oguri Cap登場! Premium Pretty Derby Gacha',
                'banner_type' => 'character',
                'category' => 'premium',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Oguri Cap [Cinderella Gray]', 'Oguri Cap']),
                'start_date' => '2025-12-11',
                'end_date' => '2026-01-08',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Stay Gold登場! Premium Pretty Derby Gacha',
                'banner_type' => 'character',
                'category' => 'premium',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Stay Gold [Sunlit Outsider]', 'Stay Gold']),
                'start_date' => '2025-12-21',
                'end_date' => '2026-01-19',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => '5th Anniv. Premium Pretty Derby Gacha (Almond Eye)',
                'banner_type' => 'character',
                'category' => 'anniversary',
                'base_rate' => 4.50,
                'featured_items' => json_encode(['Almond Eye [The Changer]', 'Almond Eye']),
                'start_date' => '2026-02-24',
                'end_date' => '2026-03-30',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => '5.5th Anniv. Premium Pretty Derby Gacha (Epiphaneia)',
                'banner_type' => 'character',
                'category' => 'anniversary',
                'base_rate' => 4.50,
                'featured_items' => json_encode(["Epiphaneia [Fate's Chosen Star]", 'Epiphaneia']),
                'start_date' => '2026-08-24',
                'end_date' => '2026-10-01',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($premiumBanners as $banner) {
            $existing = DB::table('gacha_banners')
                ->where('banner_type', 'character')
                ->where(function ($q) use ($banner) {
                    $q->where('start_date', $banner['start_date'])
                        ->orWhere('name', 'like', '%'.explode('(', $banner['name'])[0].'%');
                })
                ->first();

            if ($existing) {
                DB::table('gacha_banners')
                    ->where('id', $existing->id)
                    ->update([
                        'base_rate' => 4.50,
                        'name' => $banner['name'],
                        'category' => $banner['category'],
                        'featured_items' => $banner['featured_items'],
                        'end_date' => $banner['end_date'],
                    ]);
            } else {
                DB::table('gacha_banners')->insert($banner);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
