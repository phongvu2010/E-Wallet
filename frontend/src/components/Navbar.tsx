import React from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Sun, Moon, Server, Wallet } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isDark, toggleTheme, setIsQuickAddOpen, setIsApiModalOpen, apiConfig, apiHealthStatus } = useApp();

  return (
    <header id="main-header" className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 p-0.5 shadow-sm shadow-emerald-600/20 flex items-center justify-center ring-2 ring-emerald-500/20">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              FinFlow
            </span>
            <span className="hidden sm:inline-block ml-2.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              FastAPI v1
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API Status Indicator */}
          <button
            id="btn-api-status"
            onClick={() => setIsApiModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              apiConfig.isLiveMode
                ? apiHealthStatus === 'online'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/70'
                : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70'
            }`}
            title="Cấu hình kết nối FastAPI Backend"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {apiConfig.isLiveMode ? (apiHealthStatus === 'online' ? 'FastAPI Online' : 'FastAPI Connecting...') : 'Mock Mode'}
            </span>
            <span className={`w-2 h-2 rounded-full ${
              apiConfig.isLiveMode ? (apiHealthStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500') : 'bg-slate-400'
            }`} />
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            title={isDark ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>

          {/* Quick Add Transaction Button */}
          <button
            id="btn-quick-add-transaction"
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm giao dịch</span>
          </button>

          {/* User Profile Avatar */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold shadow-xs">
              VA
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

