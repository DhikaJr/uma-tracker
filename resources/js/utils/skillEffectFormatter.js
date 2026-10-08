/**
 * Uma Musume Skill Effect & Target Formatter
 * Formats raw skill effect numbers, values, targets, and durations into human-readable text matching GameTora standards.
 * Includes Indonesian translations and descriptions.
 */

/**
 * Map effect type number and value to English effect name matching GameTora.
 *
 * @param {number|string} type
 * @param {number|string} value
 * @returns {string}
 */
export function getSkillEffectTypeName(type, value) {
    const t = Number(type);
    const val = Number(value);
    const isNeg = val < 0;

    switch (t) {
        case 1:
            return isNeg ? 'Speed Down' : 'Speed Up';
        case 2:
            return isNeg ? 'Stamina Down' : 'Stamina Up';
        case 3:
            return isNeg ? 'Power Down' : 'Power Up';
        case 4:
            return isNeg ? 'Guts Down' : 'Guts Up';
        case 5:
            return isNeg ? 'Wisdom Down' : 'Wisdom Up';
        case 6:
            return 'Change Strategy';
        case 8:
            return isNeg ? 'Decrease Field of View' : 'Increase Field of View';
        case 9:
            return isNeg ? 'Stamina Drain' : 'Stamina Recovery';
        case 10:
            return val >= 10000 ? 'Worsen Start Reaction Time' : 'Improve Start Reaction Time';
        case 13:
            return isNeg ? 'Decrease Rush Time' : 'Increase Rush Time';
        case 14:
            return val >= 0 ? 'Add Start Delay' : 'Reduce Start Delay';
        case 21:
        case 22:
            return isNeg ? 'Decrease Current Speed' : 'Increase Current Speed';
        case 27:
            return isNeg ? 'Decrease Target Speed' : 'Increase Target Speed';
        case 28:
            return isNeg ? 'Decrease Lane Movement Speed' : 'Increase Lane Movement Speed';
        case 29:
            return isNeg ? 'Decreased Rush Chance' : 'Increased Rush Chance';
        case 31:
            return isNeg ? 'Decrease Acceleration' : 'Increase Acceleration';
        case 32:
            return isNeg ? 'All Stats Down' : 'All Stats Up';
        case 35:
            return 'Change Lane';
        case 37:
            return 'Use Random Rare Skills';
        case 38:
            return 'Debuff Immunity';
        case 48:
            return 'Zenkai Spurt Acceleration';
        case 49:
            return 'Reactivate Unique Skill';
        case 501:
            return isNeg ? 'Decrease Carnival Point Gain' : 'Increase Carnival Point Gain';
        case 502:
            return 'All Stats Increased During Carnival';
        case 503:
            return 'Mood Maxed During Carnival';
        default:
            return `Effect ${t}`;
    }
}

/**
 * Format effect value based on its type.
 *
 * @param {number|string} type
 * @param {number|string} value
 * @returns {string}
 */
export function formatSkillEffectValue(type, value) {
    const t = Number(type);
    const val = Number(value);

    switch (t) {
        case 6:
            return val === 0 ? 'Runaway' : 'Unknown';
        case 35:
            return `${val / 100}% of the track`;
        case 13:
            // Rush time is in seconds (e.g. 50000 / 10000 = 5 s)
            return `${val / 10000} s`;
        default: {
            const scaled = val / 10000;
            return String(Math.round(scaled * 10000) / 10000);
        }
    }
}

/**
 * Map target code and target details to readable English target string matching GameTora.
 *
 * @param {number|string|null|undefined} target
 * @param {number|string|null|undefined} targetDetails
 * @returns {string|null}
 */
export function getSkillTargetName(target, targetDetails) {
    if (target === undefined || target === null || target === '') return null;
    const t = Number(target);
    const td = Number(targetDetails);

    switch (t) {
        case 1:
            return 'Self';
        case 4:
            return td === 18 ? 'All enemies within the field of view' : 'All enemies';
        case 7:
            return td === 5 ? 'Five closest girls' : (td ? `${td} closest girls` : 'Closest girls');
        case 9:
            switch (td) {
                case 1: return 'Closest girl ahead of you';
                case 2: return 'Two closest girls ahead of you';
                case 3: return 'Three closest girls ahead of you';
                case 5: return 'Five closest girls ahead of you';
                case 18: return 'All enemy girls ahead of you';
                default: return td ? `${td} closest girls ahead of you` : 'All enemy girls ahead of you';
            }
        case 10:
            switch (td) {
                case 1: return 'Closest girl behind you';
                case 2: return 'Two closest girls behind you';
                case 3: return 'Three closest girls behind you';
                case 5: return 'Five closest girls behind you';
                case 18: return 'All enemy girls behind you';
                default: return td ? `${td} closest girls behind you` : 'All enemy girls behind you';
            }
        case 11:
            return 'All teammates and you';
        case 18:
            switch (td) {
                case 1: return 'All enemy Front Runners';
                case 2: return 'All enemy Pace Chasers';
                case 3: return 'All enemy Late Surgers';
                case 4: return 'All enemy End Closers';
                default: return 'All enemies';
            }
        case 19:
            return 'Rushing enemies ahead of you';
        case 20:
            return 'Rushing enemies behind you';
        case 21:
            switch (td) {
                case 1: return 'Rushing enemy Front Runners';
                case 2: return 'Rushing enemy Pace Chasers';
                case 3: return 'Rushing enemy Late Surgers';
                case 4: return 'Rushing enemy End Closers';
                default: return 'Rushing enemies';
            }
        case 22:
            return 'Specific character';
        case 23:
            return 'Girl who triggered this skill';
        default:
            return 'Opponents';
    }
}

