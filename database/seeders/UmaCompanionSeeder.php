<?php

namespace Database\Seeders;

use App\Models\CareerRun;
use App\Models\GachaPity;
use App\Models\GachaPull;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class UmaCompanionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Initialize Pities
        GachaPity::updateOrCreate(
            ['banner_type' => 'character'],
            ['current_pity' => 45, 'last_reset_at' => Carbon::now()->subDays(20)]
        );

        GachaPity::updateOrCreate(
            ['banner_type' => 'support_card'],
            ['current_pity' => 110, 'last_reset_at' => Carbon::now()->subDays(15)]
        );

        // 2. Seed Realistic Gacha Pulls
        $pullsData = [
            // Character pulls
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Special Week [Special Dreamer]', 'rarity' => 'SSR', 'is_rate_up' => true, 'pity_count_at_pull' => 10, 'days_ago' => 18],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Vodka [Wild Top]', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 9, 'days_ago' => 18],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Agnes Tachyon', 'rarity' => 'R', 'is_rate_up' => false, 'pity_count_at_pull' => 8, 'days_ago' => 18],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Daiwa Scarlet', 'rarity' => 'R', 'is_rate_up' => false, 'pity_count_at_pull' => 7, 'days_ago' => 18],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Gold Ship', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 6, 'days_ago' => 18],
            ['banner_type' => 'character', 'pull_type' => 'single', 'item_name' => 'Oguri Cap [Starry Nocturne]', 'rarity' => 'SSR', 'is_rate_up' => false, 'pity_count_at_pull' => 25, 'days_ago' => 12],
            ['banner_type' => 'character', 'pull_type' => 'ticket', 'item_name' => 'Matikanetannhauser', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 32, 'days_ago' => 8],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Silence Suzuka [Beyond the White]', 'rarity' => 'SSR', 'is_rate_up' => true, 'pity_count_at_pull' => 45, 'days_ago' => 3],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Nice Nature', 'rarity' => 'R', 'is_rate_up' => false, 'pity_count_at_pull' => 44, 'days_ago' => 3],
            ['banner_type' => 'character', 'pull_type' => 'multi_10', 'item_name' => 'Twin Turbo', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 43, 'days_ago' => 3],

            // Support card pulls
            ['banner_type' => 'support_card', 'pull_type' => 'multi_10', 'item_name' => 'Kitasan Black [Bring Down the Lightning]', 'rarity' => 'SSR', 'is_rate_up' => true, 'pity_count_at_pull' => 30, 'days_ago' => 14],
            ['banner_type' => 'support_card', 'pull_type' => 'multi_10', 'item_name' => 'Sweep Tosho [Little Witch]', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 29, 'days_ago' => 14],
            ['banner_type' => 'support_card', 'pull_type' => 'multi_10', 'item_name' => 'Fine Motion [Thank you, Sir]', 'rarity' => 'SSR', 'is_rate_up' => false, 'pity_count_at_pull' => 68, 'days_ago' => 10],
            ['banner_type' => 'support_card', 'pull_type' => 'single', 'item_name' => 'Super Creek [One-Piece Dress]', 'rarity' => 'SSR', 'is_rate_up' => false, 'pity_count_at_pull' => 85, 'days_ago' => 6],
            ['banner_type' => 'support_card', 'pull_type' => 'multi_10', 'item_name' => 'Marvelous Sunday [Smile for You]', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 99, 'days_ago' => 2],
            ['banner_type' => 'support_card', 'pull_type' => 'multi_10', 'item_name' => 'Tosen Jordan', 'rarity' => 'R', 'is_rate_up' => false, 'pity_count_at_pull' => 100, 'days_ago' => 2],
            ['banner_type' => 'support_card', 'pull_type' => 'multi_10', 'item_name' => 'Mayano Top Gun', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 105, 'days_ago' => 1],
            ['banner_type' => 'support_card', 'pull_type' => 'ticket', 'item_name' => 'Symboli Rudolf', 'rarity' => 'R', 'is_rate_up' => false, 'pity_count_at_pull' => 110, 'days_ago' => 0],
        ];

        foreach ($pullsData as $p) {
            GachaPull::create([
                'banner_type' => $p['banner_type'],
                'pull_type' => $p['pull_type'],
                'item_name' => $p['item_name'],
                'rarity' => $p['rarity'],
                'is_rate_up' => $p['is_rate_up'],
                'pity_count_at_pull' => $p['pity_count_at_pull'],
                'pulled_at' => Carbon::now()->subDays($p['days_ago'])->subHours(rand(1, 10)),
            ]);
        }

        // 3. Seed Realistic Career Runs across scenarios & ranks (E to LG)
        $careerData = [
            [
                'uma_name' => 'Gentildonna',
                'scenario' => 'Mecha Uma Musume',
                'starting_fans' => 280000,
                'ending_fans' => 72580000,
                'final_rank' => 'LG3',
                'notes' => 'Personal best record! 14 G1 wins, completed all overclocks and maxed power stat.',
                'days_ago' => 1,
            ],
            [
                'uma_name' => 'Orfevre',
                'scenario' => 'Mecha Uma Musume',
                'starting_fans' => 250000,
                'ending_fans' => 65320000,
                'final_rank' => 'US1',
                'notes' => 'Triple Crown + Takarazuka Kinen + Arima Kinen sweep. Amazing pace control.',
                'days_ago' => 3,
            ],
            [
                'uma_name' => 'Duramente',
                'scenario' => 'Mecha Uma Musume',
                'starting_fans' => 220000,
                'ending_fans' => 58410000,
                'final_rank' => 'UA4',
                'notes' => 'Overclocked training gear level 5 achieved early on.',
                'days_ago' => 4,
            ],
            [
                'uma_name' => 'Kitasan Black',
                'scenario' => 'Great Food Festival',
                'starting_fans' => 200000,
                'ending_fans' => 52180000,
                'final_rank' => 'UB2',
                'notes' => 'High food buff synergy during summer training camp.',
                'days_ago' => 6,
            ],
            [
                'uma_name' => 'Oguri Cap',
                'scenario' => 'U.A.F. Ready GO!',
                'starting_fans' => 150000,
                'ending_fans' => 48950000,
                'final_rank' => 'UD5',
                'notes' => 'Top condition bonus maintained throughout all seasons.',
                'days_ago' => 8,
            ],
            [
                'uma_name' => 'Silence Suzuka',
                'scenario' => "Project L'Arc",
                'starting_fans' => 105000,
                'ending_fans' => 42500000,
                'final_rank' => 'UE2',
                'notes' => 'Pure Runner build (大逃げ), Prix de l\'Arc de Triomphe victory!',
                'days_ago' => 11,
            ],
            [
                'uma_name' => 'Mejiro McQueen',
                'scenario' => 'Grand Masters',
                'starting_fans' => 110000,
                'ending_fans' => 38450000,
                'final_rank' => 'UG7',
                'notes' => 'Stamina god run with Gold Ship and Super Creek inheritance.',
                'days_ago' => 14,
            ],
            [
                'uma_name' => 'Special Week',
                'scenario' => 'Grand Live',
                'starting_fans' => 120000,
                'ending_fans' => 34800000,
                'final_rank' => 'UF3',
                'notes' => 'Triple Tiara and Tenno Sho Autumn champion.',
                'days_ago' => 16,
            ],
            [
                'uma_name' => 'Gold Ship',
                'scenario' => 'Make a New Track (Twinkle Star Climax)',
                'starting_fans' => 95000,
                'ending_fans' => 31200000,
                'final_rank' => 'SS+',
                'notes' => 'G1 race schedule grinding route.',
                'days_ago' => 20,
            ],
            [
                'uma_name' => 'Tokai Teio',
                'scenario' => 'URA Finals',
                'starting_fans' => 80000,
                'ending_fans' => 18200000,
                'final_rank' => 'A+',
                'notes' => 'Classic nostalgic run with Teio Step.',
                'days_ago' => 24,
            ],
        ];

        foreach ($careerData as $c) {
            CareerRun::create([
                'uma_name' => $c['uma_name'],
                'scenario' => $c['scenario'],
                'starting_fans' => $c['starting_fans'],
                'ending_fans' => $c['ending_fans'],
                'final_rank' => $c['final_rank'],
                'notes' => $c['notes'],
                'run_date' => Carbon::now()->subDays($c['days_ago'])->format('Y-m-d'),
            ]);
        }
    }
}
