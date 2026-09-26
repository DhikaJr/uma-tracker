import React from 'react';
import { Sparkles, Star } from 'lucide-react';

export default function RarityBadge({ rarity, size = 'md' }) {
    if (!rarity) return null;

    const r = String(rarity).toUpperCase();

    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-xs rounded',
        md: 'px-2.5 py-0.5 text-xs font-bold rounded-md',
        lg: 'px-3.5 py-1 text-sm font-black rounded-lg',
    }[size] || 'px-2.5 py-0.5 text-xs font-bold rounded-md';

    if (r === 'SSR') {
        return (
            <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 text-white font-black tracking-wide border border-amber-200 shadow-sm shadow-amber-400/40 select-none ${sizeClasses}`}>
                <Sparkles className="w-3 h-3 text-amber-200 fill-amber-200 animate-pulse" />
                <span>SSR</span>
            </span>
        );
    }

    if (r === 'SR') {
        return (
            <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold border border-yellow-300 shadow-xs select-none ${sizeClasses}`}>
                <Star className="w-2.5 h-2.5 text-yellow-100 fill-yellow-200" />
                <span>SR</span>
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center justify-center bg-slate-200 text-slate-800 font-bold border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500 select-none ${sizeClasses}`}>
            <span>R</span>
        </span>
    );
}

