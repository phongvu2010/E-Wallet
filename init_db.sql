-- Supabase Database Initialization Script for Personal Financial Management (Credit Card & Multi-Account)
-- File: init_db.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Accounts Table (Tài khoản thanh toán / Thẻ tín dụng / Ví tiền)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number VARCHAR(50) NOT NULL UNIQUE,
    bank_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(100) NOT NULL, -- e.g., 'Credit Card', 'Checking Account', 'E-Wallet', 'Cash'
    card_holder_name VARCHAR(100),
    initial_balance NUMERIC(15, 2) DEFAULT 0.00, -- Số dư ban đầu
    current_credit_limit NUMERIC(15, 2) DEFAULT 0.00, -- Hạn mức hiện tại (Dành cho thẻ tín dụng)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table (Danh mục thu chi phân cấp Cha - Con)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- Danh mục cha (NULL nếu là danh mục gốc)
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'transfer')), -- Loại thu/chi
    icon VARCHAR(50),
    color VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_category_per_parent UNIQUE NULLS NOT DISTINCT (parent_id, name)
);

-- 3. Statements Table (Kỳ sao kê - Thẻ tín dụng)
CREATE TABLE IF NOT EXISTS public.statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    statement_code INT, -- Mã ID kỳ sao kê gốc (ví dụ: 1, 2, 3 từ file Excel)
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    statement_date DATE NOT NULL,
    payment_due_date DATE NOT NULL,
    credit_limit NUMERIC(15, 2), -- Hạn mức tín dụng ghi nhận tại kỳ sao kê này
    reward NUMERIC(15, 2) DEFAULT 0.00,
    file_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Instalments Table (Chương trình trả góp)
CREATE TABLE IF NOT EXISTS public.instalments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    transaction_date DATE,
    total_amount NUMERIC(15, 2) NOT NULL,
    conversion_fee NUMERIC(15, 2) DEFAULT 0.00,
    term_months INT DEFAULT 12, -- Số tháng trả góp
    monthly_amount NUMERIC(15, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions Table (Chi tiết giao dịch thu chi / chuyển khoản / trả góp)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    statement_id UUID REFERENCES public.statements(id) ON DELETE SET NULL,
    instalment_id UUID REFERENCES public.instalments(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    post_date DATE,
    transaction_detail TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    fee NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance optimization
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON public.transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_instalment ON public.transactions(instalment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_statements_account ON public.statements(account_id);

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON public.statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instalments_updated_at BEFORE UPDATE ON public.instalments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for Supabase Security Best Practices
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instalments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Default RLS Policies (Allow access to authenticated users)
CREATE POLICY "Enable read/write for authenticated users on accounts" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on statements" ON public.statements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on instalments" ON public.instalments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on transactions" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
