<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\UmaCatalogItem;
use App\Services\BackupService;
use App\Support\SkillConditionTranslator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkillConditionTranslatorTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test translation of Gambar 2 - Trigger 1.
     * Formula: phase==2&straight_front_type==2&order<=2
     */
    public function test_translate_image2_trigger_1(): void
    {
        $formula = 'phase==2&straight_front_type==2&order<=2';
        $result = SkillConditionTranslator::translate($formula);

        $this->assertFalse($result['has_alternatives']);
        $this->assertCount(1, $result['branches']);

        $conditions = $result['branches'][0]['conditions'];
        $this->assertCount(3, $conditions);

        // 1. phase==2
        $this->assertSame('phase', $conditions[0]['field']);
        $this->assertSame('==', $conditions[0]['operator']);
        $this->assertSame('Berada di Fase Akhir (Late-Race)', $conditions[0]['text']);

        // 2. straight_front_type==2
        $this->assertSame('straight_front_type', $conditions[1]['field']);
        $this->assertSame('==', $conditions[1]['operator']);
        $this->assertSame('Berada di lintasan lurus seberang penonton (backstretch)', $conditions[1]['text']);

        // 3. order<=2
        $this->assertSame('order', $conditions[2]['field']);
        $this->assertSame('<=', $conditions[2]['operator']);
        $this->assertSame('Peringkat ke-1 s/d 2 (posisi 1–2 terdepan)', $conditions[2]['text']);

        // Summary sentence
        $this->assertStringContainsString('Fase Akhir (Late-Race)', $result['summary']);
        $this->assertStringContainsString('backstretch', $result['summary']);
        $this->assertStringContainsString('peringkat ke-1 s/d 2', $result['summary']);
    }

    /**
     * Test translation of Gambar 2 - Trigger 2.
     * Formula: distance_rate>=50&corner==3&order<=2
     */
    public function test_translate_image2_trigger_2(): void
    {
        $formula = 'distance_rate>=50&corner==3&order<=2';
        $result = SkillConditionTranslator::translate($formula);

        $this->assertFalse($result['has_alternatives']);
        $this->assertCount(1, $result['branches']);

        $conditions = $result['branches'][0]['conditions'];
        $this->assertCount(3, $conditions);

        // 1. distance_rate>=50
        $this->assertSame('distance_rate', $conditions[0]['field']);
        $this->assertSame('>=', $conditions[0]['operator']);
        $this->assertSame('Telah melewati separuh jarak balapan (progres >= 50%)', $conditions[0]['text']);

        // 2. corner==3
        $this->assertSame('corner', $conditions[1]['field']);
        $this->assertSame('==', $conditions[1]['operator']);
        $this->assertSame('Sedang berada di tikungan ke-3', $conditions[1]['text']);

        // 3. order<=2
        $this->assertSame('order', $conditions[2]['field']);
        $this->assertSame('<=', $conditions[2]['operator']);
        $this->assertSame('Peringkat ke-1 s/d 2 (posisi 1–2 terdepan)', $conditions[2]['text']);

        // Summary sentence
        $this->assertStringContainsString('tikungan ke-3', $result['summary']);
        $this->assertStringContainsString('separuh jarak balapan', $result['summary']);
        $this->assertStringContainsString('peringkat ke-1 s/d 2', $result['summary']);
    }

    /**
     * Test alternative OR branches separated by '@'.
     * Formula: distance_type==1&ground_type==1@distance_type==2&ground_type==1
     */
    public function test_translate_alternative_or_conditions(): void
    {
        $formula = 'distance_type==1&ground_type==1@distance_type==2&ground_type==1';
        $result = SkillConditionTranslator::translate($formula);

        $this->assertTrue($result['has_alternatives']);
        $this->assertCount(2, $result['branches']);

        // Branch 1: Sprint & Turf
        $this->assertSame('Balapan kategori Jarak Pendek (Sprint / 短距離)', $result['branches'][0]['conditions'][0]['text'] ?? '');
        // Branch 2: Mile & Turf
        $this->assertSame('Balapan kategori Jarak Mil (Mile / マイル)', $result['branches'][1]['conditions'][0]['text'] ?? '');

        // Summary contains ATAU
        $this->assertStringContainsString('ATAU', $result['summary']);
    }

    /**
     * Test order_rate with Champions Meetings and League of Heroes calculations.
     */
    public function test_translate_order_rate_with_annotations(): void
    {
        $res = SkillConditionTranslator::translateClause('order_rate<=40');
        $this->assertSame('Peringkat di 40% pelari terdepan (CM [Champions Meetings] <= 4 | LoH [League of Heroes] <= 5)', $res['text']);

        $res2 = SkillConditionTranslator::translateClause('order_rate>=50');
        $this->assertSame('Peringkat di 50% pelari belakang (CM [Champions Meetings] >= 5 | LoH [League of Heroes] >= 6)', $res2['text']);
    }

    /**
     * Test precondition translations such as running_style.
     */
    public function test_translate_precondition_running_style(): void
    {
        $res = SkillConditionTranslator::translateClause('running_style==2');
        $this->assertSame('Menggunakan strategi Leader (Pengejar Terdepan / 先行)', $res['text']);

        $res2 = SkillConditionTranslator::translateClause('running_style==1');
        $this->assertSame('Menggunakan strategi Runner (Pelari Depan / 逃げ)', $res2['text']);
    }

    /**
     * Test artisan command uma:enrich-skills enriches catalog items including support cards.
     */
    public function test_enrich_skills_artisan_command(): void
    {
        $item = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Test Uma',
            'skills' => [
                [
                    'name' => 'Test Skill',
                    'condition_groups' => [
                        [
                            'condition' => 'phase==2&straight_front_type==2&order<=2',
                            'precondition' => 'running_style==1',
                        ],
                    ],
                ],
            ],
        ]);

        $card = UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => 'Test Support Card',
            'details' => [
                'hints' => [
                    'skills' => [
                        [
                            'name' => 'Hint Skill',
                            'condition_groups' => [
                                ['condition' => 'phase==1&order_rate<=50'],
                            ],
                        ],
                    ],
                ],
                'event_skills' => [
                    [
                        'name' => 'Event Skill',
                        'condition_groups' => [
                            ['condition' => 'corner==3'],
                        ],
                    ],
                ],
            ],
        ]);

        $this->artisan('uma:enrich-skills')
            ->expectsOutputToContain('Pengayaan selesai!')
            ->assertSuccessful();

        $fresh = $item->fresh();
        $skills = $fresh->skills;

        $this->assertNotNull($skills[0]['condition_translated']);
        $this->assertStringContainsString('Fase Akhir', $skills[0]['condition_translated']);
        $this->assertNotNull($skills[0]['condition_groups'][0]['condition_translated']);
        $this->assertNotNull($skills[0]['condition_groups'][0]['precondition_translated']);
        $this->assertStringContainsString('Runner', $skills[0]['condition_groups'][0]['precondition_translated']);

        $freshCard = $card->fresh();
        $this->assertNotNull($freshCard->details['hints']['skills'][0]['condition_translated']);
        $this->assertStringContainsString('Champions Meetings', $freshCard->details['hints']['skills'][0]['condition_translated']);
        $this->assertNotNull($freshCard->details['event_skills'][0]['condition_translated']);
        $this->assertStringContainsString('tikungan ke-3', $freshCard->details['event_skills'][0]['condition_translated']);
    }

    /**
     * Test backup and restore retains translated skill conditions in catalog items.
     */
    public function test_backup_and_restore_preserves_translated_conditions(): void
    {
        $backupService = app(BackupService::class);
        $item = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'El Condor Pasa [Planador]',
            'skills' => [
                'unique' => [
                    'id' => 100014,
                    'name' => 'Victoria por plancha ☆',
                    'condition_translated' => 'Skill aktif saat berada di Fase Akhir (Late-Race)...',
                    'condition_groups' => [
                        [
                            'condition' => 'phase==2&straight_front_type==2&order<=2',
                            'condition_translated' => 'Skill aktif saat berada di Fase Akhir (Late-Race) DAN berada di lintasan lurus seberang penonton (backstretch) DAN peringkat ke-1 s/d 2 (posisi 1–2 terdepan).',
                        ],
                        [
                            'condition' => 'distance_rate>=50&corner==3&order<=2',
                            'condition_translated' => 'Skill aktif saat sedang berada di tikungan ke-3 DAN telah melewati separuh jarak balapan (progres >= 50%) DAN peringkat ke-1 s/d 2 (posisi 1–2 terdepan).',
                        ],
                    ],
                ],
            ],
        ]);

        // Export backup
        $backup = $backupService->export();
        $this->assertSame(BackupService::CURRENT_SCHEMA_VERSION, $backup['version']);
        $this->assertGreaterThan(0, $backup['summary']['uma_catalog_items']);

        // Clear and restore
        UmaCatalogItem::query()->delete();
        $this->assertSame(0, UmaCatalogItem::count());

        $result = $backupService->import($backup, 'overwrite');
        $this->assertGreaterThan(0, $result['restored']['uma_catalog_items']);

        $restored = UmaCatalogItem::where('name', 'El Condor Pasa [Planador]')->first();
        $this->assertNotNull($restored);
        $this->assertNotNull($restored->skills['unique']['condition_translated']);
        $this->assertCount(2, $restored->skills['unique']['condition_groups']);
        $this->assertSame(
            'phase==2&straight_front_type==2&order<=2',
            $restored->skills['unique']['condition_groups'][0]['condition']
        );
        $this->assertStringContainsString(
            'Fase Akhir',
            $restored->skills['unique']['condition_groups'][0]['condition_translated']
        );
    }

    /**
     * Test GET /api/collection/skill-detail returns enriched skill data.
     */
    public function test_get_skill_detail_endpoint(): void
    {
        // 1. Missing parameters returns 400
        $res = $this->getJson('/api/collection/skill-detail');
        $res->assertStatus(400);

        // 2. Fetch with skill name e.g. "Tail Nine"
        $res2 = $this->getJson('/api/collection/skill-detail?name=Tail Nine');
        if ($res2->status() === 200) {
            $data = $res2->json();
            $this->assertTrue($data['success']);
            $this->assertArrayHasKey('skill', $data);
            $this->assertArrayHasKey('condition_groups', $data['skill']);
            if (! empty($data['skill']['condition_groups'])) {
                $this->assertNotNull($data['skill']['condition_groups'][0]['condition_translated']);
            }
        } else {
            // If local skill dataset is in test environment without skills cache, test with non-existent id
            $res404 = $this->getJson('/api/collection/skill-detail?id=999999999');
            $res404->assertStatus(404);
        }
    }

    /**
     * Test near_count condition explanation and note.
     */
    public function test_translate_near_count_condition(): void
    {
        $formula = 'phase==1&corner!=0&order_rate>=40&near_count>=3';
        $result = SkillConditionTranslator::translate($formula);

        $conditions = $result['branches'][0]['conditions'];
        $nearCount = $conditions[3];

        $this->assertSame('near_count', $nearCount['field']);
        $this->assertSame('Terdapat minimal 3 pelari lain di sekitar dekat', $nearCount['text']);
        $this->assertArrayHasKey('note', $nearCount);
        $this->assertStringContainsString('3 meter di depan/belakang', $nearCount['note']);
        $this->assertStringContainsString('1/18 lebar lintasan', $nearCount['note']);
    }

    /**
     * Test always==1 condition explanation and note.
     */
    public function test_translate_always_condition(): void
    {
        $formula = 'always==1';
        $result = SkillConditionTranslator::translate($formula);

        $this->assertSame('Skill akan selalu aktif.', $result['summary']);
        $conditions = $result['branches'][0]['conditions'];
        $alwaysCond = $conditions[0];

        $this->assertSame('always', $alwaysCond['field']);
        $this->assertSame('Skill akan selalu aktif', $alwaysCond['text']);
        $this->assertArrayHasKey('note', $alwaysCond);
    }

    /**
     * Test infront_near_lane_time condition explanation and note.
     */
    public function test_translate_infront_near_lane_time_condition(): void
    {
        $formula = 'is_lastspurt==1&hp_per>=1&infront_near_lane_time>=1';
        $result = SkillConditionTranslator::translate($formula);

        $this->assertStringContainsString('terdapat pelari lain tepat di depan selama minimal 1 detik', $result['summary']);
        $conditions = $result['branches'][0]['conditions'];
        $infrontCond = $conditions[2];

        $this->assertSame('infront_near_lane_time', $infrontCond['field']);
        $this->assertSame('Terdapat pelari lain tepat di depan selama minimal 1 detik', $infrontCond['text']);
        $this->assertArrayHasKey('note', $infrontCond);
        $this->assertStringContainsString('2,5 meter di depan', $infrontCond['note']);
        $this->assertStringContainsString('1/18 lebar lintasan', $infrontCond['note']);
    }
}
