import React from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Sun, Moon, Server, Wallet, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isDark, toggleTheme, setIsQuickAddOpen, setIsApiModalOpen, apiConfig, apiHealthStatus } = useApp();

  return (
    <header id="main-header" className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-md shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              FinFlow
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              apiConfig.isLiveMode
                ? apiHealthStatus === 'online'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isDark ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Quick Add Transaction Button */}
          <button
            id="btn-quick-add-transaction"
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="font-semibold">+ Giao dịch mới</span>
          </button>

          {/* User Profile Avatar */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
              VA
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
