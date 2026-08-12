import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TransactionType } from '../types/api';
import { X, ArrowRight, DollarSign, Calendar, FileText, Wallet, Tag } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setIsQuickAddOpen, accounts, categories, addTransaction, isLoading } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [fee, setFee] = useState<string>('0');
  const [transactionDetail, setTransactionDetail] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>('');

  if (!isQuickAddOpen) return null;

  const filteredCategories = categories.filter((c) => {
    if (type === 'transfer') return c.type === 'transfer';
    if (type === 'instalment') return c.type === 'instalment' || c.type === 'expense';
    return c.type === type;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert('Vui lòng chọn tài khoản thanh toán');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!transactionDetail.trim()) {
      alert('Vui lòng nhập nội dung giao dịch');
      return;
    }
    if (type === 'transfer' && !destinationAccountId) {
      alert('Vui lòng chọn tài khoản nhận');
      return;
    }

    const success = await addTransaction({
      account_id: accountId,
      destination_account_id: type === 'transfer' ? destinationAccountId : null,
      category_id: categoryId || (filteredCategories[0]?.id || null),
      type,
      transaction_date: transactionDate,
      transaction_detail: transactionDetail.trim(),
      amount: parseFloat(amount),
      fee: parseFloat(fee) || 0,
      description: description.trim() || null,
    });

    if (success) {
      // Reset form
      setAmount('');
      setTransactionDetail('');
      setDescription('');
      setIsQuickAddOpen(false);
    }
  };

  return (
    <div id="modal-quick-add-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div id="modal-quick-add-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>+ Nhập Giao Dịch Nhanh</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              POST /api/v1/transactions
            </p>
          </div>
          <button
            id="btn-close-quick-add"
            onClick={() => setIsQuickAddOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Transaction Type Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 tracking-wider">
              Loại giao dịch
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => { setType('expense'); setCategoryId(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'expense'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => { setType('income'); setCategoryId(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'income'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Thu nhập
              </button>
              <button
                type="button"
                onClick={() => { setType('transfer'); setCategoryId(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'transfer'
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Chuyển khoản
              </button>
              <button
                type="button"
                onClick={() => { setType('instalment'); setCategoryId(''); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'instalment'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Trả góp
              </button>
            </div>
          </div>


          {/* Amount & Currency Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Số tiền (VND) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
              <input
                id="input-transaction-amount"
                type="number"
                step="1000"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                required
              />
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 pl-1">
                Bằng chữ / Định dạng: {formatCurrency(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Transaction Detail Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Nội dung giao dịch <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <input
                id="input-transaction-detail"
                type="text"
                placeholder="Ví dụ: Ăn tối nhà hàng, Lương hàng tháng, Tiền điện..."
                value={transactionDetail}
                onChange={(e) => setTransactionDetail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                {type === 'transfer' ? 'Từ tài khoản' : 'Tài khoản thanh toán'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  id="select-account-id"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                >
                  <option value="">-- Chọn tài khoản --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({formatCurrency(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {type === 'transfer' ? (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Đến tài khoản <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ArrowRight className="w-4 h-4 text-sky-400" />
                  </div>
                  <select
                    id="select-destination-account-id"
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  >
                    <option value="">-- Chọn tài khoản đích --</option>
                    {accounts.filter((a) => a.id !== accountId).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} ({formatCurrency(acc.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Danh mục phân loại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    id="select-category-id"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">-- Danh mục mặc định --</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Date & Fee Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Ngày giao dịch
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="input-transaction-date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                Phí giao dịch (VND)
              </label>
              <input
                id="input-fee"
                type="number"
                step="1000"
                placeholder="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Description Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              id="input-description"
              rows={2}
              placeholder="Chi tiết địa điểm, số hóa đơn, ghi chú..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              id="btn-cancel-quick-add"
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              id="btn-submit-quick-add"
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Lưu Giao Dịch'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
