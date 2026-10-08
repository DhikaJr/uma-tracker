import greenSkillsCatalog from '../data/greenSkillsCatalog.json';

/**
 * Checks whether all primary race conditions are officially announced by Cygames.
 * (Venue, Distance, Direction, Season must all be present).
 */
export function isEventFullyConfirmed(event) {
    if (!event) return false;
    return Boolean(
        event.venue &&
        event.distance &&
        event.direction &&
        event.season
    );
}

/**
 * Resolves green skill recommendations for a competition event.
 */
export function getRecommendedGreenSkills(event) {
    if (!event || !isEventFullyConfirmed(event)) {
        return {
            isFullyConfirmed: false,
            hasRecommendations: false,
            disclaimer: 'Rekomendasi green skill belum tersedia karena informasi balapan resmi (lokasi, jarak lintasan, arah putaran, dan musim) belum diumumkan oleh Cygames.',
            hasRandomConditions: false,
            randomDisclaimer: null,
            skills: [],
        };
    }

    const hasRandomConditions = event.weather === 'random' || event.track_condition === 'random';
    const skills = [];

    // Helper to push a skill from catalog with status override
    const addSkill = (id, recommendationStatus, statusLabel, customDescId = null) => {
        const item = greenSkillsCatalog[id];
        if (!item) return;

        skills.push({
            ...item,
            recommendation_status: recommendationStatus,
            status_label: statusLabel,
            desc_id: customDescId || item.desc_id,
        });
    };

    // 1. Direction (Right / Left)
    const direction = String(event.direction || '');
    if (direction.startsWith('right')) {
        addSkill(200012, 'recommended', 'Direkomendasikan (Pasti Aktif)');
    } else if (direction.startsWith('left')) {
        addSkill(200022, 'recommended', 'Direkomendasikan (Pasti Aktif)');
    }

    // 2. Venue (Racetrack)
    const venue = String(event.venue || '');
    const venueIdMap = {
        'Kyoto': 200062,
        'Nakayama': 200042,
        'Tokyo': 200032,
        'Hanshin': 200052,
        'Chukyo': 200072,
        'Oi': 200952,
        'Ooi': 200952,
        'Sapporo': 200082,
        'Hakodate': 200092,
        'Fukushima': 200102,
        'Niigata': 200112,
        'Kokura': 200122,
        'Longchamp': 202732,
    };
    if (venueIdMap[venue]) {
        addSkill(venueIdMap[venue], 'recommended', 'Direkomendasikan (Pasti Aktif)');
    }

    // 3. Distance Category (Standard vs Non-Standard Distance)
    const distance = Number(event.distance);
    if (!isNaN(distance) && distance > 0) {
        if (distance % 400 === 0) {
            addSkill(
                200132, 
                'recommended', 
                'Direkomendasikan (Pasti Aktif)',
                `Meningkatkan status Stamina sebesar +40 pada jarak balapan standar (kelipatan 400m, misal ${distance}m).`
            );
        } else {
            addSkill(
                200142, 
                'recommended', 
                'Direkomendasikan (Pasti Aktif)',
                `Meningkatkan status Stamina sebesar +40 pada jarak balapan non-standar (bukan kelipatan 400m, misal ${distance}m).`
            );
        }
    }

    // 4. Season
    const season = String(event.season || '');
    const seasonIdMap = {
        'spring': 200172,
        'summer': 200182,
        'autumn': 200192,
        'winter': 200202,
    };
    if (seasonIdMap[season]) {
        addSkill(seasonIdMap[season], 'recommended', 'Direkomendasikan (Pasti Aktif)');
    }

    // 5. Weather & Track Condition
    if (hasRandomConditions) {
        // League of Heroes / Random conditions:
        // As requested: Good Track Condition, Bad Track Condition, Sunny Days, Cloudy Days, Rainy Days, Snowy Days
        // are tagged as "Dapat Diambil (Situasional)", NOT recommended, because conditions roll randomly!
        addSkill(
            200152, 
            'situational', 
            'Dapat Diambil (Situasional)',
            'Meningkatkan status Power sebesar +40 jika putaran balapan bergulir pada kondisi lintasan baik / kering (Good Track).'
        );
        addSkill(
            200162, 
            'situational', 
            'Dapat Diambil (Situasional)',
            'Meningkatkan status Power sebesar +40 jika putaran balapan bergulir pada kondisi lintasan agak lembap, becek, atau berat (Yielding / Soft / Heavy).'
        );
        addSkill(
            200212, 
            'situational', 
            'Dapat Diambil (Situasional)',
            'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca cerah (Sunny).'
        );
        addSkill(
            200222, 
            'situational', 
            'Dapat Diambil (Situasional)',
            'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca berawan (Cloudy).'
        );
        addSkill(
            200232, 
            'situational', 
            'Dapat Diambil (Situasional)',
            'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca hujan (Rainy).'
        );
        addSkill(
            200242, 
            'situational', 
            'Dapat Diambil (Situasional)',
            'Meningkatkan status Guts sebesar +40 jika putaran balapan bergulir pada cuaca bersalju (Snowy).'
        );
    } else {
        // Fixed weather & track condition (e.g. Champions Meeting)
        if (event.weather === 'sunny') {
            addSkill(200212, 'recommended', 'Direkomendasikan (Pasti Aktif)');
        } else if (event.weather === 'cloudy') {
            addSkill(200222, 'recommended', 'Direkomendasikan (Pasti Aktif)');
        } else if (event.weather === 'rainy') {
            addSkill(200232, 'recommended', 'Direkomendasikan (Pasti Aktif)');
        } else if (event.weather === 'snowy') {
            addSkill(200242, 'recommended', 'Direkomendasikan (Pasti Aktif)');
        }

        if (event.track_condition === 'good') {
            addSkill(200152, 'recommended', 'Direkomendasikan (Pasti Aktif)');
        } else if (['yielding', 'soft', 'heavy'].includes(event.track_condition)) {
            addSkill(200162, 'recommended', 'Direkomendasikan (Pasti Aktif)');
        }
    }

    const randomDisclaimer = hasRandomConditions
        ? 'Catatan Khusus League of Heroes: Cuaca dan Kondisi Lintasan bersifat acak di setiap pertandingan. Skill cuaca (Sunny Days, Cloudy Days, Rainy Days, Snowy Days) dan kondisi lintasan (Good Track Condition, Bad Track Condition) berstatus "Dapat Diambil (Situasional)", bukan rekomendasi pasti, karena bergantung pada hasil acak saat putaran balapan berlangsung.'
        : null;

    return {
        isFullyConfirmed: true,
        hasRecommendations: true,
        disclaimer: null,
        hasRandomConditions,
        randomDisclaimer,
        skills,
    };
}
