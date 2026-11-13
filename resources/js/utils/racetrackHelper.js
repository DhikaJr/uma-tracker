/**
 * Phase definitions and Indonesian translations with GameTora colors.
 */
export const PHASE_TRANSLATIONS = {
    0: { id: 0, name: 'Fase Awal (Early-Race)', short: 'Fase Awal', color: '#ffe119', badgeClass: 'bg-yellow-400 text-slate-950' },
    1: { id: 1, name: 'Fase Tengah (Mid-Race)', short: 'Fase Tengah', color: '#624cab', badgeClass: 'bg-indigo-600 text-white' },
    2: { id: 2, name: 'Fase Akhir (Late-Race)', short: 'Fase Akhir', color: '#42d4f4', badgeClass: 'bg-cyan-400 text-slate-950' },
    3: { id: 3, name: 'Spurt Terakhir (Last Spurt)', short: 'Spurt Terakhir', color: '#e6194b', badgeClass: 'bg-rose-600 text-white' },
};

/**
 * Overlap translations for courses where laps cause overlaps.
 */
export const OVERLAP_TRANSLATIONS = {
    '01': 'Awal / Tengah',
    '02': 'Awal / Akhir',
    '03': 'Awal / Spurt',
    '12': 'Tengah / Akhir',
    '13': 'Tengah / Spurt',
    '013': 'Awal / Tengah / Spurt',
};

/**
 * Stat thresholds translations (id: 1=Speed, 2=Stamina, 3=Power, 4=Guts, 5=Wisdom).
 */
export const STAT_THRESHOLD_TRANSLATIONS = {
    1: 'Speed (Kecepatan)',
    2: 'Stamina (Daya Tahan)',
    3: 'Power (Kekuatan)',
    4: 'Guts (Semangat)',
    5: 'Wisdom (Kecerdasan)',
};

/**
 * Spurt location key translations.
 */
export const SPURT_LOCATION_TRANSLATIONS = {
    corner: 'Tikungan',
    final_corner: 'Tikungan Terakhir',
    straight: 'Trek Lurus',
    final_straight: 'Trek Lurus Akhir',
    uphill: 'Tanjakan',
    downhill: 'Turunan',
};

/**
 * Format slope number to Indonesian label.
 * Example: slope 20000 -> "Tanjakan (+2)", -20000 -> "Turunan (-2)"
 */
export function formatSlopeLabel(slopeValue) {
    const val = Number(slopeValue) / 10000;
    if (val > 0) {
        return `Tanjakan (+${val})`;
    }
    if (val < 0) {
        return `Turunan (${val})`;
    }
    return 'Datar';
}

/**
 * Format spurt location list to Indonesian text.
 */
export function formatSpurtLocations(locations = []) {
    if (!locations || locations.length === 0) return '???';
    const translated = locations
        .map(loc => SPURT_LOCATION_TRANSLATIONS[loc] || loc)
        .filter(Boolean);
    return translated.join(', ');
}

/**
 * Find racetrack course data for a given competition event.
 * Returns null if event is not fully confirmed or course is not found.
 */
export function findRacetrackCourse(event) {
    return event?.racetrack_course ?? null;
}
