<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CompetitionEvent;
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
}
