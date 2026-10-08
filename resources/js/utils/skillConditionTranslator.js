/**
 * Uma Musume Skill Condition Translator
 * Translates mathematical/technical condition codes into fluent, easy-to-understand Indonesian explanations.
 * Based on GameTora Skill Condition Viewer data (https://gametora.com/umamusume/skill-condition-viewer).
 */

const TRACK_NAMES = {
    10001: 'Sapporo',
    10002: 'Hakodate',
    10003: 'Fukushima',
    10004: 'Niigata',
    10005: 'Tokyo',
    10006: 'Nakayama',
    10007: 'Chukyo',
    10008: 'Kyoto',
    10009: 'Hanshin',
    10010: 'Kokura',
    10011: 'Ooi',
    10012: 'Kawasaki',
    10013: 'Funabashi',
    10014: 'Morioka',
    10101: 'Longchamp',
};

/**
 * Translates a single atomic clause like "phase==2" or "order<=2".
 */
export function translateClause(clause) {
    if (!clause || typeof clause !== 'string') {
        return {
            raw: '',
            field: '',
            operator: '==',
            value: '',
            text: '',
            category: 'general',
            icon: 'zap',
        };
    }

    const trimmed = clause.trim();
    const match = trimmed.match(/^([a-z0-9_]+)\s*(<=|>=|!=|==|<|>)\s*(.+)$/i);

    if (!match) {
        return {
            raw: trimmed,
            field: trimmed,
            operator: '==',
            value: '',
            text: `Kondisi: ${trimmed}`,
            category: 'general',
            icon: 'zap',
        };
    }

    const field = match[1].toLowerCase();
    const op = match[2];
    const valStr = match[3].trim();
    const val = isNaN(valStr) ? valStr : Number(valStr);
    const intVal = parseInt(valStr, 10);

    switch (field) {
        // ================= UNCONDITIONAL / ALWAYS =================
        case 'always':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                'Skill akan selalu aktif',
                'skill',
                'sparkles',
                'Skill ini tidak memerlukan kondisi balapan tertentu dan akan selalu aktif.'
            );

        // ================= RACETRACK / PHASE =================
        case 'phase': {
            const phaseLabels = {
                0: 'Fase Awal (Early-Race)',
                1: 'Fase Pertengahan (Mid-Race)',
                2: 'Fase Akhir (Late-Race)',
                3: 'Fase Spurt Akhir (Last Spurt)',
            };
            if (op === '==' && phaseLabels[intVal] !== undefined) {
                return makeResult(trimmed, field, op, val, `Berada di ${phaseLabels[intVal]}`, 'phase', 'flag');
            }
            if (op === '>=' && intVal === 2) {
                return makeResult(trimmed, field, op, val, 'Berada di Fase Akhir (Late-Race) atau Last Spurt', 'phase', 'flag');
            }
            if (op === '>=' && intVal === 1) {
                return makeResult(trimmed, field, op, val, 'Berada di Fase Pertengahan (Mid-Race) ke atas', 'phase', 'flag');
            }
            if (op === '<=' && intVal === 1) {
                return makeResult(trimmed, field, op, val, 'Berada di Fase Awal hingga Pertengahan (Early s/d Mid-Race)', 'phase', 'flag');
            }
            return makeResult(trimmed, field, op, val, `Fase balapan ${op} ${val}`, 'phase', 'flag');
        }

        case 'phase_firsthalf': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            const name = names[intVal] || `Fase ${intVal}`;
            return makeResult(trimmed, field, op, val, `Berada di paruh pertama ${name}`, 'phase', 'flag');
        }

        case 'phase_laterhalf': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            const name = names[intVal] || `Fase ${intVal}`;
            return makeResult(trimmed, field, op, val, `Berada di paruh kedua ${name}`, 'phase', 'flag');
        }

        case 'straight_front_type': {
            if (op === '==' && intVal === 1) {
                return makeResult(trimmed, field, op, val, 'Berada di lintasan lurus depan tribun penonton (frontstretch)', 'track', 'compass');
            }
            if (op === '==' && intVal === 2) {
                return makeResult(trimmed, field, op, val, 'Berada di lintasan lurus seberang penonton (backstretch)', 'track', 'compass');
            }
            return makeResult(trimmed, field, op, val, `Tipe lintasan lurus ${op} ${val}`, 'track', 'compass');
        }

        case 'corner': {
            if (op === '==' && intVal === 0) {
                return makeResult(trimmed, field, op, val, 'Sedang berada di lintasan lurus (bukan di tikungan)', 'track', 'corner');
            }
            if (op === '!=' && intVal === 0) {
                return makeResult(trimmed, field, op, val, 'Sedang berada di tikungan manapun', 'track', 'corner');
            }
            if (op === '==' && intVal >= 1 && intVal <= 4) {
                return makeResult(trimmed, field, op, val, `Sedang berada di tikungan ke-${val}`, 'track', 'corner');
            }
            return makeResult(trimmed, field, op, val, `Tikungan ${op} ${val}`, 'track', 'corner');
        }

        case 'is_finalcorner':
            return makeResult(trimmed, field, op, val, 'Sedang berada di tikungan terakhir (Final Corner)', 'track', 'flag');

        case 'is_finalcorner_laterhalf':
            return makeResult(trimmed, field, op, val, 'Sedang berada di paruh kedua tikungan terakhir', 'track', 'flag');

        case 'is_last_straight':
        case 'is_last_straight_onetime':
            return makeResult(trimmed, field, op, val, 'Sedang berada di lintasan lurus terakhir (Final Straight)', 'track', 'flag');

        case 'is_lastspurt':
            return makeResult(trimmed, field, op, val, 'Sedang dalam pacuan sprint akhir (Last Spurt mode)', 'status', 'zap');

        case 'slope': {
            const slopeTexts = {
                1: 'Sedang berada di tanjakan (uphill)',
                2: 'Sedang berada di turunan (downhill)',
                0: 'Sedang berada di lintasan datar (flat)',
            };
            return makeResult(trimmed, field, op, val, slopeTexts[intVal] || `Kemiringan lintasan ${op} ${val}`, 'track', 'trending-up');
        }

        // ================= PROGRESS & DISTANCE =================
        case 'distance_rate': {
            if (op === '>=' || op === '>') {
                const text = intVal === 50
                    ? 'Telah melewati separuh jarak balapan (progres >= 50%)'
                    : `Progres balapan telah mencapai minimal ${val}%`;
                return makeResult(trimmed, field, op, val, text, 'progress', 'gauge');
            }
            if (op === '<=' || op === '<') {
                return makeResult(trimmed, field, op, val, `Progres balapan masih berada di bawah atau sama dengan ${val}%`, 'progress', 'gauge');
            }
            return makeResult(trimmed, field, op, val, `Progres balapan ${op} ${val}%`, 'progress', 'gauge');
        }

        case 'remain_distance': {
            if (op === '<=' || op === '<') {
                return makeResult(trimmed, field, op, val, `Sisa jarak menuju garis finish <= ${val} meter`, 'progress', 'milestone');
            }
            if (op === '>=' || op === '>') {
                return makeResult(trimmed, field, op, val, `Sisa jarak menuju garis finish >= ${val} meter`, 'progress', 'milestone');
            }
            if (op === '==') {
                return makeResult(trimmed, field, op, val, `Tepat di sisa jarak ${val} meter menuju garis finish`, 'progress', 'milestone');
            }
            return makeResult(trimmed, field, op, val, `Sisa jarak finish ${op} ${val}m`, 'progress', 'milestone');
        }

        case 'course_distance':
            return makeResult(trimmed, field, op, val, `Panjang lintasan balap ${op} ${val} meter`, 'track', 'map-pin');

        case 'is_basis_distance':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                intVal === 1
                    ? 'Balapan pada jarak standar (kelipatan 400m, misal 1200m, 1600m, 2000m, 2400m)'
                    : 'Balapan pada jarak non-standar (bukan kelipatan 400m)',
                'track',
                'map-pin'
            );

        case 'accumulatetime':
            return makeResult(trimmed, field, op, val, `Waktu balapan telah berjalan minimal ${val} detik`, 'progress', 'clock');

        // ================= POSITION & RANKING =================
        case 'order': {
            if (op === '<=') {
                const text = intVal === 1
                    ? 'Memimpin balapan di posisi terdepan (peringkat 1)'
                    : `Peringkat ke-1 s/d ${val} (posisi 1–${val} terdepan)`;
                return makeResult(trimmed, field, op, val, text, 'position', 'trophy');
            }
            if (op === '>=') {
                return makeResult(trimmed, field, op, val, `Peringkat ke-${val} atau lebih belakang`, 'position', 'trophy');
            }
            if (op === '==') {
                const text = intVal === 1 ? 'Sedang memimpin balapan (peringkat 1)' : `Tepat di peringkat ke-${val}`;
                return makeResult(trimmed, field, op, val, text, 'position', 'trophy');
            }
            return makeResult(trimmed, field, op, val, `Peringkat balapan ${op} ${val}`, 'position', 'trophy');
        }

        case 'order_rate': {
            const cm = Math.ceil((9 * Number(val)) / 100);
            const loh = Math.ceil((12 * Number(val)) / 100);
            if (op === '<=') {
                return makeResult(trimmed, field, op, val, `Peringkat di ${val}% pelari terdepan (CM [Champions Meetings] <= ${cm} | LoH [League of Heroes] <= ${loh})`, 'position', 'percent');
            }
            if (op === '>=') {
                return makeResult(trimmed, field, op, val, `Peringkat di ${val}% pelari belakang (CM [Champions Meetings] >= ${cm} | LoH [League of Heroes] >= ${loh})`, 'position', 'percent');
            }
            return makeResult(trimmed, field, op, val, `Peringkat persentase ${op} ${val}% (CM [Champions Meetings]: ${cm} | LoH [League of Heroes]: ${loh})`, 'position', 'percent');
        }

        case 'order_rate_in20_continue':
        case 'order_rate_in40_continue':
        case 'order_rate_in50_continue':
        case 'order_rate_in80_continue': {
            const m = field.match(/in(\d+)/);
            const pct = m ? m[1] : '50';
            return makeResult(trimmed, field, op, val, `Konsisten bertahan di ${pct}% pelari terdepan sepanjang balapan hingga titik ini`, 'position', 'shield');
        }

        case 'order_rate_out20_continue':
        case 'order_rate_out40_continue':
        case 'order_rate_out50_continue':
        case 'order_rate_out70_continue': {
            const m = field.match(/out(\d+)/);
            const pct = m ? m[1] : '50';
            return makeResult(trimmed, field, op, val, `Konsisten berada di luar ${pct}% pelari terdepan sepanjang balapan hingga titik ini`, 'position', 'shield');
        }

        // ================= OVERTAKE & ACTIONS =================
        case 'change_order_onetime': {
            if (op === '<' && intVal <= 0) {
                return makeResult(trimmed, field, op, val, 'Berhasil menyalip pelari lain (peringkat naik)', 'action', 'arrow-up-right');
            }
            if (op === '>' && intVal >= 0) {
                return makeResult(trimmed, field, op, val, 'Tersalip oleh pelari lain (peringkat turun)', 'action', 'arrow-down-right');
            }
            return makeResult(trimmed, field, op, val, `Perubahan posisi ${op} ${val}`, 'action', 'arrow-up-right');
        }

        case 'change_order_up_middle':
            return makeResult(trimmed, field, op, val, `Telah menyalip lawan minimal ${val} kali selama Fase Pertengahan (Mid-Race)`, 'action', 'arrow-up-right');

        case 'change_order_up_end_after':
            return makeResult(trimmed, field, op, val, `Telah menyalip lawan minimal ${val} kali setelah memasuki Fase Akhir`, 'action', 'arrow-up-right');

        case 'change_order_up_finalcorner_after':
            return makeResult(trimmed, field, op, val, `Telah menyalip lawan minimal ${val} kali setelah tikungan terakhir`, 'action', 'arrow-up-right');

        case 'is_overtake':
            return makeResult(trimmed, field, op, val, 'Sedang dalam upaya menyalip lawan (overtaking attempt)', 'action', 'zap');

        case 'overtake_target_no_order_up_time':
            return makeResult(trimmed, field, op, val, `Sedang mengejar lawan tanpa berhasil naik peringkat selama minimal ${val} detik`, 'action', 'clock');

        case 'overtake_target_time':
            return makeResult(trimmed, field, op, val, `Sedang menargetkan lawan untuk disalip selama minimal ${val} detik`, 'action', 'clock');

        case 'compete_fight_count':
            return makeResult(trimmed, field, op, val, `Telah beradu kecepatan sengit (Showdown / Kurasoi) minimal ${val} kali`, 'action', 'swords');

        case 'bashin_diff_infront':
            return makeResult(trimmed, field, op, val, `Jarak ke pelari tepat di depan <= ${val} bashin (panjang kuda)`, 'position', 'ruler');

        case 'bashin_diff_behind':
            return makeResult(trimmed, field, op, val, `Jarak ke pelari tepat di belakang ${op} ${val} bashin (panjang kuda)`, 'position', 'ruler');

        case 'distance_diff_top':
            return makeResult(trimmed, field, op, val, `Jarak selisih dengan pelari peringkat pertama ${op} ${val} meter`, 'position', 'ruler');

        case 'distance_diff_top_float':
            return makeResult(trimmed, field, op, val, `Jarak selisih dengan pelari peringkat pertama ${op} ${Number(val) / 10} meter`, 'position', 'ruler');

        case 'blocked_front':
            return makeResult(trimmed, field, op, val, 'Jalur lari di depan sedang terhalang oleh pelari lain', 'status', 'shield-alert');

        case 'blocked_front_continuetime':
            return makeResult(trimmed, field, op, val, `Terhalang oleh pelari di depan selama minimal ${val} detik`, 'status', 'shield-alert');

        case 'blocked_side_continuetime':
            return makeResult(trimmed, field, op, val, `Terhimpit dari samping oleh pelari lain selama minimal ${val} detik`, 'status', 'shield-alert');

        case 'is_surrounded':
            return makeResult(trimmed, field, op, val, 'Sedang terkepung oleh pelari lain di sekitarnya', 'status', 'users');

        case 'blocked_all_continuetime':
            return makeResult(trimmed, field, op, val, `Terhalang oleh pelari lain dari depan dan samping secara bersamaan selama minimal ${val} detik`, 'status', 'shield-alert');

        case 'near_count': {
            let text = `Terdapat minimal ${val} pelari lain di sekitar dekat`;
            if (op === '==') {
                text = `Terdapat tepat ${val} pelari lain di sekitar dekat`;
            } else if (op === '<=' || op === '<') {
                text = `Terdapat maksimal ${val} pelari lain di sekitar dekat`;
            } else if (op === '>') {
                text = `Terdapat lebih dari ${val} pelari lain di sekitar dekat`;
            }
            const note = 'Catatan: "Sekitar dekat" berarti tidak lebih dari 3 meter di depan/belakang dan tidak lebih dari 3 lajur ke samping (1 lajur = 1/18 lebar lintasan).';
            return makeResult(trimmed, field, op, val, text, 'status', 'users', note);
        }

        case 'near_infront_count': {
            let text = `Terdapat minimal ${val} pelari lain tepat di depan`;
            if (op === '==' && intVal === 0) {
                text = 'Tidak ada pelari lain tepat di depan';
            } else if (op === '==') {
                text = `Terdapat tepat ${val} pelari lain tepat di depan`;
            } else if (op === '<=' || op === '<') {
                text = `Terdapat maksimal ${val} pelari lain tepat di depan`;
            } else if (op === '>') {
                text = `Terdapat lebih dari ${val} pelari lain tepat di depan`;
            }
            const note = 'Catatan: "Tepat di depan" berarti tidak lebih dari 2,5 meter di depan.';
            return makeResult(trimmed, field, op, val, text, 'status', 'users', note);
        }

        case 'infront_near_lane_time': {
            let text = `Terdapat pelari lain tepat di depan selama minimal ${val} detik`;
            if (op === '==') {
                text = `Terdapat pelari lain tepat di depan selama tepat ${val} detik`;
            } else if (op === '<=' || op === '<') {
                text = `Terdapat pelari lain tepat di depan selama maksimal ${val} detik`;
            } else if (op === '>') {
                text = `Terdapat pelari lain tepat di depan selama lebih dari ${val} detik`;
            }
            const note = 'Catatan: "Tepat di depan" berarti tidak lebih dari 2,5 meter di depan dan tidak lebih dari 1 lajur ke samping (1/18 lebar lintasan). Tidak harus pelari yang sama (asalkan ada minimal satu), namun timer akan reset jika peringkat Anda berubah.';
            return makeResult(trimmed, field, op, val, text, 'action', 'clock', note);
        }

        case 'behind_near_lane_time':
        case 'behind_near_lane_time_set1': {
            let text = `Terdapat pelari lain tepat di belakang selama minimal ${val} detik`;
            if (op === '==') {
                text = `Terdapat pelari lain tepat di belakang selama tepat ${val} detik`;
            } else if (op === '<=' || op === '<') {
                text = `Terdapat pelari lain tepat di belakang selama maksimal ${val} detik`;
            } else if (op === '>') {
                text = `Terdapat pelari lain tepat di belakang selama lebih dari ${val} detik`;
            }
            const note = 'Catatan: "Tepat di belakang" berarti tidak lebih dari 2,5 meter di belakang dan tidak lebih dari 1 lajur ke samping (1/18 lebar lintasan). Tidak harus pelari yang sama (asalkan ada minimal satu), namun timer akan reset jika peringkat Anda berubah.';
            return makeResult(trimmed, field, op, val, text, 'action', 'clock', note);
        }

        case 'lastspurt': {
            let text = `Mode pacuan sprint akhir (Last Spurt) bernilai ${val}`;
            if (intVal === 2) {
                text = 'Memiliki stamina yang cukup untuk sprint akhir (Last Spurt) dengan kecepatan penuh';
            } else if (intVal === 1) {
                text = 'Memiliki stamina yang cukup untuk berlari di atas kecepatan dasar saat sprint akhir';
            } else if (intVal === 0) {
                text = 'Stamina tidak mencukupi untuk mempertahankan kecepatan dasar di sprint akhir';
            }
            const note = 'Catatan: Mengacu pada kecukupan stamina karakter untuk melakukan pacuan sprint akhir (Last Spurt) di Fase Akhir balapan.';
            return makeResult(trimmed, field, op, val, text, 'status', 'zap', note);
        }

        case 'is_move_lane': {
            let text = 'Baru saja berpindah lajur lintasan';
            if (intVal === 1) {
                text = 'Baru saja bergerak mendekat ke sisi pagar dalam (inner fence)';
            } else if (intVal === 2) {
                text = 'Baru saja bergerak menjauh dari sisi pagar dalam (outer fence)';
            }
            return makeResult(trimmed, field, op, val, text, 'action', 'arrow-right-left');
        }

        case 'visiblehorse':
            return makeResult(trimmed, field, op, val, `Jumlah pelari dalam bidang pandang ${op} ${val}`, 'status', 'eye');

        // ================= STRATEGY & TRACK APTITUDES =================
        case 'running_style': {
            const styles = {
                1: 'Runner (Pelari Depan / 逃げ)',
                2: 'Leader (Pengejar Terdepan / 先行)',
                3: 'Betweener (Pelari Tengah / 差し)',
                4: 'Chaser (Pelari Belakang / 追込)',
            };
            return makeResult(trimmed, field, op, val, `Menggunakan strategi ${styles[intVal] || `Strategi ${val}`}`, 'strategy', 'user-check');
        }

        case 'distance_type': {
            const dists = {
                1: 'Jarak Pendek (Sprint / 短距離)',
                2: 'Jarak Mil (Mile / マイル)',
                3: 'Jarak Menengah (Medium / 中距離)',
                4: 'Jarak Jauh (Long / 長距離)',
            };
            return makeResult(trimmed, field, op, val, `Balapan kategori ${dists[intVal] || `Jarak ${val}`}`, 'track', 'map-pin');
        }

        case 'ground_type': {
            const grounds = {
                1: 'Lintasan Rumput (Turf / 芝)',
                2: 'Lintasan Tanah (Dirt / ダート)',
            };
            return makeResult(trimmed, field, op, val, `Berlangsung di ${grounds[intVal] || `Tipe Tanah ${val}`}`, 'track', 'trees');
        }

        case 'ground_condition': {
            const conditions = {
                1: 'Baik (Good / 良)',
                2: 'Sedikit Basah (Yielding / 稍重)',
                3: 'Basah (Soft / 重)',
                4: 'Buruk/Berlumpur (Bad / 不良)',
            };
            return makeResult(trimmed, field, op, val, `Kondisi lintasan ${conditions[intVal] || `Kondisi ${val}`}`, 'track', 'cloud-rain');
        }

        case 'weather': {
            const weathers = {
                1: 'Cerah (Sunny / 晴)',
                2: 'Berawan (Cloudy / 曇)',
                3: 'Hujan (Rainy / 雨)',
                4: 'Bersalju (Snowy / 雪)',
            };
            return makeResult(trimmed, field, op, val, `Kondisi cuaca ${weathers[intVal] || `Cuaca ${val}`}`, 'track', 'sun');
        }

        case 'season': {
            const seasons = {
                1: 'Musim Semi (Spring / 春)',
                2: 'Musim Panas (Summer / 夏)',
                3: 'Musim Gugur (Autumn / 秋)',
                4: 'Musim Dingin (Winter / 冬)',
            };
            return makeResult(trimmed, field, op, val, `Berlangsung pada ${seasons[intVal] || `Musim ${val}`}`, 'track', 'calendar');
        }

        case 'time': {
            const times = {
                0: 'Waktu Bebas',
                1: 'Pagi hari (Morning)',
                2: 'Siang hari (Daytime)',
                3: 'Sore hari (Evening)',
                4: 'Malam hari (Night)',
            };
            return makeResult(trimmed, field, op, val, `Balapan pada ${times[intVal] || `Waktu ${val}`}`, 'track', 'clock');
        }

        case 'track_id': {
            const trackName = TRACK_NAMES[intVal] || `Racetrack #${val}`;
            return makeResult(trimmed, field, op, val, `Berlangsung di Pacuan Kuda ${trackName}`, 'track', 'map-pin');
        }

        // ================= STAMINA & HP =================
        case 'hp_per': {
            if (op === '<=' || op === '<') {
                return makeResult(trimmed, field, op, val, `Sisa stamina (HP) tersisa ${val}% atau kurang`, 'status', 'heart');
            }
            if (op === '>=' || op === '>') {
                return makeResult(trimmed, field, op, val, `Sisa stamina (HP) masih tersisa minimal ${val}%`, 'status', 'heart');
            }
            return makeResult(trimmed, field, op, val, `Stamina ${op} ${val}%`, 'status', 'heart');
        }

        case 'temptation_count':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                intVal === 0 ? 'Tidak sedang panik / tergesa-gesa (tidak terkena kakari)' : 'Sedang mengalami panik / tergesa-gesa (kakari)',
                'status',
                'alert-circle'
            );

        case 'motivation': {
            const moods = {
                1: 'Sangat Buruk (Terrible / 絶不調)',
                2: 'Buruk (Bad / 不調)',
                3: 'Biasa (Normal / 普通)',
                4: 'Baik (Good / 好調)',
                5: 'Sangat Baik (Perfect / 絶好調)',
            };
            return makeResult(trimmed, field, op, val, `Mood karakter ${op} ${moods[intVal] || `Mood ${val}`}`, 'status', 'smile');
        }

        case 'is_badstart':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                intVal === 0 ? 'Start berjalan lancar (tidak mengalami bad start / telat start)' : 'Mengalami start buruk / terlambat start (bad start)',
                'status',
                'play'
            );

        case 'is_goodstart':
            return makeResult(trimmed, field, op, val, 'Melakukan start yang sempurna (good start)', 'status', 'play');

        // ================= SKILLS ACTIVATION COUNTERS =================
        case 'activate_count_middle':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan minimal ${val} skill selama Fase Pertengahan (Mid-Race)`, 'skill', 'sparkles');

        case 'activate_count_start':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan minimal ${val} skill selama Fase Awal (Early-Race)`, 'skill', 'sparkles');

        case 'activate_count_end_after':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan minimal ${val} skill pada Fase Akhir atau Last Spurt`, 'skill', 'sparkles');

        case 'activate_count_later_half':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan minimal ${val} skill di paruh kedua balapan`, 'skill', 'sparkles');

        case 'activate_count_all':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan minimal ${val} skill sepanjang balapan ini`, 'skill', 'sparkles');

        case 'activate_count_heal':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan minimal ${val} skill pemulihan stamina (heal)`, 'skill', 'sparkles');

        case 'activate_count_all_team':
            return makeResult(trimmed, field, op, val, `Tim telah mengaktifkan total minimal ${val} skill secara kumulatif`, 'skill', 'sparkles');

        case 'is_activate_other_skill_detail':
            return makeResult(trimmed, field, op, val, 'Pemicu sebelumnya (Trigger 1) dari skill ini telah aktif lebih awal pada balapan', 'skill', 'zap');

        case 'is_activate_any_skill':
            return makeResult(trimmed, field, op, val, 'Ada skill lain yang baru saja diaktifkan', 'skill', 'zap');

        case 'is_activate_heal_skill':
            return makeResult(trimmed, field, op, val, 'Baru saja mengaktifkan skill pemulihan stamina', 'skill', 'heart');

        // ================= RANDOM POINT ACTIVATIONS =================
        case 'phase_random': {
            const names = ['Fase Awal (Early-Race)', 'Fase Pertengahan (Mid-Race)', 'Fase Akhir (Late-Race)', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak selama ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'phase_firsthalf_random': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di paruh pertama ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'phase_laterhalf_random': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di paruh kedua ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'corner_random':
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di tikungan ke-${val}`, 'random', 'shuffle');

        case 'all_corner_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di salah satu tikungan balapan', 'random', 'shuffle');

        case 'straight_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di salah satu lintasan lurus', 'random', 'shuffle');

        case 'last_straight_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di lintasan lurus terakhir', 'random', 'shuffle');

        case 'up_slope_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di salah satu tanjakan', 'random', 'shuffle');

        case 'down_slope_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di salah satu turunan', 'random', 'shuffle');

        case 'distance_rate_after_random':
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak setelah menempuh minimal ${val}% balapan`, 'random', 'shuffle');

        case 'run_at_full_speed_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak saat pacuan kecepatan penuh (Zenkai Spurt)', 'random', 'zap');

        // ================= BASE STATS =================
        case 'base_speed':
            return makeResult(trimmed, field, op, val, `Stat Speed dasar ${op} ${val}`, 'stat', 'activity');
        case 'base_stamina':
            return makeResult(trimmed, field, op, val, `Stat Stamina dasar ${op} ${val}`, 'stat', 'activity');
        case 'base_power':
            return makeResult(trimmed, field, op, val, `Stat Power dasar ${op} ${val}`, 'stat', 'activity');
        case 'base_guts':
            return makeResult(trimmed, field, op, val, `Stat Guts dasar ${op} ${val}`, 'stat', 'activity');
        case 'base_wiz':
            return makeResult(trimmed, field, op, val, `Stat Wit/Wisdom dasar ${op} ${val}`, 'stat', 'activity');

        case 'fan_count':
            return makeResult(trimmed, field, op, val, `Jumlah fans ${op} ${Number(val).toLocaleString('id-ID')}`, 'stat', 'users');

        case 'popularity':
            return makeResult(trimmed, field, op, val, `Tingkat popularitas taruhan balap ${op} urutan ke-${val}`, 'stat', 'star');

        case 'is_abroad':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                intVal === 1 ? "Balapan diadakan di luar negeri (seperti Prix de l'Arc de Triomphe)" : 'Balapan diadakan di dalam negeri Jepang',
                'track',
                'globe'
            );

        // ================= TRACK ATTRIBUTES & CONDITIONS =================
        case 'is_tight_track':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                'Balapan di lintasan dengan tikungan tajam/sempit',
                'track',
                'corner',
                'Catatan: Berlaku untuk sirkuit Sapporo, Hakodate, Fukushima, Kokura, Kawasaki, dan Funabashi.'
            );

        case 'rotation':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                intVal === 1 ? 'Arah putaran lintasan searah jarum jam (Kanan / Right-turn)' : 'Arah putaran lintasan berlawanan jarum jam (Kiri / Left-turn)',
                'track',
                'compass'
            );

        case 'corner_count':
            return makeResult(trimmed, field, op, val, `Jumlah tikungan sirkuit balap ${op} ${val}`, 'track', 'corner');

        case 'furlong':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                `Berada pada furlong ke-${val} (sekitar ${(Number(val) - 1) * 200}–${Number(val) * 200} meter awal balapan)`,
                'progress',
                'milestone'
            );

        case 'grade': {
            const gradeNames = {
                100: 'G1',
                200: 'G2',
                300: 'G3',
                400: 'Open (OP)',
                700: 'Pre-OP',
            };
            return makeResult(trimmed, field, op, val, `Grade kompetisi balapan ${op} ${gradeNames[intVal] || `Grade ${val}`}`, 'track', 'trophy');
        }

        case 'is_dirtgrade':
            return makeResult(trimmed, field, op, val, 'Balapan berkategori grade Dirt resmi (Jpn1, Jpn2, Jpn3)', 'track', 'trophy');

        // ================= ADDITIONAL RANDOM & PROGRESS =================
        case 'is_finalcorner_random':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di tikungan terakhir (Final Corner)', 'random', 'shuffle');

        case 'phase_corner_random': {
            const names = ['Fase Awal (Early-Race)', 'Fase Pertengahan (Mid-Race)', 'Fase Akhir (Late-Race)', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di tikungan saat ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'phase_firstquarter': {
            const names = ['Fase Awal (Early-Race)', 'Fase Pertengahan (Mid-Race)', 'Fase Akhir (Late-Race)', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Berada di seperempat pertama ${names[intVal] || `Fase ${val}`}`, 'phase', 'flag');
        }

        case 'phase_firstquarter_random': {
            const names = ['Fase Awal (Early-Race)', 'Fase Pertengahan (Mid-Race)', 'Fase Akhir (Late-Race)', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di seperempat pertama ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'phase_first_half_straight_random': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di lintasan lurus paruh pertama ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'phase_latter_half_straight_random': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di lintasan lurus paruh kedua ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'phase_straight_random': {
            const names = ['Fase Awal', 'Fase Pertengahan', 'Fase Akhir', 'Last Spurt'];
            return makeResult(trimmed, field, op, val, `Terpilih pada titik acak di lintasan lurus saat ${names[intVal] || `Fase ${val}`}`, 'random', 'shuffle');
        }

        case 'up_slope_random_later_half':
            return makeResult(trimmed, field, op, val, 'Terpilih pada titik acak di tanjakan paruh kedua balapan', 'random', 'shuffle');

        // ================= STATUS & CONDITIONS =================
        case 'is_hp_empty_onetime':
            return makeResult(trimmed, field, op, val, 'Stamina (HP) pernah habis terkuras selama balapan ini', 'status', 'heart');

        case 'is_temptation':
            return makeResult(
                trimmed,
                field,
                op,
                val,
                intVal === 1 ? 'Sedang mengalami panik / tergesa-gesa (kakari)' : 'Tidak sedang panik / tergesa-gesa (kakari)',
                'status',
                'alert-circle'
            );

        case 'temptation_count_infront':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} pelari di depan yang mengalami panik/kakari`, 'status', 'alert-circle');

        case 'temptation_count_behind':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} pelari di belakang yang mengalami panik/kakari`, 'status', 'alert-circle');

        case 'temptation_opponent_count_infront':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} pelari lawan di depan yang mengalami panik/kakari`, 'status', 'alert-circle');

        case 'temptation_opponent_count_behind':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} pelari lawan di belakang yang mengalami panik/kakari`, 'status', 'alert-circle');

        case 'running_style_temptation_opponent_count_nige': {
            const text = (op === '>=' && intVal === 1)
                ? 'Terdapat minimal 1 pelari Front Runner (pelari depan / 逃げ) lawan yang sedang panik / tergesa-gesa (kakari)'
                : `Jumlah pelari Front Runner (pelari depan / 逃げ) lawan yang sedang panik / tergesa-gesa (kakari) ${op} ${val}`;
            return makeResult(
                trimmed,
                field,
                op,
                val,
                text,
                'strategy',
                'alert-circle',
                'Jumlah pelari Front Runner (逃げ) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.'
            );
        }

        case 'running_style_temptation_opponent_count_senko': {
            const text = (op === '>=' && intVal === 1)
                ? 'Terdapat minimal 1 pelari Pace Chaser (pelari penguntit / 先行) lawan yang sedang panik / tergesa-gesa (kakari)'
                : `Jumlah pelari Pace Chaser (pelari penguntit / 先行) lawan yang sedang panik / tergesa-gesa (kakari) ${op} ${val}`;
            return makeResult(
                trimmed,
                field,
                op,
                val,
                text,
                'strategy',
                'alert-circle',
                'Jumlah pelari Pace Chaser (先行) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.'
            );
        }

        case 'running_style_temptation_opponent_count_sashi': {
            const text = (op === '>=' && intVal === 1)
                ? 'Terdapat minimal 1 pelari Late Surger (pelari penyalip / 差し) lawan yang sedang panik / tergesa-gesa (kakari)'
                : `Jumlah pelari Late Surger (pelari penyalip / 差し) lawan yang sedang panik / tergesa-gesa (kakari) ${op} ${val}`;
            return makeResult(
                trimmed,
                field,
                op,
                val,
                text,
                'strategy',
                'alert-circle',
                'Jumlah pelari Late Surger (差し) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.'
            );
        }

        case 'running_style_temptation_opponent_count_oikomi': {
            const text = (op === '>=' && intVal === 1)
                ? 'Terdapat minimal 1 pelari End Closer (pelari penutup / 追込) lawan yang sedang panik / tergesa-gesa (kakari)'
                : `Jumlah pelari End Closer (pelari penutup / 追込) lawan yang sedang panik / tergesa-gesa (kakari) ${op} ${val}`;
            return makeResult(
                trimmed,
                field,
                op,
                val,
                text,
                'strategy',
                'alert-circle',
                'Jumlah pelari End Closer (追込) lawan yang saat ini sedang mengalami status panik (kakari) di dalam balapan.'
            );
        }

        case 'random_lot':
        case 'random_lot_shared':
            return makeResult(trimmed, field, op, val, `Peluang keberhasilan aktivasi ${val}% (undian acak)`, 'random', 'shuffle');

        case 'succession_skill_count':
            return makeResult(trimmed, field, op, val, `Memiliki minimal ${val} skill warisan (Inherited Skill)`, 'skill', 'sparkles');

        case 'same_skill_horse_count':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} pelari lain dalam balapan yang memiliki skill ini`, 'skill', 'users');

        case 'running_style_count_same':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} pelari lain dengan strategi lari yang sama`, 'strategy', 'users');

        case 'running_style_count_same_rate':
            return makeResult(trimmed, field, op, val, `Proporsi pelari dengan strategi lari yang sama ${op} ${val}%`, 'strategy', 'users');

        case 'running_style_count_nige_otherself':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} Runner (pelari depan) lain selain diri sendiri`, 'strategy', 'users');

        case 'running_style_count_senko_otherself':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} Leader (pengejar depan) lain selain diri sendiri`, 'strategy', 'users');

        case 'running_style_count_sashi_otherself':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} Betweener (pelari tengah) lain selain diri sendiri`, 'strategy', 'users');

        case 'running_style_count_oikomi_otherself':
            return makeResult(trimmed, field, op, val, `Terdapat ${op} ${val} Chaser (pelari belakang) lain selain diri sendiri`, 'strategy', 'users');

        case 'is_exist_chara_id':
            return makeResult(trimmed, field, op, val, `Terdapat karakter spesifik (ID ${val}) dalam balapan`, 'other', 'users');

        case 'is_exist_skill_id':
            return makeResult(trimmed, field, op, val, `Terdapat pelari dalam balapan yang memiliki skill spesifik (ID ${val})`, 'skill', 'zap');

        case 'is_used_skill_id':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan skill spesifik (ID ${val}) dalam balapan ini`, 'skill', 'zap');

        case 'is_used_skill_id_with_detail_one':
            return makeResult(trimmed, field, op, val, `Telah mengaktifkan trigger pertama skill spesifik (ID ${val})`, 'skill', 'zap');

        case 'is_popularity_top_character_activate_advantage_skill':
            return makeResult(trimmed, field, op, val, 'Pelari terpopuler (favorit 1) baru saja mengaktifkan skill keunggulan', 'skill', 'zap');

        case 'is_other_character_activate_advantage_skill':
            return makeResult(trimmed, field, op, val, 'Pelari lain dalam balapan baru saja mengaktifkan skill keunggulan', 'skill', 'zap');

        default: {
            const readable = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return makeResult(trimmed, field, op, val, `${readable} ${op} ${val}`, 'other', 'info');
        }
    }
}

function makeResult(raw, field, op, val, text, category, icon, note = '') {
    return {
        raw,
        field,
        operator: op,
        value: val,
        text,
        category,
        icon,
        note,
    };
}

/**
 * Builds a natural summary sentence from a single branch's conditions.
 */
function buildBranchSummary(conditions) {
    if (!conditions || conditions.length === 0) {
        return 'Skill akan selalu aktif.';
    }

    // Handle 'always' condition
    if (conditions.some(c => c.field === 'always')) {
        const nonAlways = conditions.filter(c => c.field !== 'always');
        if (nonAlways.length === 0) {
            return 'Skill akan selalu aktif.';
        }
        const lc = (s) => (s && s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s);
        return `Skill akan selalu aktif saat ${nonAlways.map(c => lc(c.text)).join(' DAN ')}.`;
    }

    const locParts = [];
    const posParts = [];
    const actionParts = [];
    const otherParts = [];

    for (const c of conditions) {
        if (c.category === 'phase' || c.category === 'track') {
            locParts.push(c.text);
        } else if (c.category === 'position' || c.category === 'progress') {
            posParts.push(c.text);
        } else if (c.category === 'action' || c.category === 'status') {
            actionParts.push(c.text);
        } else {
            otherParts.push(c.text);
        }
    }

    const all = [...locParts, ...posParts, ...actionParts, ...otherParts];
    const lc = (s) => (s && s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s);

    if (all.length === 1) {
        return `Skill aktif saat ${lc(all[0])}.`;
    }

    return `Skill aktif saat ${all.map(lc).join(' DAN ')}.`;
}

/**
 * Translates a complete condition string (with '&' and '@').
 */
export function translateConditionString(condStr) {
    if (!condStr || typeof condStr !== 'string' || !condStr.trim()) {
        return {
            summary: 'Skill akan selalu aktif.',
            hasAlternatives: false,
            branches: [],
        };
    }

    const rawBranches = condStr.split('@');
    const branches = [];

    for (const branchStr of rawBranches) {
        const trimmed = branchStr.trim();
        if (!trimmed) continue;

        const clauses = trimmed.split('&');
        const conditions = [];

        for (const cl of clauses) {
            const clTrim = cl.trim();
            if (clTrim) {
                conditions.push(translateClause(clTrim));
            }
        }

        branches.push({
            summary: buildBranchSummary(conditions),
            conditions,
        });
    }

    const hasAlternatives = branches.length > 1;
    let summary = 'Skill akan selalu aktif.';

    if (branches.length === 1) {
        summary = branches[0].summary;
    } else if (branches.length > 1) {
        summary = branches.map((b, idx) => `Opsi ${idx + 1}: ${b.summary}`).join(' ATAU ');
    }

    return {
        summary,
        hasAlternatives,
        branches,
    };
}
