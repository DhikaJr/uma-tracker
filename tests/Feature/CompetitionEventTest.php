<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CompetitionEvent;
use App\Support\CompetitionGreenSkillRecommender;
use App\Support\CompetitionRacetrackHelper;
use App\Support\CompetitionStatRecoveryRecommender;
use Database\Seeders\CompetitionEventSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompetitionEventTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that CompetitionEventSeeder seeds exactly six official events.
     */
    public function test_seeder_produces_exactly_six_official_events(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $this->assertSame(6, CompetitionEvent::count());

        $first = CompetitionEvent::where('year', 2026)->where('month', 10)->first();
        $this->assertNotNull($first);
        $this->assertSame('Champions Meeting CLASSIC', $first->event_name);
        $this->assertSame('champions_meeting', $first->event_type);
        $this->assertSame('2026-10-20', $first->start_date?->format('Y-m-d'));
        $this->assertSame('Kyoto', $first->venue);
        $this->assertSame(2200, $first->distance);

        $last = CompetitionEvent::where('year', 2027)->where('month', 3)->first();
        $this->assertNotNull($last);
        $this->assertSame('Champions Meeting MILE', $last->event_name);
        $this->assertSame('no_debuff', $last->special_rule);
        $this->assertNull($last->venue);
    }

    /**
     * Test that re-running the seeder is idempotent and never creates duplicate rows.
     */
    public function test_seeder_is_idempotent(): void
    {
        $this->seed(CompetitionEventSeeder::class);
        $this->assertSame(6, CompetitionEvent::count());

        // Run seeder second time
        $this->seed(CompetitionEventSeeder::class);
        $this->assertSame(6, CompetitionEvent::count());

        // Run seeder third time
        $this->seed(CompetitionEventSeeder::class);
        $this->assertSame(6, CompetitionEvent::count());
    }

    /**
     * Test that the API returns all events in the correct chronological order.
     */
    public function test_api_returns_all_events_in_correct_chronological_order(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $response = $this->getJson('/api/competition-events');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $events = $response->json('data');
        $this->assertIsArray($events);
        $this->assertCount(6, $events);

        // 1. Oct 2026 (exact: 2026-10-20)
        $this->assertSame(2026, $events[0]['year']);
        $this->assertSame(10, $events[0]['month']);
        $this->assertSame('exact', $events[0]['period']);
        $this->assertSame('champions_meeting', $events[0]['event_type']);
        $this->assertSame('Champions Meeting CLASSIC', $events[0]['event_name']);

        // 2. Late Nov 2026
        $this->assertSame(2026, $events[1]['year']);
        $this->assertSame(11, $events[1]['month']);
        $this->assertSame('late', $events[1]['period']);
        $this->assertSame('league_of_heroes', $events[1]['event_type']);

        // 3. Late Dec 2026
        $this->assertSame(2026, $events[2]['year']);
        $this->assertSame(12, $events[2]['month']);
        $this->assertSame('late', $events[2]['period']);
        $this->assertSame('champions_meeting', $events[2]['event_type']);
        $this->assertSame('Champions Meeting LONG', $events[2]['event_name']);

        // 4. Late Jan 2027
        $this->assertSame(2027, $events[3]['year']);
        $this->assertSame(1, $events[3]['month']);
        $this->assertSame('late', $events[3]['period']);
        $this->assertSame('champions_meeting', $events[3]['event_type']);
        $this->assertSame('Champions Meeting CLASSIC', $events[3]['event_name']);

        // 5. Mid Feb 2027
        $this->assertSame(2027, $events[4]['year']);
        $this->assertSame(2, $events[4]['month']);
        $this->assertSame('mid', $events[4]['period']);
        $this->assertSame('league_of_heroes', $events[4]['event_type']);

        // 6. Late Mar 2027
        $this->assertSame(2027, $events[5]['year']);
        $this->assertSame(3, $events[5]['month']);
        $this->assertSame('late', $events[5]['period']);
        $this->assertSame('champions_meeting', $events[5]['event_type']);
        $this->assertSame('Champions Meeting MILE', $events[5]['event_name']);
    }

    /**
     * Test that NULL columns strictly remain NULL in JSON serialization without defaulting.
     */
    public function test_null_columns_remain_null_in_json_serialization(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $response = $this->getJson('/api/competition-events');
        $response->assertOk();

        $events = $response->json('data');

        // Jan 2027 event (Index 3)
        $janEvent = $events[3];
        $this->assertNull($janEvent['venue']);
        $this->assertNull($janEvent['distance']);
        $this->assertNull($janEvent['direction']);
        $this->assertNull($janEvent['season']);
        $this->assertNull($janEvent['time_of_day']);
        $this->assertNull($janEvent['weather']);
        $this->assertNull($janEvent['track_condition']);
        $this->assertNull($janEvent['special_rule']);
        $this->assertNull($janEvent['start_date']);

        // Feb 2027 event (Index 4)
        $febEvent = $events[4];
        $this->assertNull($febEvent['venue']);
        $this->assertNull($febEvent['distance']);
        $this->assertNull($febEvent['direction']);
        $this->assertNull($febEvent['season']);
        $this->assertNull($febEvent['time_of_day']);
        $this->assertNull($febEvent['weather']);
        $this->assertNull($febEvent['track_condition']);
        $this->assertNull($febEvent['special_rule']);
        $this->assertNull($febEvent['start_date']);
    }

    /**
     * Test that explicit 'random' values for weather and track condition are preserved.
     */
    public function test_random_values_remain_explicitly_random(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $response = $this->getJson('/api/competition-events');
        $response->assertOk();

        // Late Nov 2026 League of Heroes (Index 1)
        $novEvent = $response->json('data.1');
        $this->assertSame('league_of_heroes', $novEvent['event_type']);
        $this->assertSame('random', $novEvent['weather']);
        $this->assertSame('random', $novEvent['track_condition']);
    }

    /**
     * Test that Champions Meeting MILE in March 2027 has special_rule = "no_debuff",
     * and League of Heroes in Feb 2027 strictly has special_rule = NULL.
     */
    public function test_special_rule_assignment_integrity(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $response = $this->getJson('/api/competition-events');
        $response->assertOk();

        $events = $response->json('data');

        // Feb 2027 LoH must NOT have special_rule
        $febEvent = $events[4];
        $this->assertSame('League of Heroes', $febEvent['event_name']);
        $this->assertNull($febEvent['special_rule']);

        // Mar 2027 CM MILE must have special_rule = "no_debuff"
        $marEvent = $events[5];
        $this->assertSame('Champions Meeting MILE', $marEvent['event_name']);
        $this->assertSame('no_debuff', $marEvent['special_rule']);
    }

    /**
     * Test exact date vs period-based date serialization.
     */
    public function test_date_serialization_integrity(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $response = $this->getJson('/api/competition-events');
        $response->assertOk();

        $events = $response->json('data');

        // Oct 2026 has exact start_date
        $this->assertSame('exact', $events[0]['period']);
        $this->assertSame('2026-10-20', $events[0]['start_date']);
        $this->assertSame('20 Oktober 2026', $events[0]['date_label']);

        // Nov 2026 has late period without start_date
        $this->assertSame('late', $events[1]['period']);
        $this->assertNull($events[1]['start_date']);
        $this->assertSame('Akhir November 2026', $events[1]['date_label']);

        // Feb 2027 has mid period without start_date
        $this->assertSame('mid', $events[4]['period']);
        $this->assertNull($events[4]['start_date']);
        $this->assertSame('Pertengahan Februari 2027', $events[4]['date_label']);
    }

    /**
     * Test the single event endpoint GET /api/competition-events/{id}.
     */
    public function test_single_competition_event_endpoint(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $first = CompetitionEvent::first();
        $this->assertNotNull($first);

        $response = $this->getJson("/api/competition-events/{$first->id}");
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $first->id)
            ->assertJsonPath('data.event_name', $first->event_name)
            ->assertJsonPath('data.source_name', 'Cygames')
            ->assertJsonPath('data.source_url', 'https://umamusume.jp/news/detail?id=3483');

        // Test 404 for non-existent ID
        $res404 = $this->getJson('/api/competition-events/999999');
        $res404->assertNotFound();
    }

    /**
     * Test the No Debuff Special Rule skill catalog integrity and 100% matched skills.
     */
    public function test_no_debuff_skill_catalog_file_integrity_and_all_skills_matched(): void
    {
        $filePath = resource_path('js/data/noDebuffSkills.json');
        $this->assertFileExists($filePath);

        $json = json_decode(file_get_contents($filePath), true);
        $this->assertIsArray($json);
        $this->assertSame('no_debuff', $json['rule_id']);
        $this->assertSame(55, $json['total_skills']);
        $this->assertCount(55, $json['skills']);
        $this->assertStringContainsString('TIDAK AKAN AKTIF/TERPICU', $json['translated_rule_id']);
        $this->assertStringContainsString('固有スキルおよび進化スキルは対象外', $json['original_rule_jp']);

        // Check required specific skills exist
        $skillNamesJp = array_column($json['skills'], 'original_name_jp');
        $this->assertContains('慧眼', $skillNamesJp);
        $this->assertContains('独占力', $skillNamesJp);
        $this->assertContains('八方にらみ', $skillNamesJp);
        $this->assertContains('アナタヲ・オイカケテ', $skillNamesJp);
        $this->assertContains('至上であれ', $skillNamesJp);
        $this->assertContains('Adventure of 564', $skillNamesJp);
        $this->assertTrue(collect($skillNamesJp)->contains(fn ($name) => strcasecmp($name, 'Drain for Rose') === 0));
        $this->assertContains('Spooky-Scary-Happy', $skillNamesJp);

        // Check each skill has an ID, English name, and icon URL
        foreach ($json['skills'] as $skill) {
            $this->assertArrayHasKey('id', $skill);
            $this->assertArrayHasKey('name_jp', $skill);
            $this->assertArrayHasKey('name_en', $skill);
            $this->assertArrayHasKey('icon_url', $skill);
            $this->assertArrayHasKey('base_duration', $skill);
            $this->assertNotEmpty($skill['name_en']);
            $this->assertStringStartsWith('https://gametora.com/images/umamusume/skill_icons/', $skill['icon_url']);
            $this->assertNotEmpty($skill['base_duration']);
            $this->assertNotEmpty($skill['effects']);
        }

        // Verify specific debuff effect name, value, and target enrichment
        $skillsByEn = collect($json['skills'])->keyBy('name_en');

        // 1. Mystifying Murmur (魅惑のささやき)
        $this->assertTrue($skillsByEn->has('Mystifying Murmur'));
        $mystifying = $skillsByEn->get('Mystifying Murmur');
        $this->assertSame('Instant effect', $mystifying['base_duration']);
        $this->assertSame('Stamina Drain', $mystifying['effects'][0]['name']);
        $this->assertSame('-0.03', $mystifying['effects'][0]['formatted_value']);
        $this->assertSame('All enemy girls ahead of you', $mystifying['effects'][0]['target_name']);

        // 2. Dominator (独占力)
        $this->assertTrue($skillsByEn->has('Dominator'));
        $dominator = $skillsByEn->get('Dominator');
        $this->assertSame('3 s', $dominator['base_duration']);
        $this->assertSame('Decrease Current Speed', $dominator['effects'][0]['name']);
        $this->assertSame('-0.25', $dominator['effects'][0]['formatted_value']);
        $this->assertSame('All enemy girls ahead of you', $dominator['effects'][0]['target_name']);

        // 3. Frenzied Late Surgers (差し駆け引き)
        $this->assertTrue($skillsByEn->has('Frenzied Late Surgers'));
        $frenzied = $skillsByEn->get('Frenzied Late Surgers');
        $this->assertSame('Instant effect', $frenzied['base_duration']);
        $this->assertSame('Increase Rush Time', $frenzied['effects'][0]['name']);
        $this->assertSame('5 s', $frenzied['effects'][0]['formatted_value']);
        $this->assertSame('Rushing enemy Late Surgers', $frenzied['effects'][0]['target_name']);
    }

    /**
     * Test green skill recommendations for fully confirmed October 2026 CM Classic.
     */
    public function test_green_skill_recommendations_for_fully_confirmed_cm_classic_october_2026(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $event = CompetitionEvent::where('year', 2026)->where('month', 10)->firstOrFail();

        $this->assertTrue($event->is_fully_confirmed);
        $recs = $event->recommended_green_skills;

        $this->assertTrue($recs['is_fully_confirmed']);
        $this->assertTrue($recs['has_recommendations']);
        $this->assertFalse($recs['has_random_conditions']);
        $this->assertNull($recs['random_disclaimer']);

        $skillNames = array_column($recs['skills'], 'name_en');
        $this->assertContains('Right-Handed ○', $skillNames);
        $this->assertContains('Kyoto Racecourse ○', $skillNames);
        $this->assertContains('Non-Standard Distance ○', $skillNames);
        $this->assertContains('Fall Runner ○', $skillNames);
        $this->assertContains('Cloudy Days ○', $skillNames);
        $this->assertContains('Good Track Condition ○', $skillNames);

        // All 6 should have recommendation_status 'recommended'
        foreach ($recs['skills'] as $skill) {
            $this->assertSame('recommended', $skill['recommendation_status']);
            $this->assertSame('Direkomendasikan (Pasti Aktif)', $skill['status_label']);
            $this->assertSame('+40', $skill['value']);
            $this->assertNotEmpty($skill['desc_id']);
        }
    }

    /**
     * Test green skill recommendations for November 2026 League of Heroes:
     * Weather & Track are random, so Good Track, Bad Track, and Weather skills must be marked as 'situational' (Dapat Diambil).
     */
    public function test_green_skill_recommendations_for_league_of_heroes_november_2026_with_random_conditions(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $event = CompetitionEvent::where('year', 2026)->where('month', 11)->firstOrFail();

        $this->assertTrue($event->is_fully_confirmed);
        $recs = $event->recommended_green_skills;

        $this->assertTrue($recs['is_fully_confirmed']);
        $this->assertTrue($recs['has_recommendations']);
        $this->assertTrue($recs['has_random_conditions']);
        $this->assertNotNull($recs['random_disclaimer']);
        $this->assertStringContainsString('League of Heroes', $recs['random_disclaimer']);
        $this->assertStringContainsString('Dapat Diambil (Situasional)', $recs['random_disclaimer']);

        $skillsByName = collect($recs['skills'])->keyBy('name_en');

        // Confirmed Fixed Parameters (Recommended)
        $this->assertTrue($skillsByName->has('Right-Handed ○'));
        $this->assertSame('recommended', $skillsByName->get('Right-Handed ○')['recommendation_status']);

        $this->assertTrue($skillsByName->has('Kyoto Racecourse ○'));
        $this->assertSame('recommended', $skillsByName->get('Kyoto Racecourse ○')['recommendation_status']);

        $this->assertTrue($skillsByName->has('Non-Standard Distance ○'));
        $this->assertSame('recommended', $skillsByName->get('Non-Standard Distance ○')['recommendation_status']);

        $this->assertTrue($skillsByName->has('Fall Runner ○'));
        $this->assertSame('recommended', $skillsByName->get('Fall Runner ○')['recommendation_status']);

        // Explicit Random Weather & Track conditions (Situational / Dapat Diambil)
        $situationalNames = [
            'Good Track Condition ○',
            'Bad Track Condition ○',
            'Sunny Days ○',
            'Cloudy Days ○',
            'Rainy Days ○',
            'Snowy Days ○',
        ];

        foreach ($situationalNames as $name) {
            $this->assertTrue($skillsByName->has($name), "Expected {$name} to be in LoH green skills");
            $this->assertSame('situational', $skillsByName->get($name)['recommendation_status']);
            $this->assertSame('Dapat Diambil (Situasional)', $skillsByName->get($name)['status_label']);
        }
    }

    /**
     * Test green skill recommendations for December 2026 CM Long (Nakayama 2500m Winter Sunny Good).
     */
    public function test_green_skill_recommendations_for_cm_long_december_2026(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $event = CompetitionEvent::where('year', 2026)->where('month', 12)->firstOrFail();

        $this->assertTrue($event->is_fully_confirmed);
        $recs = $event->recommended_green_skills;

        $skillNames = array_column($recs['skills'], 'name_en');
        $this->assertContains('Right-Handed ○', $skillNames);
        $this->assertContains('Nakayama Racecourse ○', $skillNames);
        $this->assertContains('Non-Standard Distance ○', $skillNames);
        $this->assertContains('Winter Runner ○', $skillNames);
        $this->assertContains('Sunny Days ○', $skillNames);
        $this->assertContains('Good Track Condition ○', $skillNames);
    }

    /**
     * Test unannounced / partially announced events return disclaimer without speculation.
     */
    public function test_unannounced_events_return_disclaimer_without_speculation(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        // January 2027 CM Classic (Venue and Distance are NULL)
        $event = CompetitionEvent::where('year', 2027)->where('month', 1)->firstOrFail();

        $this->assertFalse($event->is_fully_confirmed);
        $recs = $event->recommended_green_skills;

        $this->assertFalse($recs['is_fully_confirmed']);
        $this->assertFalse($recs['has_recommendations']);
        $this->assertEmpty($recs['skills']);
        $this->assertStringContainsString('Rekomendasi green skill belum tersedia', $recs['disclaimer']);
    }

    /**
     * Test greenSkillsCatalog.json exists and has 26 skills.
     */
    public function test_green_skills_catalog_json_integrity(): void
    {
        $path = resource_path('js/data/greenSkillsCatalog.json');
        $this->assertFileExists($path);

        $json = json_decode((string) file_get_contents($path), true);
        $this->assertIsArray($json);
        $this->assertCount(26, $json);

        // Spot check key skills
        $this->assertArrayHasKey('200012', $json); // Right-Handed ○
        $this->assertArrayHasKey('200062', $json); // Kyoto Racecourse ○
        $this->assertArrayHasKey('200132', $json); // Standard Distance ○
        $this->assertArrayHasKey('200142', $json); // Non-Standard Distance ○
        $this->assertArrayHasKey('200152', $json); // Good Track Condition ○
        $this->assertArrayHasKey('200162', $json); // Bad Track Condition ○
        $this->assertArrayHasKey('200212', $json); // Sunny Days ○
    }

    /**
     * Test racetracksCatalog.json integrity and course details.
     */
    public function test_racetracks_catalog_json_integrity(): void
    {
        $path = resource_path('js/data/racetracksCatalog.json');
        $this->assertFileExists($path);

        $catalog = json_decode((string) file_get_contents($path), true);
        $this->assertIsArray($catalog);
        $this->assertCount(17, $catalog);

        $tracksBySlug = collect($catalog)->keyBy('slug');
        $this->assertTrue($tracksBySlug->has('kyoto'));
        $this->assertTrue($tracksBySlug->has('nakayama'));

        $kyoto = $tracksBySlug->get('kyoto');
        $this->assertSame('Kyoto', $kyoto['name_en']);
        $this->assertSame('京都', $kyoto['name_ja']);
        $this->assertNotEmpty($kyoto['courses']);

        // Spot check Kyoto 2200m turf outer (Course ID 10808)
        $course2200 = collect($kyoto['courses'])->firstWhere('id', 10808);
        $this->assertNotNull($course2200);
        $this->assertSame(2200, $course2200['length']);
        $this->assertSame('turf', $course2200['surface']);
        $this->assertSame('outer', $course2200['inout_str']);
        $this->assertSame('https://gametora.com/umamusume/racetracks/kyoto#2200-turf-outer', $course2200['gametora_url']);
        $this->assertCount(4, $course2200['phases']);
        $this->assertArrayHasKey('simple', $course2200['image_urls']);
        $this->assertArrayHasKey('full', $course2200['image_urls']);
    }

    /**
     * Test that API /api/competition-events attaches official GameTora racetrack course details
     * for fully confirmed events (#1, #2, #3), and leaves it NULL for unconfirmed events (#4, #5, #6).
     */
    public function test_racetrack_course_attachment_on_events_api(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $response = $this->getJson('/api/competition-events');
        $response->assertOk();

        $events = $response->json('data');
        $this->assertCount(6, $events);

        // Event #1: Oct 2026 CM Classic (Kyoto 2200m Turf Outer)
        $this->assertNotNull($events[0]['racetrack_course']);
        $this->assertSame('kyoto', $events[0]['racetrack_course']['track_slug']);
        $this->assertSame(10808, $events[0]['racetrack_course']['course']['id']);
        $this->assertSame('https://gametora.com/umamusume/racetracks/kyoto#2200-turf-outer', $events[0]['racetrack_course']['gametora_url']);
        $this->assertSame(2200, $events[0]['racetrack_course']['course']['length']);

        // Event #2: Nov 2026 LoH (Kyoto 3000m Turf Outer)
        $this->assertNotNull($events[1]['racetrack_course']);
        $this->assertSame('kyoto', $events[1]['racetrack_course']['track_slug']);
        $this->assertSame(10810, $events[1]['racetrack_course']['course']['id']);
        $this->assertSame('https://gametora.com/umamusume/racetracks/kyoto#3000-turf-outer', $events[1]['racetrack_course']['gametora_url']);
        $this->assertSame(3000, $events[1]['racetrack_course']['course']['length']);

        // Event #3: Dec 2026 CM Long (Nakayama 2500m Turf Inner)
        $this->assertNotNull($events[2]['racetrack_course']);
        $this->assertSame('nakayama', $events[2]['racetrack_course']['track_slug']);
        $this->assertSame(10506, $events[2]['racetrack_course']['course']['id']);
        $this->assertSame('https://gametora.com/umamusume/racetracks/nakayama#2500-turf-inner', $events[2]['racetrack_course']['gametora_url']);
        $this->assertSame(2500, $events[2]['racetrack_course']['course']['length']);

        // Events #4, #5, #6: Unannounced events must strictly have NULL racetrack_course
        $this->assertNull($events[3]['racetrack_course']);
        $this->assertNull($events[4]['racetrack_course']);
        $this->assertNull($events[5]['racetrack_course']);
    }

    public function test_event_key_lifecycle_and_in_place_update_without_duplication(): void
    {
        $this->seed(CompetitionEventSeeder::class);
        $this->assertSame(6, CompetitionEvent::count());

        $janEvent = CompetitionEvent::where('event_key', 'cm-2027-01')->first();
        $this->assertNotNull($janEvent);
        $this->assertSame('late', $janEvent->period);
        $this->assertNull($janEvent->venue);
        $this->assertNull($janEvent->start_date);

        // Update when details become confirmed
        CompetitionEvent::updateOrCreate(
            ['event_key' => 'cm-2027-01'],
            [
                'period' => 'exact',
                'start_date' => '2027-01-24',
                'venue' => 'Tokyo',
            ]
        );

        $this->assertSame(6, CompetitionEvent::count());

        $updated = CompetitionEvent::where('event_key', 'cm-2027-01')->first();
        $this->assertNotNull($updated);
        $this->assertSame('exact', $updated->period);
        $this->assertSame('2027-01-24', $updated->start_date?->format('Y-m-d'));
        $this->assertSame('Tokyo', $updated->venue);
    }

    public function test_competition_racetrack_helper_surface_and_candidate_resolution(): void
    {
        // 1. When surface, venue, or distance is null, empty, or whitespace-only, both methods MUST return null
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 2200,
            'surface' => null,
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 2200,
            'surface' => '',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 2200,
            'surface' => "   \t\n  ",
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('Kyoto', 2200, ''));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('Kyoto', 2200, null));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('Kyoto', 2200, "   \t "));

        // Venue whitespace tests
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => '   ',
            'distance' => 2200,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => " \t\n ",
            'distance' => 2200,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('   ', 2200, 'turf'));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl(" \t\n ", 2200, 'turf'));

        // Distance whitespace & non-positive numeric tests
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => '   ',
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => " \t\n ",
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 0,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => -2200,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        // Distance decimal tests (2200.9)
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 2200.9,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => '2200.9',
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('Kyoto', 2200.9, 'turf'));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('Kyoto', '2200.9', 'turf'));

        // Venue & Surface array type tests
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => ['Kyoto'],
            'distance' => 2200,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 2200,
            'surface' => ['turf'],
            'direction' => 'right_outer',
        ]));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl(['Kyoto'], 2200, 'turf'));
        $this->assertNull(CompetitionRacetrackHelper::buildGameToraUrl('Kyoto', 2200, ['turf']));

        // 2. Single candidate track (Kyoto 2200m Turf) returns course even when direction is null
        $singleCandidate = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 2200,
            'surface' => 'turf',
            'direction' => null,
        ]);
        $this->assertNotNull($singleCandidate);
        $this->assertSame(10808, $singleCandidate['course']['id']);
        $this->assertSame(2200, $singleCandidate['course']['length']);

        // 3. Multi-candidate track (Kyoto 1600m Turf inner and outer)
        // Without direction -> MUST return null (no speculative picking)
        $noDirection = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1600,
            'surface' => 'turf',
            'direction' => null,
        ]);
        $this->assertNull($noDirection);

        $emptyDirection = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1600,
            'surface' => 'turf',
            'direction' => '',
        ]);
        $this->assertNull($emptyDirection);

        // With right_inner -> returns inner course (10805)
        $innerCourse = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1600,
            'surface' => 'turf',
            'direction' => 'right_inner',
        ]);
        $this->assertNotNull($innerCourse);
        $this->assertSame('inner', $innerCourse['course']['inout_str']);

        // With right_outer -> returns outer course (10806)
        $outerCourse = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1600,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]);
        $this->assertNotNull($outerCourse);
        $this->assertSame('outer', $outerCourse['course']['inout_str']);

        // Multi-candidate track (Kyoto 1400m Turf inner and outer)
        $noDir1400 = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1400,
            'surface' => 'turf',
            'direction' => null,
        ]);
        $this->assertNull($noDir1400);

        $inner1400 = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1400,
            'surface' => 'turf',
            'direction' => 'right_inner',
        ]);
        $this->assertNotNull($inner1400);
        $this->assertSame('inner', $inner1400['course']['inout_str']);

        $outer1400 = CompetitionRacetrackHelper::findCourse([
            'venue' => 'Kyoto',
            'distance' => 1400,
            'surface' => 'turf',
            'direction' => 'right_outer',
        ]);
        $this->assertNotNull($outer1400);
        $this->assertSame('outer', $outer1400['course']['inout_str']);
    }

    public function test_loh_november_2026_with_random_conditions_is_treated_as_fully_confirmed(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $loh = CompetitionEvent::where('event_key', 'loh-2026-11')->firstOrFail();

        $this->assertSame('random', $loh->weather);
        $this->assertSame('random', $loh->track_condition);

        // Assert isFullyConfirmed on both recommenders
        $this->assertTrue(CompetitionGreenSkillRecommender::isFullyConfirmed($loh));
        $this->assertTrue(CompetitionStatRecoveryRecommender::isFullyConfirmed($loh));
        $this->assertTrue($loh->is_fully_confirmed);

        $guide = CompetitionStatRecoveryRecommender::getRecommendations($loh);
        $this->assertTrue($guide['is_fully_confirmed']);
        $this->assertTrue($guide['has_guide_reference']);
        $this->assertSame('https://gamewith.jp/uma-musume/article/show/574934', $guide['source_url']);
        $this->assertNotEmpty($guide['stat_tiers']);
        $this->assertNotEmpty($guide['reference_recovery_catalog']);
    }

    public function test_recovery_skills_catalog_integrity_and_excludes_non_recovery_skills(): void
    {
        $path = resource_path('js/data/recoverySkillsCatalog.json');
        $this->assertFileExists($path);

        $catalog = json_decode((string) file_get_contents($path), true);
        $this->assertIsArray($catalog);
        $this->assertNotEmpty($catalog);

        $namesJp = array_column($catalog, 'name_jp');

        // Curvature must be EXCLUDED
        $this->assertNotContains('弧線のプロフェッサー', $namesJp);

        // Maestro must be INCLUDED
        $this->assertContains('円弧のマエストロ', $namesJp);

        // Breath of Fresh Air and Cooldown must be two distinct entries
        $this->assertContains('好転一息', $namesJp);
        $this->assertContains('クールダウン', $namesJp);

        $bofa = null;
        $cooldown = null;
        foreach ($catalog as $skill) {
            // Verify effect_type is always stamina_recovery
            $this->assertSame('stamina_recovery', $skill['effect_type']);

            // Verify heal_value is consistent with raw_effect_value
            $expectedHeal = '+'.number_format($skill['raw_effect_value'] / 100, 1).'%';
            $this->assertSame($expectedHeal, $skill['heal_value']);

            if ($skill['name_jp'] === '好転一息') {
                $bofa = $skill;
            }
            if ($skill['name_jp'] === 'クールダウン') {
                $cooldown = $skill;
            }
        }

        $this->assertNotNull($bofa);
        $this->assertNotNull($cooldown);
        $this->assertNotEquals($bofa['id'], $cooldown['id']);
        $this->assertNotEquals($bofa['distance_category'], $cooldown['distance_category']);

        // Verify condition_groups exists on every entry for full modal detail
        foreach ($catalog as $skill) {
            $this->assertArrayHasKey('condition_groups', $skill);
            $this->assertNotEmpty($skill['condition_groups']);
            $this->assertArrayHasKey('effects', $skill['condition_groups'][0]);
            $this->assertNotEmpty($skill['condition_groups'][0]['effects']);
            $this->assertArrayHasKey('is_inherited', $skill);
        }

        // Verify distinct Original Unique vs Inherited Unique entries
        $catalogById = array_column($catalog, null, 'id');

        // Illuminate You (Original Costume Unique)
        $this->assertArrayHasKey(110741, $catalogById);
        $illuminateOrig = $catalogById[110741];
        $this->assertFalse($illuminateOrig['is_inherited']);
        $this->assertSame('Unique (Costume Original)', $illuminateOrig['rarity_label']);
        $this->assertSame('Original', $illuminateOrig['version_label']);
        $this->assertSame('+7.5%', $illuminateOrig['heal_value']);
        $this->assertCount(2, $illuminateOrig['condition_groups']);

        // Illuminate You (Inherited Costume Unique)
        $this->assertArrayHasKey(910741, $catalogById);
        $illuminateInh = $catalogById[910741];
        $this->assertTrue($illuminateInh['is_inherited']);
        $this->assertSame('Unique (Costume Inherited)', $illuminateInh['rarity_label']);
        $this->assertSame('Inherited (Warisan)', $illuminateInh['version_label']);
        $this->assertSame('+3.5%', $illuminateInh['heal_value']);
        $this->assertSame(110741, $illuminateInh['parent_id']);
        $this->assertCount(2, $illuminateInh['condition_groups']);

        // Arrow of Gold, Break up the Dark Clouds (Original Costume Unique)
        $this->assertArrayHasKey(110671, $catalogById);
        $arrowOrig = $catalogById[110671];
        $this->assertFalse($arrowOrig['is_inherited']);
        $this->assertSame('Unique (Costume Original)', $arrowOrig['rarity_label']);
        $this->assertSame('Original', $arrowOrig['version_label']);
        $this->assertSame('+3.5%', $arrowOrig['heal_value']);

        // Arrow of Gold, Break up the Dark Clouds (Inherited Costume Unique)
        $this->assertArrayHasKey(910671, $catalogById);
        $arrowInh = $catalogById[910671];
        $this->assertTrue($arrowInh['is_inherited']);
        $this->assertSame('Unique (Costume Inherited)', $arrowInh['rarity_label']);
        $this->assertSame('Inherited (Warisan)', $arrowInh['version_label']);
        $this->assertSame('+0.5%', $arrowInh['heal_value']);
        $this->assertSame(110671, $arrowInh['parent_id']);

        // Purity of Heart (3★ Original) vs Pure Heart (Inherited)
        $this->assertArrayHasKey(100451, $catalogById);
        $purityOrig = $catalogById[100451];
        $this->assertFalse($purityOrig['is_inherited']);
        $this->assertSame('Unique (Original)', $purityOrig['rarity_label']);
        $this->assertSame('+7.5%', $purityOrig['heal_value']);

        $this->assertArrayHasKey(900451, $catalogById);
        $pureHeartInh = $catalogById[900451];
        $this->assertTrue($pureHeartInh['is_inherited']);
        $this->assertSame('Unique (Inherited)', $pureHeartInh['rarity_label']);
        $this->assertSame('+3.5%', $pureHeartInh['heal_value']);

        // Verify character attribution labels on Unique Original and Unique Warisan (Inherited)
        $this->assertSame("Mejiro Bright (Costume)'s unique", $illuminateOrig['character_label']);
        $this->assertSame('Mejiro Bright', $illuminateOrig['character_name']);
        $this->assertSame(107402, $illuminateOrig['character_id']);

        $this->assertSame("Mejiro Bright (Costume Warisan)'s unique", $illuminateInh['character_label']);
        $this->assertSame('Mejiro Bright', $illuminateInh['character_name']);
        $this->assertSame(107402, $illuminateInh['character_id']);

        $this->assertSame("Satono Diamond (Costume)'s unique", $arrowOrig['character_label']);
        $this->assertSame("Satono Diamond (Costume Warisan)'s unique", $arrowInh['character_label']);

        $this->assertSame("Super Creek (Original)'s unique", $purityOrig['character_label']);
        $this->assertSame("Super Creek (Warisan)'s unique", $pureHeartInh['character_label']);

        // introduction: My body (ID 10321) & U=ma2 Inherited (ID 900321)
        $this->assertArrayHasKey(10321, $catalogById);
        $tachyonOrig = $catalogById[10321];
        $this->assertSame("Agnes Tachyon (Original)'s unique", $tachyonOrig['character_label']);
        $this->assertSame('Agnes Tachyon', $tachyonOrig['character_name']);
        $this->assertSame(103201, $tachyonOrig['character_id']);

        $this->assertArrayHasKey(900321, $catalogById);
        $tachyonInh = $catalogById[900321];
        $this->assertSame("Agnes Tachyon (Warisan)'s unique", $tachyonInh['character_label']);

        // Clear Heart (ID 10451)
        $this->assertArrayHasKey(10451, $catalogById);
        $clearHeart = $catalogById[10451];
        $this->assertSame("Super Creek (Original)'s unique", $clearHeart['character_label']);

        // Ready, Steady, Go! (ID 10521) & Super-Duper Climax Inherited (ID 900521)
        $this->assertArrayHasKey(10521, $catalogById);
        $uraraOrig = $catalogById[10521];
        $this->assertSame("Haru Urara (Original)'s unique", $uraraOrig['character_label']);

        $this->assertArrayHasKey(900521, $catalogById);
        $uraraInh = $catalogById[900521];
        $this->assertSame("Haru Urara (Warisan)'s unique", $uraraInh['character_label']);

        // Verify distance_diff_rate translation in catalog (Sleeping Lion ID 200621)
        $this->assertArrayHasKey(200621, $catalogById);
        $sleepingLion = $catalogById[200621];
        $this->assertStringNotContainsString('distance_diff_rate', $sleepingLion['activation_condition_id']);
        $this->assertStringContainsString('rombongan belakang', $sleepingLion['activation_condition_id']);
        $this->assertStringContainsString('rentang jarak >= 75%', $sleepingLion['activation_condition_id']);

        // Verify all 50 unique skills have non-empty character_label
        $uniqueCount = 0;
        foreach ($catalog as $s) {
            if ($s['is_inherited'] || in_array($s['rarity'], [3, 4, 5], true)) {
                $uniqueCount++;
                $this->assertNotNull($s['character_label'], "Skill {$s['id']} ({$s['name_en']}) missing character_label");
                $this->assertNotEmpty($s['character_name'], "Skill {$s['id']} ({$s['name_en']}) missing character_name");
            }
        }
        $this->assertSame(50, $uniqueCount);
    }

    public function test_verified_gamewith_guides_urls_and_stat_tiers(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        // CM Oct 2026 (Kyoto 2200m)
        $cmOct = CompetitionEvent::where('event_key', 'cm-2026-10')->firstOrFail();
        $recOct = $cmOct->recommended_build_guide;
        $this->assertTrue($recOct['has_guide_reference']);
        $this->assertSame('https://gamewith.jp/uma-musume/article/show/572401', $recOct['source_url']);
        $this->assertSame('GameWith', $recOct['source_name']);
        $this->assertCount(2, $recOct['stat_tiers']);
        $this->assertSame('2000', $recOct['stat_tiers'][0]['speed']);
        $this->assertSame('1400', $recOct['stat_tiers'][0]['stamina']);

        // LoH Nov 2026 (Kyoto 3000m)
        $lohNov = CompetitionEvent::where('event_key', 'loh-2026-11')->firstOrFail();
        $recNov = $lohNov->recommended_build_guide;
        $this->assertTrue($recNov['has_guide_reference']);
        $this->assertSame('https://gamewith.jp/uma-musume/article/show/574934', $recNov['source_url']);
        $this->assertTrue($recNov['stat_tiers'][1]['is_provisional']);

        // CM Dec 2026 (Nakayama 2500m)
        $cmDec = CompetitionEvent::where('event_key', 'cm-2026-12')->firstOrFail();
        $recDec = $cmDec->recommended_build_guide;
        $this->assertTrue($recDec['has_guide_reference']);
        $this->assertSame('https://gamewith.jp/uma-musume/article/show/578925', $recDec['source_url']);
        $this->assertStringContainsString('Gold Recovery 1', $recDec['stat_tiers'][0]['stamina']);
        $this->assertStringContainsString('Gold Recovery 1', $recDec['stat_tiers'][1]['stamina']);
        $this->assertNotNull($recDec['recovery_guide']);
        $this->assertStringContainsString('Gold Recovery', implode(' ', $recDec['recovery_guide']['recommendations']));
    }

    public function test_unannounced_events_and_events_without_community_guide_do_not_speculate(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        // 1. Unannounced event (Jan 2027)
        $cmJan = CompetitionEvent::where('event_key', 'cm-2027-01')->firstOrFail();
        $this->assertFalse($cmJan->is_fully_confirmed);

        $recJan = $cmJan->recommended_build_guide;
        $this->assertFalse($recJan['is_fully_confirmed']);
        $this->assertFalse($recJan['has_guide_reference']);
        $this->assertEmpty($recJan['stat_tiers']);
        $this->assertNull($recJan['recovery_guide']);
        $this->assertEmpty($recJan['reference_recovery_catalog']);
        $this->assertSame('Rekomendasi target stats dan kebutuhan recovery belum ditampilkan karena detail lintasan dan jarak resmi belum diumumkan secara lengkap oleh Cygames.', $recJan['disclaimer']);

        // 2. Event with confirmed track but NO community guide entry
        $eventNoGuide = CompetitionEvent::create([
            'event_key' => 'cm-2099-99',
            'event_type' => 'champions_meeting',
            'event_name' => 'Custom Future Event',
            'year' => 2099,
            'month' => 9,
            'period' => 'late',
            'date_label' => 'Akhir September 2099',
            'venue' => 'Tokyo',
            'surface' => 'turf',
            'distance' => 2400,
            'distance_category' => 'medium',
            'direction' => 'left',
            'season' => 'autumn',
        ]);

        $this->assertTrue($eventNoGuide->is_fully_confirmed);

        $recNoGuide = $eventNoGuide->recommended_build_guide;
        $this->assertTrue($recNoGuide['is_fully_confirmed']);
        $this->assertFalse($recNoGuide['has_guide_reference']);
        $this->assertEmpty($recNoGuide['stat_tiers']);
        $this->assertNull($recNoGuide['recovery_guide']);
        $this->assertEmpty($recNoGuide['reference_recovery_catalog']);
        $this->assertSame('Referensi rekomendasi belum tersedia', $recNoGuide['disclaimer']);
    }

    /**
     * Test classification separating primary recovery skills from mixed-effect recovery skills.
     */
    public function test_recovery_catalog_classification_separates_primary_recovery_from_mixed_effects(): void
    {
        $catalog = CompetitionStatRecoveryRecommender::getRecoveryCatalog();
        $this->assertNotEmpty($catalog, 'Recovery skills catalog must not be empty');

        $catalogById = array_column($catalog, null, 'id');

        // Reference Skill 1: Arc Maestro (円弧のマエストロ / ID 200351) MUST be in recovery_only
        $this->assertArrayHasKey(200351, $catalogById, 'Arc Maestro (200351) must exist in catalog');
        $arcMaestro = $catalogById[200351];
        $this->assertSame('recovery_only', $arcMaestro['recovery_category']);
        $this->assertSame('Recovery Utama', $arcMaestro['recovery_category_label']);
        $this->assertFalse($arcMaestro['is_mixed_effect']);
        $this->assertEmpty($arcMaestro['non_recovery_effects']);

        // Reference Skill 2: introduction: My body (ID 10321) MUST be in mixed_effect_recovery, NOT recovery_only
        $this->assertArrayHasKey(10321, $catalogById, 'introduction: My body (10321) must exist in catalog');
        $tachyonSkill = $catalogById[10321];
        $this->assertSame('mixed_effect_recovery', $tachyonSkill['recovery_category']);
        $this->assertSame('Skill Multi-Efek dengan Recovery', $tachyonSkill['recovery_category_label']);
        $this->assertTrue($tachyonSkill['is_mixed_effect']);
        $this->assertNotEmpty($tachyonSkill['non_recovery_effects']);

        // Dynamic validation: Split catalog dynamically without hardcoding static totals
        $recoveryOnlySkills = array_filter($catalog, fn (array $s): bool => ($s['recovery_category'] ?? null) === 'recovery_only');
        $mixedEffectSkills = array_filter($catalog, fn (array $s): bool => ($s['recovery_category'] ?? null) === 'mixed_effect_recovery');

        $this->assertNotEmpty($recoveryOnlySkills, 'Must have skills in recovery_only category');
        $this->assertNotEmpty($mixedEffectSkills, 'Must have skills in mixed_effect_recovery category');
        $this->assertSame(
            count($catalog),
            count($recoveryOnlySkills) + count($mixedEffectSkills),
            'Every skill in the catalog must belong to either recovery_only or mixed_effect_recovery'
        );

        // Verify that Arc Maestro is strictly in recoveryOnlySkills and NOT in mixedEffectSkills
        $recoveryOnlyIds = array_column($recoveryOnlySkills, 'id');
        $mixedEffectIds = array_column($mixedEffectSkills, 'id');

        $this->assertContains(200351, $recoveryOnlyIds);
        $this->assertNotContains(200351, $mixedEffectIds);

        // Verify that introduction: My body is strictly in mixedEffectSkills and NOT in recoveryOnlySkills
        $this->assertContains(10321, $mixedEffectIds);
        $this->assertNotContains(10321, $recoveryOnlyIds);

        // Verify that EVERY skill in recovery_only only has valid recovery effects (type 9)
        foreach ($recoveryOnlySkills as $skill) {
            $this->assertFalse($skill['is_mixed_effect'], "Skill {$skill['id']} in recovery_only must have is_mixed_effect=false");
            $this->assertEmpty($skill['non_recovery_effects'], "Skill {$skill['id']} in recovery_only must have empty non_recovery_effects");

            $allEffects = [];
            foreach ($skill['condition_groups'] as $group) {
                foreach ($group['effects'] as $effect) {
                    $allEffects[] = $effect;
                }
            }

            $this->assertNotEmpty($allEffects, "Skill {$skill['id']} must have at least one effect");
            foreach ($allEffects as $effect) {
                $this->assertSame(9, (int) $effect['type'], "Skill {$skill['id']} ({$skill['name_en']}) in recovery_only has non-recovery effect type {$effect['type']}");
            }
        }

        // Verify that EVERY skill in mixed_effect_recovery has at least one recovery effect (type 9) AND at least one non-recovery effect
        foreach ($mixedEffectSkills as $skill) {
            $this->assertTrue($skill['is_mixed_effect'], "Skill {$skill['id']} in mixed_effect_recovery must have is_mixed_effect=true");
            $this->assertNotEmpty($skill['non_recovery_effects'], "Skill {$skill['id']} in mixed_effect_recovery must have non-empty non_recovery_effects");

            $hasRecovery = false;
            $hasNonRecovery = false;

            foreach ($skill['condition_groups'] as $group) {
                foreach ($group['effects'] as $effect) {
                    if ((int) $effect['type'] === 9) {
                        $hasRecovery = true;
                    } else {
                        $hasNonRecovery = true;
                    }
                }
            }

            $this->assertTrue($hasRecovery, "Skill {$skill['id']} ({$skill['name_en']}) in mixed_effect_recovery must have at least one recovery effect (type 9)");
            $this->assertTrue($hasNonRecovery, "Skill {$skill['id']} ({$skill['name_en']}) in mixed_effect_recovery must have at least one non-recovery effect");
        }

        // Verify that all skills in both categories retain essential metadata
        foreach ($catalog as $skill) {
            $this->assertArrayHasKey('id', $skill);
            $this->assertArrayHasKey('name_en', $skill);
            $this->assertArrayHasKey('name_jp', $skill);
            $this->assertArrayHasKey('rarity', $skill);
            $this->assertArrayHasKey('raw_effect_value', $skill);
            $this->assertArrayHasKey('heal_value', $skill);
            $this->assertArrayHasKey('icon_url', $skill);
            $this->assertArrayHasKey('running_style', $skill);
            $this->assertArrayHasKey('distance_category', $skill);
            $this->assertArrayHasKey('activation_condition_id', $skill);
        }
    }

    /**
     * Test that competition event recommended build guide includes recovery skills
     * matching the event's distance range (e.g. Medium or Long), in addition to all-distance skills,
     * and strictly excludes skills restricted to other distances.
     */
    public function test_event_recovery_catalog_includes_skills_matching_event_distance_range_and_excludes_incompatible(): void
    {
        $this->seed(CompetitionEventSeeder::class);

        $fullCatalog = CompetitionStatRecoveryRecommender::getRecoveryCatalog();
        $allDistanceSkillsCount = count(array_filter($fullCatalog, fn (array $s): bool => ($s['distance_category'] ?? '') === 'all'));

        // 1. CM October 2026: Kyoto 2200m (Middle / Medium distance)
        $cmOct = CompetitionEvent::where('event_key', 'cm-2026-10')->firstOrFail();
        $recOct = CompetitionStatRecoveryRecommender::getRecommendations($cmOct);
        $catalogOct = $recOct['reference_recovery_catalog'];
        $octIds = array_column($catalogOct, 'id');

        $this->assertNotEmpty($catalogOct);
        $this->assertGreaterThan(
            $allDistanceSkillsCount,
            count($catalogOct),
            'CM October 2026 (Medium) must include medium-specific skills in addition to all-distance skills'
        );

        // All-distance skill Arc Maestro (200351) MUST be included
        $this->assertContains(200351, $octIds, 'Arc Maestro (all-distance) must be included');

        // Medium-specific skills MUST be included
        $this->assertContains(200711, $octIds, 'Trailblazer (Medium) must be included in Medium event');
        $this->assertContains(201141, $octIds, 'Miracle Step (Medium) must be included in Medium event');
        $this->assertContains(202091, $octIds, 'Burning Spirit (Medium) must be included in Medium event');

        // Multi-distance skill covering Medium & Long MUST be included
        $this->assertContains(203511, $octIds, 'Domineering Glare (Medium & Long) must be included in Medium event');

        // Long-only skills MUST NOT be included in Medium event
        $this->assertNotContains(200741, $octIds, 'Cooldown (Long-only) must not be included in Medium event');
        $this->assertNotContains(201201, $octIds, 'VIP Pass (Long-only) must not be included in Medium event');
        $this->assertNotContains(204292, $octIds, 'Ultra-Long Recovery (Long-only) must not be included in Medium event');

        // Sprint-only skill MUST NOT be included in Medium event
        $this->assertNotContains(200662, $octIds, 'Wait and See (Sprint-only) must not be included in Medium event');

        // 2. LoH November 2026: Kyoto 3000m (Long distance)
        $lohNov = CompetitionEvent::where('event_key', 'loh-2026-11')->firstOrFail();
        $recNov = CompetitionStatRecoveryRecommender::getRecommendations($lohNov);
        $catalogNov = $recNov['reference_recovery_catalog'];
        $novIds = array_column($catalogNov, 'id');

        $this->assertNotEmpty($catalogNov);
        $this->assertGreaterThan(
            $allDistanceSkillsCount,
            count($catalogNov),
            'LoH November 2026 (Long) must include long-specific skills in addition to all-distance skills'
        );

        // All-distance skill Arc Maestro (200351) MUST be included
        $this->assertContains(200351, $novIds, 'Arc Maestro (all-distance) must be included in Long event');

        // Long-specific skills MUST be included
        $this->assertContains(200741, $novIds, 'Cooldown (Long) must be included in Long event');
        $this->assertContains(201201, $novIds, 'VIP Pass (Long) must be included in Long event');
        $this->assertContains(204292, $novIds, 'Ultra-Long Recovery (Long) must be included in Long event');

        // Multi-distance skill covering Medium & Long MUST be included
        $this->assertContains(203511, $novIds, 'Domineering Glare (Medium & Long) must be included in Long event');

        // Medium-only skills MUST NOT be included in Long event
        $this->assertNotContains(200711, $novIds, 'Trailblazer (Medium-only) must not be included in Long event');
        $this->assertNotContains(201141, $novIds, 'Miracle Step (Medium-only) must not be included in Long event');

        // Sprint-only skill MUST NOT be included in Long event
        $this->assertNotContains(200662, $novIds, 'Wait and See (Sprint-only) must not be included in Long event');
    }
}
