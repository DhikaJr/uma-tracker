<?php

declare(strict_types=1);

namespace App\Support;

class SkillConditionTranslator
{
    /**
     * Map of known racetrack IDs to readable Indonesian track names.
     *
     * @var array<int, string>
     */
    protected const TRACK_NAMES = [
        10001 => 'Sapporo',
        10002 => 'Hakodate',
        10003 => 'Fukushima',
        10004 => 'Niigata',
        10005 => 'Tokyo',
        10006 => 'Nakayama',
        10007 => 'Chukyo',
        10008 => 'Kyoto',
        10009 => 'Hanshin',
        10010 => 'Kokura',
        10011 => 'Ooi',
        10012 => 'Kawasaki',
        10013 => 'Funabashi',
        10014 => 'Morioka',
        10101 => 'Longchamp',
    ];

    /**
     * Translate a full condition string (supports '&' and '@' operators).
     *
     * @return array{
     *     summary: string,
     *     has_alternatives: bool,
     *     branches: list<array{
     *         summary: string,
     *         conditions: list<array{
     *             raw: string,
     *             field: string,
     *             operator: string,
     *             value: string|float|int,
     *             text: string,
     *             category: string,
     *             icon: string
     *         }>
     *     }>
     * }
     */
    public static function translate(?string $conditionString): array
    {
        if ($conditionString === null || trim($conditionString) === '') {
            return [
                'summary' => 'Dapat aktif kapan saja tanpa syarat khusus.',
                'has_alternatives' => false,
                'branches' => [],
            ];
        }

        // Split by '@' (OR branches)
        $rawBranches = explode('@', $conditionString);
        $branches = [];

        foreach ($rawBranches as $branchStr) {
            $branchStr = trim($branchStr);
            if ($branchStr === '') {
                continue;
            }

            $clauses = explode('&', $branchStr);
            $parsedConditions = [];

            foreach ($clauses as $clause) {
                $clause = trim($clause);
                if ($clause !== '') {
                    $parsedConditions[] = self::translateClause($clause);
                }
            }

            $branchSummary = self::buildBranchSummary($parsedConditions);
            $branches[] = [
                'summary' => $branchSummary,
                'conditions' => $parsedConditions,
            ];
        }

        $hasAlternatives = count($branches) > 1;
        $overallSummary = self::buildOverallSummary($branches);

        return [
            'summary' => $overallSummary,
            'has_alternatives' => $hasAlternatives,
            'branches' => $branches,
        ];
    }

    /**
     * Translate a single atomic condition clause (e.g. "phase==2", "order<=2").
     *
     * @return array{
     *     raw: string,
     *     field: string,
     *     operator: string,
     *     value: string|float|int,
     *     text: string,
     *     category: string,
     *     icon: string
     * }
     */
    public static function translateClause(string $clause): array
    {
        $clause = trim($clause);

        if (! preg_match('/^([a-z0-9_]+)\s*(<=|>=|!=|==|<|>)\s*(.+)$/i', $clause, $m)) {
            return [
                'raw' => $clause,
                'field' => $clause,
                'operator' => '==',
                'value' => '',
                'text' => "Kondisi: {$clause}",
                'category' => 'general',
                'icon' => 'zap',
            ];
        }

        $field = strtolower(trim($m[1]));
        $op = trim($m[2]);
        $valStr = trim($m[3]);
        $val = is_numeric($valStr) ? (str_contains($valStr, '.') ? (float) $valStr : (int) $valStr) : $valStr;

        return self::resolveConditionExplanation($clause, $field, $op, $val);
    }

    /**
     * Resolve individual condition explanation based on field, operator, and value.
     *
     * @return array{
     *     raw: string,
     *     field: string,
     *     operator: string,
     *     value: string|float|int,
     *     text: string,
     *     category: string,
     *     icon: string
     * }
     */
    protected static function resolveConditionExplanation(string $raw, string $field, string $op, string|float|int $val): array
    {
        $intVal = (int) $val;

        switch ($field) {
            // ================= UNCONDITIONAL / ALWAYS =================
            case 'always':
                return self::makeClauseResult(
                    $raw,
                    $field,
                    $op,
                    $val,
                    'Skill akan selalu aktif',
                    'skill',
                    'sparkles',
                    'Skill ini tidak memerlukan kondisi balapan tertentu dan akan selalu aktif.'
                );

                // ================= RACETRACK / PHASE =================
            case 'phase':
                $phaseLabels = [
                    0 => 'Fase Awal (Early-Race)',
                    1 => 'Fase Pertengahan (Mid-Race)',
                    2 => 'Fase Akhir (Late-Race)',
                    3 => 'Fase Spurt Akhir (Last Spurt)',
                ];
                if ($op === '==' && isset($phaseLabels[$intVal])) {
                    return self::makeClauseResult($raw, $field, $op, $val, "Berada di {$phaseLabels[$intVal]}", 'phase', 'flag');
                }
                if ($op === '>=' && $intVal === 2) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Berada di Fase Akhir (Late-Race) atau Last Spurt', 'phase', 'flag');
                }
                if ($op === '>=' && $intVal === 1) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Berada di Fase Pertengahan (Mid-Race) ke atas', 'phase', 'flag');
                }
                if ($op === '<=' && $intVal === 1) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Berada di Fase Awal hingga Pertengahan (Early s/d Mid-Race)', 'phase', 'phase');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Fase balapan {$op} {$val}", 'phase', 'flag');

