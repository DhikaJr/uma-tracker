import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import {
    Camera,
    Upload,
    CheckCircle2,
    AlertCircle,
    X,
    Sparkles,
    FileText,
    RotateCcw,
    Layers,
    ArrowRight,
    HelpCircle,
    AlertTriangle
} from 'lucide-react';

// Built-in scenario signatures supporting English, Indonesian, and Japanese
const DEFAULT_SCENARIO_RULES = [
    {
        name: 'Make a New Track (Twinkle Star Climax)',
        keywords: ['make a new track', 'makeanewtrack', 'climax', 'chm', 'pembukaan seri climax', 'twinkle star climax', 'new track', 'クライマックス', '開幕', 'seri climax']
    },
    {
        name: 'URA Finals',
        keywords: ['ura finals', 'urafinals', 'uraファイナルズ', '新設!ura', '新設！ura', 'ura']
    },
    {
        name: 'Aoharu Hai',
        keywords: ['aoharu hai', 'aoharu cup', 'aoharu', 'アオハル杯', 'アオハル', '輝け、チームの絆']
    },
    {
        name: 'Grand Live',
        keywords: ['grand live', 'grandlive', 'グランドライブ', 'connect, deliver, yell', 'つなげ、照らせ']
    },
    {
        name: 'Grand Masters',
        keywords: ['grand masters', 'grandmasters', 'グランドマスターズ', 'inheritors of the three goddesses', '継ぐ者達へ']
    },
    {
        name: "Project L'Arc",
        keywords: ["project l'arc", 'project larc', "l'arc", 'larc', '凱旋門', 'プロジェクト']
    },
    {
        name: 'U.A.F. Ready GO!',
        keywords: ['u.a.f. ready go', 'uaf ready go', 'u.a.f', 'uaf', 'ready go', 'アスリートのキラメキ']
    },
    {
        name: 'Great Food Festival',
        keywords: ['great food festival', 'food festival', 'harvest', '大豊食祭', '満腹ッ', '大豊食', '収穫ッ']
    },
    {
        name: 'Mecha Uma Musume',
        keywords: ['mecha uma musume', 'mecha', 'メカウマ娘', '走れ！メカウマ娘', '夢繋ぐ発明']
    },
    {
        name: 'The Twinkle Legends',
        keywords: ['the twinkle legends', 'twinkle legends', 'トゥインクル レジェンズ', 'twinkle']
    },
    {
        name: 'Beyond Dreams',
        keywords: ['beyond dreams', '夢の向こうへ']
    },
    {
        name: 'Tracen-ken',
        keywords: ['tracen-ken', 'tracen ken', 'トレセン研']
    },
    {
        name: 'Yukoma Onsen',
        keywords: ['yukoma onsen', 'yukoma', 'ゆこま温泉', '湯の街']
    },
    {
        name: 'Design Your Island',
        keywords: ['design your island', 'island', 'アイランド']
    }
];

