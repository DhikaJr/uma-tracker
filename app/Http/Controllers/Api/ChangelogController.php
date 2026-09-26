<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ChangelogController extends Controller
{
    /**
     * Get parsed changelog with structured release versions and rendered HTML.
     */
    public function index(): JsonResponse
    {
        $filePath = base_path('CHANGELOG.md');

        if (! File::exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Changelog file not found.',
                'versions' => [],
            ], 404);
        }

        $rawContent = File::get($filePath);

        // Split markdown by version headers: ## [Versi X.Y.Z]
        $pattern = '/(?=^##\s*\[Versi\s+[\d\.]+\])/m';
        $parts = preg_split($pattern, $rawContent, -1, PREG_SPLIT_NO_EMPTY);

        $versions = [];
        $headerIntro = '';

        foreach ($parts as $part) {
            $trimmed = trim($part);
            if (! str_starts_with($trimmed, '## [Versi')) {
                $headerIntro = Str::markdown($trimmed);

                continue;
            }

            if (preg_match('/^##\s*\[Versi\s+([\d\.]+)\]\s*-\s*([^\n\r]+)/', $trimmed, $headerMatch)) {
                $versionNum = trim($headerMatch[1]);
                $releaseDate = trim($headerMatch[2]);

                // Extract body without the "## [Versi ...]" line
                $lines = explode("\n", $trimmed);
                array_shift($lines);
                $bodyMarkdown = trim(implode("\n", $lines));

                // Extract section titles (### ...) for quick summary & search
                preg_match_all('/^###\s*([^\n\r]+)/m', $bodyMarkdown, $sectionMatches);
                $highlights = array_map('trim', $sectionMatches[1] ?? []);

                $html = Str::markdown($trimmed);

                $versions[] = [
                    'version' => $versionNum,
                    'title' => "Versi {$versionNum}",
                    'date' => $releaseDate,
                    'highlights' => $highlights,
                    'raw_markdown' => $trimmed,
                    'html' => $html,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'latest_version' => $versions[0]['version'] ?? null,
            'total_versions' => count($versions),
            'header_intro_html' => $headerIntro,
            'versions' => $versions,
        ]);
    }
}