/**
 * Get Indonesian translation for target description.
 *
 * @param {number|string|null|undefined} target
 * @param {number|string|null|undefined} targetDetails
 * @returns {string|null}
 */
export function getSkillTargetTranslation(target, targetDetails) {
    if (target === undefined || target === null || target === '') return null;
    const t = Number(target);
    const td = Number(targetDetails);

    switch (t) {
        case 1:
            return 'Diri sendiri';
        case 4:
            return td === 18 ? 'Semua lawan dalam bidang pandang' : 'Semua lawan';
        case 7:
            return td === 5 ? '5 pelari terdekat' : 'Pelari terdekat';
        case 9:
            switch (td) {
                case 1: return '1 pelari terdekat di depan';
                case 2: return '2 pelari terdekat di depan';
                case 3: return '3 pelari terdekat di depan';
                case 5: return '5 pelari terdekat di depan';
                case 18: return 'Semua Uma Musume lawan di depan';
                default: return td ? `${td} pelari terdekat di depan` : 'Semua pelari lawan di depan';
            }
        case 10:
            switch (td) {
                case 1: return '1 pelari terdekat di belakang';
                case 2: return '2 pelari terdekat di belakang';
                case 3: return '3 pelari terdekat di belakang';
                case 5: return '5 pelari terdekat di belakang';
                case 18: return 'Semua Uma Musume lawan di belakang';
                default: return td ? `${td} pelari terdekat di belakang` : 'Semua pelari lawan di belakang';
            }
        case 11:
            return 'Semua rekan tim dan diri sendiri';
        case 18:
            switch (td) {
                case 1: return 'Semua Front Runner (pelari depan / 逃げ) lawan';
                case 2: return 'Semua Pace Chaser (pelari penguntit / 先行) lawan';
                case 3: return 'Semua Late Surger (pelari penyalip / 差し) lawan';
                case 4: return 'Semua End Closer (pelari penutup / 追込) lawan';
                default: return 'Semua pelari lawan';
            }
        case 19:
            return 'Lawan yang sedang panik / tergesa-gesa (kakari) di depan';
        case 20:
            return 'Lawan yang sedang panik / tergesa-gesa (kakari) di belakang';
        case 21:
            switch (td) {
                case 1: return 'Front Runner (pelari depan / 逃げ) lawan yang sedang panik / kakari';
                case 2: return 'Pace Chaser (pelari penguntit / 先行) lawan yang sedang panik / kakari';
                case 3: return 'Late Surger (pelari penyalip / 差し) lawan yang sedang panik / kakari';
                case 4: return 'End Closer (pelari penutup / 追込) lawan yang sedang panik / kakari';
                default: return 'Pelari lawan yang sedang panik / kakari';
            }
        case 22:
            return 'Karakter spesifik';
        case 23:
            return 'Pelari yang memicu skill ini';
        default:
            return 'Pelari lawan';
    }
}

/**
 * Format base duration into human-readable string.
 *
 * @param {number|string|null|undefined} baseTime
 * @param {string|null|undefined} fallbackDuration
 * @returns {string|null}
 */
export function formatSkillBaseDuration(baseTime, fallbackDuration = null) {
    if (fallbackDuration && typeof fallbackDuration === 'string') {
        return fallbackDuration;
    }
    if (baseTime === undefined || baseTime === null || baseTime === '') {
        return null;
    }
    const num = Number(baseTime);
    if (num === -1) return 'none';
    if (num === 0) return 'Instant effect';
    return `${num / 10000} s`;
}

/**
 * Fully enrich an effect object for display in UI.
 *
 * @param {object} eff
 * @returns {object}
 */
export function enrichSkillEffect(eff) {
    if (!eff) return null;

    const type = eff.type;
    const value = eff.value ?? 0;
    const name = eff.name || (type ? getSkillEffectTypeName(type, value) : 'Effect');
    const formattedValue = eff.formatted_value || (type ? formatSkillEffectValue(type, value) : String(value));
    const targetName = eff.target_name || getSkillTargetName(eff.target, eff.target_details);
    const targetNameId = eff.target_name_id || getSkillTargetTranslation(eff.target, eff.target_details);
    const isDebuff = Number(value) < 0 || eff.type === 13 || eff.type === 14 || eff.type === 8;

    return {
        ...eff,
        type,
        value,
        name,
        formatted_value: formattedValue,
        display_text: eff.display_text || `${name} (${formattedValue})`,
        is_debuff: isDebuff,
        target_name: targetName,
        target_name_id: targetNameId,
    };
}
