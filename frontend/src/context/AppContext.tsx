import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AccountResponse, AccountCreate, AccountUpdate,
  CategoryResponse, CategoryTreeResponse, CategoryCreate, CategoryUpdate,
  TransactionResponse, TransactionCreate, TransactionUpdate, TransactionFilters,
  InstalmentResponse, InstalmentCreate, InstalmentUpdate,
  StatementResponse, StatementCreate, StatementUpdate
} from '../types/api';
import {
  initialAccounts,
  initialCategories,
  initialCategoryTree,
  initialTransactions,
  initialInstalments,
  initialStatements
} from '../data/mockData';
import { financeApi, getApiConfig, saveApiConfig, ApiConfig } from '../api/client';
import { useToast } from './ToastContext';

export type NavTab = 'dashboard' | 'accounts' | 'categories' | 'transactions' | 'instalments' | 'statements';

interface AppContextType {
  // Navigation & UI state
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isDark: boolean;
  toggleTheme: () => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  isApiModalOpen: boolean;
  setIsApiModalOpen: (open: boolean) => void;

  // API Config
  apiConfig: ApiConfig;
  updateApiConfig: (config: ApiConfig) => void;
  apiHealthStatus: 'idle' | 'checking' | 'online' | 'offline';
  checkApiHealth: () => Promise<void>;

  // Data Loading
  isLoading: boolean;
  refreshAllData: () => Promise<void>;

  // Toasts
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;

  // Data Collections
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  categoryTree: CategoryTreeResponse[];
  transactions: TransactionResponse[];
  instalments: InstalmentResponse[];
  statements: StatementResponse[];


  // CRUD Operations
  addTransaction: (tx: TransactionCreate) => Promise<boolean>;
  updateTransaction: (id: string, tx: TransactionUpdate) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;

  addAccount: (acc: AccountCreate) => Promise<boolean>;
  updateAccount: (id: string, acc: AccountUpdate) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  recalculateBalance: (id: string) => Promise<void>;

  addCategory: (cat: CategoryCreate) => Promise<boolean>;
  updateCategory: (id: string, cat: CategoryUpdate) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;

  addInstalment: (ins: InstalmentCreate) => Promise<boolean>;
  updateInstalment: (id: string, ins: InstalmentUpdate) => Promise<boolean>;
  deleteInstalment: (id: string) => Promise<boolean>;

  addStatement: (stm: StatementCreate) => Promise<boolean>;
  updateStatement: (id: string, stm: StatementUpdate) => Promise<boolean>;
  deleteStatement: (id: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);

