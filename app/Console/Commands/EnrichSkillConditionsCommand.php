<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\UmaCatalogItem;
use App\Services\GameToraSyncService;
use App\Support\SkillConditionTranslator;
use Illuminate\Console\Command;

class EnrichSkillConditionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'uma:enrich-skills';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perkaya seluruh data skill pada katalog karakter dan support card dengan terjemahan kondisi bahasa Indonesia yang mudah dipahami';

    /**
     * Execute the console command.
     */
    public function handle(GameToraSyncService $syncService): int
    {
        $this->info('Memulai pengayaan terjemahan kondisi skill pada katalog Uma Musume...');

        $skillsById = $syncService->loadSkillsLookup();

        $items = UmaCatalogItem::whereNotNull('skills')->get();
        $updatedCount = 0;
        $totalSkillsEnriched = 0;

        foreach ($items as $item) {
            $skills = $item->skills;
            if (! is_array($skills)) {
                continue;
            }

            $modified = false;
            foreach ($skills as $key => $skill) {
                if (! is_array($skill)) {
                    continue;
                }

                $skills[$key] = $this->enrichSkill($skill, $totalSkillsEnriched, $modified);
            }

            if ($modified) {
                $item->skills = $skills;
                $item->save();
                $updatedCount++;
            }
        }

        // Support cards details: hints.skills, event_skills, training_events, dates
        $cards = UmaCatalogItem::where('type', 'support_card')->whereNotNull('details')->get();
        $cardUpdatedCount = 0;

        foreach ($cards as $card) {
            $details = $card->details;
            if (! is_array($details)) {
                continue;
            }

            $cardModified = false;

            // 1. Hints skills
            if (isset($details['hints']['skills']) && is_array($details['hints']['skills'])) {
                foreach ($details['hints']['skills'] as $sKey => $sItem) {
                    if (is_array($sItem)) {
                        $details['hints']['skills'][$sKey] = $this->enrichSkill($sItem, $totalSkillsEnriched, $cardModified);
                    }
                }
            }

            // 2. Event skills
            if (isset($details['event_skills']) && is_array($details['event_skills'])) {
                foreach ($details['event_skills'] as $sKey => $sItem) {
                    if (is_array($sItem)) {
                        $details['event_skills'][$sKey] = $this->enrichSkill($sItem, $totalSkillsEnriched, $cardModified);
                    }
                }
            }

            // 3. Training Events rewards
            if (isset($details['training_events']) && is_array($details['training_events'])) {
                $details['training_events'] = $this->enrichEventsSkills($details['training_events'], $skillsById, $syncService, $totalSkillsEnriched, $cardModified);
            }

            // 4. Dates rewards
            if (isset($details['dates']) && is_array($details['dates'])) {
                $details['dates'] = $this->enrichEventsSkills($details['dates'], $skillsById, $syncService, $totalSkillsEnriched, $cardModified);
            }

            if ($cardModified) {
                $card->details = $details;
                $card->save();
                $cardUpdatedCount++;
            }
        }

        $this->info("Pengayaan selesai! {$updatedCount} karakter dan {$cardUpdatedCount} support card diperbarui ({$totalSkillsEnriched} skill diperkaya).");

        return Command::SUCCESS;
    }

    /**
     * Enrich skills inside training events or dates choices rewards.
     *
     * @param  array<int, mixed>  $events
     * @param  array<int, array<string, mixed>>  $skillsById
     * @return array<int, mixed>
     */
    protected function enrichEventsSkills(array $events, array $skillsById, GameToraSyncService $syncService, int &$totalEnriched, bool &$modified): array
    {
        foreach ($events as $eIdx => $ev) {
            if (! isset($ev['choices']) || ! is_array($ev['choices'])) {
                continue;
            }

            foreach ($ev['choices'] as $cIdx => $choice) {
                if (! isset($choice['rewards']) || ! is_array($choice['rewards'])) {
                    continue;
                }

                foreach ($choice['rewards'] as $rIdx => $reward) {
                    if (($reward['type'] ?? '') === 'sk' && isset($reward['skill']) && is_array($reward['skill'])) {
                        $skObj = $reward['skill'];
                        $skId = (int) ($skObj['id'] ?? 0);

                        // If skill lacks condition_groups but exists in skillsById, enrich from lookup
                        if (empty($skObj['condition_groups']) && $skId && isset($skillsById[$skId])) {
                            $events[$eIdx]['choices'][$cIdx]['rewards'][$rIdx]['skill'] = $syncService->enrichSkillData($skillsById[$skId], $skillsById);
                            $modified = true;
                            $totalEnriched++;
                        } else {
                            $events[$eIdx]['choices'][$cIdx]['rewards'][$rIdx]['skill'] = $this->enrichSkill($skObj, $totalEnriched, $modified);
                        }
                    }
                }
            }
        }

        return $events;
    }

    /**
     * Enrich a single skill array with condition translations.
     *
     * @param  array<string, mixed>  $skill
     * @return array<string, mixed>
     */
    protected function enrichSkill(array $skill, int &$totalEnriched, bool &$modified): array
    {
        if (isset($skill['condition_groups']) && is_array($skill['condition_groups'])) {
            foreach ($skill['condition_groups'] as $cgIdx => $cg) {
                if (! is_array($cg)) {
                    continue;
                }

                $condStr = $cg['condition'] ?? '';
                if ($condStr !== '') {
                    $trans = SkillConditionTranslator::translate($condStr);
                    $skill['condition_groups'][$cgIdx]['condition_translated'] = $trans['summary'];
                    $modified = true;
                    $totalEnriched++;
                }

                $precondStr = $cg['precondition'] ?? null;
                if ($precondStr) {
                    $preTrans = SkillConditionTranslator::translate($precondStr);
                    $skill['condition_groups'][$cgIdx]['precondition_translated'] = $preTrans['summary'];
                    $modified = true;
                }
            }

            if (isset($skill['condition_groups'][0]['condition_translated'])) {
                $skill['condition_translated'] = $skill['condition_groups'][0]['condition_translated'];
            }
            if (isset($skill['condition_groups'][0]['precondition_translated'])) {
                $skill['precondition_translated'] = $skill['condition_groups'][0]['precondition_translated'];
            }
        } elseif (! empty($skill['conditions']) || ! empty($skill['condition'])) {
            $c = $skill['conditions'] ?? $skill['condition'];
            $trans = SkillConditionTranslator::translate((string) $c);
            $skill['condition_translated'] = $trans['summary'];
            $modified = true;
            $totalEnriched++;
        }

        // Handle unique_versions if present
        if (isset($skill['unique_versions']) && is_array($skill['unique_versions'])) {
            foreach ($skill['unique_versions'] as $uKey => $uSkill) {
                if (is_array($uSkill)) {
                    $skill['unique_versions'][$uKey] = $this->enrichSkill($uSkill, $totalEnriched, $modified);
                }
            }
        }

        return $skill;
    }
}
