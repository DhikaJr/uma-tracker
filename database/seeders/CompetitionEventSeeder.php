<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\CompetitionEvent;
use Illuminate\Database\Seeder;

class CompetitionEventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Inserts the 6 officially announced Cygames 2026–2027 competition events.
     * Guaranteed to be idempotent: running multiple times never duplicates rows.
     */
    public function run(): void
    {
        $events = [
            [
                'event_type' => 'champions_meeting',
                'event_name' => 'Champions Meeting CLASSIC',
                'year' => 2026,
                'month' => 10,
                'period' => 'exact',
                'date_label' => '20 Oktober 2026',
                'start_date' => '2026-10-20',
                'venue' => 'Kyoto',
                'surface' => 'turf',
                'distance' => 2200,
                'distance_category' => 'middle',
                'direction' => 'right_outer',
                'season' => 'autumn',
                'time_of_day' => 'day',
                'weather' => 'cloudy',
                'track_condition' => 'good',
                'special_rule' => null,
                'source_name' => 'Cygames',
                'source_url' => 'https://umamusume.jp/news/detail?id=3483',
            ],
            [
                'event_type' => 'league_of_heroes',
                'event_name' => 'League of Heroes',
                'year' => 2026,
                'month' => 11,
                'period' => 'late',
                'date_label' => 'Akhir November 2026',
                'start_date' => null,
                'venue' => 'Kyoto',
                'surface' => 'turf',
                'distance' => 3000,
                'distance_category' => 'long',
                'direction' => 'right_outer',
                'season' => 'autumn',
                'time_of_day' => 'day',
                'weather' => 'random',
                'track_condition' => 'random',
                'special_rule' => null,
                'source_name' => 'Cygames',
                'source_url' => 'https://umamusume.jp/news/detail?id=3483',
            ],
            [
                'event_type' => 'champions_meeting',
                'event_name' => 'Champions Meeting LONG',
                'year' => 2026,
                'month' => 12,
                'period' => 'late',
                'date_label' => 'Akhir Desember 2026',
                'start_date' => null,
                'venue' => 'Nakayama',
                'surface' => 'turf',
                'distance' => 2500,
                'distance_category' => 'long',
                'direction' => 'right_inner',
                'season' => 'winter',
                'time_of_day' => 'day',
                'weather' => 'sunny',
                'track_condition' => 'good',
                'special_rule' => null,
                'source_name' => 'Cygames',
                'source_url' => 'https://umamusume.jp/news/detail?id=3483',
            ],
            [
                'event_type' => 'champions_meeting',
                'event_name' => 'Champions Meeting CLASSIC',
                'year' => 2027,
                'month' => 1,
                'period' => 'late',
                'date_label' => 'Akhir Januari 2027',
                'start_date' => null,
                'venue' => null,
                'surface' => 'turf',
                'distance' => null,
                'distance_category' => 'middle',
                'direction' => null,
                'season' => null,
                'time_of_day' => null,
                'weather' => null,
                'track_condition' => null,
                'special_rule' => null,
                'source_name' => 'Cygames',
                'source_url' => 'https://umamusume.jp/news/detail?id=3483',
            ],
            [
                'event_type' => 'league_of_heroes',
                'event_name' => 'League of Heroes',
                'year' => 2027,
                'month' => 2,
                'period' => 'mid',
                'date_label' => 'Pertengahan Februari 2027',
                'start_date' => null,
                'venue' => null,
                'surface' => 'dirt',
                'distance' => null,
                'distance_category' => 'middle',
                'direction' => null,
                'season' => null,
                'time_of_day' => null,
                'weather' => null,
                'track_condition' => null,
                'special_rule' => null,
                'source_name' => 'Cygames',
                'source_url' => 'https://umamusume.jp/news/detail?id=3483',
            ],
            [
                'event_type' => 'champions_meeting',
                'event_name' => 'Champions Meeting MILE',
                'year' => 2027,
                'month' => 3,
                'period' => 'late',
                'date_label' => 'Akhir Maret 2027',
                'start_date' => null,
                'venue' => null,
                'surface' => 'turf',
                'distance' => null,
                'distance_category' => 'mile',
                'direction' => null,
                'season' => null,
                'time_of_day' => null,
                'weather' => null,
                'track_condition' => null,
                'special_rule' => 'no_debuff',
                'source_name' => 'Cygames',
                'source_url' => 'https://umamusume.jp/news/detail?id=3483',
            ],
        ];

        foreach ($events as $event) {
            CompetitionEvent::updateOrCreate(
                [
                    'year' => $event['year'],
                    'month' => $event['month'],
                    'period' => $event['period'],
                    'event_type' => $event['event_type'],
                    'event_name' => $event['event_name'],
                ],
                $event
            );
        }
    }
}
