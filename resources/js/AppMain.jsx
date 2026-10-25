import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import Toast from './components/Toast';

// Lazy-loaded Views and Modals for Code-Splitting
const DashboardView = lazy(() => import('./components/DashboardView'));
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));
const GachaView = lazy(() => import('./components/GachaView'));
const FansView = lazy(() => import('./components/FansView'));
const AffinityView = lazy(() => import('./components/AffinityView'));
const CollectionView = lazy(() => import('./components/CollectionView'));
const CircleClubView = lazy(() => import('./components/CircleClubView'));
const JewelPlannerView = lazy(() => import('./components/JewelPlannerView'));
const CompetitionEventsView = lazy(() => import('./components/CompetitionEventsView'));
const CompetitionEventDetailView = lazy(() => import('./components/CompetitionEventDetailView'));
const BackupRestoreModal = lazy(() => import('./components/BackupRestoreModal'));
const ChangelogModal = lazy(() => import('./components/ChangelogModal'));

/**
 * Lightweight fallback spinner during dynamic chunk lazy-loading.
 * Fully styled for both light and dark modes.
 */
function ViewLoadingFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 shadow-xs animate-fadeIn">
            <div className="relative flex items-center justify-center mb-4">
                <div className="w-10 h-10 border-3 border-emerald-200 dark:border-emerald-900 border-t-emerald-500 rounded-full animate-spin" />
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                Memuat modul...
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                Menyiapkan tampilan & data aplikasi
            </p>
        </div>
    );
}