  const [apiConfig, setApiConfigState] = useState<ApiConfig>(getApiConfig());
  const [apiHealthStatus, setApiHealthStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

  const [isLoading, setIsLoading] = useState<boolean>(false);


  // Persistent / Mock Collections State
  const [accounts, setAccounts] = useState<AccountResponse[]>(() => {
    const saved = localStorage.getItem('finflow_accounts');
    return saved ? JSON.parse(saved) : initialAccounts;
  });

  const [categories, setCategories] = useState<CategoryResponse[]>(() => {
    const saved = localStorage.getItem('finflow_categories');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [categoryTree, setCategoryTree] = useState<CategoryTreeResponse[]>(() => {
    const saved = localStorage.getItem('finflow_category_tree');
    return saved ? JSON.parse(saved) : initialCategoryTree;
  });

  const [transactions, setTransactions] = useState<TransactionResponse[]>(() => {
    const saved = localStorage.getItem('finflow_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [instalments, setInstalments] = useState<InstalmentResponse[]>(() => {
    const saved = localStorage.getItem('finflow_instalments');
    return saved ? JSON.parse(saved) : initialInstalments;
  });

  const [statements, setStatements] = useState<StatementResponse[]>(() => {
    const saved = localStorage.getItem('finflow_statements');
    return saved ? JSON.parse(saved) : initialStatements;
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('finflow_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('finflow_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('finflow_category_tree', JSON.stringify(categoryTree));
  }, [categoryTree]);

  useEffect(() => {
    localStorage.setItem('finflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('finflow_instalments', JSON.stringify(instalments));
  }, [instalments]);

  useEffect(() => {
    localStorage.setItem('finflow_statements', JSON.stringify(statements));
  }, [statements]);

  // Theme Toggler
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Update Api Config

  const updateApiConfig = (newConfig: ApiConfig) => {
    setApiConfigState(newConfig);
    saveApiConfig(newConfig);
    showToast('Đã lưu cấu hình API', newConfig.isLiveMode ? `Đang kết nối tới ${newConfig.baseUrl}` : 'Đang sử dụng Chế độ Giả lập (Mock Data)', 'info');
  };

  const checkApiHealth = useCallback(async () => {
    if (!apiConfig.isLiveMode) {
      setApiHealthStatus('idle');
      return;
    }
    setApiHealthStatus('checking');
    const res = await financeApi.checkHealth();
    if (res.data) {
      setApiHealthStatus('online');
    } else {
      setApiHealthStatus('offline');
    }
  }, [apiConfig]);

  // Refresh All Data from Live Backend if active
  const refreshAllData = useCallback(async () => {
    if (!apiConfig.isLiveMode) return;
    setIsLoading(true);
    try {
      const [accRes, catTreeRes, txRes, insRes, stmRes] = await Promise.all([
        financeApi.getAccounts(),
        financeApi.getCategoryTree(),
        financeApi.getTransactions({ limit: 100 }),
        financeApi.getInstalments(),
        financeApi.getStatements(),
      ]);

      if (accRes.data) setAccounts(accRes.data.items);
      if (catTreeRes.data) setCategoryTree(catTreeRes.data);
      if (txRes.data) setTransactions(txRes.data.items);
      if (insRes.data) setInstalments(insRes.data.items);
      if (stmRes.data) setStatements(stmRes.data.items);
    } catch {
      showToast('Lỗi đồng bộ API', 'Không thể tải dữ liệu từ Backend FastAPI', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig, showToast]);

  useEffect(() => {
    if (apiConfig.isLiveMode) {
      checkApiHealth();
      refreshAllData();
    }
  }, [apiConfig.isLiveMode, checkApiHealth, refreshAllData]);

  // Helper to sync account balances on transaction changes
  const recalculateAccountBalancesLocally = (txList: TransactionResponse[], accList: AccountResponse[]) => {
    return accList.map((acc) => {
      let balance = parseFloat(acc.initial_balance || '0');
      txList.forEach((tx) => {
        const amt = parseFloat(tx.amount || '0');
        const fee = parseFloat(tx.fee || '0');
        if (tx.account_id === acc.id) {
          if (tx.type === 'income') {
            balance += amt;
          } else if (tx.type === 'expense' || tx.type === 'instalment') {
            balance -= (amt + fee);
          } else if (tx.type === 'transfer') {
            balance -= (amt + fee);
          }
        }
        if (tx.destination_account_id === acc.id && tx.type === 'transfer') {
          balance += amt;
        }
      });
      return {
        ...acc,
        current_balance: balance.toString(),
        updated_at: new Date().toISOString(),
      };
    });
  };

  // Transactions CRUD
  const addTransaction = async (txData: TransactionCreate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.createTransaction(txData);
        if (res.error) {
          showToast('Tạo giao dịch thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Giao dịch thành công', 'Đã ghi nhận giao dịch mới vào FastAPI');
        return true;
      } else {
        // Local Mock
        const newTx: TransactionResponse = {
          id: `tx-${Date.now()}`,
          user_id: 'user-default',
          account_id: txData.account_id,
          destination_account_id: txData.destination_account_id || null,
          statement_id: txData.statement_id || null,
          instalment_id: txData.instalment_id || null,
          category_id: txData.category_id || null,
          type: txData.type,
          transaction_date: txData.transaction_date,
          post_date: txData.post_date || txData.transaction_date,
          transaction_detail: txData.transaction_detail,
          amount: txData.amount.toString(),
          fee: (txData.fee || 0).toString(),
          total_amount: (Number(txData.amount) + Number(txData.fee || 0)).toString(),
          description: txData.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedTxs = [newTx, ...transactions];
        setTransactions(updatedTxs);

        // Auto update balances
        const updatedAccs = recalculateAccountBalancesLocally(updatedTxs, accounts);
        setAccounts(updatedAccs);

        showToast('Giao dịch thành công', `Đã ghi nhận +${newTx.amount} ₫`, 'success');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi thao tác', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = async (id: string, txData: TransactionUpdate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.updateTransaction(id, txData);
        if (res.error) {
          showToast('Cập nhật thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Cập nhật thành công', 'Đã lưu thông tin giao dịch');
        return true;
      } else {
        const updatedTxs = transactions.map((t) => {
          if (t.id === id) {
            const amt = txData.amount !== undefined ? txData.amount!.toString() : t.amount;
            const fee = txData.fee !== undefined ? txData.fee!.toString() : t.fee;
            return {
              ...t,
              ...txData,
              amount: amt,
              fee: fee,
              total_amount: (Number(amt) + Number(fee)).toString(),
              updated_at: new Date().toISOString(),
            } as TransactionResponse;
          }
          return t;
        });
        setTransactions(updatedTxs);
        setAccounts(recalculateAccountBalancesLocally(updatedTxs, accounts));
        showToast('Cập nhật thành công', 'Đã chỉnh sửa giao dịch');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi thao tác', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.deleteTransaction(id);
        if (res.error) {
          showToast('Xóa giao dịch thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Đã xóa giao dịch', 'Số dư tài khoản đã được hoàn lại');
        return true;
      } else {
        const updatedTxs = transactions.filter((t) => t.id !== id);
        setTransactions(updatedTxs);
        setAccounts(recalculateAccountBalancesLocally(updatedTxs, accounts));
        showToast('Đã xóa giao dịch', 'Số dư tài khoản đã được tự động hoàn lại');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi thao tác', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Accounts CRUD
  const addAccount = async (accData: AccountCreate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.createAccount(accData);
        if (res.error) {
          showToast('Tạo tài khoản thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã thêm tài khoản mới');
        return true;
      } else {
        const newAcc: AccountResponse = {
          id: `acc-${Date.now()}`,
          user_id: 'user-default',
          account_name: accData.account_name,
          account_type: accData.account_type,
          bank_name: accData.bank_name || null,
          account_number: accData.account_number || null,
          card_holder_name: accData.card_holder_name || null,
          currency: accData.currency || 'VND',
          initial_balance: (accData.initial_balance || 0).toString(),
          current_balance: (accData.initial_balance || 0).toString(),
          current_credit_limit: (accData.current_credit_limit || 0).toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updatedAccs = [...accounts, newAcc];
        setAccounts(recalculateAccountBalancesLocally(transactions, updatedAccs));
        showToast('Thành công', `Đã thêm tài khoản ${newAcc.account_name}`);
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi thao tác', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccount = async (id: string, accData: AccountUpdate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.updateAccount(id, accData);
        if (res.error) {
          showToast('Cập nhật thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã cập nhật thông tin tài khoản');
        return true;
      } else {
        const updatedAccs = accounts.map((a) => (a.id === id ? { ...a, ...accData, updated_at: new Date().toISOString() } as AccountResponse : a));
        setAccounts(recalculateAccountBalancesLocally(transactions, updatedAccs));
        showToast('Thành công', 'Đã cập nhật thông tin tài khoản');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi thao tác', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.deleteAccount(id);
        if (res.error) {
          showToast('Xóa tài khoản thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Đã xóa', 'Đã xóa tài khoản khỏi hệ thống');
        return true;
      } else {
        setAccounts(accounts.filter((a) => a.id !== id));
        showToast('Đã xóa', 'Đã xóa tài khoản thành công');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi thao tác', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateBalance = async (id: string) => {
    if (apiConfig.isLiveMode) {
      const res = await financeApi.recalculateBalance(id);
      if (res.error) {
        showToast('Lỗi tính lại số dư', res.error, 'error');
      } else {
        await refreshAllData();
        showToast('Đồng bộ số dư', res.data?.message || 'Đã đồng bộ số dư từ lịch sử giao dịch');
      }
    } else {
      setAccounts(recalculateAccountBalancesLocally(transactions, accounts));
      showToast('Đồng bộ số dư', 'Đã tính toán lại toàn bộ số dư từ lịch sử giao dịch');
    }
  };

  // Categories CRUD
  const addCategory = async (catData: CategoryCreate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.createCategory(catData);
        if (res.error) {
          showToast('Thất bại', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã tạo danh mục thu chi mới');
        return true;
      } else {
        const newCat: CategoryResponse = {
          id: `cat-${Date.now()}`,
          user_id: 'user-default',
          name: catData.name,
          parent_id: catData.parent_id || null,
          type: catData.type || 'expense',
          icon: catData.icon || 'Tag',
          color: catData.color || '#06B6D4',
          description: catData.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCategories([...categories, newCat]);
        showToast('Thành công', `Đã tạo danh mục ${newCat.name}`);
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategory = async (id: string, catData: CategoryUpdate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.updateCategory(id, catData);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã cập nhật danh mục');
        return true;
      } else {
        setCategories(categories.map((c) => (c.id === id ? { ...c, ...catData, updated_at: new Date().toISOString() } as CategoryResponse : c)));
        showToast('Thành công', 'Đã cập nhật danh mục');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.deleteCategory(id);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã xóa danh mục');
        return true;
      } else {
        setCategories(categories.filter((c) => c.id !== id));
        showToast('Thành công', 'Đã xóa danh mục');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Instalments CRUD
  const addInstalment = async (insData: InstalmentCreate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.createInstalment(insData);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã thêm khoản trả góp mới');
        return true;
      } else {
        const total = Number(insData.total_amount || 0);
        const terms = insData.term_months || 12;
        const monthly = (total / terms).toFixed(0);

        const newIns: InstalmentResponse = {
          id: `ins-${Date.now()}`,
          user_id: 'user-default',
          account_id: insData.account_id,
          product_name: insData.product_name,
          transaction_date: insData.transaction_date || new Date().toISOString().split('T')[0],
          total_amount: total.toString(),
          conversion_fee: (insData.conversion_fee || 0).toString(),
          term_months: terms,
          monthly_amount: monthly,
          status: insData.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setInstalments([newIns, ...instalments]);
        showToast('Thành công', `Đã tạo khoản trả góp ${newIns.product_name}`);
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateInstalment = async (id: string, insData: InstalmentUpdate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.updateInstalment(id, insData);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã cập nhật trả góp');
        return true;
      } else {
        setInstalments(
          instalments.map((i) => {
            if (i.id === id) {
              const updated = { ...i, ...insData, updated_at: new Date().toISOString() };
              const total = Number(updated.total_amount || 0);
              const terms = updated.term_months || 12;
              updated.monthly_amount = (total / terms).toFixed(0);
              return updated as InstalmentResponse;
            }
            return i;
          })
        );
        showToast('Thành công', 'Đã cập nhật thông tin trả góp');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInstalment = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.deleteInstalment(id);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã xóa khoản trả góp');
        return true;
      } else {
        setInstalments(instalments.filter((i) => i.id !== id));
        showToast('Thành công', 'Đã xóa khoản trả góp');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Statements CRUD
  const addStatement = async (stmData: StatementCreate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.createStatement(stmData);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã thêm sao kê mới');
        return true;
      } else {
        const newStm: StatementResponse = {
          id: `stm-${Date.now()}`,
          user_id: 'user-default',
          account_id: stmData.account_id,
          statement_code: stmData.statement_code || Number(new Date().toISOString().slice(0, 7).replace('-', '')),
          statement_date: stmData.statement_date,
          payment_due_date: stmData.payment_due_date,
          credit_limit: stmData.credit_limit ? stmData.credit_limit.toString() : '50000000',
          total_amount: (stmData.total_amount || 0).toString(),
          min_payment: (stmData.min_payment || 0).toString(),
          reward: (stmData.reward || 0).toString(),
          file_name: stmData.file_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setStatements([newStm, ...statements]);
        showToast('Thành công', 'Đã tạo kỳ sao kê mới');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatement = async (id: string, stmData: StatementUpdate): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.updateStatement(id, stmData);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã cập nhật sao kê');
        return true;
      } else {
        setStatements(statements.map((s) => (s.id === id ? { ...s, ...stmData, updated_at: new Date().toISOString() } as StatementResponse : s)));
        showToast('Thành công', 'Đã cập nhật sao kê');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStatement = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (apiConfig.isLiveMode) {
        const res = await financeApi.deleteStatement(id);
        if (res.error) {
          showToast('Lỗi', res.error, 'error');
          return false;
        }
        await refreshAllData();
        showToast('Thành công', 'Đã xóa kỳ sao kê');
        return true;
      } else {
        setStatements(statements.filter((s) => s.id !== id));
        showToast('Thành công', 'Đã xóa kỳ sao kê');
        return true;
      }
    } catch (e: any) {
      showToast('Lỗi', e.message, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isDark,
        toggleTheme,
        isQuickAddOpen,
        setIsQuickAddOpen,
        isApiModalOpen,
        setIsApiModalOpen,

        apiConfig,
        updateApiConfig,
        apiHealthStatus,
        checkApiHealth,

        isLoading,
        refreshAllData,

        showToast,

        accounts,
        categories,
        categoryTree,
        transactions,
        instalments,
        statements,

        addTransaction,
        updateTransaction,
        deleteTransaction,

        addAccount,
        updateAccount,
        deleteAccount,
        recalculateBalance,

        addCategory,
        updateCategory,
        deleteCategory,

        addInstalment,
        updateInstalment,
        deleteInstalment,

        addStatement,
        updateStatement,
        deleteStatement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
