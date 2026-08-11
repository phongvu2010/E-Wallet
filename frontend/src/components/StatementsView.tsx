import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatementCreate, StatementResponse } from '../types/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FileSpreadsheet, Plus, Trash2, Edit2, AlertCircle, Calendar, Gift, X } from 'lucide-react';

export const StatementsView: React.FC = () => {
  const { statements, accounts, addStatement, updateStatement, deleteStatement, isLoading } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatement, setEditingStatement] = useState<StatementResponse | null>(null);

  const [accountId, setAccountId] = useState(accounts.find((a) => a.account_type === 'Credit Card')?.id || accounts[0]?.id || '');
  const [statementDate, setStatementDate] = useState('2026-07-25');
  const [paymentDueDate, setPaymentDueDate] = useState('2026-08-15');
  const [totalAmount, setTotalAmount] = useState('8450000');
  const [minPayment, setMinPayment] = useState('845000');
  const [reward, setReward] = useState('250000');
  const [fileName, setFileName] = useState('SaoKe_Techcombank_Thang07_2026.pdf');

  const openCreateModal = () => {
    setEditingStatement(null);
    setAccountId(accounts.find((a) => a.account_type === 'Credit Card')?.id || accounts[0]?.id || '');
    setStatementDate(new Date().toISOString().split('T')[0]);
    setPaymentDueDate(new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]);
    setTotalAmount('0');
    setMinPayment('0');
    setReward('0');
    setFileName('');
    setIsModalOpen(true);
  };

  const openEditModal = (stm: StatementResponse) => {
    setEditingStatement(stm);
    setAccountId(stm.account_id);
    setStatementDate(stm.statement_date);
    setPaymentDueDate(stm.payment_due_date);
    setTotalAmount(stm.total_amount);
    setMinPayment(stm.min_payment);
    setReward(stm.reward);
    setFileName(stm.file_name || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert('Vui lòng chọn thẻ tín dụng');
      return;
    }

    if (editingStatement) {
      await updateStatement(editingStatement.id, {
        account_id: accountId,
        statement_date: statementDate,
        payment_due_date: paymentDueDate,
        total_amount: parseFloat(totalAmount) || 0,
        min_payment: parseFloat(minPayment) || 0,
        reward: parseFloat(reward) || 0,
        file_name: fileName || null,
      });
    } else {
      const data: StatementCreate = {
        account_id: accountId,
        statement_date: statementDate,
        payment_due_date: paymentDueDate,
        total_amount: parseFloat(totalAmount) || 0,
        min_payment: parseFloat(minPayment) || 0,
        reward: parseFloat(reward) || 0,
        file_name: fileName || null,
      };
      await addStatement(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div id="statements-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Quản Lý Sao Kê Thẻ Tín Dụng</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi chu kỳ chốt sổ, hạn thanh toán và hoàn tiền cashback (/api/v1/statements).
          </p>
        </div>

        <button
          id="btn-add-statement"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm Sao Kê Mới</span>
        </button>
      </div>

      {/* Statements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {statements.map((stm) => {
          const acc = accounts.find((a) => a.id === stm.account_id);
          const total = parseFloat(stm.total_amount || '0');
          const min = parseFloat(stm.min_payment || '0');
          const rwd = parseFloat(stm.reward || '0');

          return (
            <div
              key={stm.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {acc?.account_name || 'Thẻ tín dụng'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Kỳ sao kê: {formatDate(stm.statement_date)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Hạn: {formatDate(stm.payment_due_date)}
                  </span>
                </div>

                <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Tổng dư nợ sao kê:</span>
                    <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Thanh toán tối thiểu:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(min)}</span>
                  </div>
                  {rwd > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <Gift className="w-3.5 h-3.5" /> Cashback / Điểm thưởng:
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(rwd)}</span>
                    </div>
                  )}
                </div>

                {stm.file_name && (
                  <p className="text-xs text-slate-400 font-mono truncate">
                    File đính kèm: {stm.file_name}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Code: {stm.statement_code || 'N/A'}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(stm)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm(`Xóa sao kê kỳ ${formatDate(stm.statement_date)}?`)) deleteStatement(stm.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Statement Modal */}
      {isModalOpen && (
        <div id="modal-statement-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div id="modal-statement-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingStatement ? 'Chỉnh Sửa Sao Kê' : 'Thêm Kỳ Sao Kê Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Thẻ tín dụng</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Ngày sao kê</label>
                  <input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Hạn thanh toán</label>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dư nợ sao kê</label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Thanh toán tối thiểu</label>
                  <input
                    type="number"
                    value={minPayment}
                    onChange={(e) => setMinPayment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Cashback / Thưởng</label>
                  <input
                    type="number"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Tên file sao kê (PDF/Excel)</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="SaoKe_Thang08_2026.pdf"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono"
                />
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