            case 'phase_firsthalf':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal', 1 => 'Fase Pertengahan', 2 => 'Fase Akhir', 3 => 'Last Spurt', default => "Fase {$intVal}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Berada di separuh awal {$phaseName}", 'phase', 'flag');

            case 'phase_laterhalf':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal', 1 => 'Fase Pertengahan', 2 => 'Fase Akhir', 3 => 'Last Spurt', default => "Fase {$intVal}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Berada di separuh kedua {$phaseName}", 'phase', 'flag');

            case 'phase_firstquarter':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal', 1 => 'Fase Pertengahan', 2 => 'Fase Akhir', 3 => 'Last Spurt', default => "Fase {$intVal}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Berada di seperempat awal {$phaseName}", 'phase', 'flag');

            case 'straight_front_type':
                if ($op === '==' && $intVal === 1) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Berada di lintasan lurus depan tribun penonton (frontstretch)', 'track', 'compass');
                }
                if ($op === '==' && $intVal === 2) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Berada di lintasan lurus seberang penonton (backstretch)', 'track', 'compass');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Tipe trek lurus {$op} {$val}", 'track', 'compass');

            case 'corner':
                if ($op === '==' && $intVal === 0) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Sedang berada di lintasan lurus (bukan di tikungan)', 'track', 'corner-up-right');
                }
                if ($op === '!=' && $intVal === 0) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Sedang berada di tikungan manapun', 'track', 'corner-up-right');
                }
                if ($op === '==' && $intVal >= 1 && $intVal <= 4) {
                    return self::makeClauseResult($raw, $field, $op, $val, "Sedang berada di tikungan ke-{$val}", 'track', 'corner-up-right');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Tikungan {$op} {$val}", 'track', 'corner-up-right');

            case 'corner_count':
                return self::makeClauseResult($raw, $field, $op, $val, "Jumlah tikungan lintasan {$op} {$val}", 'track', 'corner-up-right');

            case 'is_finalcorner':
                return self::makeClauseResult($raw, $field, $op, $val, 'Sedang berada di tikungan terakhir (Final Corner)', 'track', 'flag');

            case 'is_finalcorner_laterhalf':
                return self::makeClauseResult($raw, $field, $op, $val, 'Sedang berada di paruh kedua tikungan terakhir (Final Corner later half)', 'track', 'flag');

            case 'is_last_straight':
            case 'is_last_straight_onetime':
                return self::makeClauseResult($raw, $field, $op, $val, 'Sedang berada di lintasan lurus terakhir (Final Straight)', 'track', 'flag');

            case 'is_lastspurt':
                return self::makeClauseResult($raw, $field, $op, $val, 'Sedang dalam pacuan sprint akhir (Last Spurt mode)', 'status', 'zap');

            case 'slope':
                $slopeText = match ($intVal) {
                    1 => 'Sedang berada di tanjakan (uphill)',
                    2 => 'Sedang berada di turunan (downhill)',
                    0 => 'Sedang berada di lintasan datar (flat)',
                    default => "Kemiringan trek {$op} {$val}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, $slopeText, 'track', 'trending-up');

                // ================= PROGRESS & DISTANCE =================
            case 'distance_rate':
                if ($op === '>=' || $op === '>') {
                    $text = $intVal === 50
                        ? 'Telah melewati separuh jarak balapan (progres >= 50%)'
                        : "Progres balapan telah mencapai minimal {$val}%";

                    return self::makeClauseResult($raw, $field, $op, $val, $text, 'progress', 'gauge');
                }
                if ($op === '<=' || $op === '<') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Progres balapan masih berada di bawah atau sama dengan {$val}%", 'progress', 'gauge');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Progres balapan {$op} {$val}%", 'progress', 'gauge');

            case 'remain_distance':
                if ($op === '<=' || $op === '<') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Sisa jarak menuju garis finish <= {$val} meter", 'progress', 'milestone');
                }
                if ($op === '>=' || $op === '>') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Sisa jarak menuju garis finish >= {$val} meter", 'progress', 'milestone');
                }
                if ($op === '==') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Tepat di sisa jarak {$val} meter menuju finish", 'progress', 'milestone');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Sisa jarak finish {$op} {$val}m", 'progress', 'milestone');

            case 'remain_distance_viewer_id':
                return self::makeClauseResult($raw, $field, $op, $val, "Sisa jarak finish karakter {$op} {$val}m", 'progress', 'milestone');

            case 'course_distance':
                return self::makeClauseResult($raw, $field, $op, $val, "Panjang lintasan balap {$op} {$val}m", 'track', 'map-pin');

            case 'is_basis_distance':
                $text = $intVal === 1
                    ? 'Balapan pada jarak standar (kelipatan 400m, misal 1200m, 1600m, 2000m, 2400m)'
                    : 'Balapan pada jarak non-standar (bukan kelipatan 400m)';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'track', 'map-pin');

            case 'accumulatetime':
                return self::makeClauseResult($raw, $field, $op, $val, "Waktu balapan telah berjalan minimal {$val} detik", 'progress', 'clock');

                // ================= POSITION & RANKING =================
            case 'order':
                if ($op === '<=') {
                    $text = $intVal === 1 ? 'Memimpin balapan di posisi terdepan (peringkat 1)' : "Peringkat ke-1 s/d {$val} (posisi 1–{$val} terdepan)";

                    return self::makeClauseResult($raw, $field, $op, $val, $text, 'position', 'trophy');
                }
                if ($op === '>=') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Peringkat ke-{$val} atau lebih belakang", 'position', 'trophy');
                }
                if ($op === '==') {
                    $text = $intVal === 1 ? 'Sedang memimpin balapan (peringkat 1)' : "Tepat di peringkat ke-{$val}";

                    return self::makeClauseResult($raw, $field, $op, $val, $text, 'position', 'trophy');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Peringkat balapan {$op} {$val}", 'position', 'trophy');

            case 'order_rate':
                $cmVal = (int) ceil((9 * (float) $val) / 100);
                $lohVal = (int) ceil((12 * (float) $val) / 100);
                if ($op === '<=') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Peringkat di {$val}% pelari terdepan (CM [Champions Meetings] <= {$cmVal} | LoH [League of Heroes] <= {$lohVal})", 'position', 'percent');
                }
                if ($op === '>=') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Peringkat di {$val}% pelari belakang (CM [Champions Meetings] >= {$cmVal} | LoH [League of Heroes] >= {$lohVal})", 'position', 'percent');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Peringkat persentase {$op} {$val}% (CM [Champions Meetings]: {$cmVal} | LoH [League of Heroes]: {$lohVal})", 'position', 'percent');

            case 'order_rate_in20_continue':
            case 'order_rate_in40_continue':
            case 'order_rate_in50_continue':
            case 'order_rate_in80_continue':
                preg_match('/in(\d+)/', $field, $pm);
                $pct = $pm[1] ?? '50';

                return self::makeClauseResult($raw, $field, $op, $val, "Konsisten bertahan di {$pct}% pelari terdepan sepanjang balapan hingga titik ini", 'position', 'shield');

            case 'order_rate_out20_continue':
            case 'order_rate_out40_continue':
            case 'order_rate_out50_continue':
            case 'order_rate_out70_continue':
                preg_match('/out(\d+)/', $field, $pm);
                $pct = $pm[1] ?? '50';

                return self::makeClauseResult($raw, $field, $op, $val, "Konsisten berada di luar {$pct}% pelari terdepan sepanjang balapan hingga titik ini", 'position', 'shield');

                // ================= OVERTAKE & COMPETITION =================
            case 'change_order_onetime':
                if ($op === '<' && (int) $val <= 0) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Berhasil menyalip pelari lain (peringkat naik)', 'action', 'arrow-up-right');
                }
                if ($op === '>' && (int) $val >= 0) {
                    return self::makeClauseResult($raw, $field, $op, $val, 'Tersalip oleh pelari lain (peringkat turun)', 'action', 'arrow-down-right');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Perubahan posisi {$op} {$val}", 'action', 'arrow-up-right');

            case 'change_order_up_middle':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah menyalip lawan minimal {$val} kali selama Fase Pertengahan (Mid-Race)", 'action', 'arrow-up-right');

            case 'change_order_up_end_after':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah menyalip lawan minimal {$val} kali setelah memasuki Fase Akhir", 'action', 'arrow-up-right');

            case 'change_order_up_finalcorner_after':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah menyalip lawan minimal {$val} kali setelah tikungan terakhir", 'action', 'arrow-up-right');

            case 'is_overtake':
                return self::makeClauseResult($raw, $field, $op, $val, 'Sedang dalam upaya menyalip lawan (overtaking attempt)', 'action', 'zap');

            case 'overtake_target_no_order_up_time':
                return self::makeClauseResult($raw, $field, $op, $val, "Sedang mengejar lawan tanpa berhasil naik peringkat selama minimal {$val} detik", 'action', 'clock');

            case 'overtake_target_time':
                return self::makeClauseResult($raw, $field, $op, $val, "Sedang menargetkan lawan untuk disalip selama minimal {$val} detik", 'action', 'clock');

            case 'compete_fight_count':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah beradu kecepatan sengit (Showdown / Kurasoi) minimal {$val} kali", 'action', 'swords');

            case 'bashin_diff_infront':
                return self::makeClauseResult($raw, $field, $op, $val, "Jarak ke pelari tepat di depan <= {$val} bashin (panjang kuda)", 'position', 'ruler');

            case 'bashin_diff_behind':
                return self::makeClauseResult($raw, $field, $op, $val, "Jarak ke pelari tepat di belakang {$op} {$val} bashin (panjang kuda)", 'position', 'ruler');

            case 'distance_diff_top':
                return self::makeClauseResult($raw, $field, $op, $val, "Jarak selisih dengan pelari peringkat pertama {$op} {$val} meter", 'position', 'ruler');

            case 'distance_diff_top_float':
                $meters = (float) $val / 10;

                return self::makeClauseResult($raw, $field, $op, $val, "Jarak selisih dengan pelari peringkat pertama {$op} {$meters} meter", 'position', 'ruler');

            case 'distance_diff_rate':
                return self::makeClauseResult($raw, $field, $op, $val, "Selisih jarak persentase dengan posisi pertama {$op} {$val}%", 'position', 'ruler');

            case 'blocked_front':
                return self::makeClauseResult($raw, $field, $op, $val, 'Jalur lari di depan sedang terhalang oleh pelari lain', 'status', 'shield-alert');

            case 'blocked_front_continuetime':
                return self::makeClauseResult($raw, $field, $op, $val, "Terhalang oleh pelari di depan selama minimal {$val} detik", 'status', 'shield-alert');

            case 'blocked_side_continuetime':
                return self::makeClauseResult($raw, $field, $op, $val, "Terhimpit dari samping oleh pelari lain selama minimal {$val} detik", 'status', 'shield-alert');

            case 'is_surrounded':
                return self::makeClauseResult($raw, $field, $op, $val, 'Sedang terkepung oleh pelari lain di sekitarnya', 'status', 'users');

            case 'near_count':
                $text = "Terdapat minimal {$val} pelari lain di sekitar dekat";
                if ($op === '==') {
                    $text = "Terdapat tepat {$val} pelari lain di sekitar dekat";
                } elseif ($op === '<=' || $op === '<') {
                    $text = "Terdapat maksimal {$val} pelari lain di sekitar dekat";
                } elseif ($op === '>') {
                    $text = "Terdapat lebih dari {$val} pelari lain di sekitar dekat";
                }
                $note = 'Catatan: "Sekitar dekat" berarti tidak lebih dari 3 meter di depan/belakang dan tidak lebih dari 3 lajur ke samping (1 lajur = 1/18 lebar lintasan).';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'status', 'users', $note);

            case 'near_infront_count':
                $text = "Terdapat minimal {$val} pelari lain tepat di depan";
                if ($op === '==' && $intVal === 0) {
                    $text = 'Tidak ada pelari lain tepat di depan';
                } elseif ($op === '==') {
                    $text = "Terdapat tepat {$val} pelari lain tepat di depan";
                } elseif ($op === '<=' || $op === '<') {
                    $text = "Terdapat maksimal {$val} pelari lain tepat di depan";
                } elseif ($op === '>') {
                    $text = "Terdapat lebih dari {$val} pelari lain tepat di depan";
                }
                $note = 'Catatan: "Tepat di depan" berarti tidak lebih dari 2,5 meter di depan.';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'status', 'users', $note);

            case 'visiblehorse':
                return self::makeClauseResult($raw, $field, $op, $val, "Jumlah pelari dalam bidang pandang {$op} {$val}", 'status', 'eye');

            case 'infront_near_lane_time':
                $text = "Terdapat pelari lain tepat di depan selama minimal {$val} detik";
                if ($op === '==') {
                    $text = "Terdapat pelari lain tepat di depan selama tepat {$val} detik";
                } elseif ($op === '<=' || $op === '<') {
                    $text = "Terdapat pelari lain tepat di depan selama maksimal {$val} detik";
                } elseif ($op === '>') {
                    $text = "Terdapat pelari lain tepat di depan selama lebih dari {$val} detik";
                }
                $note = 'Catatan: "Tepat di depan" berarti tidak lebih dari 2,5 meter di depan dan tidak lebih dari 1 lajur ke samping (1/18 lebar lintasan). Tidak harus pelari yang sama (asalkan ada minimal satu), namun timer akan reset jika peringkat Anda berubah.';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'action', 'clock', $note);

            case 'behind_near_lane_time':
            case 'behind_near_lane_time_set1':
                $text = "Terdapat pelari lain tepat di belakang selama minimal {$val} detik";
                if ($op === '==') {
                    $text = "Terdapat pelari lain tepat di belakang selama tepat {$val} detik";
                } elseif ($op === '<=' || $op === '<') {
                    $text = "Terdapat pelari lain tepat di belakang selama maksimal {$val} detik";
                } elseif ($op === '>') {
                    $text = "Terdapat pelari lain tepat di belakang selama lebih dari {$val} detik";
                }
                $note = 'Catatan: "Tepat di belakang" berarti tidak lebih dari 2,5 meter di belakang dan tidak lebih dari 1 lajur ke samping (1/18 lebar lintasan). Tidak harus pelari yang sama (asalkan ada minimal satu), namun timer akan reset jika peringkat Anda berubah.';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'action', 'clock', $note);

                // ================= RUNNING STRATEGY & APTITUDE =================
            case 'running_style':
                $styleNames = [
                    1 => 'Runner (Pelari Depan / 逃げ)',
                    2 => 'Leader (Pengejar Terdepan / 先行)',
                    3 => 'Betweener (Pelari Tengah / 差し)',
                    4 => 'Chaser (Pelari Belakang / 追込)',
                ];
                $name = $styleNames[$intVal] ?? "Strategi {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Menggunakan strategi {$name}", 'strategy', 'user-check');

            case 'distance_type':
                $distNames = [
                    1 => 'Jarak Pendek (Sprint / 短距離)',
                    2 => 'Jarak Mil (Mile / マイル)',
                    3 => 'Jarak Menengah (Medium / 中距離)',
                    4 => 'Jarak Jauh (Long / 長距離)',
                ];
                $name = $distNames[$intVal] ?? "Tipe Jarak {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Balapan kategori {$name}", 'track', 'map-pin');

            case 'ground_type':
                $groundNames = [
                    1 => 'Lintasan Rumput (Turf / 芝)',
                    2 => 'Lintasan Tanah (Dirt / ダート)',
                ];
                $name = $groundNames[$intVal] ?? "Tipe Tanah {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Berlangsung di {$name}", 'track', 'trees');

            case 'ground_condition':
                $condNames = [
                    1 => 'Baik (Good / 良)',
                    2 => 'Sedikit Basah (Yielding / 稍重)',
                    3 => 'Basah (Soft / 重)',
                    4 => 'Buruk/Berlumpur (Bad / 不良)',
                ];
                $name = $condNames[$intVal] ?? "Kondisi {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Kondisi lintasan {$name}", 'track', 'cloud-rain');

            case 'weather':
                $weatherNames = [
                    1 => 'Cerah (Sunny / 晴)',
                    2 => 'Berawan (Cloudy / 曇)',
                    3 => 'Hujan (Rainy / 雨)',
                    4 => 'Bersalju (Snowy / 雪)',
                ];
                $name = $weatherNames[$intVal] ?? "Cuaca {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Kondisi cuaca {$name}", 'track', 'sun');

            case 'season':
                $seasonNames = [
                    1 => 'Musim Semi (Spring / 春)',
                    2 => 'Musim Panas (Summer / 夏)',
                    3 => 'Musim Gugur (Autumn / 秋)',
                    4 => 'Musim Dingin (Winter / 冬)',
                ];
                $name = $seasonNames[$intVal] ?? "Musim {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Berlangsung pada {$name}", 'track', 'calendar');

            case 'time':
                $timeNames = [
                    0 => 'Waktu Bebas',
                    1 => 'Pagi hari (Morning)',
                    2 => 'Siang hari (Daytime)',
                    3 => 'Sore hari (Evening)',
                    4 => 'Malam hari (Night)',
                ];
                $name = $timeNames[$intVal] ?? "Waktu {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Balapan pada {$name}", 'track', 'clock');

            case 'rotation':
                $rotName = $intVal === 1 ? 'Searah jarum jam (Kanan / Right)' : 'Berlawanan jarum jam (Kiri / Left)';

                return self::makeClauseResult($raw, $field, $op, $val, "Arah putaran lintasan {$rotName}", 'track', 'rotate-cw');

            case 'track_id':
                $trackName = self::TRACK_NAMES[$intVal] ?? "Racetrack #{$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Berlangsung di Pacuan Kuda {$trackName}", 'track', 'map-pin');

                // ================= STAMINA, HP & MENTAL =================
            case 'hp_per':
                if ($op === '<=' || $op === '<') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Sisa stamina (HP) tersisa {$val}% atau kurang", 'status', 'heart');
                }
                if ($op === '>=' || $op === '>') {
                    return self::makeClauseResult($raw, $field, $op, $val, "Sisa stamina (HP) masih tersisa minimal {$val}%", 'status', 'heart');
                }

                return self::makeClauseResult($raw, $field, $op, $val, "Stamina {$op} {$val}%", 'status', 'heart');

            case 'temptation_count':
                $text = $intVal === 0
                    ? 'Tidak sedang panik / tergesa-gesa (tidak terkena kakari)'
                    : 'Sedang mengalami panik / tergesa-gesa (kakari)';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'status', 'alert-circle');

            case 'is_temptation':
                $text = $intVal === 1
                    ? 'Sedang mengalami panik / tergesa-gesa (kakari)'
                    : 'Tidak sedang panik / tergesa-gesa (kakari)';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'status', 'alert-circle');

            case 'temptation_count_infront':
                return self::makeClauseResult($raw, $field, $op, $val, "Terdapat {$op} {$val} pelari di depan yang mengalami panik/kakari", 'status', 'alert-circle');

            case 'temptation_count_behind':
                return self::makeClauseResult($raw, $field, $op, $val, "Terdapat {$op} {$val} pelari di belakang yang mengalami panik/kakari", 'status', 'alert-circle');

            case 'temptation_opponent_count_infront':
                return self::makeClauseResult($raw, $field, $op, $val, "Terdapat {$op} {$val} pelari lawan di depan yang mengalami panik/kakari", 'status', 'alert-circle');

            case 'temptation_opponent_count_behind':
                return self::makeClauseResult($raw, $field, $op, $val, "Terdapat {$op} {$val} pelari lawan di belakang yang mengalami panik/kakari", 'status', 'alert-circle');

            case 'running_style_temptation_opponent_count_nige':
                $text = ($op === '>=' && $intVal === 1)
                    ? 'Terdapat minimal 1 pelari Front Runner (pelari depan / 逃げ) lawan yang sedang panik / tergesa-gesa (kakari)'
                    : "Jumlah pelari Front Runner (pelari depan / 逃げ) lawan yang sedang panik / tergesa-gesa (kakari) {$op} {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'strategy', 'alert-circle', 'Jumlah pelari Front Runner (逃げ) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.');

            case 'running_style_temptation_opponent_count_senko':
                $text = ($op === '>=' && $intVal === 1)
                    ? 'Terdapat minimal 1 pelari Pace Chaser (pelari penguntit / 先行) lawan yang sedang panik / tergesa-gesa (kakari)'
                    : "Jumlah pelari Pace Chaser (pelari penguntit / 先行) lawan yang sedang panik / tergesa-gesa (kakari) {$op} {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'strategy', 'alert-circle', 'Jumlah pelari Pace Chaser (先行) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.');

            case 'running_style_temptation_opponent_count_sashi':
                $text = ($op === '>=' && $intVal === 1)
                    ? 'Terdapat minimal 1 pelari Late Surger (pelari penyalip / 差し) lawan yang sedang panik / tergesa-gesa (kakari)'
                    : "Jumlah pelari Late Surger (pelari penyalip / 差し) lawan yang sedang panik / tergesa-gesa (kakari) {$op} {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'strategy', 'alert-circle', 'Jumlah pelari Late Surger (差し) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.');

            case 'running_style_temptation_opponent_count_oikomi':
                $text = ($op === '>=' && $intVal === 1)
                    ? 'Terdapat minimal 1 pelari End Closer (pelari penutup / 追込) lawan yang sedang panik / tergesa-gesa (kakari)'
                    : "Jumlah pelari End Closer (pelari penutup / 追込) lawan yang sedang panik / tergesa-gesa (kakari) {$op} {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'strategy', 'alert-circle', 'Jumlah pelari End Closer (追込) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.');

            case 'motivation':
                $moodNames = [
                    1 => 'Sangat Buruk (Terrible / 絶不調)',
                    2 => 'Buruk (Bad / 不調)',
                    3 => 'Biasa (Normal / 普通)',
                    4 => 'Baik (Good / 好調)',
                    5 => 'Sangat Baik (Perfect / 絶好調)',
                ];
                $name = $moodNames[$intVal] ?? "Mood {$val}";

                return self::makeClauseResult($raw, $field, $op, $val, "Mood karakter {$op} {$name}", 'status', 'smile');

            case 'is_badstart':
                $text = $intVal === 0
                    ? 'Start berjalan lancar (tidak mengalami bad start / telat start)'
                    : 'Mengalami start buruk / terlambat start (bad start)';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'status', 'play');

            case 'is_goodstart':
                return self::makeClauseResult($raw, $field, $op, $val, 'Melakukan start yang sempurna (good start)', 'status', 'play');

                // ================= SKILLS ACTIVATION COUNTERS =================
            case 'activate_count_middle':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah mengaktifkan minimal {$val} skill selama Fase Pertengahan (Mid-Race)", 'skill', 'sparkles');

            case 'activate_count_start':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah mengaktifkan minimal {$val} skill selama Fase Awal (Early-Race)", 'skill', 'sparkles');

            case 'activate_count_end_after':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah mengaktifkan minimal {$val} skill pada Fase Akhir atau Last Spurt", 'skill', 'sparkles');

            case 'activate_count_later_half':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah mengaktifkan minimal {$val} skill di paruh kedua balapan", 'skill', 'sparkles');

            case 'activate_count_all':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah mengaktifkan minimal {$val} skill sepanjang balapan ini", 'skill', 'sparkles');

            case 'activate_count_heal':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah mengaktifkan minimal {$val} skill pemulihan stamina (heal)", 'skill', 'sparkles');

            case 'activate_count_all_team':
                return self::makeClauseResult($raw, $field, $op, $val, "Tim telah mengaktifkan total minimal {$val} skill secara kumulatif", 'skill', 'sparkles');

            case 'is_activate_other_skill_detail':
                return self::makeClauseResult($raw, $field, $op, $val, 'Pemicu sebelumnya (Trigger 1) dari skill ini telah aktif lebih awal pada balapan', 'skill', 'zap');

            case 'is_activate_any_skill':
                return self::makeClauseResult($raw, $field, $op, $val, 'Ada skill lain yang baru saja diaktifkan', 'skill', 'zap');

            case 'is_activate_heal_skill':
                return self::makeClauseResult($raw, $field, $op, $val, 'Baru saja mengaktifkan skill pemulihan stamina', 'skill', 'heart');

            case 'is_used_skill_id':
            case 'is_used_skill_id_with_detail_one':
                return self::makeClauseResult($raw, $field, $op, $val, "Telah menggunakan skill khusus (ID: {$val}) pada balapan ini", 'skill', 'award');

                // ================= RANDOM POINT ACTIVATIONS =================
            case 'phase_random':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal (Early-Race)',
                    1 => 'Fase Pertengahan (Mid-Race)',
                    2 => 'Fase Akhir (Late-Race)',
                    3 => 'Last Spurt',
                    default => "Fase {$val}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Terpilih pada titik acak selama {$phaseName}", 'random', 'shuffle');

            case 'phase_firsthalf_random':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal', 1 => 'Fase Pertengahan', 2 => 'Fase Akhir', 3 => 'Last Spurt', default => "Fase {$val}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Terpilih pada titik acak di paruh pertama {$phaseName}", 'random', 'shuffle');

            case 'phase_laterhalf_random':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal', 1 => 'Fase Pertengahan', 2 => 'Fase Akhir', 3 => 'Last Spurt', default => "Fase {$val}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Terpilih pada titik acak di paruh kedua {$phaseName}", 'random', 'shuffle');

            case 'phase_firstquarter_random':
                $phaseName = match ($intVal) {
                    0 => 'Fase Awal', 1 => 'Fase Pertengahan', 2 => 'Fase Akhir', 3 => 'Last Spurt', default => "Fase {$val}"
                };

                return self::makeClauseResult($raw, $field, $op, $val, "Terpilih pada titik acak di seperempat awal {$phaseName}", 'random', 'shuffle');

            case 'corner_random':
                return self::makeClauseResult($raw, $field, $op, $val, "Terpilih pada titik acak di tikungan ke-{$val}", 'random', 'shuffle');

            case 'all_corner_random':
                return self::makeClauseResult($raw, $field, $op, $val, 'Terpilih pada titik acak di salah satu tikungan balapan', 'random', 'shuffle');

            case 'straight_random':
                return self::makeClauseResult($raw, $field, $op, $val, 'Terpilih pada titik acak di salah satu lintasan lurus', 'random', 'shuffle');

            case 'last_straight_random':
                return self::makeClauseResult($raw, $field, $op, $val, 'Terpilih pada titik acak di lintasan lurus terakhir', 'random', 'shuffle');

            case 'up_slope_random':
                return self::makeClauseResult($raw, $field, $op, $val, 'Terpilih pada titik acak di salah satu tanjakan', 'random', 'shuffle');

            case 'down_slope_random':
                return self::makeClauseResult($raw, $field, $op, $val, 'Terpilih pada titik acak di salah satu turunan', 'random', 'shuffle');

            case 'distance_rate_after_random':
                return self::makeClauseResult($raw, $field, $op, $val, "Terpilih pada titik acak setelah menempuh minimal {$val}% balapan", 'random', 'shuffle');

            case 'run_at_full_speed_random':
                return self::makeClauseResult($raw, $field, $op, $val, 'Terpilih pada titik acak saat pacuan kecepatan penuh (Zenkai Spurt)', 'random', 'zap');

                // ================= STATS & PROFILE =================
            case 'base_speed':
                return self::makeClauseResult($raw, $field, $op, $val, "Stat Speed dasar {$op} {$val}", 'stat', 'activity');

            case 'base_stamina':
                return self::makeClauseResult($raw, $field, $op, $val, "Stat Stamina dasar {$op} {$val}", 'stat', 'activity');

            case 'base_power':
                return self::makeClauseResult($raw, $field, $op, $val, "Stat Power dasar {$op} {$val}", 'stat', 'activity');

            case 'base_guts':
                return self::makeClauseResult($raw, $field, $op, $val, "Stat Guts dasar {$op} {$val}", 'stat', 'activity');

            case 'base_wiz':
                return self::makeClauseResult($raw, $field, $op, $val, "Stat Wit/Wisdom dasar {$op} {$val}", 'stat', 'activity');

            case 'fan_count':
                $formattedFans = number_format((int) $val, 0, ',', '.');

                return self::makeClauseResult($raw, $field, $op, $val, "Jumlah fans {$op} {$formattedFans}", 'stat', 'users');

            case 'popularity':
                return self::makeClauseResult($raw, $field, $op, $val, "Tingkat popularitas taruhan balap {$op} urutan ke-{$val}", 'stat', 'star');

            case 'is_abroad':
                $text = $intVal === 1 ? 'Balapan diadakan di luar negeri (seperti Prix de l\'Arc de Triomphe)' : 'Balapan diadakan di dalam negeri Jepang';

                return self::makeClauseResult($raw, $field, $op, $val, $text, 'track', 'globe');

            default:
                // Format camel/snake-case fallback
                $readableField = ucwords(str_replace('_', ' ', $field));

                return self::makeClauseResult($raw, $field, $op, $val, "{$readableField} {$op} {$val}", 'other', 'info');
        }
    }

    /**
     * Helper to construct clause result array.
     *
     * @return array{
     *     raw: string,
     *     field: string,
     *     operator: string,
     *     value: string|float|int,
     *     text: string,
     *     category: string,
     *     icon: string,
     *     note?: string
     * }
     */
    protected static function makeClauseResult(
        string $raw,
        string $field,
        string $op,
        string|float|int $val,
        string $text,
        string $category,
        string $icon,
        string $note = ''
    ): array {
        $result = [
            'raw' => $raw,
            'field' => $field,
            'operator' => $op,
            'value' => $val,
            'text' => $text,
            'category' => $category,
            'icon' => $icon,
        ];

        if ($note !== '') {
            $result['note'] = $note;
        }

        return $result;
    }

    /**
     * Build a fluent Indonesian summary sentence from condition items of a single branch.
     *
     * @param  list<array{text: string, category: string, raw: string, field: string}>  $conditions
     */
    protected static function buildBranchSummary(array $conditions): string
    {
        if (empty($conditions)) {
            return 'Skill akan selalu aktif.';
        }

        // Handle 'always' condition
        $hasAlways = false;
        foreach ($conditions as $c) {
            if ($c['field'] === 'always') {
                $hasAlways = true;
                break;
            }
        }

        if ($hasAlways) {
            $nonAlways = array_values(array_filter($conditions, fn ($c) => $c['field'] !== 'always'));
            if (empty($nonAlways)) {
                return 'Skill akan selalu aktif.';
            }

            return 'Skill akan selalu aktif saat '.implode(' DAN ', array_map(fn ($p) => lcfirst($p['text']), $nonAlways)).'.';
        }

        // Collect parts by field priority
        $locParts = [];
        $posParts = [];
        $actionParts = [];
        $otherParts = [];

        foreach ($conditions as $c) {
            $cat = $c['category'];
            $txt = $c['text'];

            if ($cat === 'phase' || $cat === 'track') {
                $locParts[] = $txt;
            } elseif ($cat === 'position' || $cat === 'progress') {
                $posParts[] = $txt;
            } elseif ($cat === 'action' || $cat === 'status') {
                $actionParts[] = $txt;
            } else {
                $otherParts[] = $txt;
            }
        }

        $allPhrases = array_merge($locParts, $posParts, $actionParts, $otherParts);

        if (count($allPhrases) === 1) {
            return 'Skill aktif saat '.lcfirst($allPhrases[0]).'.';
        }

        return 'Skill aktif saat '.implode(' DAN ', array_map(fn ($p) => lcfirst($p), $allPhrases)).'.';
    }

    /**
     * Build an overall summary covering all OR branches.
     *
     * @param  list<array{summary: string, conditions: mixed}>  $branches
     */
    protected static function buildOverallSummary(array $branches): string
    {
        if (empty($branches)) {
            return 'Skill akan selalu aktif.';
        }

        if (count($branches) === 1) {
            return $branches[0]['summary'];
        }

        $summaries = array_map(fn ($b, $idx) => 'Opsi '.($idx + 1).': '.$b['summary'], $branches, array_keys($branches));

        return implode(' ATAU ', $summaries);
    }
}
