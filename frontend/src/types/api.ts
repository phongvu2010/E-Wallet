export type AccountType = 'Checking Account' | 'Credit Card' | 'E-Wallet' | 'Cash' | 'Savings';

export type CategoryType = 'expense' | 'income' | 'transfer' | 'instalment';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'instalment';

export type InstalmentStatus = 'active' | 'completed' | 'cancelled';

export interface AccountResponse {
  id: string;
  user_id: string;
  account_name: string;
  account_type: AccountType;
  bank_name?: string | null;
  account_number?: string | null;
  card_holder_name?: string | null;
  currency: string;
  initial_balance: string;
  current_balance: string | null;
  current_credit_limit: string;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  account_name: string;
  account_type: AccountType;
  bank_name?: string | null;
  account_number?: string | null;
  card_holder_name?: string | null;
  currency?: string;
  initial_balance?: number | string;
  current_credit_limit?: number | string;
}

export interface AccountUpdate {
  account_name?: string | null;
  account_type?: AccountType | null;
  bank_name?: string | null;
  account_number?: string | null;
  card_holder_name?: string | null;
  currency?: string | null;
  initial_balance?: number | string | null;
  current_credit_limit?: number | string | null;
}

export interface CategoryResponse {
  id: string;
  user_id: string | null;
  name: string;
  parent_id?: string | null;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryTreeResponse extends CategoryResponse {
  children: CategoryTreeResponse[];
}

export interface CategoryCreate {
  name: string;
  parent_id?: string | null;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface CategoryUpdate {
  name?: string | null;
  parent_id?: string | null;
  type?: CategoryType | null;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface TransactionResponse {
  id: string;
  user_id: string;
  account_id: string;
  destination_account_id?: string | null;
  statement_id?: string | null;
  instalment_id?: string | null;
  category_id?: string | null;
  type: TransactionType;
  transaction_date: string;
  post_date?: string | null;
  transaction_detail: string;
  amount: string;
  fee: string;
  total_amount?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  account_id: string;
  destination_account_id?: string | null;
  statement_id?: string | null;
  instalment_id?: string | null;
  category_id?: string | null;
  type: TransactionType;
  transaction_date: string;
  post_date?: string | null;
  transaction_detail: string;
  amount: number | string;
  fee?: number | string;
  description?: string | null;
}

export interface TransactionUpdate {
  account_id?: string | null;
  destination_account_id?: string | null;
  statement_id?: string | null;
  instalment_id?: string | null;
  category_id?: string | null;
  type?: TransactionType | null;
  transaction_date?: string | null;
  post_date?: string | null;
  transaction_detail?: string | null;
  amount?: number | string | null;
  fee?: number | string | null;
  description?: string | null;
}

export interface InstalmentResponse {
  id: string;
  user_id: string;
  account_id: string;
  product_name: string;
  transaction_date?: string | null;
  total_amount: string;
  conversion_fee: string;
  term_months: number;
  monthly_amount: string | null;
  status: InstalmentStatus;
  created_at: string;
  updated_at: string;
}

export interface InstalmentCreate {
  account_id: string;
  product_name: string;
  transaction_date?: string | null;
  total_amount: number | string;
  conversion_fee?: number | string;
  term_months?: number;
  status?: InstalmentStatus;
}

export interface InstalmentUpdate {
  account_id?: string | null;
  product_name?: string | null;
  transaction_date?: string | null;
  total_amount?: number | string | null;
  conversion_fee?: number | string | null;
  term_months?: number | null;
  status?: InstalmentStatus | null;
}

export interface StatementResponse {
  id: string;
  user_id: string;
  account_id: string;
  statement_code?: number | null;
  statement_date: string;
  payment_due_date: string;
  credit_limit?: string | null;
  total_amount: string;
  min_payment: string;
  reward: string;
  file_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatementCreate {
  account_id: string;
  statement_code?: number | null;
  statement_date: string;
  payment_due_date: string;
  credit_limit?: number | string | null;
  total_amount?: number | string;
  min_payment?: number | string;
  reward?: number | string;
  file_name?: string | null;
}

export interface StatementUpdate {
  account_id?: string | null;
  statement_code?: number | null;
  statement_date?: string | null;
  payment_due_date?: string | null;
  credit_limit?: number | string | null;
  total_amount?: number | string | null;
  min_payment?: number | string | null;
  reward?: number | string | null;
  file_name?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TransactionFilters {
  skip?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  account_id?: string;
  category_id?: string;
  type?: TransactionType;
}
