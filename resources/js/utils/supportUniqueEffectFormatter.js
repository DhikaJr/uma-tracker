/**
 * Support Card Unique Effect Formatter
 * 
 * Formats GameTora / Cygames unique effects (types 101-122, 9991, and basic < 100)
 * into human-readable descriptions, condition tags, and bonus badges in English & Indonesian.
 */

export const SUPPORT_EFFECTS_MAP = {
    1: { name_en: 'Friendship Bonus', name_id: 'Bonus Persahabatan', symbol: '%' },
    2: { name_en: 'Mood Effect', name_id: 'Efek Mood', symbol: '%' },
    3: { name_en: 'Speed Bonus', name_id: 'Bonus Speed', symbol: '' },
    4: { name_en: 'Stamina Bonus', name_id: 'Bonus Stamina', symbol: '' },
    5: { name_en: 'Power Bonus', name_id: 'Bonus Power', symbol: '' },
    6: { name_en: 'Guts Bonus', name_id: 'Bonus Guts', symbol: '' },
    7: { name_en: 'Wit Bonus', name_id: 'Bonus Wit', symbol: '' },
    8: { name_en: 'Training Effectiveness', name_id: 'Efektivitas Latihan', symbol: '%' },
    9: { name_en: 'Initial Speed', name_id: 'Speed Awal', symbol: '' },
    10: { name_en: 'Initial Stamina', name_id: 'Stamina Awal', symbol: '' },
    11: { name_en: 'Initial Power', name_id: 'Power Awal', symbol: '' },
    12: { name_en: 'Initial Guts', name_id: 'Guts Awal', symbol: '' },
    13: { name_en: 'Initial Wit', name_id: 'Wit Awal', symbol: '' },
    14: { name_en: 'Initial Friendship Gauge', name_id: 'Gauge Ikatan Awal', symbol: '' },
    15: { name_en: 'Race Bonus', name_id: 'Bonus Balapan', symbol: '%' },
    16: { name_en: 'Fan Bonus', name_id: 'Bonus Fans', symbol: '%' },
    17: { name_en: 'Hint Levels', name_id: 'Level Hint', symbol: 'Lv ' },
    18: { name_en: 'Hint Frequency', name_id: 'Frekuensi Hint', symbol: '%' },
    19: { name_en: 'Specialty Priority', name_id: 'Prioritas Spesialisasi', symbol: '' },
    20: { name_en: 'Max Speed', name_id: 'Batas Maksimal Speed', symbol: '' },
    21: { name_en: 'Max Stamina', name_id: 'Batas Maksimal Stamina', symbol: '' },
    22: { name_en: 'Max Power', name_id: 'Batas Maksimal Power', symbol: '' },
    23: { name_en: 'Max Guts', name_id: 'Batas Maksimal Guts', symbol: '' },
    24: { name_en: 'Max Wit', name_id: 'Batas Maksimal Wit', symbol: '' },
    25: { name_en: 'Event Recovery', name_id: 'Pemulihan Energi Event', symbol: '%' },
    26: { name_en: 'Event Effectiveness', name_id: 'Efek Event', symbol: '%' },
    27: { name_en: 'Failure Protection', name_id: 'Penurunan Risiko Gagal', symbol: '%' },
    28: { name_en: 'Energy Cost Reduction', name_id: 'Hemat Konsumsi Energi', symbol: '%' },
    29: { name_en: 'Minigame Effectiveness', name_id: 'Efek Minigame', symbol: '%' },
    30: { name_en: 'Skill Point Bonus', name_id: 'Bonus Skill Point', symbol: '' },
    31: { name_en: 'Wit Friendship Recovery', name_id: 'Pemulihan Energi Wit', symbol: '' },
    32: { name_en: 'Initial Skill Points Up', name_id: 'Skill Point Awal', symbol: '' },
    33: { name_en: 'Hint Quantity Bonus', name_id: 'Bonus Jumlah Hint', symbol: '%' },
    41: { name_en: 'All Stats Bonus', name_id: 'Bonus Seluruh Status', symbol: '%' },
    9991: { name_en: 'Increases Stats from Hints', name_id: 'Peningkatan Status dari Hint', symbol: '' },
};

