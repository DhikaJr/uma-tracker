<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\CompetitionEvent;

class CompetitionGreenSkillRecommender
{
    /**
     * Determine whether the event has full official confirmed race parameters.
     */
    public static function isFullyConfirmed(CompetitionEvent $event): bool
    {
        return ! empty($event->venue)
            && ! empty($event->distance)
            && ! empty($event->direction)
            && ! empty($event->season);
    }

    /**
     * Generate green skill recommendations matching confirmed race conditions.
     *
     * @return array{
     *     is_fully_confirmed: bool,
     *     has_recommendations: bool,
     *     disclaimer: ?string,
     *     has_random_conditions: bool,
     *     random_disclaimer: ?string,
     *     skills: array<int, array<string, mixed>>
     * }
     */
    public static function getRecommendations(CompetitionEvent $event): array
    {
        if (! self::isFullyConfirmed($event)) {
            return [
                'is_fully_confirmed' => false,
                'has_recommendations' => false,
                'disclaimer' => 'Rekomendasi green skill belum tersedia karena rincian informasi balapan resmi (sirkuit, jarak lintasan, arah putaran, dan musim) belum diumumkan oleh Cygames.',
                'has_random_conditions' => false,
                'random_disclaimer' => null,
                'skills' => [],
            ];
        }

        $skills = [];
        $isLoH = $event->event_type === 'league_of_heroes';
        $hasRandomConditions = ($event->weather === 'random' || $event->track_condition === 'random');

        // 1. Direction (Right / Left)
        $direction = (string) $event->direction;
        if (str_starts_with($direction, 'right')) {
            $skills[] = [
                'id' => 200012,
                'name_en' => 'Right-Handed ○',
                'name_jp' => '右回り○',
                'icon_id' => 10011,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10011.png',
                'stat' => 'Speed',
                'value' => '+40',
                'recommendation_status' => 'recommended',
                'status_label' => 'Direkomendasikan (Pasti Aktif)',
                'desc_en' => 'Moderately increase performance on right-handed tracks.',
                'desc_id' => 'Meningkatkan status Speed sebesar +40 pada sirkuit putaran kanan (searah jarum jam).',
                'condition' => 'rotation==1',
            ];
        } elseif (str_starts_with($direction, 'left')) {
            $skills[] = [
                'id' => 200022,
                'name_en' => 'Left-Handed ○',
                'name_jp' => '左回り○',
                'icon_id' => 10011,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10011.png',
                'stat' => 'Speed',
                'value' => '+40',
                'recommendation_status' => 'recommended',
                'status_label' => 'Direkomendasikan (Pasti Aktif)',
                'desc_en' => 'Moderately increase performance on left-handed tracks.',
                'desc_id' => 'Meningkatkan status Speed sebesar +40 pada sirkuit putaran kiri (berlawanan arah jarum jam).',
                'condition' => 'rotation==2',
            ];
        }

        // 2. Venue (Racetrack)
        $venue = (string) $event->venue;
        $venueSkills = [
            'Kyoto' => [
                'id' => 200062,
                'name_en' => 'Kyoto Racecourse ○',
                'name_jp' => '京都レース場○',
                'icon_id' => 10021,
                'stat' => 'Stamina',
                'value' => '+40',
                'desc_en' => 'Moderately increase performance at Kyoto Racecourse.',
                'desc_id' => 'Meningkatkan status Stamina sebesar +40 saat berlomba di Sirkuit Kyoto.',
                'condition' => 'track_id==10008',
            ],
            'Nakayama' => [
                'id' => 200042,
                'name_en' => 'Nakayama Racecourse ○',
                'name_jp' => '中山レース場○',
                'icon_id' => 10021,
                'stat' => 'Stamina',
                'value' => '+40',
                'desc_en' => 'Moderately increase performance at Nakayama Racecourse.',
                'desc_id' => 'Meningkatkan status Stamina sebesar +40 saat berlomba di Sirkuit Nakayama.',
                'condition' => 'track_id==10005',
            ],
            'Tokyo' => [
                'id' => 200032,
                'name_en' => 'Tokyo Racecourse ○',
                'name_jp' => '東京レース場○',
                'icon_id' => 10021,
                'stat' => 'Stamina',
                'value' => '+40',
                'desc_en' => 'Moderately increase performance at Tokyo Racecourse.',
                'desc_id' => 'Meningkatkan status Stamina sebesar +40 saat berlomba di Sirkuit Tokyo.',
                'condition' => 'track_id==10006',
            ],
            'Hanshin' => [
                'id' => 200052,
                'name_en' => 'Hanshin Racecourse ○',
                'name_jp' => '阪神レース場○',
                'icon_id' => 10021,
                'stat' => 'Stamina',
                'value' => '+40',
                'desc_en' => 'Moderately increase performance at Hanshin Racecourse.',
                'desc_id' => 'Meningkatkan status Stamina sebesar +40 saat berlomba di Sirkuit Hanshin.',
                'condition' => 'track_id==10009',
            ],
            'Chukyo' => [
                'id' => 200072,
                'name_en' => 'Chukyo Racecourse ○',
                'name_jp' => '中京レース場○',
                'icon_id' => 10021,
                'stat' => 'Stamina',
                'value' => '+40',
                'desc_en' => 'Moderately increase performance at Chukyo Racecourse.',
                'desc_id' => 'Meningkatkan status Stamina sebesar +40 saat berlomba di Sirkuit Chukyo.',
                'condition' => 'track_id==10007',
            ],
            'Oi' => [
                'id' => 200952,
                'name_en' => 'Oi Racecourse ○',
                'name_jp' => '大井レース場○',
                'icon_id' => 10021,
                'stat' => 'Stamina',
                'value' => '+40',
                'desc_en' => 'Moderately increase performance at Oi Racecourse.',
                'desc_id' => 'Meningkatkan status Stamina sebesar +40 saat berlomba di Sirkuit Oi.',
                'condition' => 'track_id==10101',
            ],
        ];

        if (isset($venueSkills[$venue])) {
            $vSkill = $venueSkills[$venue];
            $skills[] = array_merge($vSkill, [
                'icon_url' => "https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_{$vSkill['icon_id']}.png",
                'recommendation_status' => 'recommended',
                'status_label' => 'Direkomendasikan (Pasti Aktif)',
            ]);
        }

        // 3. Distance Category (Standard vs Non-Standard Distance)
        $distance = $event->distance;
        if ($distance !== null) {
            $isStandard = ($distance % 400 === 0);
            if ($isStandard) {
                $skills[] = [
                    'id' => 200132,
                    'name_en' => 'Standard Distance ○',
                    'name_jp' => '根幹距離○',
                    'icon_id' => 10021,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10021.png',
                    'stat' => 'Stamina',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance over standard distances (multiples of 400m).',
                    'desc_id' => "Meningkatkan status Stamina sebesar +40 pada jarak balapan standar (kelipatan 400m, misal {$distance}m).",
                    'condition' => 'is_basis_distance==1',
                ];
            } else {
                $skills[] = [
                    'id' => 200142,
                    'name_en' => 'Non-Standard Distance ○',
                    'name_jp' => '非根幹距離○',
                    'icon_id' => 10021,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10021.png',
                    'stat' => 'Stamina',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance over non-standard distances (non-multiples of 400m).',
                    'desc_id' => "Meningkatkan status Stamina sebesar +40 pada jarak balapan non-standar (bukan kelipatan 400m, misal {$distance}m).",
                    'condition' => 'is_basis_distance==0',
                ];
            }
        }

        // 4. Season
        $season = (string) $event->season;
        $seasonSkills = [
            'spring' => [
                'id' => 200172,
                'name_en' => 'Spring Runner ○',
                'name_jp' => '春ウマ娘○',
                'desc_en' => 'Moderately increase performance in spring.',
                'desc_id' => 'Meningkatkan status Speed sebesar +40 saat berlomba di musim semi (Spring).',
                'condition' => 'season==1@season==5',
            ],
            'summer' => [
                'id' => 200182,
                'name_en' => 'Summer Runner ○',
                'name_jp' => '夏ウマ娘○',
                'desc_en' => 'Moderately increase performance in summer.',
                'desc_id' => 'Meningkatkan status Speed sebesar +40 saat berlomba di musim panas (Summer).',
                'condition' => 'season==2',
            ],
            'autumn' => [
                'id' => 200192,
                'name_en' => 'Fall Runner ○',
                'name_jp' => '秋ウマ娘○',
                'desc_en' => 'Moderately increase performance in fall.',
                'desc_id' => 'Meningkatkan status Speed sebesar +40 saat berlomba di musim gugur (Autumn).',
                'condition' => 'season==3',
            ],
            'winter' => [
                'id' => 200202,
                'name_en' => 'Winter Runner ○',
                'name_jp' => '冬ウマ娘○',
                'desc_en' => 'Moderately increase performance in winter.',
                'desc_id' => 'Meningkatkan status Speed sebesar +40 saat berlomba di musim dingin (Winter).',
                'condition' => 'season==4',
            ],
        ];

        if (isset($seasonSkills[$season])) {
            $sSkill = $seasonSkills[$season];
            $skills[] = array_merge($sSkill, [
                'icon_id' => 10011,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10011.png',
                'stat' => 'Speed',
                'value' => '+40',
                'recommendation_status' => 'recommended',
                'status_label' => 'Direkomendasikan (Pasti Aktif)',
            ]);
        }

        // 5. Weather & Track Condition handling
        if ($hasRandomConditions) {
            // Random weather & track conditions (e.g. League of Heroes)
            // User requested to explicitly flag these 6 as "dapat diambil" (situational), not recommended:
            // Good Track Condition, Bad Track Condition, Sunny Days, Cloudy Days, Rainy Days, Snowy Days
            $skills[] = [
                'id' => 200152,
                'name_en' => 'Good Track Condition ○',
                'name_jp' => '良バ場○',
                'icon_id' => 10031,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10031.png',
                'stat' => 'Power',
                'value' => '+40',
                'recommendation_status' => 'situational',
                'status_label' => 'Dapat Diambil (Situasional)',
                'desc_en' => 'Moderately increase performance on firm ground.',
                'desc_id' => 'Meningkatkan status Power sebesar +40 jika putaran balapan bergulir pada kondisi lintasan baik / kering (Good Track).',
                'condition' => 'ground_condition==1',
            ];

            $skills[] = [
                'id' => 200162,
                'name_en' => 'Bad Track Condition ○',
                'name_jp' => '道悪○',
                'icon_id' => 10031,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10031.png',
                'stat' => 'Power',
                'value' => '+40',
                'recommendation_status' => 'situational',
                'status_label' => 'Dapat Diambil (Situasional)',
                'desc_en' => 'Moderately increase performance on good, soft, and heavy ground.',
                'desc_id' => 'Meningkatkan status Power sebesar +40 jika putaran balapan bergulir pada kondisi lintasan lembap, berat, atau becek (Yielding / Soft / Heavy).',
                'condition' => 'ground_condition==2@ground_condition==3@ground_condition==4',
            ];

            $skills[] = [
                'id' => 200212,
                'name_en' => 'Sunny Days ○',
                'name_jp' => '晴れの日○',
                'icon_id' => 10041,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                'stat' => 'Guts',
                'value' => '+40',
                'recommendation_status' => 'situational',
                'status_label' => 'Dapat Diambil (Situasional)',
                'desc_en' => 'Moderately increase performance in sunny weather.',
                'desc_id' => 'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca cerah (Sunny).',
                'condition' => 'weather==1',
            ];

            $skills[] = [
                'id' => 200222,
                'name_en' => 'Cloudy Days ○',
                'name_jp' => '曇りの日○',
                'icon_id' => 10041,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                'stat' => 'Guts',
                'value' => '+40',
                'recommendation_status' => 'situational',
                'status_label' => 'Dapat Diambil (Situasional)',
                'desc_en' => 'Moderately increase performance in cloudy weather.',
                'desc_id' => 'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca berawan (Cloudy).',
                'condition' => 'weather==2',
            ];

            $skills[] = [
                'id' => 200232,
                'name_en' => 'Rainy Days ○',
                'name_jp' => '雨の日○',
                'icon_id' => 10041,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                'stat' => 'Guts',
                'value' => '+40',
                'recommendation_status' => 'situational',
                'status_label' => 'Dapat Diambil (Situasional)',
                'desc_en' => 'Moderately increase performance in rainy weather.',
                'desc_id' => 'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca hujan (Rainy).',
                'condition' => 'weather==3',
            ];

            $skills[] = [
                'id' => 200242,
                'name_en' => 'Snowy Days ○',
                'name_jp' => '雪の日○',
                'icon_id' => 10041,
                'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                'stat' => 'Guts',
                'value' => '+40',
                'recommendation_status' => 'situational',
                'status_label' => 'Dapat Diambil (Situasional)',
                'desc_en' => 'Moderately increase performance in snowy weather.',
                'desc_id' => 'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca salju (Snowy).',
                'condition' => 'weather==4',
            ];
        } else {
            // Fixed / Confirmed Weather & Track condition (e.g. Champions Meeting)
            if ($event->weather === 'sunny') {
                $skills[] = [
                    'id' => 200212,
                    'name_en' => 'Sunny Days ○',
                    'name_jp' => '晴れの日○',
                    'icon_id' => 10041,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                    'stat' => 'Guts',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance in sunny weather.',
                    'desc_id' => 'Meningkatkan status Guts sebesar +40 saat berlomba di cuaca cerah (Sunny).',
                    'condition' => 'weather==1',
                ];
            } elseif ($event->weather === 'cloudy') {
                $skills[] = [
                    'id' => 200222,
                    'name_en' => 'Cloudy Days ○',
                    'name_jp' => '曇りの日○',
                    'icon_id' => 10041,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                    'stat' => 'Guts',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance in cloudy weather.',
                    'desc_id' => 'Meningkatkan status Guts sebesar +40 saat berlomba di cuaca berawan (Cloudy).',
                    'condition' => 'weather==2',
                ];
            } elseif ($event->weather === 'rainy') {
                $skills[] = [
                    'id' => 200232,
                    'name_en' => 'Rainy Days ○',
                    'name_jp' => '雨の日○',
                    'icon_id' => 10041,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                    'stat' => 'Guts',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance in rainy weather.',
                    'desc_id' => 'Meningkatkan status Guts sebesar +40 saat berlomba di cuaca hujan (Rainy).',
                    'condition' => 'weather==3',
                ];
            } elseif ($event->weather === 'snowy') {
                $skills[] = [
                    'id' => 200242,
                    'name_en' => 'Snowy Days ○',
                    'name_jp' => '雪の日○',
                    'icon_id' => 10041,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10041.png',
                    'stat' => 'Guts',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance in snowy weather.',
                    'desc_id' => 'Meningkatkan status Guts sebesar +40 saat berlomba di cuaca salju (Snowy).',
                    'condition' => 'weather==4',
                ];
            }

            if ($event->track_condition === 'good') {
                $skills[] = [
                    'id' => 200152,
                    'name_en' => 'Good Track Condition ○',
                    'name_jp' => '良バ場○',
                    'icon_id' => 10031,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10031.png',
                    'stat' => 'Power',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance on firm ground.',
                    'desc_id' => 'Meningkatkan status Power sebesar +40 saat kondisi lintasan baik / kering (Good Track).',
                    'condition' => 'ground_condition==1',
                ];
            } elseif (in_array($event->track_condition, ['yielding', 'soft', 'heavy'], true)) {
                $skills[] = [
                    'id' => 200162,
                    'name_en' => 'Bad Track Condition ○',
                    'name_jp' => '道悪○',
                    'icon_id' => 10031,
                    'icon_url' => 'https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_10031.png',
                    'stat' => 'Power',
                    'value' => '+40',
                    'recommendation_status' => 'recommended',
                    'status_label' => 'Direkomendasikan (Pasti Aktif)',
                    'desc_en' => 'Moderately increase performance on good, soft, and heavy ground.',
                    'desc_id' => 'Meningkatkan status Power sebesar +40 saat kondisi lintasan agak lembap, becek, atau berat (Yielding / Soft / Heavy).',
                    'condition' => 'ground_condition==2@ground_condition==3@ground_condition==4',
                ];
            }
        }

        $randomDisclaimer = null;
        if ($hasRandomConditions) {
            $randomDisclaimer = 'Catatan Khusus League of Heroes: Cuaca dan Kondisi Lintasan bersifat acak di setiap pertandingan. Skill cuaca (Sunny Days, Cloudy Days, Rainy Days, Snowy Days) dan kondisi lintasan (Good Track Condition, Bad Track Condition) berstatus "Dapat Diambil (Situasional)", bukan rekomendasi utama, karena bergantung pada hasil acak saat putaran balapan berlangsung.';
        }

        return [
            'is_fully_confirmed' => true,
            'has_recommendations' => true,
            'disclaimer' => null,
            'has_random_conditions' => $hasRandomConditions,
            'random_disclaimer' => $randomDisclaimer,
            'skills' => $skills,
        ];
    }
}
