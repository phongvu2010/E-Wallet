import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InstalmentCreate, InstalmentResponse, InstalmentStatus } from '../types/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CalendarClock, Plus, Trash2, Edit2, CheckCircle, Clock, X } from 'lucide-react';

export const InstalmentsView: React.FC = () => {
  const { instalments, accounts, addInstalment, updateInstalment, deleteInstalment, isLoading } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstalment, setEditingInstalment] = useState<InstalmentResponse | null>(null);

  const [productName, setProductName] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [totalAmount, setTotalAmount] = useState('');
  const [conversionFee, setConversionFee] = useState('0');
  const [termMonths, setTermMonths] = useState('12');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<InstalmentStatus>('active');

  const openCreateModal = () => {
    setEditingInstalment(null);
    setProductName('');
    setAccountId(accounts[0]?.id || '');
    setTotalAmount('');
    setConversionFee('0');
    setTermMonths('12');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (ins: InstalmentResponse) => {
    setEditingInstalment(ins);
    setProductName(ins.product_name);
    setAccountId(ins.account_id);
    setTotalAmount(ins.total_amount);
    setConversionFee(ins.conversion_fee);
    setTermMonths(ins.term_months.toString());
    setTransactionDate(ins.transaction_date || new Date().toISOString().split('T')[0]);
    setStatus(ins.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
      alert('Vui lòng nhập tên sản phẩm và tổng số tiền trả góp');
      return;
    }

    if (editingInstalment) {
      await updateInstalment(editingInstalment.id, {
        product_name: productName,
        account_id: accountId,
        total_amount: parseFloat(totalAmount),
        conversion_fee: parseFloat(conversionFee) || 0,
        term_months: parseInt(termMonths) || 12,
        transaction_date: transactionDate,
        status,
      });
    } else {
      const data: InstalmentCreate = {
        account_id: accountId,
        product_name: productName,
        total_amount: parseFloat(totalAmount),
        conversion_fee: parseFloat(conversionFee) || 0,
        term_months: parseInt(termMonths) || 12,
        transaction_date: transactionDate,
        status,
      };
      await addInstalment(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div id="instalments-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Quản Lý Các Khoản Mua Trả Góp</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tính toán nghĩa vụ trả hàng tháng và phí chuyển đổi (/api/v1/instalments).
          </p>
        </div>

        <button
          id="btn-add-instalment"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm Khoản Trả Góp</span>
        </button>
      </div>

      {/* Instalment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {instalments.map((ins) => {
          const acc = accounts.find((a) => a.id === ins.account_id);
          const total = parseFloat(ins.total_amount || '0');
          const fee = parseFloat(ins.conversion_fee || '0');
          const monthly = parseFloat(ins.monthly_amount || (total / ins.term_months).toFixed(0));

          return (
            <div
              key={ins.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm shadow-slate-200/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {ins.product_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Tài khoản: {acc?.account_name || 'N/A'} • Ngày tạo: {formatDate(ins.transaction_date)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    ins.status === 'active'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                  }`}>
                    {ins.status === 'active' ? 'Đang trả' : 'Đã hoàn tất'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 my-4 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng giá trị</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{formatCurrency(total)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Kỳ hạn</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{ins.term_months} tháng</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Mỗi tháng</span>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(monthly)}</span>
                  </div>
                </div>

                {fee > 0 && (
                  <p className="text-xs text-slate-400">
                    Phí chuyển đổi trả góp: <span className="font-semibold text-slate-300">{formatCurrency(fee)}</span>
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  DB Trigger Auto Calculated
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(ins)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm(`Xóa trả góp ${ins.product_name}?`)) deleteInstalment(ins.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instalment Modal */}
      {isModalOpen && (
        <div id="modal-instalment-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div id="modal-instalment-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingInstalment ? 'Chỉnh Sửa Khoản Trả Góp' : 'Tạo Khoản Trả Góp Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Tên sản phẩm / Thiết bị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Laptop Dell, Điện thoại iPhone..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Thẻ / Tài khoản thanh toán</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Tổng số tiền (VND) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="24000000"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Kỳ hạn (Tháng)</label>
                  <input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Phí chuyển đổi (VND)</label>
                  <input
                    type="number"
                    value={conversionFee}
                    onChange={(e) => setConversionFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