export function getEffectDef(id) {
    const numId = Number(id);
    return SUPPORT_EFFECTS_MAP[numId] || {
        name_en: `Effect ${numId}`,
        name_id: `Efek ${numId}`,
        symbol: '',
    };
}

function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
        const t = x % y;
        x = y;
        y = t;
    }
    return x || 1;
}

/**
 * Format a single unique effect dictionary.
 */
export function parseSingleUniqueEffect(ue, cardType = null) {
    const type = Number(ue.type || 0);
    const val = ue.value !== undefined ? ue.value : null;
    const val1 = ue.value_1 !== undefined ? ue.value_1 : null;
    const val2 = ue.value_2 !== undefined ? ue.value_2 : null;
    const val3 = ue.value_3 !== undefined ? ue.value_3 : null;
    const val4 = ue.value_4 !== undefined ? ue.value_4 : null;

    switch (type) {
        case 101: {
            const eff1 = getEffectDef(val1);
            const eff2 = val3 ? getEffectDef(val3) : null;
            const isFull = Number(val) === 100;
            const bond = Number(val);

            const sym1 = eff1.symbol;
            const valStr1 = `${val2}${sym1 === '%' ? '%' : ''}`;

            if (eff2) {
                const sym2 = eff2.symbol;
                const valStr2 = `${val4}${sym2 === '%' ? '%' : ''}`;

                const titleEn = `${eff1.name_en} & ${eff2.name_en}`;
                const titleId = `${eff1.name_id} & ${eff2.name_id}`;

                const condEn = isFull ? 'Bond Gauge Full (100)' : `Bond Gauge ≥ ${bond}`;
                const condId = isFull ? 'Gauge Ikatan Penuh (100)' : `Gauge Ikatan ≥ ${bond}`;

                const descEn = isFull
                    ? `Gain ${eff1.name_en} (${valStr1}) and ${eff2.name_en} (${valStr2}) when the bond gauge is full`
                    : `Gain ${eff1.name_en} (${valStr1}) and ${eff2.name_en} (${valStr2}) when the bond gauge is at least ${bond}`;

                const descId = isFull
                    ? `Mendapatkan ${eff1.name_id} (+${valStr1}) dan ${eff2.name_id} (+${valStr2}) saat gauge ikatan penuh (100)`
                    : `Mendapatkan ${eff1.name_id} (+${valStr1}) dan ${eff2.name_id} (+${valStr2}) saat gauge ikatan mencapai minimal ${bond}`;

                const bonuses = [
                    {
                        name_en: eff1.name_en,
                        name_id: eff1.name_id,
                        value: val2,
                        symbol: sym1,
                        formatted: `+${valStr1}`,
                    },
                    {
                        name_en: eff2.name_en,
                        name_id: eff2.name_id,
                        value: val4,
                        symbol: sym2,
                        formatted: `+${valStr2}`,
                    },
                ];

                return {
                    title_en: titleEn,
                    title_id: titleId,
                    desc_en: descEn,
                    desc_id: descId,
                    condition: condEn,
                    condition_id: condId,
                    bonuses,
                };
            } else {
                const titleEn = eff1.name_en;
                const titleId = eff1.name_id;

                const condEn = isFull ? 'Bond Gauge Full (100)' : `Bond Gauge ≥ ${bond}`;
                const condId = isFull ? 'Gauge Ikatan Penuh (100)' : `Gauge Ikatan ≥ ${bond}`;

                const descEn = isFull
                    ? `Gain ${eff1.name_en} (${valStr1}) when the bond gauge is full`
                    : `Gain ${eff1.name_en} (${valStr1}) when the bond gauge is at least ${bond}`;

                const descId = isFull
                    ? `Mendapatkan ${eff1.name_id} (+${valStr1}) saat gauge ikatan penuh (100)`
                    : `Mendapatkan ${eff1.name_id} (+${valStr1}) saat gauge ikatan mencapai minimal ${bond}`;

                const bonuses = [
                    {
                        name_en: eff1.name_en,
                        name_id: eff1.name_id,
                        value: val2,
                        symbol: sym1,
                        formatted: `+${valStr1}`,
                    },
                ];

                return {
                    title_en: titleEn,
                    title_id: titleId,
                    desc_en: descEn,
                    desc_id: descId,
                    condition: condEn,
                    condition_id: condId,
                    bonuses,
                };
            }
        }

        case 102: {
            const bond = Number(val);
            const effVal = Number(val1);

            return {
                title_en: 'Off-Type Increased Training',
                title_id: 'Efektivitas Latihan di Luar Fasilitas Tipe',
                desc_en: `When the bond gauge is ${bond} or higher and this card is in a facility different from its type, gain Increased Training (${effVal}%)`,
                desc_id: `Saat gauge ikatan mencapai ${bond} atau lebih dan kartu ini berada di fasilitas berbeda dari tipenya, dapatkan Efektivitas Latihan (+${effVal}%)`,
                condition: `Bond Gauge ≥ ${bond} & Off-Type Facility`,
                condition_id: `Gauge Ikatan ≥ ${bond} & Di Luar Tipe Fasilitas`,
                bonuses: [
                    {
                        name_en: 'Training Effectiveness',
                        name_id: 'Efektivitas Latihan',
                        value: effVal,
                        symbol: '%',
                        formatted: `+${effVal}%`,
                    },
                ],
            };
        }

        case 103: {
            const typeCount = Number(val);
            const effVal = Number(val1);

            return {
                title_en: 'Deck Diversity Increased Training',
                title_id: 'Efektivitas Latihan Keragaman Tipe Dek',
                desc_en: `If there are at least ${typeCount} different types of support cards in your deck, gain Increased Training (${effVal}%)`,
                desc_id: `Jika terdapat minimal ${typeCount} jenis kartu support berbeda di dalam dek, dapatkan Efektivitas Latihan (+${effVal}%)`,
                condition: `≥ ${typeCount} Support Types in Deck`,
                condition_id: `≥ ${typeCount} Jenis Kartu di Dek`,
                bonuses: [
                    {
                        name_en: 'Training Effectiveness',
                        name_id: 'Efektivitas Latihan',
                        value: effVal,
                        symbol: '%',
                        formatted: `+${effVal}%`,
                    },
                ],
            };
        }

        case 104: {
            const fanStep = Number(val);
            const effMax = Number(val1);
            const fanMax = fanStep * effMax;
            const fanStepStr = fanStep.toLocaleString();
            const fanMaxStr = fanMax.toLocaleString();

            return {
                title_en: 'Fan Scaling Increased Training',
                title_id: 'Efektivitas Latihan Berskala Fans',
                desc_en: `Gain Increased Training (1%) per ${fanStepStr} fans, up to (${effMax}%) for ${fanMaxStr} fans`,
                desc_id: `Dapatkan Efektivitas Latihan (+1%) per ${fanStepStr} fans, hingga maksimal (+${effMax}%) pada ${fanMaxStr} fans`,
                condition: `1% per ${fanStepStr} Fans`,
                condition_id: `+1% per ${fanStepStr} Fans`,
                bonuses: [
                    {
                        name_en: 'Training Effectiveness',
                        name_id: 'Efektivitas Latihan',
                        value: effMax,
                        symbol: '%',
                        formatted: `Maks +${effMax}%`,
                    },
                ],
            };
        }

        case 105: {
            const effVal = Number(val);
            const friendVal = Number(val1);
            const typeLabel = cardType || 'Card Type';

            return {
                title_en: 'Initial Stat Up per Support',
                title_id: 'Status Awal per Kartu Support',
                desc_en: `Gain Initial Stat Up (${effVal}), where Stat is the type of the card (${typeLabel}), for every card in your support deck (Friend and Group types give (${friendVal}) to every stat)`,
                desc_id: `Dapatkan Status Awal (+${effVal}) sesuai tipe kartu (${typeLabel}) untuk setiap kartu di dek support (tipe Friend & Group memberi (+${friendVal}) ke semua status)`,
                condition: 'Deck Composition',
                condition_id: 'Komposisi Seluruh Dek Support',
                bonuses: [
                    {
                        name_en: 'Initial Stat Up',
                        name_id: 'Status Awal',
                        value: effVal,
                        symbol: '',
                        formatted: `+${effVal}/kartu`,
                    },
                ],
            };
        }

        case 106: {
            const eff = getEffectDef(val1);
            const stepVal = Number(val2);
            const timesMax = Number(val);
            const valMax = timesMax * stepVal;
            const sym = eff.symbol;

            return {
                title_en: `Rainbow Stacking ${eff.name_en}`,
                title_id: `Akumulasi ${eff.name_id} Rainbow`,
                desc_en: `Gain ${eff.name_en} (${stepVal}) every time you do friendship training with this card, up to ${timesMax} times for a total of (${valMax})`,
                desc_id: `Dapatkan ${eff.name_id} (+${stepVal}${sym}) setiap kali latihan persahabatan bersama kartu ini, hingga ${timesMax} kali (total +${valMax}${sym})`,
                condition: `Friendship Training (Max ${timesMax}x)`,
                condition_id: `Latihan Persahabatan (Maks ${timesMax}x)`,
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: valMax,
                        symbol: sym,
                        formatted: `Maks +${valMax}${sym}`,
                    },
                ],
            };
        }

        case 107: {
            const eff = getEffectDef(val);
            const minVal = Number(val4 || 5);
            const maxVal = Number(val3 || 15);
            const sym = eff.symbol;

            return {
                title_en: `Low Energy ${eff.name_en}`,
                title_id: `${eff.name_id} Berskala Energi Rendah`,
                desc_en: `The less energy you have, the more ${eff.name_en} you'll gain (from ${minVal}${sym} to ${maxVal}${sym})`,
                desc_id: `Semakin rendah stamina/energi yang tersisa, semakin tinggi ${eff.name_id} yang didapatkan (dari +${minVal}${sym} hingga +${maxVal}${sym})`,
                condition: 'Scales with Low Energy',
                condition_id: 'Berskala Energi Rendah',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        min: minVal,
                        symbol: sym,
                        formatted: `+${minVal}${sym} ~ +${maxVal}${sym}`,
                    },
                ],
            };
        }

        case 108: {
            const eff = getEffectDef(val);
            const minEnergy = Number(val1);
            const rate = Number(val2 || 100);
            const minVal = Number(val3);
            const maxVal = Number(val4);

            const div = gcd(rate, 100);
            const stepEff = Math.floor(rate / div);
            const stepEnergy = Math.floor(100 / div);
            const maxEnergy = Math.floor(minEnergy + ((maxVal - minVal) * 100) / rate);
            const sym = eff.symbol;

            return {
                title_en: `Max Energy Scaling ${eff.name_en}`,
                title_id: `${eff.name_id} Berskala Batas Maksimal Energi`,
                desc_en: `Gain ${eff.name_en} (${minVal}%); gain additional ${stepEff}% ${eff.name_en} for every ${stepEnergy} points of maximum Energy above ${minEnergy}, up to (${maxVal}%) at ${maxEnergy}`,
                desc_id: `Dapatkan ${eff.name_id} (+${minVal}%); tambahan +${stepEff}% ${eff.name_id} per setiap ${stepEnergy} poin batas energi di atas ${minEnergy}, hingga maksimal (+${maxVal}%) pada ${maxEnergy} energi`,
                condition: `Max Energy > ${minEnergy}`,
                condition_id: `Batas Energi > ${minEnergy}`,
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        min: minVal,
                        symbol: sym,
                        formatted: `+${minVal}% ~ +${maxVal}%`,
                    },
                ],
            };
        }

        case 109: {
            const eff = getEffectDef(val);
            const bondStep = Number(val1 || 30);
            const effMax = Math.floor(600 / bondStep);
            const sym = eff.symbol;

            return {
                title_en: `Total Bond Scaling ${eff.name_en}`,
                title_id: `${eff.name_id} Berskala Total Ikatan Dek`,
                desc_en: `Gain ${eff.name_en} (1%) for every ${bondStep} combined support bond, up to (${effMax}%) at 600`,
                desc_id: `Dapatkan ${eff.name_id} (+1%) per setiap ${bondStep} total poin ikatan seluruh support card di dek, hingga maksimal (+${effMax}%) pada 600`,
                condition: 'Total Deck Bond (Max 600)',
                condition_id: 'Total Ikatan Seluruh Support (Maks 600)',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: effMax,
                        symbol: sym,
                        formatted: `Maks +${effMax}%`,
                    },
                ],
            };
        }

        case 110: {
            const eff = getEffectDef(val);
            const stepVal = Number(val1);
            const maxVal = 5 * stepVal;
            const sym = eff.symbol;

            return {
                title_en: `Same Facility ${eff.name_en}`,
                title_id: `${eff.name_id} Fasilitas yang Sama`,
                desc_en: `Gain ${eff.name_en} (${stepVal}${sym}) for every support card in the same training facility`,
                desc_id: `Dapatkan ${eff.name_id} (+${stepVal}${sym}) untuk setiap kartu support yang berada di fasilitas latihan yang sama`,
                condition: 'Support in Same Facility',
                condition_id: 'Support di Fasilitas Sama',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        min: stepVal,
                        symbol: sym,
                        formatted: `+${stepVal}${sym}/kartu (Maks +${maxVal}${sym})`,
                    },
                ],
            };
        }

        case 111: {
            const eff = getEffectDef(val);
            const stepVal = Number(val1);
            const maxVal = 5 * stepVal;
            const sym = eff.symbol;

            return {
                title_en: `Facility Level Scaling ${eff.name_en}`,
                title_id: `${eff.name_id} Berskala Level Fasilitas`,
                desc_en: `Gain ${eff.name_en} (${stepVal}${sym}) per every level of the current training facility`,
                desc_id: `Dapatkan ${eff.name_id} (+${stepVal}${sym}) per setiap level dari fasilitas latihan saat ini`,
                condition: 'Facility Level (Lv. 1-5)',
                condition_id: 'Level Fasilitas (Lv. 1-5)',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        min: stepVal,
                        symbol: sym,
                        formatted: `+${stepVal}${sym}/Lv (Maks +${maxVal}${sym})`,
                    },
                ],
            };
        }

        case 112: {
            const chance = Number(val);

            return {
                title_en: 'Training Failure Protection',
                title_id: 'Pencegahan Kegagalan Latihan',
                desc_en: `${chance}% chance to make the current training fail rate zero`,
                desc_id: `Peluang ${chance}% membuat tingkat kegagalan latihan (fail rate) menjadi 0%`,
                condition: `${chance}% Chance`,
                condition_id: `Peluang ${chance}%`,
                bonuses: [
                    {
                        name_en: 'Zero Fail Rate',
                        name_id: 'Bebas Gagal Latihan',
                        value: chance,
                        symbol: '%',
                        formatted: `Peluang ${chance}%`,
                    },
                ],
            };
        }

        case 113: {
            const eff = getEffectDef(val);
            const effVal = Number(val1);
            const sym = eff.symbol;

            return {
                title_en: `Friendship Training ${eff.name_en}`,
                title_id: `${eff.name_id} Latihan Persahabatan`,
                desc_en: `Gain ${eff.name_en} (${effVal}${sym}) when participating in a friendship (rainbow) training`,
                desc_id: `Dapatkan ${eff.name_id} (+${effVal}${sym}) saat berpartisipasi dalam latihan persahabatan (rainbow training)`,
                condition: 'Rainbow Training',
                condition_id: 'Latihan Persahabatan Rainbow',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: effVal,
                        symbol: sym,
                        formatted: `+${effVal}${sym}`,
                    },
                ],
            };
        }

        case 114: {
            const eff = getEffectDef(val);
            const minVal = Number(val1);
            const maxVal = Number(val2);
            const sym = eff.symbol;

            return {
                title_en: `Current Energy Scaling ${eff.name_en}`,
                title_id: `${eff.name_id} Berskala Sisa Energi`,
                desc_en: `Gain ${eff.name_en} that scales with current Energy, from (${minVal}${sym}) at 0 Energy to (${maxVal}${sym}) at 100+ Energy`,
                desc_id: `Dapatkan ${eff.name_id} yang berskala dengan energi saat ini, dari (+${minVal}${sym}) pada 0 energi hingga (+${maxVal}${sym}) pada 100+ energi`,
                condition: 'Current Energy (0-100+)',
                condition_id: 'Sisa Energi (0-100+)',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        min: minVal,
                        symbol: sym,
                        formatted: `+${minVal}${sym} ~ +${maxVal}${sym}`,
                    },
                ],
            };
        }

        case 115: {
            const eff = getEffectDef(val);
            const effVal = Number(val1);
            const sym = eff.symbol;

            return {
                title_en: `All Supports ${eff.name_en}`,
                title_id: `${eff.name_id} Seluruh Support`,
                desc_en: `All support cards gain ${eff.name_en} (${effVal}${sym})`,
                desc_id: `Seluruh kartu support mendapatkan ${eff.name_id} (+${effVal}${sym})`,
                condition: 'All Support Cards',
                condition_id: 'Seluruh Kartu Support',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: effVal,
                        symbol: sym,
                        formatted: `+${effVal}${sym}`,
                    },
                ],
            };
        }

        case 116: {
            const eff = getEffectDef(val1);
            const skillKind = Number(val);
            const skillNameEn = skillKind === 1 ? 'Speed-increasing' : (skillKind === 3 ? 'Recovery' : 'General');
            const skillNameId = skillKind === 1 ? 'penambah Speed' : (skillKind === 3 ? 'pemulih Stamina/Recovery' : 'Umum');
            const stepVal = Number(val2);
            const maxSkills = Number(val3);
            const maxVal = stepVal * maxSkills;
            const sym = eff.symbol;

            return {
                title_en: `${skillNameEn} Skill Scaling ${eff.name_en}`,
                title_id: `${eff.name_id} Berskala Skill ${skillNameId}`,
                desc_en: `Gain ${eff.name_en} (${stepVal}${sym}) for every ${skillNameEn} skill, up to (${maxVal}${sym}) for ${maxSkills} skills`,
                desc_id: `Dapatkan ${eff.name_id} (+${stepVal}${sym}) untuk setiap skill ${skillNameId}, hingga maksimal (+${maxVal}${sym}) untuk ${maxSkills} skill`,
                condition: `${skillNameEn} Skills (Max ${maxSkills})`,
                condition_id: `Skill ${skillNameId} (Maks ${maxSkills})`,
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        symbol: sym,
                        formatted: `+${stepVal}${sym}/skill (Maks +${maxVal}${sym})`,
                    },
                ],
            };
        }

        case 117: {
            const eff = getEffectDef(val);
            const maxVal = Number(val2);
            const sym = eff.symbol;

            return {
                title_en: `Combined Facility Level ${eff.name_en}`,
                title_id: `${eff.name_id} Total Level Seluruh Fasilitas`,
                desc_en: `The higher the combined facility level, the higher ${eff.name_en} you'll gain (up to ${maxVal}${sym})`,
                desc_id: `Semakin tinggi total level seluruh fasilitas latihan, semakin tinggi ${eff.name_id} yang didapatkan (hingga +${maxVal}${sym})`,
                condition: 'Combined Facility Level',
                condition_id: 'Total Level Seluruh Fasilitas',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: maxVal,
                        symbol: sym,
                        formatted: `Maks +${maxVal}${sym}`,
                    },
                ],
            };
        }

        case 118: {
            const bond = Number(val1);
            const amount = Number(val || 0) + 1;

            return {
                title_en: 'Multi-Facility Presence',
                title_id: 'Kehadiran Multi-Fasilitas',
                desc_en: `When the bond gauge is ${bond} or higher, this support can appear in ${amount} training facilities at once`,
                desc_id: `Saat gauge ikatan mencapai ${bond} atau lebih, kartu support ini dapat muncul di ${amount} fasilitas latihan sekaligus`,
                condition: `Bond Gauge ≥ ${bond}`,
                condition_id: `Gauge Ikatan ≥ ${bond}`,
                bonuses: [
                    {
                        name_en: 'Multi-Facility Presence',
                        name_id: 'Muncul Multi-Fasilitas',
                        value: amount,
                        symbol: '',
                        formatted: `${amount} Fasilitas Sekaligus`,
                    },
                ],
            };
        }

        case 119: {
            const bond = Number(val2 || 60);

            return {
                title_en: 'Deck Appearance Rate Boost',
                title_id: 'Peningkatan Peluang Kemunculan Support',
                desc_en: `When the bond gauge is ${bond} or higher, all support cards in your deck are more likely to appear in training facilities`,
                desc_id: `Saat gauge ikatan mencapai ${bond} atau lebih, seluruh kartu support di dek lebih berpeluang muncul di fasilitas latihan`,
                condition: `Bond Gauge ≥ ${bond}`,
                condition_id: `Gauge Ikatan ≥ ${bond}`,
                bonuses: [
                    {
                        name_en: 'Appearance Rate Boost',
                        name_id: 'Peluang Muncul Support Naik',
                        value: 1,
                        symbol: '',
                        formatted: 'Aktif',
                    },
                ],
            };
        }

        case 120: {
            const bond = Number(val1);
            const maxVal = Number(val3);

            return {
                title_en: 'Deck Stat Bonus per Type',
                title_id: 'Bonus Status per Tipe Kartu Dek',
                desc_en: `When the bond gauge is ${bond} or higher, gain Stat Bonus, where Stat is the type of the card, for every card in your support deck (up to ${maxVal} per Stat); Friends and Groups give skill points`,
                desc_id: `Saat gauge ikatan mencapai ${bond} atau lebih, dapatkan Bonus Status sesuai tipe kartu untuk setiap kartu di dek (hingga +${maxVal} per status); tipe Friend & Group memberi bonus skill point`,
                condition: `Bond Gauge ≥ ${bond}`,
                condition_id: `Gauge Ikatan ≥ ${bond}`,
                bonuses: [
                    {
                        name_en: 'Stat Bonus per Deck Card',
                        name_id: 'Bonus Status per Kartu Dek',
                        value: maxVal,
                        symbol: '',
                        formatted: `Maks +${maxVal}/Status`,
                    },
                ],
            };
        }

        case 121: {
            const without = Number(val);
            const withVal = Number(val1);

            return {
                title_en: 'Bonus Bond Gain from Training',
                title_id: 'Bonus Peningkatan Ikatan saat Latihan',
                desc_en: `All supports get ${without} bonus bond from training; ${withVal} if they're in the same facility as this card`,
                desc_id: `Seluruh kartu support mendapatkan +${without} bonus ikatan saat latihan (+${withVal} jika berada di fasilitas yang sama dengan kartu ini)`,
                condition: 'All Supports Training',
                condition_id: 'Semua Kartu Support saat Latihan',
                bonuses: [
                    {
                        name_en: 'Bonus Bond Gain',
                        name_id: 'Bonus Pertambahan Ikatan',
                        value: withVal,
                        symbol: '',
                        formatted: `+${without} (+${withVal} sefasilitas)`,
                    },
                ],
            };
        }

        case 122: {
            const eff = getEffectDef(val);
            const effVal = Number(val1);
            const sym = eff.symbol;

            return {
                title_en: `Next Turn ${eff.name_en} Buff`,
                title_id: `Buff ${eff.name_id} Giliran Berikutnya`,
                desc_en: `Supports that train together with this one gain ${eff.name_en} (${effVal}${sym}) for the next turn`,
                desc_id: `Kartu support yang berlatih bersama kartu ini mendapatkan ${eff.name_id} (+${effVal}${sym}) untuk 1 giliran berikutnya`,
                condition: 'Next Turn After Training Together',
                condition_id: 'Giliran Berikutnya Setelah Latihan Bersama',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: effVal,
                        symbol: sym,
                        formatted: `+${effVal}${sym} (1 Turn)`,
                    },
                ],
            };
        }

        case 9991: {
            return {
                title_en: 'Increases Stats from Hints',
                title_id: 'Peningkatan Status dari Hint',
                desc_en: 'Increases stats from hints',
                desc_id: 'Meningkatkan status yang didapatkan saat memperoleh hint event',
                condition: 'Hint Event Trigger',
                condition_id: 'Saat Menerima Hint Event',
                bonuses: [
                    {
                        name_en: 'Stats from Hints',
                        name_id: 'Status dari Hint',
                        value: 1,
                        symbol: '',
                        formatted: 'Aktif',
                    },
                ],
            };
        }

        default: {
            // Basic effect (< 100)
            const eff = getEffectDef(type);
            const numVal = Number(val || 0);
            const sym = eff.symbol;
            const valStr = sym === 'Lv ' ? `Lv. ${numVal}` : `+${numVal}${sym}`;

            return {
                title_en: eff.name_en,
                title_id: eff.name_id,
                desc_en: `${eff.name_en} (${valStr})`,
                desc_id: `${eff.name_id} (${valStr})`,
                condition: 'Passive Effect',
                condition_id: 'Efek Pasif',
                bonuses: [
                    {
                        name_en: eff.name_en,
                        name_id: eff.name_id,
                        value: numVal,
                        symbol: sym,
                        formatted: valStr,
                    },
                ],
            };
        }
    }
}

