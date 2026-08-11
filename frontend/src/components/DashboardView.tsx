import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowRightLeft
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { accounts, transactions, categories, instalments, setIsQuickAddOpen, setActiveTab } = useApp();

  // Financial Calculations
  const stats = useMemo(() => {
    let netAssets = 0;
    let creditDebt = 0;

    accounts.forEach((acc) => {
      const bal = parseFloat(acc.current_balance || '0');
      if (acc.account_type === 'Credit Card') {
        if (bal < 0) creditDebt += Math.abs(bal);
      } else {
        netAssets += bal;
      }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthIncome = 0;
    let monthExpense = 0;

    transactions.forEach((tx) => {
      const d = new Date(tx.transaction_date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const amt = parseFloat(tx.amount || '0');
        if (tx.type === 'income') monthIncome += amt;
        if (tx.type === 'expense' || tx.type === 'instalment') monthExpense += amt;
      }
    });

    return { netAssets, creditDebt, monthIncome, monthExpense };
  }, [accounts, transactions]);

  // Spending Breakdown for Pie Chart
  const categorySpendingData = useMemo(() => {
    const categoryMap: Record<string, { name: string; value: number; color: string }> = {};

    transactions
      .filter((t) => t.type === 'expense' || t.type === 'instalment')
      .forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.category_id);
        const name = cat ? cat.name : 'Khác';
        const color = cat?.color || '#06B6D4';
        const amt = parseFloat(tx.amount || '0');

        if (!categoryMap[name]) {
          categoryMap[name] = { name, value: 0, color };
        }
        categoryMap[name].value += amt;
      });

    return Object.values(categoryMap).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // Balance & Cashflow Trend Data for Line/Area Chart
  const trendData = useMemo(() => {
    // Group transactions by date for the last 7 entries
    const datesMap: Record<string, { date: string; thu: number; chi: number }> = {};

    transactions.slice(0, 15).forEach((tx) => {
      const d = tx.transaction_date;
      if (!datesMap[d]) {
        datesMap[d] = { date: formatDate(d), thu: 0, chi: 0 };
      }
      const amt = parseFloat(tx.amount || '0');
      if (tx.type === 'income') datesMap[d].thu += amt;
      if (tx.type === 'expense' || tx.type === 'instalment') datesMap[d].chi += amt;
    });

    return Object.values(datesMap).reverse();
  }, [transactions]);

  const PIE_COLORS = ['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];

  return (
    <div id="dashboard-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-slate-900 border border-emerald-500/20 shadow-lg">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Tổng quan Tài chính Cá nhân</span>
            <Sparkles className="w-5 h-5 text-emerald-400 animate-bounce" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Theo dõi dòng tiền, phân bổ chi tiêu và quản lý trả góp theo thời gian thực.
          </p>
        </div>
        <button
          id="btn-dashboard-quick-add"
          onClick={() => setIsQuickAddOpen(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Ghi nhận giao dịch</span>
        </button>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Assets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng tài sản có
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatCurrency(stats.netAssets)}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <span>{accounts.filter((a) => a.account_type !== 'Credit Card').length} tài khoản thanh toán</span>
            </p>
          </div>
        </div>

        {/* Credit Card Debt */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Dư nợ Thẻ Tín Dụng
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(stats.creditDebt)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Khoản nợ cần thanh toán kỳ sao kê
            </p>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Thu nhập tháng này
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-teal-600 dark:text-teal-400 tracking-tight">
              +{formatCurrency(stats.monthIncome)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Chi tiêu tháng này
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              -{formatCurrency(stats.monthExpense)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bao gồm cả khoản trả góp
            </p>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Expense Pie Chart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-500" />
                Phân bổ chi tiêu theo Danh mục
              </h3>
            </div>
            {categorySpendingData.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpendingData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categorySpendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), 'Chi tiêu']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu chi tiêu để hiển thị
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 max-h-[120px] overflow-y-auto">
            {categorySpendingData.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || PIE_COLORS[i] }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Balance & Cashflow Line/Area Chart */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Biến động Dòng tiền (Thu vs Chi)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Biểu đồ so sánh theo các ngày giao dịch gần đây</p>
            </div>
          </div>
          {trendData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), '']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="thu" name="Thu nhập" stroke="#10B981" fillOpacity={1} fill="url(#colorThu)" strokeWidth={2} />
                  <Area type="monotone" dataKey="chi" name="Chi tiêu" stroke="#EF4444" fillOpacity={1} fill="url(#colorChi)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu biến động dòng tiền
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Instalments Progress & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Instalments Summary Widget */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" />
                Tiến độ Trả góp Hàng tháng
              </h3>
              <button
                onClick={() => setActiveTab('instalments')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Xem tất cả ({instalments.length})
              </button>
            </div>

            <div className="space-y-4">
              {instalments.map((ins) => {
                const total = parseFloat(ins.total_amount || '0');
                const monthly = parseFloat(ins.monthly_amount || '0');
                return (
                  <div key={ins.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {ins.product_name}
                      </h4>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(monthly)} / tháng
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Kỳ hạn: {ins.term_months} tháng</span>
                      <span>Tổng tiền: {formatCurrency(total)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: '45%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Lịch sử Giao dịch Gần đây
            </h3>
            <button
              id="btn-view-all-transactions"
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Xem toàn bộ
            </button>
          </div>

          <div className="space-y-2.5">
            {transactions.slice(0, 5).map((tx) => {
              const cat = categories.find((c) => c.id === tx.category_id);
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : isTransfer
                          ? 'bg-sky-500/10 text-sky-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {isIncome ? '+' : isTransfer ? <ArrowRightLeft className="w-4 h-4" /> : '-'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {tx.transaction_detail}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{formatDate(tx.transaction_date)}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{cat?.name || tx.type}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-extrabold ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : isTransfer ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
