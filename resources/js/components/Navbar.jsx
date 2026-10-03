import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Sparkles, Trophy, Users, Sun, Moon, Menu, X, Database, BarChart3, Calculator, Layers, ScrollText, GitFork } from 'lucide-react';

export default function Navbar({ 
    activeTab, 
    setActiveTab, 
    monthlyFans = 0, 
    circleGoal = 20000000, 
    darkMode = false, 
    toggleDarkMode,
    onOpenBackup,
    onOpenChangelog,
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Lock body scrolling and close on Escape when mobile menu is open
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMobileMenuOpen]);

    const navItems = [
        { id: 'dashboard', label: 'Dasbor', shortLabel: 'Dasbor', icon: LayoutDashboard },
        { id: 'analytics', label: 'Analitik', shortLabel: 'Analitik', icon: BarChart3 },
        { id: 'gacha', label: 'Pelacak Gacha', shortLabel: 'Gacha', icon: Sparkles },
        { id: 'career', label: 'Karier & Fans', shortLabel: 'Karier', icon: Trophy },
        { id: 'affinity', label: 'Kalkulator Afinitas', shortLabel: 'Afinitas', icon: GitFork },
        { id: 'collection', label: 'Koleksi', shortLabel: 'Koleksi', icon: Layers },
        { id: 'club', label: 'Circle Club', shortLabel: 'Circle', icon: Users },
        { id: 'planner', label: 'Perencana Jewel', shortLabel: 'Perencana', icon: Calculator },
    ];

    const circlePercent = Math.min(100, Math.round((monthlyFans / (circleGoal || 1)) * 100));

    const handleSelectTab = (tabId) => {
        setActiveTab(tabId);
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 text-white shadow-lg border-b border-emerald-700/60">
            <div className="w-full max-w-[1366px] 2xl:max-w-screen-2xl mx-auto px-2 sm:px-3 lg:px-4 xl:px-5">
                <div className="flex items-center justify-between h-16 gap-1.5 lg:gap-2 xl:gap-3">
                    {/* Brand / Logo */}
                    <div 
                        className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer shrink-0 select-none" 
                        onClick={() => handleSelectTab('dashboard')}
                    >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-0.5 shadow-md shadow-orange-500/30 flex items-center justify-center shrink-0">
                            <div className="w-full h-full bg-emerald-950 rounded-[10px] flex items-center justify-center text-base sm:text-lg">
                                🥕
                            </div>
                        </div>
                        <div className="shrink-0">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="font-black text-sm sm:text-base 2xl:text-lg tracking-tight bg-gradient-to-r from-emerald-100 via-white to-amber-200 bg-clip-text text-transparent whitespace-nowrap">
                                    UMA COMPANION
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] uppercase font-black tracking-wider badge-trainer-hub rounded-full whitespace-nowrap" style={{ backgroundColor: '#fbbf24', color: '#090d16' }}>
                                    Trainer Hub
                                </span>
                            </div>
                            <p className="text-[10px] text-emerald-300 font-medium hidden 2xl:block whitespace-nowrap">
                                Pelacak Gacha & Perolehan Fans Karier
                            </p>
                        </div>
                    </div>

                    {/* Desktop Navigation Tabs (Hidden on mobile / screens < md) */}
                    <nav className="hidden md:flex items-center justify-center gap-0.5 lg:gap-1 xl:gap-1.5 flex-1 min-w-0 mx-1 xl:mx-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelectTab(item.id)}
                                    className={`flex items-center gap-1 2xl:gap-2 px-1.5 lg:px-1.5 xl:px-2 2xl:px-3.5 py-1.5 rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                                        isActive
                                            ? 'bg-emerald-600/90 text-white shadow-inner ring-1 ring-emerald-400/50'
                                            : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/60'
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-emerald-300'}`} />
                                    <span className="hidden 2xl:inline whitespace-nowrap">{item.label}</span>
                                    <span className="2xl:hidden whitespace-nowrap">{item.shortLabel}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right Controls */}
                    <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
                        {/* Circle Monthly Fans Badge (Desktop Only) */}
                        <div 
                            title={`Target Bulanan Circle: ${(monthlyFans).toLocaleString()} / ${(circleGoal).toLocaleString()} fans (${circlePercent}%)`}
                            className="hidden xl:flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-700/50 px-2 py-1 rounded-xl whitespace-nowrap shrink-0 shadow-xs"
                        >
                            <div className="p-1 rounded-lg bg-emerald-800/80 text-amber-300 shrink-0">
                                <Users className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-right leading-tight whitespace-nowrap shrink-0">
                                <div className="text-[10px] text-emerald-300 font-medium flex items-center gap-1 justify-end whitespace-nowrap">
                                    <span className="hidden 2xl:inline">Kuota Circle</span>
                                    <span className="text-amber-400 font-bold">{circlePercent}%</span>
                                </div>
                                <div className="text-[10px] xl:text-[11px] font-bold text-white font-mono whitespace-nowrap">
                                    <span className="hidden 2xl:inline">{(monthlyFans).toLocaleString()} / {(circleGoal).toLocaleString()}</span>
                                    <span className="2xl:hidden">
                                        {monthlyFans >= 1000000 ? `${(monthlyFans / 1000000).toFixed(1)}M` : monthlyFans.toLocaleString()} / {circleGoal >= 1000000 ? `${(circleGoal / 1000000).toFixed(0)}M` : circleGoal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Changelog Modal Button (Desktop / Tablet) */}
                        <button
                            type="button"
                            onClick={onOpenChangelog}
                            title="Riwayat Pembaruan (Changelog)"
                            aria-label="Riwayat Pembaruan"
                            className="p-1.5 sm:px-2 2xl:px-3 sm:py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-800/80 border border-emerald-700/50 text-emerald-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
                        >
                            <ScrollText className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-emerald-300 shrink-0" />
                            <span className="text-xs font-bold hidden 2xl:inline whitespace-nowrap">Changelog</span>
                        </button>

                        {/* Backup & Restore Button (Desktop / Tablet) */}
                        <button
                            type="button"
                            onClick={onOpenBackup}
                            title="Cadangkan & Pulihkan Data (Backup & Restore)"
                            aria-label="Cadangkan & Pulihkan Data"
                            className="p-1.5 sm:px-2 2xl:px-3 sm:py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-800/80 border border-emerald-700/50 text-emerald-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
                        >
                            <Database className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-emerald-300 shrink-0" />
                            <span className="text-xs font-bold hidden 2xl:inline whitespace-nowrap">Backup & Restore</span>
                        </button>

                        {/* Dark Mode Toggle Button */}
                        <button
                            type="button"
                            onClick={toggleDarkMode}
                            title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                            aria-label={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                            className="p-1.5 sm:px-2 2xl:px-3 sm:py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-800/80 border border-emerald-700/50 text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
                        >
                            {darkMode ? (
                                <>
                                    <Sun className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-amber-300 shrink-0" />
                                    <span className="text-xs font-bold text-amber-200 hidden 2xl:inline whitespace-nowrap">Terang</span>
                                </>
                            ) : (
                                <>
                                    <Moon className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-emerald-200 shrink-0" />
                                    <span className="text-xs font-bold text-emerald-100 hidden 2xl:inline whitespace-nowrap">Gelap</span>
                                </>
                            )}
                        </button>

                        {/* Mobile Hamburger Menu Button (Visible only on screens < md) */}
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(prev => !prev)}
                            title={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu Navigasi'}
                            aria-label={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu Navigasi'}
                            aria-expanded={isMobileMenuOpen}
                            className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-800/80 border border-emerald-700/50 text-emerald-200 hover:text-white transition-colors cursor-pointer md:hidden shadow-xs flex items-center justify-center shrink-0"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-300" /> : <Menu className="w-5 h-5 text-emerald-200" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Drawer / Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-emerald-700/60 animate-fadeIn space-y-3 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain pb-28 px-0.5">
                        {/* Mobile Navigation Links */}
                        <div className="grid grid-cols-1 gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectTab(item.id)}
                                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                                            isActive
                                                ? 'bg-emerald-700 text-white shadow-inner border border-emerald-500/40'
                                                : 'text-emerald-100/90 hover:bg-emerald-800/60 hover:text-white'
                                        }`}
                                    >
                                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-800 text-amber-300' : 'bg-emerald-950/60 text-emerald-300'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span>{item.label}</span>
                                        {isActive && (
                                            <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mobile Action Buttons */}
                        <div className="pt-2 border-t border-emerald-800/60 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenChangelog?.();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-100 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                                <ScrollText className="w-4 h-4 text-emerald-300" />
                                <span>Riwayat Pembaruan (Changelog)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onOpenBackup?.();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-100 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                                <Database className="w-4 h-4 text-amber-300" />
                                <span>Cadangkan & Pulihkan Data (Backup & Restore)</span>
                            </button>

                            {/* Mobile Circle Quota Progress */}
                            <div className="bg-emerald-950/80 border border-emerald-700/40 p-3 rounded-2xl">
                                <div className="flex items-center justify-between text-xs font-bold text-emerald-200 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-amber-300" />
                                        <span>Kuota Fans Circle</span>
                                    </div>
                                    <span className="text-amber-400 font-mono">{circlePercent}%</span>
                                </div>
                                <div className="w-full bg-emerald-900 rounded-full h-2 overflow-hidden mb-1">
                                    <div 
                                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 rounded-full" 
                                        style={{ width: `${circlePercent}%` }}
                                    />
                                </div>
                                <div className="text-[10px] text-emerald-300 font-mono text-right">
                                    {(monthlyFans).toLocaleString()} / {(circleGoal).toLocaleString()} fans
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