// Fallback Japanese and alias dictionary for core Uma Musume characters
const BUILTIN_UMA_OCR_MAP = {
    'oguri cap': 'Oguri Cap',
    'オグリキャップ': 'Oguri Cap',
    'oguri': 'Oguri Cap',
    'cap': 'Oguri Cap',
    'qui cap': 'Oguri Cap',
    'starlight beat': 'Oguri Cap',
    'スターライトビート': 'Oguri Cap',
    'ashen miracle': 'Oguri Cap',
    'キセキの白星': 'Oguri Cap',
    'special week': 'Special Week',
    'スペシャルウィーク': 'Special Week',
    'special dreamer': 'Special Week',
    'スペシャル・ドリーマー': 'Special Week',
    'silence suzuka': 'Silence Suzuka',
    'サイレンススズカ': 'Silence Suzuka',
    'tokai teio': 'Tokai Teio',
    'トウカイテイオー': 'Tokai Teio',
    'beyond the horizon': 'Tokai Teio',
    'maruzensky': 'Maruzensky',
    'マルゼンスキー': 'Maruzensky',
    'fuji kiseki': 'Fuji Kiseki',
    'フジキセキ': 'Fuji Kiseki',
    'gold ship': 'Gold Ship',
    'ゴールドシップ': 'Gold Ship',
    'golshi': 'Gold Ship',
    'ゴルシ': 'Gold Ship',
    'vodka': 'Vodka',
    'ウオッカ': 'Vodka',
    'daiwa scarlet': 'Daiwa Scarlet',
    'ダイワスカーレット': 'Daiwa Scarlet',
    'taiki shuttle': 'Taiki Shuttle',
    'タイキシャトル': 'Taiki Shuttle',
    'grass wonder': 'Grass Wonder',
    'グラスワンダー': 'Grass Wonder',
    'hishi akebono': 'Hishi Akebono',
    'ヒシアケボノ': 'Hishi Akebono',
    'rice shower': 'Rice Shower',
    'ライスシャワー': 'Rice Shower',
    'mejiro mcqueen': 'Mejiro McQueen',
    'メジロマックイーン': 'Mejiro McQueen',
    'symboli rudolf': 'Symboli Rudolf',
    'シンボリルドルフ': 'Symboli Rudolf',
    'kitasan black': 'Kitasan Black',
    'キタサンブラック': 'Kitasan Black',
    'satono diamond': 'Satono Diamond',
    'サトノダイヤモンド': 'Satono Diamond',
    'epiphaneia': 'Epiphaneia',
    'エピファネイア': 'Epiphaneia',
    'fate chosen star': 'Epiphaneia',
    'fate choosen star': 'Epiphaneia',
    'fate\'s chosen star': 'Epiphaneia',
    '運命の星': 'Epiphaneia',
    'duramente': 'Duramente',
    'ドゥラメンテ': 'Duramente',
    'red in black': 'Duramente',
    'orfevre': 'Orfevre',
    'オルフェーヴル': 'Orfevre',
    'total dominion': 'Orfevre',
    'gentildonna': 'Gentildonna',
    'ジェンティルドンナ': 'Gentildonna',
    'regina dei fiori': 'Gentildonna',
    'almond eye': 'Almond Eye',
    'アーモンドアイ': 'Almond Eye',
    'the changer': 'Almond Eye'
};

