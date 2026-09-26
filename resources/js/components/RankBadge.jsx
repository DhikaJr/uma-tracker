import React from 'react';
import { Crown, Star, Sparkles } from 'lucide-react';

/**
 * Visual badge for Uma Musume evaluation ranks from E up to LG24.
 */
export default function RankBadge({ rank, size = 'md' }) {
    if (!rank) return null;

    const rankStr = String(rank).toUpperCase();

    // Determine tier styling
    let bgClasses = 'bg-slate-700 text-white border-slate-500';
    let icon = null;

    if (rankStr.startsWith('LG')) {
        bgClasses = 'bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600 text-white border-amber-300 shadow-md shadow-amber-400/40 ring-1 ring-amber-300 animate-rainbow font-black tracking-wider';
        icon = <Crown className="w-3.5 h-3.5 text-amber-200 fill-amber-300 inline mr-0.5" />;
    } else if (rankStr.startsWith('US')) {
        bgClasses = 'bg-gradient-to-r from-slate-200 via-sky-300 to-indigo-300 text-indigo-950 border-sky-400 shadow-sm shadow-sky-400/40 font-extrabold';
        icon = <Sparkles className="w-3 h-3 text-indigo-700 inline mr-0.5" />;
    } else if (rankStr.startsWith('UA')) {
        bgClasses = 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 text-white border-rose-300 shadow-sm shadow-rose-500/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-amber-300 fill-amber-300 inline mr-0.5" />;
    } else if (rankStr.startsWith('UB')) {
        bgClasses = 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white border-blue-300 shadow-sm shadow-blue-500/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-cyan-200 fill-cyan-300 inline mr-0.5" />;
    } else if (rankStr.startsWith('UC')) {
        bgClasses = 'bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 text-white border-teal-300 shadow-sm shadow-emerald-500/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-emerald-100 fill-emerald-200 inline mr-0.5" />;
    } else if (rankStr.startsWith('UD')) {
        bgClasses = 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500 text-white border-fuchsia-300 shadow-sm shadow-pink-500/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-pink-200 fill-pink-200 inline mr-0.5" />;
    } else if (rankStr.startsWith('UE')) {
        bgClasses = 'bg-gradient-to-r from-cyan-600 via-sky-500 to-teal-400 text-white border-cyan-300 shadow-sm shadow-cyan-500/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-sky-100 fill-sky-200 inline mr-0.5" />;
    } else if (rankStr.startsWith('UF')) {
        bgClasses = 'bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 text-white border-purple-300 shadow-sm shadow-purple-500/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-purple-200 fill-purple-200 inline mr-0.5" />;
    } else if (rankStr.startsWith('UG')) {
        bgClasses = 'bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white border-purple-400 shadow-sm shadow-purple-600/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-purple-200 fill-purple-300 inline mr-0.5" />;
    } else if (rankStr.startsWith('SS')) {
        bgClasses = 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 border-yellow-300 shadow-sm shadow-amber-400/30 font-extrabold';
        icon = <Star className="w-3 h-3 text-slate-900 fill-slate-900 inline mr-0.5" />;
    } else if (rankStr.startsWith('S')) {
        bgClasses = 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 border-amber-300 font-bold';
    } else if (rankStr.startsWith('A')) {
        bgClasses = 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 font-bold';
    } else if (rankStr.startsWith('B')) {
        bgClasses = 'bg-gradient-to-r from-slate-400 to-slate-500 text-white border-slate-300 font-bold';
    } else if (rankStr.startsWith('C')) {
        bgClasses = 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-300 font-semibold';
    } else if (rankStr.startsWith('D')) {
        bgClasses = 'bg-gradient-to-r from-orange-600 to-amber-700 text-white border-orange-400 font-semibold';
    } else if (rankStr.startsWith('E')) {
        bgClasses = 'bg-gradient-to-r from-stone-600 to-stone-700 text-stone-200 border-stone-400 font-medium';
    } else if (rankStr.startsWith('F')) {
        bgClasses = 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-zinc-300 border-zinc-500 font-medium';
    } else if (rankStr.startsWith('G')) {
        bgClasses = 'bg-gradient-to-r from-neutral-700 to-neutral-800 text-neutral-400 border-neutral-600 font-medium';
    }

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs rounded-md',
        md: 'px-2.5 py-1 text-sm rounded-lg',
        lg: 'px-3.5 py-1.5 text-base rounded-xl',
    }[size] || 'px-2.5 py-1 text-sm rounded-lg';

    return (
        <span className={`inline-flex items-center justify-center border font-mono tracking-tight select-none shadow-xs ${sizeClasses} ${bgClasses}`}>
            {icon}
            <span>{rankStr}</span>
        </span>
    );
}
