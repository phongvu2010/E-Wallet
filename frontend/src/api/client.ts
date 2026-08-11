import {
  AccountResponse, AccountCreate, AccountUpdate,
  CategoryResponse, CategoryTreeResponse, CategoryCreate, CategoryUpdate,
  TransactionResponse, TransactionCreate, TransactionUpdate, TransactionFilters,
  InstalmentResponse, InstalmentCreate, InstalmentUpdate,
  StatementResponse, StatementCreate, StatementUpdate,
  PaginatedResponse
} from '../types/api';

export interface ApiConfig {
  baseUrl: string;
  token: string;
  isLiveMode: boolean;
}

const CONFIG_KEY = 'finflow_api_config';

export function getApiConfig(): ApiConfig {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore parsing error
    }
  }
  return {
    baseUrl: 'http://localhost:8000',
    token: '',
    isLiveMode: false, // Default to mock mode in preview unless live toggle is explicitly enabled
  };
}

export function saveApiConfig(config: ApiConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Fetch wrapper with error handling and fallback support
async function request<T>(path: string, options: RequestInit = {}): Promise<{ data?: T; error?: string }> {
  const config = getApiConfig();
  if (!config.isLiveMode) {
    return { error: 'LOCAL_MODE' };
  }

  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      let message = `API Error ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        message = errJson.detail || errJson.message || message;
      } catch {
        // ignore
      }
      return { error: message };
    }
    const data = await res.json();
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Network connection error' };
  }
}

export const financeApi = {
  // Accounts
  getAccounts: async (skip = 0, limit = 100) => {
    return request<PaginatedResponse<AccountResponse>>(`/api/v1/accounts?skip=${skip}&limit=${limit}`);
  },
  createAccount: async (data: AccountCreate) => {
    return request<AccountResponse>(`/api/v1/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getAccountById: async (id: string) => {
    return request<AccountResponse>(`/api/v1/accounts/${id}`);
  },
  updateAccount: async (id: string, data: AccountUpdate) => {
    return request<AccountResponse>(`/api/v1/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteAccount: async (id: string) => {
    return request<AccountResponse>(`/api/v1/accounts/${id}`, {
      method: 'DELETE',
    });
  },
  recalculateBalance: async (id: string) => {
    return request<{ success: boolean; message: string; balance: string }>(`/api/v1/accounts/${id}/recalculate-balance`, {
      method: 'POST',
    });
  },

  // Categories
  getCategories: async (skip = 0, limit = 100) => {
    return request<PaginatedResponse<CategoryResponse>>(`/api/v1/categories?skip=${skip}&limit=${limit}`);
  },
  getCategoryTree: async () => {
    return request<CategoryTreeResponse[]>(`/api/v1/categories/tree`);
  },
  createCategory: async (data: CategoryCreate) => {
    return request<CategoryResponse>(`/api/v1/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCategory: async (id: string, data: CategoryUpdate) => {
    return request<CategoryResponse>(`/api/v1/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteCategory: async (id: string) => {
    return request<CategoryResponse>(`/api/v1/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Transactions
  getTransactions: async (filters: TransactionFilters = {}) => {
    const query = new URLSearchParams();
    if (filters.skip !== undefined) query.set('skip', filters.skip.toString());
    if (filters.limit !== undefined) query.set('limit', filters.limit.toString());
    if (filters.start_date) query.set('start_date', filters.start_date);
    if (filters.end_date) query.set('end_date', filters.end_date);
    if (filters.account_id) query.set('account_id', filters.account_id);
    if (filters.category_id) query.set('category_id', filters.category_id);
    if (filters.type) query.set('type', filters.type);

    return request<PaginatedResponse<TransactionResponse>>(`/api/v1/transactions?${query.toString()}`);
  },
  createTransaction: async (data: TransactionCreate) => {
    return request<TransactionResponse>(`/api/v1/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateTransaction: async (id: string, data: TransactionUpdate) => {
    return request<TransactionResponse>(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteTransaction: async (id: string) => {
    return request<TransactionResponse>(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  // Instalments
  getInstalments: async (skip = 0, limit = 100) => {
    return request<PaginatedResponse<InstalmentResponse>>(`/api/v1/instalments?skip=${skip}&limit=${limit}`);
  },
  createInstalment: async (data: InstalmentCreate) => {
    return request<InstalmentResponse>(`/api/v1/instalments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getInstalmentById: async (id: string) => {
    return request<InstalmentResponse>(`/api/v1/instalments/${id}`);
  },
  updateInstalment: async (id: string, data: InstalmentUpdate) => {
    return request<InstalmentResponse>(`/api/v1/instalments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteInstalment: async (id: string) => {
    return request<InstalmentResponse>(`/api/v1/instalments/${id}`, {
      method: 'DELETE',
    });
  },

  // Statements
  getStatements: async (skip = 0, limit = 100) => {
    return request<PaginatedResponse<StatementResponse>>(`/api/v1/statements?skip=${skip}&limit=${limit}`);
  },
  createStatement: async (data: StatementCreate) => {
    return request<StatementResponse>(`/api/v1/statements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getStatementById: async (id: string) => {
    return request<StatementResponse>(`/api/v1/statements/${id}`);
  },
  updateStatement: async (id: string, data: StatementUpdate) => {
    return request<StatementResponse>(`/api/v1/statements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteStatement: async (id: string) => {
    return request<StatementResponse>(`/api/v1/statements/${id}`, {
      method: 'DELETE',
    });
  },

  // Health
  checkHealth: async () => {
    return request<{ status: string }>(`/health`);
  }
};
