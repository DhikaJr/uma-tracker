import React from 'react';
import { LayoutDashboard, Trophy, Sparkles, Users, Calculator, Layers } from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
    const navItems = [
        { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
        { id: 'career', label: 'Karier', icon: Trophy },
        { id: 'gacha', label: 'Gacha', icon: Sparkles },
        { id: 'collection', label: 'Koleksi', icon: Layers },
        { id: 'club', label: 'Circle', icon: Users },
        { id: 'planner', label: 'Perencana', icon: Calculator },
    ];

    return (
        <nav 
            aria-label="Mobile Navigation Bar"
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
            <div className="grid grid-cols-6 h-16 max-w-lg mx-auto px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveTab(item.id)}
                            className={`min-h-[48px] py-1.5 flex flex-col items-center justify-center relative cursor-pointer select-none transition-all active:scale-95 ${
                                isActive 
                                    ? 'text-emerald-600 dark:text-emerald-400 font-black' 
                                    : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {/* Active Indicator Top Pill */}
                            {isActive && (
                                <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-xs"></span>
                            )}

                            <div className={`p-1 rounded-xl transition-all ${
                                isActive 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 scale-105' 
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}>
                                <Icon className="w-5 h-5 shrink-0" />
                            </div>

                            <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