export default function AppMain() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [summaryData, setSummaryData] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [toast, setToast] = useState(null);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showChangelogModal, setShowChangelogModal] = useState(false);

    // Circle Goal (stored in database and cached in localStorage, default 20M fans)
    const [circleGoal, setCircleGoal] = useState(() => {
        const saved = localStorage.getItem('uma_circle_goal');
        if (!saved || saved === '30000000') {
            return 20000000;
        }
        return parseInt(saved, 10) || 20000000;
    });

    // Load persistent settings from database on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.circle_goal) {
                        setCircleGoal(data.circle_goal);
                        localStorage.setItem('uma_circle_goal', String(data.circle_goal));
                    }
                }
            } catch (err) {
                console.error('Failed to load settings from DB:', err);
            }
        };
        loadSettings();
    }, []);

    // Global listener for reverse skill lookup shortcut from any module
    useEffect(() => {
        const handleFindSkillSources = (e) => {
            const query = e.detail?.query;
            if (query) {
                sessionStorage.setItem('uma_pending_skill_search', query);
                setActiveTab('collection');
            }
        };
        window.addEventListener('uma:find-skill-sources', handleFindSkillSources);
        return () => window.removeEventListener('uma:find-skill-sources', handleFindSkillSources);
    }, []);

    // Dark Mode Theme (persisted in localStorage)
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('uma_dark_mode');
        if (saved !== null) {
            return saved === 'true';
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('uma_dark_mode', String(darkMode));
    }, [darkMode]);

    const toggleDarkMode = () => {
        setDarkMode(prev => !prev);
    };

    // Customizable Base SSR Rate (e.g. 3.0%, 4.5% Epiphaneia banner, 6.0%)
    const [baseRate, setBaseRate] = useState(() => {
        const saved = localStorage.getItem('uma_base_ssr_rate');
        return saved ? parseFloat(saved) : 3.0;
    });

    const updateCircleGoal = async (val) => {
        setCircleGoal(val);
        localStorage.setItem('uma_circle_goal', String(val));
        notify(`Circle goal updated to ${val.toLocaleString('id-ID')} fans!`, 'info');

        // Persist to database so it stays saved across browsers & devices
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ circle_goal: val }),
            });
        } catch (err) {
            console.error('Failed to persist circle goal to database:', err);
        }
    };

    const updateBaseRate = (rate) => {
        const parsed = parseFloat(rate);
        if (parsed > 0) {
            setBaseRate(parsed);
            localStorage.setItem('uma_base_ssr_rate', String(parsed));
            notify(`Base SSR Rate benchmark set to ${parsed}%`, 'info');
        }
    };

    const notify = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Load Dashboard Summary Data
    const loadSummary = async () => {
        setLoadingSummary(true);
        try {
            const res = await fetch(`/api/dashboard/summary?base_rate=${baseRate}`);
            const data = await res.json();
            setSummaryData(data);
        } catch (err) {
            console.error('Failed to load dashboard summary:', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, [baseRate]);

    const [liveMonthlyFans, setLiveMonthlyFans] = useState(null);

    // Refresh summary when switching to dashboard
    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadSummary();
        }
    }, [activeTab]);

    const handleCareerStatsUpdate = (stats) => {
        if (stats && typeof stats.monthly_fans === 'number') {
            setLiveMonthlyFans(stats.monthly_fans);
        }
    };

    const monthlyFans = liveMonthlyFans !== null ? liveMonthlyFans : (summaryData?.career?.monthly_fans || 0);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
            {/* Header / Navbar */}
            <Navbar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                monthlyFans={monthlyFans}
                circleGoal={circleGoal}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                onOpenBackup={() => setShowBackupModal(true)}
                onOpenChangelog={() => setShowChangelogModal(true)}
            />

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-[1366px] 2xl:max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-5 xl:px-6 py-6 sm:py-8 pb-24 sm:pb-8 overflow-x-hidden">
                <Suspense fallback={<ViewLoadingFallback />}>
                    {activeTab === 'dashboard' && (
                        <DashboardView
                            summaryData={summaryData}
                            loading={loadingSummary}
                            setActiveTab={setActiveTab}
                            circleGoal={circleGoal}
                            baseRate={baseRate}
                            setBaseRate={updateBaseRate}
                            onNotify={notify}
                            onReload={loadSummary}
                        />
                    )}

                    {activeTab === 'analytics' && (
                        <AnalyticsView 
                            circleGoal={circleGoal}
                            baseRate={baseRate}
                            onNotify={notify}
                        />
                    )}

                    {activeTab === 'gacha' && (
                        <GachaView 
                            onNotify={notify} 
                            baseRate={baseRate}
                            setBaseRate={updateBaseRate}
                        />
                    )}

                    {activeTab === 'career' && (
                        <FansView 
                            onNotify={notify} 
                            circleGoal={circleGoal}
                            setCircleGoal={updateCircleGoal}
                            onCareerStatsUpdate={handleCareerStatsUpdate}
                        />
                    )}

                    {activeTab === 'affinity' && (
                        <AffinityView 
                            onNotify={notify}
                            darkMode={darkMode}
                        />
                    )}

                    {activeTab === 'collection' && (
                        <CollectionView 
                            onNotify={notify}
                        />
                    )}

                    {activeTab === 'club' && (
                        <CircleClubView 
                            onNotify={notify} 
                            circleGoal={circleGoal}
                        />
                    )}

                    {activeTab === 'planner' && (
                        <JewelPlannerView 
                            onNotify={notify}
                        />
                    )}

                    {activeTab === 'events' && (
                        <CompetitionEventsView 
                            onNotify={notify}
                        />
                    )}
                </Suspense>
            </main>

            {/* Toast Notifications */}
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Backup & Restore Modal */}
            <Suspense fallback={null}>
                {showBackupModal && (
                    <BackupRestoreModal 
                        isOpen={showBackupModal} 
                        onClose={() => setShowBackupModal(false)} 
                        onRestoreSuccess={() => {
                            loadSummary();
                            // trigger tab reload if needed
                            setActiveTab((curr) => curr);
                        }}
                        notify={notify}
                    />
                )}
            </Suspense>

            {/* Changelog Modal */}
            <Suspense fallback={null}>
                {showChangelogModal && (
                    <ChangelogModal 
                        isOpen={showChangelogModal} 
                        onClose={() => setShowChangelogModal(false)} 
                    />
                )}
            </Suspense>

            {/* Footer with Attribution & Database Sourcing Disclaimer */}
            <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 text-xs">
                <div className="w-full max-w-[1366px] 2xl:max-w-screen-2xl mx-auto px-4 sm:px-5 lg:px-6 xl:px-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 text-sm">Uma Musume Pretty Derby Companion</span>
                            <span>•</span>
                            <span className="text-slate-300 font-semibold">Gacha & Fans Tracker</span>
                        </div>
                        <div className="text-slate-400 text-xs">
                            Crafted for Trainers 🐎🥕 | Base SSR Rate: 3.0% | Spark: 200 pulls
                        </div>
                    </div>

                    {/* Disclaimer & Attribution */}
                    <div className="text-slate-400 text-[11px] leading-relaxed space-y-2 text-center sm:text-left">
                        <p>
                            <span className="font-bold text-slate-300">Disclaimer & Data Sourcing:</span> This application is an unofficial, non-commercial fan tool designed solely to help trainers log gacha pulls and monitor monthly circle fan quotas.
                        </p>
                        <p>
                            Daftar lengkap <strong className="text-slate-300">Support Cards (563 kartu SSR, SR, R)</strong> serta seluruh <strong className="text-slate-300">varian karakter Uma Musume beserta kostum alternatifnya (271 pilihan 3★, 2★, 1★)</strong> dihimpun dan disinkronisasi dari basis data komunitas <a href="https://gametora.com/umamusume" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-semibold">GameTora</a>, serta referensi wiki Jepang seperti <a href="https://kamigame.jp/umamusume/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-semibold">Kamigame</a> dan <a href="https://gamewith.jp/uma-musume/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-semibold">GameWith</a> berdasarkan rilisan resmi server Jepang (JP) dan Global.
                        </p>
                        <p className="text-slate-500 text-[10px]">
                            Uma Musume: Pretty Derby (ウマ娘 プリティーダービー) dan seluruh aset, nama karakter, dan hak cipta terkait merupakan milik © Cygames, Inc.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Sticky Mobile Bottom Navigation Bar (sm:hidden) */}
            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}
