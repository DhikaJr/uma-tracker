/**
 * Utility functions for Indonesian date formatting
 */

const MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTHS_LONG = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format date string (YYYY-MM-DD or ISO) into standard Indonesian format.
 * Examples:
 * - formatIndonesianDate('2026-10-02') -> '02 Okt 2026'
 * - formatIndonesianDate('2026-10-02', 'long') -> '02 Oktober 2026'
 * - formatIndonesianDate('2026-10-02', 'numeric') -> '02/10/2026'
 *
 * @param {string|Date} dateVal
 * @param {'short'|'long'|'numeric'} format
 * @returns {string}
 */
export function formatIndonesianDate(dateVal, format = 'short') {
    if (!dateVal) return '-';

    try {
        let year, month, day;

        if (typeof dateVal === 'string') {
            const cleanStr = dateVal.trim();
            const ymdMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (ymdMatch) {
                year = parseInt(ymdMatch[1], 10);
                month = parseInt(ymdMatch[2], 10) - 1;
                day = parseInt(ymdMatch[3], 10);
            }
        }

        if (year === undefined) {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
        }

        const dayStr = String(day).padStart(2, '0');
        const monthNumStr = String(month + 1).padStart(2, '0');

        if (format === 'numeric') {
            return `${dayStr}/${monthNumStr}/${year}`;
        }

        if (format === 'long') {
            const monthName = MONTHS_LONG[month] || `Bulan ${month + 1}`;
            return `${dayStr} ${monthName} ${year}`;
        }

        // Default 'short': '02 Okt 2026'
        const monthName = MONTHS_SHORT[month] || `Bln ${month + 1}`;
        return `${dayStr} ${monthName} ${year}`;
    } catch {
        return String(dateVal);
    }
}
