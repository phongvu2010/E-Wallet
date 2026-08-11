import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AccountCreate, AccountResponse, AccountType } from '../types/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Wallet, CreditCard, Landmark, Coins, Plus, RefreshCw, Trash2, Edit2, ShieldCheck, X } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount, recalculateBalance, isLoading } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);

  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Checking Account');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [currentCreditLimit, setCurrentCreditLimit] = useState('0');

  const openCreateModal = () => {
    setEditingAccount(null);
    setAccountName('');
    setAccountType('Checking Account');
    setBankName('');
    setAccountNumber('');
    setCardHolderName('');
    setInitialBalance('0');
    setCurrentCreditLimit('0');
    setIsModalOpen(true);
  };

  const openEditModal = (acc: AccountResponse) => {
    setEditingAccount(acc);
    setAccountName(acc.account_name);
    setAccountType(acc.account_type);
    setBankName(acc.bank_name || '');
    setAccountNumber(acc.account_number || '');
    setCardHolderName(acc.card_holder_name || '');
    setInitialBalance(acc.initial_balance);
    setCurrentCreditLimit(acc.current_credit_limit);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      alert('Vui lòng nhập tên tài khoản');
      return;
    }

    if (editingAccount) {
      await updateAccount(editingAccount.id, {
        account_name: accountName,
        account_type: accountType,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        card_holder_name: cardHolderName || null,
        initial_balance: parseFloat(initialBalance) || 0,
        current_credit_limit: parseFloat(currentCreditLimit) || 0,
      });
    } else {
      const data: AccountCreate = {
        account_name: accountName,
        account_type: accountType,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        card_holder_name: cardHolderName || null,
        currency: 'VND',
        initial_balance: parseFloat(initialBalance) || 0,
        current_credit_limit: parseFloat(currentCreditLimit) || 0,
      };
      await addAccount(data);
    }
    setIsModalOpen(false);
  };

  const getTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'Checking Account':
        return <Landmark className="w-5 h-5 text-sky-500" />;
      case 'Credit Card':
        return <CreditCard className="w-5 h-5 text-rose-500" />;
      case 'E-Wallet':
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      case 'Cash':
        return <Coins className="w-5 h-5 text-amber-500" />;
      case 'Savings':
        return <ShieldCheck className="w-5 h-5 text-teal-500" />;
      default:
        return <Wallet className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div id="accounts-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Danh sách Tài khoản & Thẻ Thanh toán
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý số dư, hạn mức thẻ tín dụng và đồng bộ lịch sử giao dịch (/api/v1/accounts).
          </p>
        </div>
        <button
          id="btn-add-account"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm Tài khoản Mới</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isCredit = acc.account_type === 'Credit Card';
          const balance = parseFloat(acc.current_balance || '0');

          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getTypeIcon(acc.account_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {acc.account_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {acc.bank_name || acc.account_type}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {acc.account_type}
                  </span>
                </div>

                {/* Account Details */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                  {acc.account_number && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Số tài khoản:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{acc.account_number}</span>
                    </div>
                  )}
                  {acc.card_holder_name && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Chủ tài khoản:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{acc.card_holder_name}</span>
                    </div>
                  )}
                  {isCredit && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Hạn mức tín dụng:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(acc.current_credit_limit)}</span>
                    </div>
                  )}
                </div>

                {/* Balance Display */}
                <div className="mt-4">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                    {isCredit ? 'Dư nợ hiện tại' : 'Số dư khả dụng'}
                  </span>
                  <div className={`text-xl font-extrabold mt-0.5 ${
                    isCredit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {formatCurrency(balance)}
                  </div>
                </div>
              </div>

              {/* Account Controls Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => recalculateBalance(acc.id)}
                  className="text-xs font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                  title="Tính toán lại số dư từ toàn bộ lịch sử giao dịch (/recalculate-balance)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đồng bộ số dư</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa tài khoản ${acc.account_name}?`)) {
                        deleteAccount(acc.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Xóa tài khoản"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Modal */}
      {isModalOpen && (
        <div id="modal-account-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div id="modal-account-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingAccount ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Tên tài khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ví MoMo, Thẻ VCB, Tiền mặt..."
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Loại tài khoản
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  >
                    <option value="Checking Account">Tài khoản thanh toán</option>
                    <option value="Credit Card">Thẻ tín dụng</option>
                    <option value="E-Wallet">Ví điện tử</option>
                    <option value="Cash">Tiền mặt</option>
                    <option value="Savings">Sổ tiết kiệm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Ngân hàng / Đơn vị
                  </label>
                  <input
                    type="text"
                    placeholder="Vietcombank, MoMo..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Số tài khoản / Thẻ
                  </label>
                  <input
                    type="text"
                    placeholder="1018899223"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Tên chủ tài khoản
                  </label>
                  <input
                    type="text"
                    placeholder="NGUYEN VAN A"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Số dư ban đầu (VND)
                  </label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>

                {accountType === 'Credit Card' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">
                      Hạn mức tín dụng (VND)
                    </label>
                    <input
                      type="number"
                      value={currentCreditLimit}
                      onChange={(e) => setCurrentCreditLimit(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                )}
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20"
                >
                  {editingAccount ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
