import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
    if (!toast) return null;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3500);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    const isSuccess = toast.type === 'success';
    const isError = toast.type === 'error';

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-bold ${
                isSuccess 
                    ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50 shadow-emerald-900/30' 
                    : isError 
                        ? 'bg-rose-950/90 text-rose-100 border-rose-500/50 shadow-rose-900/30' 
                        : 'bg-slate-900/90 text-slate-100 border-slate-700/50 shadow-slate-900/30'
            }`}>
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                
                <span>{toast.message}</span>

                <button 
                    onClick={onClose}
                    className="ml-2 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
