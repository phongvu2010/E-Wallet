import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  Layers,
  LineChart as LineChartIcon,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { MonthlyCategorySpending } from "../../types/analytics";
import { useDailySpendingComparison } from "../../hooks/useFinanceQueries";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { Badge } from "../common/Badge";
import { Spinner } from "../common/Spinner";

interface MonthOverMonthSpendingChartProps {
  data: MonthlyCategorySpending[];
  className?: string;
}

export interface ComparisonItem {
  name: string;
  displayName: string;
  parentName: string;
  thisMonth: number;
  lastMonth: number;
  diff: number;
  diffPercent: number;
  thisCount: number;
  lastCount: number;
}

type MainTab = "category" | "daily_pacing";
type CategoryChartType = "bar" | "line";
type PacingMetricType = "cumulative" | "daily";
type ViewMode = "parent" | "category";
type SortOption = "spending" | "diff_abs" | "increase" | "decrease";

export const MonthOverMonthSpendingChart: React.FC<MonthOverMonthSpendingChartProps> = ({
  data,
  className = "",
}) => {
  // Main Tab Navigation
  const [mainTab, setMainTab] = useState<MainTab>("category");

  // Category Tab States
  const [categoryChartType, setCategoryChartType] = useState<CategoryChartType>("bar");
  const [viewMode, setViewMode] = useState<ViewMode>("parent");
  const [sortOption, setSortOption] = useState<SortOption>("spending");
  const [topLimit, setTopLimit] = useState<number>(8);
  const [showTable, setShowTable] = useState<boolean>(true);

  // Daily Pacing Tab States
  const [pacingMetricType, setPacingMetricType] = useState<PacingMetricType>("cumulative");

  // 1. Lấy danh sách các tháng duy nhất có trong dữ liệu (sắp xếp giảm dần)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    data.forEach((item) => {
      if (item.month) {
        const mKey = item.month.substring(0, 7);
        monthsSet.add(mKey);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [data]);

  // Tháng được chọn để so sánh (mặc định là tháng mới nhất)
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const activeMonth = selectedMonth || (availableMonths.length > 0 ? availableMonths[0] : "");

  // Tìm tháng trước liền kề
  const previousMonth = useMemo(() => {
    if (!activeMonth || availableMonths.length === 0) return "";
    const currentIndex = availableMonths.indexOf(activeMonth);
    if (currentIndex >= 0 && currentIndex + 1 < availableMonths.length) {
      return availableMonths[currentIndex + 1];
    }

    const [yearStr, monthStr] = activeMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) return "";

    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthNum = String(prevDate.getMonth() + 1).padStart(2, "0");
    return `${prevYear}-${prevMonthNum}`;
  }, [activeMonth, availableMonths]);

  // Query dữ liệu tiến trình chi tiêu theo ngày từ Backend (Cách 2)
  const {
    data: dailyPacingData,
    isLoading: isDailyLoading,
  } = useDailySpendingComparison(
    activeMonth || undefined,
    previousMonth || undefined
  );

  // 2. Tính toán tổng hợp theo nhóm hoặc danh mục chi tiết cho 2 tháng
  const {
    comparisonList,
    totalThisMonth,
    totalLastMonth,
    totalDiffAmount,
    totalDiffPercent,
    txCountThisMonth,
    txCountLastMonth,
    biggestIncrease,
    biggestDecrease,
  } = useMemo<{
    comparisonList: ComparisonItem[];
    totalThisMonth: number;
    totalLastMonth: number;
    totalDiffAmount: number;
    totalDiffPercent: number;
    txCountThisMonth: number;
    txCountLastMonth: number;
    biggestIncrease: ComparisonItem | null;
    biggestDecrease: ComparisonItem | null;
  }>(() => {
    if (!activeMonth || !previousMonth) {
      return {
        comparisonList: [],
        totalThisMonth: 0,
        totalLastMonth: 0,
        totalDiffAmount: 0,
        totalDiffPercent: 0,
        txCountThisMonth: 0,
        txCountLastMonth: 0,
        biggestIncrease: null,
        biggestDecrease: null,
      };
    }

    const catMap: Record<
      string,
      {
        name: string;
        parentName: string;
        thisMonthSpending: number;
        lastMonthSpending: number;
        thisCount: number;
        lastCount: number;
      }
    > = {};

    let totalThis = 0;
    let totalLast = 0;
    let countThis = 0;
    let countLast = 0;

    data.forEach((item) => {
      const itemMonth = item.month.substring(0, 7);
      const isThisMonth = itemMonth === activeMonth;
      const isLastMonth = itemMonth === previousMonth;

      if (!isThisMonth && !isLastMonth) return;

      const spending = Number(item.total_spending) || 0;
      const txCount = Number(item.transaction_count) || 0;

      const key =
        viewMode === "parent"
          ? item.parent_category_name || item.category_name || "Chưa phân loại"
          : item.category_name || "Chưa phân loại";

      if (!catMap[key]) {
        catMap[key] = {
          name: key,
          parentName: item.parent_category_name || item.category_name || "",
          thisMonthSpending: 0,
          lastMonthSpending: 0,
          thisCount: 0,
          lastCount: 0,
        };
      }

      if (isThisMonth) {
        catMap[key].thisMonthSpending += spending;
        catMap[key].thisCount += txCount;
        totalThis += spending;
        countThis += txCount;
      } else if (isLastMonth) {
        catMap[key].lastMonthSpending += spending;
        catMap[key].lastCount += txCount;
        totalLast += spending;
        countLast += txCount;
      }
    });

    const list = Object.values(catMap).map((cat) => {
      const diff = cat.thisMonthSpending - cat.lastMonthSpending;
      const diffPercent =
        cat.lastMonthSpending > 0
          ? (diff / cat.lastMonthSpending) * 100
          : cat.thisMonthSpending > 0
          ? 100
          : 0;

      return {
        name: cat.name,
        displayName: cat.name.length > 15 ? cat.name.substring(0, 13) + "…" : cat.name,
        parentName: cat.parentName,
        thisMonth: Math.round(cat.thisMonthSpending),
        lastMonth: Math.round(cat.lastMonthSpending),
        diff: Math.round(diff),
        diffPercent: parseFloat(diffPercent.toFixed(1)),
        thisCount: cat.thisCount,
        lastCount: cat.lastCount,
      };
    });

    const filteredList = list.filter((item) => item.thisMonth > 0 || item.lastMonth > 0);

    let maxInc: ComparisonItem | null = null;
    let maxDec: ComparisonItem | null = null;

    filteredList.forEach((item) => {
      if (item.diff > 0) {
        if (!maxInc || item.diff > maxInc.diff) maxInc = item;
      } else if (item.diff < 0) {
        if (!maxDec || item.diff < maxDec.diff) maxDec = item;
      }
    });

    filteredList.sort((a, b) => {
      if (sortOption === "spending") return b.thisMonth - a.thisMonth;
      if (sortOption === "diff_abs") return Math.abs(b.diff) - Math.abs(a.diff);
      if (sortOption === "increase") return b.diff - a.diff;
      if (sortOption === "decrease") return a.diff - b.diff;
      return 0;
    });

    const totalDiff = totalThis - totalLast;
    const totalPercent =
      totalLast > 0 ? (totalDiff / totalLast) * 100 : totalThis > 0 ? 100 : 0;

    return {
      comparisonList: filteredList,
      totalThisMonth: totalThis,
      totalLastMonth: totalLast,
      totalDiffAmount: totalDiff,
      totalDiffPercent: parseFloat(totalPercent.toFixed(1)),
      txCountThisMonth: countThis,
      txCountLastMonth: countLast,
      biggestIncrease: maxInc,
      biggestDecrease: maxDec,
    };
  }, [data, activeMonth, previousMonth, viewMode, sortOption]);

  const categoryChartData = useMemo(() => {
    if (topLimit <= 0) return comparisonList;
    return comparisonList.slice(0, topLimit);
  }, [comparisonList, topLimit]);

  // Format nhãn tháng hiển thị
  const formattedActiveMonth = activeMonth ? formatDate(`${activeMonth}-01`, "MM/yyyy") : "--/----";
  const formattedPreviousMonth = previousMonth
    ? formatDate(`${previousMonth}-01`, "MM/yyyy")
    : "--/----";

  // Biến đổi dữ liệu cho biểu đồ tiến trình ngày (Daily Pacing)
  const dailyChartData = useMemo(() => {
    if (!dailyPacingData || !dailyPacingData.items) return [];
    return dailyPacingData.items.map((it) => ({
      day: it.day,
      dayLabel: `Ngày ${it.day}`,
      daily_current: Number(it.daily_current) || 0,
      daily_previous: Number(it.daily_previous) || 0,
      cumulative_current: it.cumulative_current !== null ? Number(it.cumulative_current) : null,
      cumulative_previous: Number(it.cumulative_previous) || 0,
      count_current: it.tx_count_current,
      count_previous: it.tx_count_previous,
    }));
  }, [dailyPacingData]);

  if (availableMonths.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm">
        <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
        <span>Chưa có đủ dữ liệu lịch sử để so sánh chi tiêu theo tháng</span>
      </div>
    );
  }

  const isSaving = totalDiffAmount < 0;
  const isSpendingMore = totalDiffAmount > 0;

  // Tính toán chỉ số tiến độ cùng kỳ ngày as_of_day
  const asOfDay = dailyPacingData?.as_of_day || new Date().getDate();
  const isSameDaySaving = Number(dailyPacingData?.diff_amount_same_day || 0) < 0;
  const isSameDaySpendingMore = Number(dailyPacingData?.diff_amount_same_day || 0) > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Main Header with Primary View Tabs & Month Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {mainTab === "category" ? (
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              ) : (
                <LineChartIcon className="w-5 h-5 text-emerald-400" />
              )}
              <span>
                So Sánh Chi Tiêu: Tháng {formattedActiveMonth} vs Tháng {formattedPreviousMonth}
              </span>
            </h3>
            <Badge
              variant={isSaving ? "success" : isSpendingMore ? "danger" : "neutral"}
              size="sm"
            >
              {isSaving
                ? `Tổng giảm ${Math.abs(totalDiffPercent)}%`
                : isSpendingMore
                ? `Tổng tăng +${totalDiffPercent}%`
                : "Tương đương"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {mainTab === "category"
              ? "Đối chiếu tỷ trọng chi tiêu từng danh mục giữa hai tháng dạng Cột kép hoặc Đường phân bổ"
              : `So sánh nhịp độ tích lũy chi tiêu 31 ngày (Pacing) đến Ngày ${asOfDay} của tháng`}
          </p>
        </div>

        {/* View Mode & Month Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Main Perspective Selector (Danh Mục vs Tiến Trình 31 Ngày) */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs shadow-inner">
            <button
              onClick={() => setMainTab("category")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mainTab === "category"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Theo Danh Mục</span>
            </button>
            <button
              onClick={() => setMainTab("daily_pacing")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mainTab === "daily_pacing"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Tiến Trình 31 Ngày (Line)</span>
            </button>
          </div>

          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {availableMonths.map((mStr) => (
                <option key={mStr} value={mStr} className="bg-slate-900 text-slate-200">
                  Tháng {formatDate(`${mStr}-01`, "MM/yyyy")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SO SÁNH THEO DANH MỤC (HỖ TRỢ CẢ BAR VÀ LINE CHART)            */}
      {/* ==================================================================== */}
      {mainTab === "category" && (
        <div className="space-y-6">
          {/* Sub-controls Bar for Category View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chart Format Switcher: Cột ⇋ Đường */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setCategoryChartType("bar")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                    categoryChartType === "bar"
                      ? "bg-slate-800 text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Biểu đồ cột so sánh"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Dạng Cột (Bar)</span>
                </button>
                <button
                  onClick={() => setCategoryChartType("line")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                    categoryChartType === "line"
                      ? "bg-slate-800 text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Biểu đồ đường liên tục"
                >
                  <LineChartIcon className="w-3 h-3" />
                  <span>Dạng Đường (Line)</span>
                </button>
              </div>

              {/* Grouping Mode Toggle: Nhóm cha vs Hạng mục con */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setViewMode("parent")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === "parent"
                      ? "bg-emerald-500/20 text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Nhóm cha
                </button>
                <button
                  onClick={() => setViewMode("category")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewMode === "category"
                      ? "bg-emerald-500/20 text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Hạng mục con
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Top Limit Dropdown */}
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
                <option value={12}>Top 12</option>
                <option value={0}>Tất cả ({comparisonList.length})</option>
              </select>

              {/* Sort selector */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="spending">Chi tiêu tháng này cao nhất</option>
                <option value="diff_abs">Chênh lệch tuyệt đối lớn nhất</option>
                <option value="increase">Tăng chi nhiều nhất</option>
                <option value="decrease">Giảm chi nhiều nhất</option>
              </select>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tháng trước ({formattedPreviousMonth})</span>
                <span className="font-mono text-slate-500">{txCountLastMonth} GD</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-slate-200">
                  {formatCurrency(totalLastMonth)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                <span>Mốc so sánh nền kỳ trước</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tháng này ({formattedActiveMonth})</span>
                <span className="font-mono text-slate-500">{txCountThisMonth} GD</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatCurrency(totalThisMonth)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                <span>Chi tiêu thực tế kỳ hiện tại</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Biến động chi tiêu</span>
                <Badge
                  variant={isSaving ? "success" : isSpendingMore ? "danger" : "neutral"}
                  size="sm"
                >
                  {isSaving ? "Tiết kiệm" : isSpendingMore ? "Tăng chi" : "Cân bằng"}
                </Badge>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <div
                  className={`text-2xl font-bold font-mono ${
                    isSaving
                      ? "text-emerald-400"
                      : isSpendingMore
                      ? "text-rose-400"
                      : "text-slate-200"
                  }`}
                >
                  {isSaving ? "" : totalDiffAmount > 0 ? "+" : ""}
                  {formatCurrency(totalDiffAmount)}
                </div>
                <span
                  className={`text-xs font-mono font-bold flex items-center ${
                    isSaving
                      ? "text-emerald-400"
                      : isSpendingMore
                      ? "text-rose-400"
                      : "text-slate-400"
                  }`}
                >
                  {isSaving ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : isSpendingMore ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : null}
                  {Math.abs(totalDiffPercent)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isSaving
                  ? `Giảm ${formatCurrency(Math.abs(totalDiffAmount))} so với tháng trước`
                  : isSpendingMore
                  ? `Vượt ${formatCurrency(totalDiffAmount)} so với tháng trước`
                  : "Ngang bằng tháng trước"}
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Nhóm biến động đáng chú ý</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="my-2">
                {biggestIncrease && biggestIncrease.diff > 0 ? (
                  <div>
                    <p
                      className="text-xs font-semibold text-rose-400 truncate"
                      title={biggestIncrease.name}
                    >
                      {biggestIncrease.name}
                    </p>
                    <p className="text-base font-bold font-mono text-slate-200 mt-0.5">
                      +{formatCurrency(biggestIncrease.diff)}{" "}
                      <span className="text-xs text-rose-400 font-normal">
                        (+{biggestIncrease.diffPercent}%)
                      </span>
                    </p>
                  </div>
                ) : biggestDecrease && biggestDecrease.diff < 0 ? (
                  <div>
                    <p
                      className="text-xs font-semibold text-emerald-400 truncate"
                      title={biggestDecrease.name}
                    >
                      {biggestDecrease.name}
                    </p>
                    <p className="text-base font-bold font-mono text-slate-200 mt-0.5">
                      {formatCurrency(biggestDecrease.diff)}{" "}
                      <span className="text-xs text-emerald-400 font-normal">
                        ({biggestDecrease.diffPercent}%)
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Chưa có thay đổi rõ nét</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {biggestIncrease && biggestIncrease.diff > 0
                  ? "Tăng chi tiêu nhiều nhất"
                  : "Tiết kiệm nhiều nhất"}
              </p>
            </div>
          </div>

          {/* Chart Container (Bar or Line) */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-slate-400 font-medium">
                Đang hiển thị {categoryChartData.length} / {comparisonList.length} hạng mục (
                {categoryChartType === "bar" ? "Biểu đồ cột kép" : "Biểu đồ đường so sánh"}
                )
              </span>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                {categoryChartType === "bar" ? (
                  <BarChart
                    data={categoryChartData}
                    margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="displayName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(1)}Tr`}
                    />
                    <Tooltip
                      cursor={{ fill: "#1e293b", opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as ComparisonItem;
                          const diffVal = item.diff;
                          const isItemSaving = diffVal < 0;

                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[220px]">
                              <p className="font-bold text-slate-100 border-b border-slate-800 pb-1.5">
                                {item.name}
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    Tháng {formattedPreviousMonth}:
                                  </span>
                                  <span className="font-mono text-slate-200 font-semibold">
                                    {formatCurrency(item.lastMonth)} ({item.lastCount} GD)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Tháng {formattedActiveMonth}:
                                  </span>
                                  <span className="font-mono text-emerald-400 font-bold">
                                    {formatCurrency(item.thisMonth)} ({item.thisCount} GD)
                                  </span>
                                </div>
                              </div>
                              <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-medium">
                                <span className="text-slate-400">Biến động:</span>
                                <span
                                  className={`font-mono font-bold flex items-center gap-0.5 ${
                                    isItemSaving
                                      ? "text-emerald-400"
                                      : diffVal > 0
                                      ? "text-rose-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {diffVal > 0 ? "+" : ""}
                                  {formatCurrency(diffVal)} ({diffVal > 0 ? "+" : ""}
                                  {item.diffPercent}%)
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                      formatter={(value) => {
                        if (value === "lastMonth") {
                          return (
                            <span className="text-slate-400 font-medium mr-3">
                              Tháng trước ({formattedPreviousMonth})
                            </span>
                          );
                        }
                        if (value === "thisMonth") {
                          return (
                            <span className="text-emerald-400 font-semibold">
                              Tháng này ({formattedActiveMonth})
                            </span>
                          );
                        }
                        return value;
                      }}
                    />
                    <Bar
                      dataKey="lastMonth"
                      name="lastMonth"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="thisMonth"
                      name="thisMonth"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={categoryChartData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="displayName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(1)}Tr`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as ComparisonItem;
                          const diffVal = item.diff;
                          const isItemSaving = diffVal < 0;

                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[220px]">
                              <p className="font-bold text-slate-100 border-b border-slate-800 pb-1.5">
                                {item.name}
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    Tháng {formattedPreviousMonth}:
                                  </span>
                                  <span className="font-mono text-slate-200 font-semibold">
                                    {formatCurrency(item.lastMonth)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Tháng {formattedActiveMonth}:
                                  </span>
                                  <span className="font-mono text-emerald-400 font-bold">
                                    {formatCurrency(item.thisMonth)}
                                  </span>
                                </div>
                              </div>
                              <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-medium">
                                <span className="text-slate-400">Biến động:</span>
                                <span
                                  className={`font-mono font-bold flex items-center gap-0.5 ${
                                    isItemSaving
                                      ? "text-emerald-400"
                                      : diffVal > 0
                                      ? "text-rose-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {diffVal > 0 ? "+" : ""}
                                  {formatCurrency(diffVal)} ({diffVal > 0 ? "+" : ""}
                                  {item.diffPercent}%)
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                      formatter={(value) => {
                        if (value === "lastMonth") {
                          return (
                            <span className="text-indigo-400 font-medium mr-3">
                              ● Tháng trước ({formattedPreviousMonth})
                            </span>
                          );
                        }
                        if (value === "thisMonth") {
                          return (
                            <span className="text-emerald-400 font-semibold">
                              ● Tháng này ({formattedActiveMonth})
                            </span>
                          );
                        }
                        return value;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="lastMonth"
                      name="lastMonth"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#6366f1" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="thisMonth"
                      name="thisMonth"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Collapsible Detailed Breakdown Table */}
          <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/50">
            <button
              onClick={() => setShowTable(!showTable)}
              className="w-full px-4 py-3 bg-slate-900/60 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Bảng Thống Kê Chi Tiết Chênh Lệch Theo Danh Mục ({comparisonList.length})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>{showTable ? "Thu gọn" : "Xem chi tiết"}</span>
                {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showTable && (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Hạng Mục</th>
                      {viewMode === "category" && <th className="py-2.5 px-3">Nhóm Cha</th>}
                      <th className="py-2.5 px-4 text-right text-indigo-400 font-semibold">
                        Tháng {formattedPreviousMonth}
                      </th>
                      <th className="py-2.5 px-4 text-right text-emerald-400 font-semibold">
                        Tháng {formattedActiveMonth}
                      </th>
                      <th className="py-2.5 px-4 text-right font-bold">Chênh Lệch (±)</th>
                      <th className="py-2.5 px-4 text-center">% Thay Đổi</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {comparisonList.map((row, idx) => {
                      const isItemSaving = row.diff < 0;
                      const isItemIncrease = row.diff > 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-200">{row.name}</td>
                          {viewMode === "category" && (
                            <td className="py-2.5 px-3 text-slate-400">{row.parentName}</td>
                          )}
                          <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                            {formatCurrency(row.lastMonth)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-100">
                            {formatCurrency(row.thisMonth)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono font-bold ${
                              isItemSaving
                                ? "text-emerald-400"
                                : isItemIncrease
                                ? "text-rose-400"
                                : "text-slate-400"
                            }`}
                          >
                            {row.diff > 0 ? "+" : ""}
                            {formatCurrency(row.diff)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">
                            <span
                              className={`font-semibold ${
                                isItemSaving
                                  ? "text-emerald-400"
                                  : isItemIncrease
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {row.diff > 0 ? "+" : ""}
                              {row.diffPercent}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={
                                isItemSaving ? "success" : isItemIncrease ? "danger" : "neutral"
                              }
                              size="sm"
                            >
                              {isItemSaving ? "Giảm chi" : isItemIncrease ? "Tăng chi" : "Không đổi"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BIỂU ĐỒ LINE TIẾN TRÌNH CHI TIÊU 31 NGÀY (CUMULATIVE PACING)   */}
      {/* ==================================================================== */}
      {mainTab === "daily_pacing" && (
        <div className="space-y-6">
          {/* Sub-controls Bar for Daily Pacing */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Chế độ hiển thị:</span>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setPacingMetricType("cumulative")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    pacingMetricType === "cumulative"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  📈 Tích Lũy Lũy Kế (Burn-up)
                </button>
                <button
                  onClick={() => setPacingMetricType("daily")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    pacingMetricType === "daily"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  📊 Chi Tiêu Từng Ngày
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Cập nhật mốc đối chiếu cùng kỳ: <strong className="text-slate-200">Ngày {asOfDay}</strong>
              </span>
            </div>
          </div>

          {/* Apples-to-Apples Pacing KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Cùng kỳ tháng trước */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Cùng kỳ tháng trước (Ngày 1 → {asOfDay})</span>
                <span className="text-[10px] text-indigo-400 font-semibold font-mono">
                  {formattedPreviousMonth}
                </span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-slate-200">
                  {formatCurrency(dailyPacingData?.total_spending_previous_same_day || 0)}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                (Tổng cả tháng: {formatCurrency(dailyPacingData?.total_spending_previous || 0)})
              </p>
            </div>

            {/* Card 2: Tháng này đến ngày asOfDay */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tháng này (Ngày 1 → {asOfDay})</span>
                <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                  {formattedActiveMonth}
                </span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatCurrency(dailyPacingData?.total_spending_current || 0)}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Tiến độ: {asOfDay} / {dailyPacingData?.days_in_current_month || 30} ngày
              </p>
            </div>

            {/* Card 3: Chênh lệch cùng kỳ */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>So với cùng kỳ</span>
                <Badge
                  variant={isSameDaySaving ? "success" : isSameDaySpendingMore ? "danger" : "neutral"}
                  size="sm"
                >
                  {isSameDaySaving
                    ? "Tiết kiệm hơn"
                    : isSameDaySpendingMore
                    ? "Tiêu nhanh hơn"
                    : "Cân bằng"}
                </Badge>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <div
                  className={`text-2xl font-bold font-mono ${
                    isSameDaySaving
                      ? "text-emerald-400"
                      : isSameDaySpendingMore
                      ? "text-rose-400"
                      : "text-slate-200"
                  }`}
                >
                  {Number(dailyPacingData?.diff_amount_same_day || 0) > 0 ? "+" : ""}
                  {formatCurrency(dailyPacingData?.diff_amount_same_day || 0)}
                </div>
                <span
                  className={`text-xs font-mono font-bold flex items-center ${
                    isSameDaySaving
                      ? "text-emerald-400"
                      : isSameDaySpendingMore
                      ? "text-rose-400"
                      : "text-slate-400"
                  }`}
                >
                  {isSameDaySaving ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : isSameDaySpendingMore ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : null}
                  {Math.abs(Number(dailyPacingData?.diff_percent_same_day || 0))}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isSameDaySaving
                  ? `Đang tiết kiệm ${formatCurrency(
                      Math.abs(Number(dailyPacingData?.diff_amount_same_day || 0))
                    )} so với cùng kỳ`
                  : isSameDaySpendingMore
                  ? `Đang chi nhiều hơn ${formatCurrency(
                      Number(dailyPacingData?.diff_amount_same_day || 0)
                    )}`
                  : "Chi tiêu ngang bằng cùng kỳ"}
              </p>
            </div>

            {/* Card 4: Tốc độ chi tiêu trung bình / ngày */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Chi tiêu trung bình / ngày</span>
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-slate-200">
                  {formatCurrency(
                    asOfDay > 0
                      ? Math.round(Number(dailyPacingData?.total_spending_current || 0) / asOfDay)
                      : 0
                  )}
                  <span className="text-xs font-normal text-slate-400">/ngày</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Kỳ trước:{" "}
                {formatCurrency(
                  asOfDay > 0
                    ? Math.round(
                        Number(dailyPacingData?.total_spending_previous_same_day || 0) / asOfDay
                      )
                    : 0
                )}
                /ngày
              </p>
            </div>
          </div>

          {/* Daily Pacing Line / Area Chart */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
            {isDailyLoading ? (
              <div className="h-80 flex flex-col items-center justify-center gap-2">
                <Spinner size="md" />
                <span className="text-xs text-slate-400">Đang tổng hợp dữ liệu 31 ngày...</span>
              </div>
            ) : dailyChartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-xs text-slate-500">
                Chưa có dữ liệu giao dịch chi tiết theo ngày
              </div>
            ) : (
              <div className="w-full h-84">
                <ResponsiveContainer width="100%" height={340}>
                  {pacingMetricType === "cumulative" ? (
                    <AreaChart
                      data={dailyChartData}
                      margin={{ top: 15, right: 15, left: -10, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="colorCumCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `N${val}`}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(1)}Tr`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const it = payload[0].payload;
                            const prevCum = it.cumulative_previous;
                            const currCum = it.cumulative_current;
                            const hasCurrent = currCum !== null;
                            const diff = hasCurrent ? currCum - prevCum : null;

                            return (
                              <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[220px]">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                  <span className="font-bold text-slate-100">{it.dayLabel}</span>
                                  {it.day === asOfDay && (
                                    <Badge variant="warning" size="sm">
                                      Hôm nay
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                      Tháng {formattedPreviousMonth}:
                                    </span>
                                    <span className="font-mono text-slate-200 font-semibold">
                                      {formatCurrency(prevCum)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      Tháng {formattedActiveMonth}:
                                    </span>
                                    <span className="font-mono text-emerald-400 font-bold">
                                      {hasCurrent ? formatCurrency(currCum) : "Chưa phát sinh"}
                                    </span>
                                  </div>
                                </div>
                                {hasCurrent && diff !== null && (
                                  <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-medium">
                                    <span className="text-slate-400">Chênh lệch lũy kế:</span>
                                    <span
                                      className={`font-mono font-bold ${
                                        diff < 0
                                          ? "text-emerald-400"
                                          : diff > 0
                                          ? "text-rose-400"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {diff > 0 ? "+" : ""}
                                      {formatCurrency(diff)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                        formatter={(value) => {
                          if (value === "cumulative_previous") {
                            return (
                              <span className="text-indigo-400 font-medium mr-3">
                                ┄ Tháng trước ({formattedPreviousMonth})
                              </span>
                            );
                          }
                          if (value === "cumulative_current") {
                            return (
                              <span className="text-emerald-400 font-semibold">
                                ━ Tháng này ({formattedActiveMonth})
                              </span>
                            );
                          }
                          return value;
                        }}
                      />
                      {dailyPacingData?.is_current_calendar_month && (
                        <ReferenceLine
                          x={asOfDay}
                          stroke="#f59e0b"
                          strokeDasharray="3 3"
                          label={{
                            value: `Hôm nay (N${asOfDay})`,
                            position: "top",
                            fill: "#f59e0b",
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="cumulative_previous"
                        name="cumulative_previous"
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fill="none"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative_current"
                        name="cumulative_current"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#colorCumCurrent)"
                        dot={{ r: 3, fill: "#10b981" }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={dailyChartData}
                      margin={{ top: 15, right: 15, left: -10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `N${val}`}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(1)}Tr`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const it = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                                <p className="font-bold text-slate-100">{it.dayLabel}</p>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>Tháng {formattedPreviousMonth}:</span>
                                  <span className="font-mono text-indigo-400 font-semibold">
                                    {formatCurrency(it.daily_previous)} ({it.count_previous} GD)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>Tháng {formattedActiveMonth}:</span>
                                  <span className="font-mono text-emerald-400 font-bold">
                                    {formatCurrency(it.daily_current)} ({it.count_current} GD)
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                        formatter={(value) => {
                          if (value === "daily_previous") {
                            return (
                              <span className="text-slate-400 font-medium mr-3">
                                Tháng trước ({formattedPreviousMonth})
                              </span>
                            );
                          }
                          if (value === "daily_current") {
                            return (
                              <span className="text-emerald-400 font-semibold">
                                Tháng này ({formattedActiveMonth})
                              </span>
                            );
                          }
                          return value;
                        }}
                      />
                      <Bar
                        dataKey="daily_previous"
                        name="daily_previous"
                        fill="#6366f1"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={16}
                      />
                      <Bar
                        dataKey="daily_current"
                        name="daily_current"
                        fill="#10b981"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={16}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
