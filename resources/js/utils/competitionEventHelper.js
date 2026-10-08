import { Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';

// Formatters and label dictionaries (Bilingual ID & JP)
export const SURFACE_MAP = {
    turf: { label: 'Rumput', sub: 'Turf / 芝', color: 'emerald' },
    dirt: { label: 'Tanah', sub: 'Dirt / ダート', color: 'amber' },
};

export const DISTANCE_CATEGORY_MAP = {
    sprint: { label: 'Sprint', sub: '短距離 (1000m - 1400m)' },
    mile: { label: 'Mile', sub: 'マイル (1500m - 1800m)' },
    middle: { label: 'Jarak Menengah', sub: '中距離 / Middle (2000m - 2400m)' },
    long: { label: 'Jarak Jauh', sub: '長距離 / Long (2500m+)' },
};

export const DIRECTION_MAP = {
    right: { label: 'Kanan', sub: 'Right / 右' },
    left: { label: 'Kiri', sub: 'Left / 左' },
    right_outer: { label: 'Kanan • Luar', sub: 'Right Outer / 右・外' },
    right_inner: { label: 'Kanan • Dalam', sub: 'Right Inner / 右・内' },
    left_outer: { label: 'Kiri • Luar', sub: 'Left Outer / 左・外' },
    left_inner: { label: 'Kiri • Dalam', sub: 'Left Inner / 左・内' },
};

export const SEASON_MAP = {
    spring: { label: 'Musim Semi', sub: 'Spring / 春' },
    summer: { label: 'Musim Panas', sub: 'Summer / 夏' },
    autumn: { label: 'Musim Gugur', sub: 'Autumn / 秋' },
    winter: { label: 'Musim Dingin', sub: 'Winter / 冬' },
};

export const TIME_MAP = {
    day: { label: 'Siang Hari', sub: 'Day / 昼' },
    night: { label: 'Malam Hari', sub: 'Night / 夜' },
};

export const WEATHER_MAP = {
    sunny: { label: 'Cerah', sub: 'Sunny / 晴', icon: Sun, color: 'text-amber-500' },
    cloudy: { label: 'Berawan', sub: 'Cloudy / 曇', icon: Cloud, color: 'text-slate-400' },
    rainy: { label: 'Hujan', sub: 'Rainy / 雨', icon: CloudRain, color: 'text-blue-500' },
    snowy: { label: 'Salju', sub: 'Snowy / 雪', icon: Snowflake, color: 'text-cyan-400' },
};

export const TRACK_CONDITION_MAP = {
    good: { label: 'Baik', sub: 'Good / 良' },
    yielding: { label: 'Agak Lembap', sub: 'Yielding / 稍重' },
    soft: { label: 'Lembap / Berat', sub: 'Soft / 重' },
    heavy: { label: 'Buruk / Becek', sub: 'Heavy / 不良' },
};

/**
 * Calculates start and end dates (YYYY-MM-DD) for a competition event.
 */
export function getEventScheduleRange(event) {
    if (!event) return null;

    if (event.start_date) {
        const start = new Date(event.start_date);
        // CM / LoH official duration in Cygames game: lasts ~6 days
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
            startStr: event.start_date,
            endStr: end.toISOString().slice(0, 10),
            startDate: start,
            endDate: end,
            hasExactStart: true,
        };
    }

    const y = event.year;
    const m = String(event.month).padStart(2, '0');
    let startDay = 1;
    let endDay = 10;

    if (event.period === 'late') {
        startDay = 21;
        endDay = new Date(y, event.month, 0).getDate();
    } else if (event.period === 'mid') {
        startDay = 11;
        endDay = 20;
    } else if (event.period === 'early') {
        startDay = 1;
        endDay = 10;
    } else {
        startDay = 1;
        endDay = new Date(y, event.month, 0).getDate();
    }

    const startStr = `${y}-${m}-${String(startDay).padStart(2, '0')}`;
    const endStr = `${y}-${m}-${String(endDay).padStart(2, '0')}`;

    return {
        startStr,
        endStr,
        startDate: new Date(startStr),
        endDate: new Date(endStr),
        hasExactStart: false,
    };
}

/**
 * Returns event status relative to active reference date:
 * 'ongoing' | 'upcoming' | 'past'
 */
export function getEventStatus(event, activeDateStr) {
    if (!event) return { status: 'unknown', label: '-' };

    const refStr = activeDateStr || new Date().toISOString().slice(0, 10);
    const range = getEventScheduleRange(event);
    if (!range) return { status: 'unknown', label: '-' };

    if (refStr >= range.startStr && refStr <= range.endStr) {
        return {
            status: 'ongoing',
            label: 'Event Sedang Berlangsung',
            range,
        };
    }
    if (refStr < range.startStr) {
        const refDate = new Date(refStr);
        const diffMs = range.startDate.getTime() - refDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
            status: 'upcoming',
            label: 'Berlangsung Nanti',
            diffDays: diffDays > 0 ? diffDays : null,
            range,
        };
    }
    return {
        status: 'past',
        label: 'Telah Selesai',
        range,
    };
}