/**
 * Format a full unique effect container into rich description & badges.
 */
export function formatSupportUniqueEffect(uniqueEffect, rawUnique = null, cardType = null) {
    const unique = rawUnique || uniqueEffect;
    if (!unique || !Array.isArray(unique.effects) || unique.effects.length === 0) {
        return null;
    }

    // If already enriched by backend and has description_en, keep it but ensure bonuses exist
    if (uniqueEffect?.description_en && Array.isArray(uniqueEffect?.bonuses) && uniqueEffect.bonuses.length > 0) {
        return uniqueEffect;
    }

    const level = Number(unique.level !== undefined ? unique.level : (uniqueEffect?.level || 30));
    const effects = unique.effects;

    // Merge raw values if uniqueEffect was missing value_3 / value_4
    if (rawUnique?.effects && Array.isArray(rawUnique.effects) && rawUnique.effects.length === effects.length) {
        effects.forEach((eff, idx) => {
            const rawEff = rawUnique.effects[idx] || {};
            ['value', 'value_1', 'value_2', 'value_3', 'value_4'].forEach((k) => {
                if (rawEff[k] !== undefined && eff[k] === undefined) {
                    eff[k] = rawEff[k];
                }
            });
        });
    }

    const descEnParts = [];
    const descIdParts = [];
    const bonuses = [];
    const conditions = [];
    const conditionsId = [];
    const enrichedEffects = [];

    effects.forEach((ue) => {
        const parsed = parseSingleUniqueEffect(ue, cardType);

        if (parsed.desc_en) descEnParts.push(parsed.desc_en);
        if (parsed.desc_id) descIdParts.push(parsed.desc_id);
        if (parsed.condition) conditions.push(parsed.condition);
        if (parsed.condition_id) conditionsId.push(parsed.condition_id);

        if (Array.isArray(parsed.bonuses)) {
            parsed.bonuses.forEach((b) => bonuses.push(b));
        }

        enrichedEffects.push({
            ...ue,
            name_en: parsed.title_en || ue.name_en || `Effect ${ue.type}`,
            name_ja: ue.name_ja || null,
            name_id: parsed.title_id || null,
            description_en: parsed.desc_en || null,
            description_id: parsed.desc_id || null,
            bonuses: parsed.bonuses || [],
        });
    });

    return {
        level,
        description_en: descEnParts.join(' | '),
        description_id: descIdParts.join(' | '),
        condition: Array.from(new Set(conditions)).join('; '),
        condition_id: Array.from(new Set(conditionsId)).join('; '),
        bonuses,
        effects: enrichedEffects,
    };
}
