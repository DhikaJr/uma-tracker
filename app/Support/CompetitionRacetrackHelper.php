<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\CompetitionEvent;

class CompetitionRacetrackHelper
{
    /** @var array<int, array<string, mixed>>|null */
    protected static ?array $catalogCache = null;

    /**
     * Get the racetracks catalog.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getCatalog(): array
    {
        if (self::$catalogCache !== null) {
            return self::$catalogCache;
        }

        $path = resource_path('js/data/racetracksCatalog.json');
        if (file_exists($path)) {
            $data = json_decode((string) file_get_contents($path), true);
            if (is_array($data)) {
                self::$catalogCache = $data;

                return self::$catalogCache;
            }
        }

        return [];
    }

    /**
     * Validate track dimensions (venue, surface, and positive integer distance).
     * Rejects null, whitespace, invalid types, decimal distances, and non-positive numbers.
     */
    protected static function isValidTrackDimension(mixed $venue, mixed $surface, mixed $distance): bool
    {
        if (! is_string($venue) || trim($venue) === '') {
            return false;
        }

        if (! is_string($surface) || trim($surface) === '') {
            return false;
        }

        if (is_int($distance)) {
            return $distance > 0;
        }

        if (is_string($distance)) {
            return preg_match('/^[1-9][0-9]*$/', trim($distance)) === 1;
        }

        return false;
    }

    /**
     * Find matching racetrack course for a competition event.
     * Returns null if the event's location/distance/direction is not fully confirmed.
     *
     * @param  CompetitionEvent|array<string, mixed>  $event
     * @return array<string, mixed>|null
     */
    public static function findCourse(CompetitionEvent|array $event): ?array
    {
        $venue = is_array($event) ? ($event['venue'] ?? null) : $event->venue;
        $distance = is_array($event) ? ($event['distance'] ?? null) : $event->distance;
        $surface = is_array($event) ? ($event['surface'] ?? null) : $event->surface;
        $direction = is_array($event) ? ($event['direction'] ?? null) : $event->direction;

        // Zero speculative data: all required track dimensions must be officially announced
        if (! self::isValidTrackDimension($venue, $surface, $distance)) {
            return null;
        }

        $catalog = self::getCatalog();
        $normVenue = strtolower(trim($venue));
        $normSurface = strtolower(trim($surface));
        $normDirection = is_string($direction) ? strtolower(trim($direction)) : '';
        $targetDistance = (int) $distance;

        $track = null;
        foreach ($catalog as $t) {
            if (
                strtolower((string) ($t['name_en'] ?? '')) === $normVenue ||
                strtolower((string) ($t['slug'] ?? '')) === $normVenue ||
                strtolower((string) ($t['name_ja'] ?? '')) === $normVenue
            ) {
                $track = $t;
                break;
            }
        }

        if (! $track || empty($track['courses'])) {
            return null;
        }

        $wantsOuter = str_contains($normDirection, 'outer');
        $wantsInner = str_contains($normDirection, 'inner');

        // Filter courses matching length and surface
        $candidates = [];
        foreach ($track['courses'] as $c) {
            if ((int) $c['length'] === $targetDistance && ($c['surface'] ?? '') === $normSurface) {
                $candidates[] = $c;
            }
        }

        if (empty($candidates)) {
            return null;
        }

        $selectedCourse = null;
        if (count($candidates) === 1) {
            $selectedCourse = $candidates[0];
        } else {
            // When multiple candidates exist (e.g. inner/outer variants),
            // direction must be provided and must uniquely disambiguate. Never guess.
            if (! is_string($direction) || trim($direction) === '') {
                return null;
            }

            foreach ($candidates as $c) {
                if ($wantsOuter && ((int) ($c['inout'] ?? 0) === 3 || ($c['inout_str'] ?? '') === 'outer')) {
                    $selectedCourse = $c;
                    break;
                }
                if ($wantsInner && ((int) ($c['inout'] ?? 0) === 2 || ($c['inout_str'] ?? '') === 'inner')) {
                    $selectedCourse = $c;
                    break;
                }
            }

            if (! $selectedCourse) {
                return null;
            }
        }

        return [
            'track_id' => $track['id'],
            'track_name' => $track['name_en'],
            'track_name_ja' => $track['name_ja'],
            'track_slug' => $track['slug'],
            'course' => $selectedCourse,
            'gametora_url' => $selectedCourse['gametora_url'],
            'gametora_hash' => $selectedCourse['gametora_hash'],
        ];
    }

    /**
     * Build GameTora URL format for a racetrack course.
     * Format: https://gametora.com/umamusume/racetracks/{region}#{jarak}-{turf atau dirt}-{inner atau outer}
     */
    public static function buildGameToraUrl(mixed $venue, mixed $distance, mixed $surface, mixed $direction = null): ?string
    {
        if (! self::isValidTrackDimension($venue, $surface, $distance)) {
            return null;
        }

        $region = strtolower(trim($venue));
        $normSurface = strtolower(trim($surface));
        $normDirection = is_string($direction) ? strtolower(trim($direction)) : '';
        $numDistance = (int) $distance;

        $inout = '';
        if (str_contains($normDirection, 'outer')) {
            $inout = '-outer';
        } elseif (str_contains($normDirection, 'inner')) {
            $inout = '-inner';
        }

        return "https://gametora.com/umamusume/racetracks/{$region}#{$numDistance}-{$normSurface}{$inout}";
    }
}