export default function CareerOcrZone({
    umaPresets = [],
    umaOcrMap = {},
    scenarios = [],
    rankThresholds = [],
    onDataExtracted,
    onNotify
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [detectedResult, setDetectedResult] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const fileInputRef = useRef(null);

    // Global Paste Listener (Win+Shift+S -> Ctrl+V)
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        processImage(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [umaPresets, umaOcrMap, scenarios, rankThresholds]);

    // Helper: Compute rank directly from evaluation score using thresholds
    const calculateRankFromScore = (score, thresholds = []) => {
        if (!score || isNaN(score) || score < 0) return null;
        if (thresholds && thresholds.length > 0) {
            let matched = thresholds[0].rank;
            for (let i = 0; i < thresholds.length; i++) {
                if (score >= thresholds[i].score) {
                    matched = thresholds[i].rank;
                } else {
                    break;
                }
            }
            return matched;
        }
        // Standard fallback thresholds
        if (score >= 91400) return 'LF';
        if (score >= 72400) return 'LG';
        if (score >= 63400) return 'US';
        if (score >= 55200) return 'UA';
        if (score >= 47600) return 'UB';
        if (score >= 40700) return 'UC';
        if (score >= 34400) return 'UD';
        if (score >= 28800) return 'UE';
        if (score >= 23900) return 'UF';
        if (score >= 19600) return 'UG';
        if (score >= 19200) return 'SS+';
        if (score >= 17500) return 'SS';
        if (score >= 15900) return 'S+';
        if (score >= 14500) return 'S';
        if (score >= 12100) return 'A+';
        if (score >= 10000) return 'A';
        if (score >= 8200) return 'B+';
        if (score >= 6500) return 'B';
        if (score >= 4900) return 'C+';
        if (score >= 3500) return 'C';
        if (score >= 2900) return 'D+';
        if (score >= 2300) return 'D';
        if (score >= 1800) return 'E+';
        if (score >= 1300) return 'E';
        if (score >= 900) return 'F+';
        if (score >= 600) return 'F';
        if (score >= 300) return 'G+';
        return 'G';
    };

    // Parse extracted OCR text using heuristics & multi-lingual rules
    const parseOcrText = (rawText, presets = [], ocrMap = {}, scenarioList = [], thresholds = []) => {
        const text = rawText || '';
        const cleanText = text.toLowerCase();

        // 1. Scenario Detection (EN, ID, JP)
        let detectedScenario = null;
        for (const rule of DEFAULT_SCENARIO_RULES) {
            if (rule.keywords.some(kw => cleanText.includes(kw.toLowerCase()))) {
                detectedScenario = rule.name;
                break;
            }
        }
        // If not matched via keyword rules, search explicitly labeled lines
        if (!detectedScenario) {
            const scMatch = text.match(/(?:Skenario|シナリオ|Scenario|育成シナリオ)[:\s]*([^\n]+)/i);
            if (scMatch) {
                const rawSc = scMatch[1].trim();
                for (const s of scenarioList) {
                    if (s.toLowerCase().includes(rawSc.toLowerCase()) || rawSc.toLowerCase().includes(s.toLowerCase())) {
                        detectedScenario = s;
                        break;
                    }
                }
            }
        }
        // Normalize detected scenario to match exact scenario from scenarioList if available
        if (detectedScenario && scenarioList.length > 0) {
            const matchedFromList = scenarioList.find(
                s => s.toLowerCase() === detectedScenario.toLowerCase() ||
                     s.toLowerCase().includes(detectedScenario.toLowerCase()) ||
                     detectedScenario.toLowerCase().includes(s.toLowerCase())
            );
            if (matchedFromList) {
                detectedScenario = matchedFromList;
            }
        }

        // 2. Fans Gained Detection
        // Look for explicit label (Fans, ファン数, 獲得ファン数, Gain) or standalone 6-7 digit numbers
        let detectedFans = null;
        const fansLabelMatch = text.match(/(?:ファン(?:数)?|Fans?|獲得(?:ファン)?|Gain|Total Fans)[:\s]*\+?([0-9,.]+)/i);
        if (fansLabelMatch) {
            const num = parseInt(fansLabelMatch[1].replace(/[^0-9]/g, ''), 10);
            if (num >= 10000 && num <= 5000000) {
                detectedFans = num;
            }
        }
        if (!detectedFans) {
            const allNumbers = text.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{5,7}\b/g) || [];
            for (const numStr of allNumbers) {
                const num = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
                if (num >= 50000 && num <= 5000000) {
                    detectedFans = num;
                    break;
                }
            }
        }

        // 3. Evaluation Score Detection (4 to 6 digit numbers, e.g. 7,750 or 18,500)
        let detectedScore = null;
        const scoreLabelMatch = text.match(/(?:評価点|SCORE|Rating|Point|Score|スコア|評価)[:\s]*([0-9,.]+)/i);
        if (scoreLabelMatch) {
            const num = parseInt(scoreLabelMatch[1].replace(/[^0-9]/g, ''), 10);
            if (num >= 1000 && num <= 999999) {
                detectedScore = num;
            }
        }
        if (!detectedScore) {
            // Remove skill points with "pt" or "Poin" suffix to prevent collision (e.g. 2,483pt)
            const textWithoutPt = text.replace(/([0-9,.]+)\s*(?:pt|Pt|PT|Poin|ポイント)/gi, '');
            // Find 4 to 6 digit standalone numbers
            const allNumbers = textWithoutPt.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{4,6}\b/g) || [];
            for (const numStr of allNumbers) {
                const num = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
                if (num >= 1000 && num <= 200000 && num !== detectedFans) {
                    detectedScore = num;
                    break;
                }
            }
        }

        // 4. Final Rank Detection
        let detectedRank = '';
        // If score is available, authoritative rank is calculated directly from score
        if (detectedScore) {
            const autoRank = calculateRankFromScore(detectedScore, thresholds);
            if (autoRank) {
                detectedRank = autoRank;
            }
        }
        // Explicit RANK label match: "RANK B", "Rank: UG3", "ランク: S"
        if (!detectedRank) {
            const rankLabelMatch = text.match(/(?:RANK|Rank|ランク)[:\s]*([A-Z0-9+]+)/i);
            if (rankLabelMatch && rankLabelMatch[1]) {
                detectedRank = rankLabelMatch[1].toUpperCase();
            }
        }
        // High-tier compound ranks that do not conflict with single letter words (LF, LG, US, UA, UB, UC, UD, UE, UF, UG, SS+, SS, S+)
        if (!detectedRank) {
            const compoundMatch = text.match(/\b(LF\d*|LG\d*|US\d*|UA\d*|UB\d*|UC\d*|UD\d*|UE\d*|UF\d*|UG\d*|SS\+|SS|S\+)\b/i);
            if (compoundMatch) {
                detectedRank = compoundMatch[1].toUpperCase();
            }
        }
        // Check for rank badge near "Julukan" / "二つ名" / "RANK"
        if (!detectedRank) {
            const badgeNearJulukan = text.match(/\b([A-G]\+?)\b\s*(?:RANK|Julukan|二つ名)/i);
            if (badgeNearJulukan) {
                detectedRank = badgeNearJulukan[1].toUpperCase();
            }
        }

        // 5. Uma Musume Name Matching (Bilingual EN & JP + Costume Titles)
        let detectedUma = '';
        const combinedOcrMap = { ...BUILTIN_UMA_OCR_MAP, ...ocrMap };

        // Check for bracketed title: e.g. [Starlight Beat] Oguri Cap or [スターライトビート] オグリキャップ
        const bracketMatch = text.match(/[\[「]([^\]」]+)[\]」]/);
        if (bracketMatch) {
            const bracketTitle = bracketMatch[1].trim().toLowerCase();
            if (combinedOcrMap[bracketTitle]) {
                detectedUma = combinedOcrMap[bracketTitle];
            }
        }

        // Check OCR Map keys (sort longer keys first to prioritize specific multi-word names/titles)
        if (!detectedUma) {
            const sortedKeys = Object.keys(combinedOcrMap).sort((a, b) => b.length - a.length);
            for (const key of sortedKeys) {
                if (key.length >= 3 && cleanText.includes(key.toLowerCase())) {
                    detectedUma = combinedOcrMap[key];
                    break;
                }
            }
        }

        // Direct matching against presets
        if (!detectedUma) {
            for (const preset of presets) {
                const baseName = preset.replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
                if (baseName.length >= 3 && cleanText.includes(baseName)) {
                    detectedUma = preset;
                    break;
                }
            }
        }

        // Partial token matching for tokens >= 3 characters (e.g. "Cap", "Oguri", "Suzuka", "Teio", "Spe")
        if (!detectedUma) {
            for (const preset of presets) {
                const words = preset.replace(/\s*\(.*?\)$/, '').split(' ').filter(w => w.length >= 3);
                for (const word of words) {
                    if (cleanText.includes(word.toLowerCase())) {
                        detectedUma = preset;
                        break;
                    }
                }
                if (detectedUma) break;
            }
        }

        return {
            uma_name: detectedUma,
            final_rank: detectedRank,
            evaluation_score: detectedScore,
            fans_gained: detectedFans,
            scenario: detectedScenario,
            raw_text: text,
        };
    };

    // Optional helper: preprocess image with slight contrast boost via canvas for sharper OCR
    const preprocessImage = async (file) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return resolve(file);

                    const targetWidth = img.naturalWidth || img.width;
                    const targetHeight = img.naturalHeight || img.height;

                    // If image is small or standard, slight upscale helps OCR
                    const scale = targetWidth < 1200 ? 1.4 : 1.0;
                    canvas.width = Math.round(targetWidth * scale);
                    canvas.height = Math.round(targetHeight * scale);

                    // High contrast filter for clean text edges
                    ctx.filter = 'contrast(1.2) brightness(1.02)';
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, 'image/png');
                } catch {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    };

    // Run Tesseract OCR on image file
    const processImage = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            onNotify?.('Harap pilih berkas gambar yang valid (PNG, JPG, WEBP).', 'error');
            return;
        }

        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
        setProcessing(true);
        setProgressStatus('Memulai engine Tesseract.js...');
        setProgressPercent(5);

        try {
            const enhancedBlob = await preprocessImage(file);

            // Recognize using eng+jpn
            const result = await Tesseract.recognize(enhancedBlob, 'eng+jpn', {
                logger: (m) => {
                    if (m.status === 'loading tesseract core') {
                        setProgressStatus('Memuat modul OCR engine...');
                        setProgressPercent(15);
                    } else if (m.status === 'initializing tesseract' || m.status === 'initialized api') {
                        setProgressStatus('Menginisialisasi kamus pengenalan teks...');
                        setProgressPercent(30);
                    } else if (m.status === 'recognizing text') {
                        const pct = Math.round(30 + (m.progress || 0) * 65);
                        setProgressPercent(Math.min(95, pct));
                        setProgressStatus(`Membaca dan memindai teks screenshot: ${Math.round((m.progress || 0) * 100)}%`);
                    }
                },
            });

            const overallConf = Math.round(result.data?.confidence || 0);
            const words = result.data?.words || [];
            const lines = result.data?.lines || [];

            const parsed = parseOcrText(result.data.text, umaPresets, umaOcrMap, scenarios, rankThresholds);

            // Compute confidence score per detected field
            const extractFieldConfidence = (val, fWords, fLines, fallback) => {
                if (val === null || val === undefined || val === '') return null;
                const strVal = String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!strVal) return null;

                for (const w of fWords) {
                    const cleanW = (w.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanW && (cleanW.includes(strVal) || strVal.includes(cleanW))) {
                        return Math.round(w.confidence || 0);
                    }
                }
                for (const l of fLines) {
                    const cleanL = (l.text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanL && (cleanL.includes(strVal) || strVal.includes(cleanL))) {
                        return Math.round(l.confidence || 0);
                    }
                }
                return Math.round(fallback || 75);
            };

            const confidences = {
                overall: overallConf,
                uma_name: extractFieldConfidence(parsed.uma_name, words, lines, overallConf),
                final_rank: extractFieldConfidence(parsed.final_rank, words, lines, overallConf),
                evaluation_score: extractFieldConfidence(parsed.evaluation_score, words, lines, overallConf),
                fans_gained: extractFieldConfidence(parsed.fans_gained, words, lines, overallConf),
                scenario: extractFieldConfidence(parsed.scenario, words, lines, overallConf),
            };

            parsed.confidences = confidences;
            setDetectedResult(parsed);
            setProgressPercent(100);
            setProgressStatus('Pemindaian selesai!');

            // Call parent callback to auto-fill form fields
            onDataExtracted?.(parsed);

            const detectedCount = [
                parsed.uma_name ? 'Nama Karakter' : null,
                parsed.final_rank ? 'Rank' : null,
                parsed.evaluation_score ? 'Skor Evaluasi' : null,
                parsed.fans_gained ? 'Fans Gained' : null,
                parsed.scenario ? 'Skenario' : null,
            ].filter(Boolean);

            const hasLowConf = Object.entries(confidences).some(
                ([k, v]) => k !== 'overall' && parsed[k] && v !== null && v < 75
            );

            if (detectedCount.length > 0) {
                if (hasLowConf) {
                    onNotify?.(
                        `OCR Selesai! Mengisi otomatis: ${detectedCount.join(', ')}. Peringatan: Terdapat nilai dengan keyakinan < 75%, mohon periksa ulang sebelum menyimpan.`,
                        'warning'
                    );
                } else {
                    onNotify?.(
                        `OCR Berhasil! Berhasil mengisi otomatis: ${detectedCount.join(', ')} (Tingkat Keyakinan: ${overallConf}%).`,
                        'success'
                    );
                }
            } else {
                onNotify?.(
                    'Gambar terbaca, namun tidak ada angka/rank/nama/skenario yang cocok secara otomatis. Silakan periksa teks hasil scan.',
                    'info'
                );
            }
        } catch (err) {
            console.error('Tesseract OCR error:', err);
            onNotify?.('Gagal membaca gambar via OCR: ' + (err.message || 'Error tidak diketahui'), 'error');
            setProgressStatus('Pemindaian gagal.');
        } finally {
            setProcessing(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processImage(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processImage(file);
        }
    };

    const handleReset = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setDetectedResult(null);
        setProgressStatus('');
        setProgressPercent(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-700/60 bg-gradient-to-br from-emerald-50/40 via-teal-50/20 to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                        <Camera className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>OCR Screenshot Import (Auto-Fill Form)</span>
                                <span className="px-2 py-0.2 text-[9px] font-black uppercase rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                    AI Assist
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowHelp(!showHelp)}
                                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Lihat Petunjuk Penggunaan OCR"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Tempel screenshot (<strong>Ctrl + V</strong>) atau seret gambar hasil training Uma Musume untuk mengisi form otomatis
                        </p>
                    </div>
                </div>

                {previewUrl && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Ganti Screenshot</span>
                    </button>
                )}
            </div>

            {/* OCR Disclaimer Banner */}
            <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                    <span className="font-bold">Disclaimer:</span> Hasil pembacaan OCR otomatis dapat menghasilkan kesalahan deteksi angka, nama, atau teks. Harap periksa kembali isian formulir sebelum menyimpan hasil karier.
                </p>
            </div>

            {/* Help Box Collapse */}
            {showHelp && (
                <div className="mb-4 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Cara Cepat Screenshot via Windows / Ponsel:</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                        <li>Gunakan shortcut <strong>Win + Shift + S</strong> di PC atau tangkap layar akhir evaluasi karier di ponsel.</li>
                        <li>Klik di mana saja pada halaman ini, lalu tekan <strong>Ctrl + V</strong> (Paste) langsung dari clipboard.</li>
                        <li>Tesseract.js akan mengekstrak Nama Karakter, Final Rank (UG~US~LG), Skor Evaluasi, dan Fans Gained secara instan.</li>
                    </ol>
                </div>
            )}

            {/* Drop Zone / Active Process Area */}
            {!previewUrl ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                        isDragging
                            ? 'border-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/40 scale-[1.01]'
                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white/70 dark:bg-slate-800/40'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                            Seret & Lepas Gambar Screenshot di Sini, atau <span className="text-emerald-600 dark:text-emerald-400 underline">Pilih Berkas</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                            <span>Mendukung Clipboard Paste:</span>
                            <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[10px] font-black border border-slate-300 dark:border-slate-600">
                                Ctrl + V
                            </kbd>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Image Preview & Progress Card */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                            <img
                                src={previewUrl}
                                alt="Screenshot Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="flex-1 space-y-2 w-full">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{progressStatus || 'Memproses Screenshot...'}</span>
                                </span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                    {progressPercent}%
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>

                            {/* Extracted Fields Badge Row with Confidence Indicators */}
                            {detectedResult && !processing && (() => {
                                const confs = detectedResult.confidences || {};
                                const renderConfBadge = (fieldKey) => {
                                    const conf = confs[fieldKey];
                                    if (conf === null || conf === undefined) return null;
                                    const isLow = conf < 75;
                                    return (
                                        <span
                                            className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.2 rounded font-black ml-1.5 ${
                                                isLow
                                                    ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-600'
                                                    : 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200'
                                            }`}
                                            title={`Tingkat keyakinan OCR: ${conf}% ${isLow ? '(Rendah, mohon periksa ulang)' : '(Tinggi)'}`}
                                        >
                                            {isLow ? <AlertTriangle className="w-2.5 h-2.5 text-amber-700 dark:text-amber-300" /> : <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-300" />}
                                            <span>{conf}%</span>
                                        </span>
                                    );
                                };

                                const anyLow = Object.entries(confs).some(
                                    ([k, v]) => k !== 'overall' && detectedResult[k] && v !== null && v < 75
                                );

                                return (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            <span className="text-slate-400 font-semibold">
                                                Hasil Deteksi (Keyakinan {confs.overall ? `${confs.overall}%` : ''}):
                                            </span>
                                            {detectedResult.uma_name ? (
                                                <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center ${
                                                    confs.uma_name < 75
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                                }`}>
                                                    <span>Uma: {detectedResult.uma_name}</span>
                                                    {renderConfBadge('uma_name')}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                    Nama: Manual
                                                </span>
                                            )}

                                            {detectedResult.final_rank ? (
                                                <span className={`px-2 py-0.5 rounded-md font-bold font-mono border flex items-center ${
                                                    confs.final_rank < 75
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                                }`}>
                                                    <span>Rank: {detectedResult.final_rank}</span>
                                                    {renderConfBadge('final_rank')}
                                                </span>
                                            ) : null}

                                            {detectedResult.evaluation_score ? (
                                                <span className={`px-2 py-0.5 rounded-md font-bold font-mono border flex items-center ${
                                                    confs.evaluation_score < 75
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                                        : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                                                }`}>
                                                    <span>Skor: {detectedResult.evaluation_score.toLocaleString()}</span>
                                                    {renderConfBadge('evaluation_score')}
                                                </span>
                                            ) : null}

                                            {detectedResult.fans_gained ? (
                                                <span className={`px-2 py-0.5 rounded-md font-bold font-mono border flex items-center ${
                                                    confs.fans_gained < 75
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                                        : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/60'
                                                }`}>
                                                    <span>+{detectedResult.fans_gained.toLocaleString()} Fans</span>
                                                    {renderConfBadge('fans_gained')}
                                                </span>
                                            ) : null}

                                            {detectedResult.scenario ? (
                                                <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center ${
                                                    confs.scenario < 75
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                                        : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                                                }`}>
                                                    <span>Skenario: {detectedResult.scenario}</span>
                                                    {renderConfBadge('scenario')}
                                                </span>
                                            ) : null}
                                        </div>

                                        {anyLow && (
                                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-2 shadow-2xs">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                <span>
                                                    <strong>Peringatan Akurasi (&lt; 75%):</strong> Beberapa nilai terdeteksi dengan keyakinan rendah. Kolom formulir di bawah ditandai warna kuning untuk diperiksa ulang sebelum menyimpan.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
