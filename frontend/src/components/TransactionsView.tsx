import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TransactionResponse, TransactionType } from '../types/api';
import { formatCurrency, formatDate, exportTransactionsToCSV } from '../utils/formatters';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ArrowRightLeft,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions, accounts, categories, deleteTransaction, updateTransaction, setIsQuickAddOpen, isLoading } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Edit Modal state
  const [editingTx, setEditingTx] = useState<TransactionResponse | null>(null);
  const [editDetail, setEditDetail] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editFee, setEditFee] = useState('0');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Reset pagination to page 1 whenever search/filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedAccountId, selectedCategoryId, startDate, endDate, pageSize]);

  const openEditModal = (tx: TransactionResponse) => {
    setEditingTx(tx);
    setEditDetail(tx.transaction_detail);
    setEditAmount(tx.amount);
    setEditFee(tx.fee || '0');
    setEditDate(tx.transaction_date);
    setEditDescription(tx.description || '');
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (!editDetail.trim()) {
      alert('Vui lòng nhập nội dung giao dịch');
      return;
    }
    if (!editAmount || parseFloat(editAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const success = await updateTransaction(editingTx.id, {
      transaction_detail: editDetail.trim(),
      amount: parseFloat(editAmount),
      fee: parseFloat(editFee) || 0,
      transaction_date: editDate,
      description: editDescription.trim() || null,
    });

    if (success) {
      setEditingTx(null);
    }
  };

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (selectedAccountId !== 'all' && tx.account_id !== selectedAccountId && tx.destination_account_id !== selectedAccountId) return false;
      if (selectedCategoryId !== 'all' && tx.category_id !== selectedCategoryId) return false;
      if (startDate && tx.transaction_date < startDate) return false;
      if (endDate && tx.transaction_date > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailMatch = tx.transaction_detail.toLowerCase().includes(q);
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const amountMatch = tx.amount.includes(q);
        if (!detailMatch && !descMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [transactions, selectedType, selectedAccountId, selectedCategoryId, startDate, endDate, searchQuery]);

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTransactions.length);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, startIndex, pageSize]);


  // Total summary for current filtered set
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      const amt = parseFloat(tx.amount || '0');
      if (tx.type === 'income') income += amt;
      if (tx.type === 'expense' || tx.type === 'instalment') expense += amt;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedAccountId('all');
    setSelectedCategoryId('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div id="transactions-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Sổ Giao Dịch Tài Chính</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tra cứu, lọc chi tiết và quản lý toàn bộ thu chi (/api/v1/transactions).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="btn-export-csv"
            onClick={() => exportTransactionsToCSV(filteredTransactions, accounts, categories)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm transition-all flex items-center gap-2"
            title="Xuất danh sách giao dịch hiện tại ra tệp CSV"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Xuất CSV</span>
          </button>

          <button
            id="btn-add-tx-view"
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Giao Dịch Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              id="input-tx-search"
              type="text"
              placeholder="Tìm kiếm theo tên giao dịch, số tiền, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Transaction Type Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto shrink-0">
            {['all', 'income', 'expense', 'transfer', 'instalment'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all whitespace-nowrap ${
                  selectedType === t
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t === 'income' ? 'Thu nhập' : t === 'expense' ? 'Chi tiêu' : t === 'transfer' ? 'Chuyển tiền' : 'Trả góp'}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Account Picker */}
          <div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">-- Tất cả tài khoản --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.account_name}</option>
              ))}
            </select>
          </div>

          {/* Category Picker */}
          <div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">-- Tất cả danh mục --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
              placeholder="Từ ngày"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
              placeholder="Đến ngày"
            />
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 shrink-0"
              title="Đặt lại bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Summary Banner */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
        <div>
          <span className="text-slate-400 font-medium">Tổng thu:</span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            +{formatCurrency(filteredSummary.income)}
          </p>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Tổng chi:</span>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            -{formatCurrency(filteredSummary.expense)}
          </p>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Chênh lệch:</span>
          <p className={`text-sm font-bold mt-0.5 ${filteredSummary.balance >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
            {formatCurrency(filteredSummary.balance)}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold tracking-wider">
            <tr>
              <th className="p-4">Ngày giao dịch</th>
              <th className="p-4">Nội dung</th>
              <th className="p-4">Tài khoản</th>
              <th className="p-4">Danh mục</th>
              <th className="p-4 text-right">Số tiền (VND)</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => {
                const acc = accounts.find((a) => a.id === tx.account_id);
                const destAcc = accounts.find((a) => a.id === tx.destination_account_id);
                const cat = categories.find((c) => c.id === tx.category_id);

                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="p-4 max-w-[220px]">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {tx.transaction_detail}
                      </p>
                      {tx.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{tx.description}</p>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {acc?.account_name || 'N/A'}
                      </span>
                      {isTransfer && destAcc && (
                        <span className="text-[11px] text-sky-500 font-medium block">
                          → {destAcc.account_name}
                        </span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat?.color || '#06B6D4' }} />
                        {cat?.name || tx.type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold whitespace-nowrap">
                      <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : isTransfer ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-slate-100'}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Chỉnh sửa giao dịch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa giao dịch "${tx.transaction_detail}"? Số dư sẽ tự động hoàn lại.`)) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Xóa giao dịch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                  Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar Footer */}
        {filteredTransactions.length > 0 && (
          <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            {/* Rows per page selector */}
            <div className="flex items-center gap-2">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value={10}>10 dòng</option>
                <option value={25}>25 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
              <span>giao dịch / trang</span>
            </div>

            {/* Total items info */}
            <div>
              Hiển thị <span className="font-semibold text-slate-900 dark:text-slate-100">{startIndex + 1}</span> - <span className="font-semibold text-slate-900 dark:text-slate-100">{endIndex}</span> trên tổng số <span className="font-semibold text-emerald-600 dark:text-emerald-400">{filteredTransactions.length}</span> giao dịch
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-slate-900 dark:text-slate-100">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Chỉnh Sửa Giao Dịch
              </h3>
              <button onClick={() => setEditingTx(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Nội dung giao dịch</label>
                <input
                  type="text"
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-400 mb-1">Số tiền (VND)</label>
                  <input
                    type="number"
                    step="1000"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-slate-400 mb-1">Phí giao dịch</label>
                  <input
                    type="number"
                    step="1000"
                    value={editFee}
                    onChange={(e) => setEditFee(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Ngày giao dịch</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

