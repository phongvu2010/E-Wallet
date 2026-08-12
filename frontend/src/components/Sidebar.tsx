import React from 'react';
import { useApp, NavTab } from '../context/AppContext';
import {
  LayoutDashboard,
  Wallet,
  Layers,
  Receipt,
  CalendarClock,
  FileSpreadsheet
} from 'lucide-react';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, accounts, transactions, instalments, statements } = useApp();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'accounts', label: 'Tài khoản & Thẻ', icon: Wallet, badge: accounts.length },
    { id: 'categories', label: 'Danh mục', icon: Layers },
    { id: 'transactions', label: 'Giao dịch', icon: Receipt, badge: transactions.length },
    { id: 'instalments', label: 'Trả góp', icon: CalendarClock, badge: instalments.length },
    { id: 'statements', label: 'Sao kê thẻ', icon: FileSpreadsheet, badge: statements.length },
  ];

  return (
    <>
      {/* Desktop Navigation Sidebar */}
      <aside id="desktop-sidebar" className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-transparent p-4 shrink-0 transition-colors min-h-[calc(100vh-4rem)]">
        <div className="space-y-1.5">
          <p className="px-3 text.11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Quản lý tài chính
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-2xs'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System Summary Widget */}
        <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs shadow-slate-200/40">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">RESTful API v1</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-mono mt-1 font-semibold">/api/v1/transactions</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2.5 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Sẵn sàng kết nối FastAPI
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav id="mobile-bottom-nav" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md px-2 py-1 flex justify-around items-center shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all min-w-[52px] ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.2]' : 'opacity-70'}`} />
              <span className="truncate max-w-[56px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </>
  );
};
