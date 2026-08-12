-- Supabase Database Initialization Script for Personal Financial Management (Credit Card & Multi-Account)
-- File: init_db.sql

-- 1. Accounts Table (Tài khoản thanh toán / Thẻ tín dụng / Ví tiền)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    account_number VARCHAR(50), -- Cho phép NULL đối với Tiền mặt / Ví điện tử
    bank_name VARCHAR(100), -- Cho phép NULL
    account_name VARCHAR(100) NOT NULL, -- Tên gợi nhớ (Ví dụ: Ví Tiêu Dùng, Thẻ HSBC Visa, Cash)
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Checking Account', 'Credit Card', 'E-Wallet', 'Cash', 'Savings')),
    card_holder_name VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'VND',
    initial_balance NUMERIC(15, 2) DEFAULT 0.00, -- Số dư ban đầu
    current_balance NUMERIC(15, 2), -- Số dư thực tế hiện tại (Tự động lấy initial_balance nếu để NULL khi tạo)
    current_credit_limit NUMERIC(15, 2) DEFAULT 0.00, -- Hạn mức hiện tại (Dành cho thẻ tín dụng)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_account_user UNIQUE (id, user_id) -- Dùng cho Composite Foreign Key kiểm tra Cross-Tenant
);

-- 2. Categories Table (Danh mục thu chi phân cấp Cha - Con)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL nếu là danh mục mặc định của hệ thống
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- Danh mục cha (NULL nếu là danh mục gốc)
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'transfer', 'instalment')), -- Loại thu/chi/trả góp
    icon VARCHAR(50),
    color VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_category_per_parent UNIQUE NULLS NOT DISTINCT (user_id, parent_id, name) -- Lưu ý: Cú pháp NULLS NOT DISTINCT yêu cầu PostgreSQL >= 15 (Supabase mặc định hỗ trợ)
);

-- 3. Statements Table (Kỳ sao kê - Thẻ tín dụng)
CREATE TABLE IF NOT EXISTS public.statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    statement_code INT, -- Mã ID kỳ sao kê gốc (ví dụ: 1, 2, 3 từ file Excel)
    account_id UUID NOT NULL,
    statement_date DATE NOT NULL,
    payment_due_date DATE NOT NULL,
    credit_limit NUMERIC(15, 2), -- Hạn mức tín dụng ghi nhận tại kỳ sao kê này
    total_amount NUMERIC(15, 2) DEFAULT 0.00, -- Tổng dư nợ sao kê
    min_payment NUMERIC(15, 2) DEFAULT 0.00, -- Thanh toán tối thiểu
    reward NUMERIC(15, 2) DEFAULT 0.00,
    file_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_statement_per_account UNIQUE (account_id, statement_date),
    CONSTRAINT unique_statement_user UNIQUE (id, user_id),
    CONSTRAINT fk_statements_account FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE CASCADE,
    CONSTRAINT check_statement_dates CHECK (payment_due_date >= statement_date)
);

-- 4. Instalments Table (Chương trình trả góp)
CREATE TABLE IF NOT EXISTS public.instalments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL,
    transaction_date DATE,
    total_amount NUMERIC(15, 2) NOT NULL,
    conversion_fee NUMERIC(15, 2) DEFAULT 0.00,
    term_months INT DEFAULT 12, -- Số tháng trả góp
    monthly_amount NUMERIC(15, 2) GENERATED ALWAYS AS (ROUND(total_amount / GREATEST(term_months, 1), 2)) STORED, -- Tự động tính số tiền mỗi tháng
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_instalment_user UNIQUE (id, user_id),
    CONSTRAINT fk_instalments_account FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE CASCADE,
    CONSTRAINT check_instalment_amount CHECK (total_amount >= 0.00),
    CONSTRAINT check_conversion_fee CHECK (conversion_fee >= 0.00),
    CONSTRAINT check_term_months CHECK (term_months > 0)
);

-- 5. Transactions Table (Chi tiết giao dịch thu chi / chuyển khoản / trả góp)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    destination_account_id UUID, -- Dùng cho chuyển khoản
    statement_id UUID,
    instalment_id UUID,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'instalment')),
    transaction_date DATE NOT NULL,
    post_date DATE,
    transaction_detail TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    fee NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (amount + COALESCE(fee, 0.00)) STORED, -- Tự động tính tổng tiền (số tiền + phí)
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ràng buộc Bảo mật Cross-Tenant: Đảm bảo các tài khoản, sao kê, trả góp phải thuộc CÙNG một user_id
    CONSTRAINT fk_transactions_account FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_destination_account FOREIGN KEY (destination_account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_statement FOREIGN KEY (statement_id, user_id) REFERENCES public.statements(id, user_id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_instalment FOREIGN KEY (instalment_id, user_id) REFERENCES public.instalments(id, user_id) ON DELETE SET NULL,

    -- Ràng buộc Logic dữ liệu
    CONSTRAINT check_different_accounts CHECK (destination_account_id IS NULL OR destination_account_id <> account_id),
    CONSTRAINT check_transfer_destination CHECK (type <> 'transfer' OR destination_account_id IS NOT NULL),
    CONSTRAINT check_instalment_id CHECK (type <> 'instalment' OR instalment_id IS NOT NULL),
    CONSTRAINT check_transaction_amount CHECK (amount >= 0.00),
    CONSTRAINT check_transaction_fee CHECK (fee >= 0.00)
);

-- Indexing for performance optimization
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_system ON public.categories(name) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_statements_account ON public.statements(account_id);
CREATE INDEX IF NOT EXISTS idx_statements_user ON public.statements(user_id);
CREATE INDEX IF NOT EXISTS idx_instalments_user ON public.instalments(user_id);

-- Composite Indexes tối ưu truy vấn danh sách & báo cáo theo thời gian
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON public.transactions(user_id, type, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON public.transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_destination_account ON public.transactions(destination_account_id) WHERE destination_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON public.transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_instalment ON public.transactions(instalment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);

-- -----------------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- -----------------------------------------------------------------------------

-- Trigger Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely Apply updated_at Triggers
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_statements_updated_at ON public.statements;
CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON public.statements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instalments_updated_at ON public.instalments;
CREATE TRIGGER update_instalments_updated_at BEFORE UPDATE ON public.instalments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger Function: Tự động khởi tạo current_balance theo initial_balance khi tạo Tài khoản mới
CREATE OR REPLACE FUNCTION set_initial_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_balance IS NULL THEN
        NEW.current_balance := COALESCE(NEW.initial_balance, 0.00);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_initial_account_balance ON public.accounts;
CREATE TRIGGER trg_set_initial_account_balance
BEFORE INSERT ON public.accounts
FOR EACH ROW EXECUTE FUNCTION set_initial_account_balance();

-- Trigger Function: Tự động cập nhật current_balance khi người dùng sửa initial_balance
CREATE OR REPLACE FUNCTION update_account_balance_on_initial_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.initial_balance IS DISTINCT FROM OLD.initial_balance THEN
        NEW.current_balance := NEW.current_balance + (COALESCE(NEW.initial_balance, 0.00) - COALESCE(OLD.initial_balance, 0.00));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_account_balance_on_initial_change ON public.accounts;
CREATE TRIGGER trg_update_account_balance_on_initial_change
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_initial_change();

-- Trigger Function: Kiểm tra tính hợp lệ của Category (Chỉ cho phép chọn Category của mình hoặc Category hệ thống)
CREATE OR REPLACE FUNCTION validate_transaction_category()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.categories 
            WHERE id = NEW.category_id 
              AND (user_id IS NULL OR user_id = NEW.user_id)
        ) THEN
            RAISE EXCEPTION 'Category ID % does not belong to the user or system default categories.', NEW.category_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_transaction_category ON public.transactions;
CREATE TRIGGER trg_validate_transaction_category 
BEFORE INSERT OR UPDATE ON public.transactions 
FOR EACH ROW EXECUTE FUNCTION validate_transaction_category();

-- Trigger Function: Tự động cập nhật số dư thực tế (current_balance) trong bảng accounts khi có Giao dịch
-- Quy ước số dư:
-- - Tài khoản Tài sản (Checking/Cash/Wallet/Savings): income (+) tăng balance, expense (-) giảm balance.
-- - Tài khoản Thẻ tín dụng: Chi tiêu (expense) làm giảm current_balance (âm dần tương ứng với dư nợ), thanh toán thẻ (income) làm tăng current_balance về 0.
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. XỬ LÝ KHI XÓA (DELETE) HOẶC CẬP NHẬT (UPDATE): Hoàn trả lại hiệu ứng của giao dịch cũ (OLD)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF OLD.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.total_amount WHERE id = OLD.account_id;
        ELSIF OLD.type IN ('expense', 'instalment') THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.total_amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' AND OLD.destination_account_id IS NOT NULL THEN
            -- Khóa và cập nhật theo thứ tự ID nhất quán để phòng chống Deadlock khi có nhiều chuyển khoản đồng thời
            IF OLD.account_id < OLD.destination_account_id THEN
                UPDATE public.accounts SET current_balance = current_balance + OLD.total_amount WHERE id = OLD.account_id;
                UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.destination_account_id;
            ELSE
                UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.destination_account_id;
                UPDATE public.accounts SET current_balance = current_balance + OLD.total_amount WHERE id = OLD.account_id;
            END IF;
        END IF;
    END IF;

    -- 2. XỬ LÝ KHI THÊM MỚI (INSERT) HOẶC CẬP NHẬT (UPDATE): Áp dụng hiệu ứng của giao dịch mới (NEW)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.total_amount WHERE id = NEW.account_id;
        ELSIF NEW.type IN ('expense', 'instalment') THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.total_amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' AND NEW.destination_account_id IS NOT NULL THEN
            -- Khóa và cập nhật theo thứ tự ID nhất quán để phòng chống Deadlock
            IF NEW.account_id < NEW.destination_account_id THEN
                UPDATE public.accounts SET current_balance = current_balance - NEW.total_amount WHERE id = NEW.account_id;
                UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.destination_account_id;
            ELSE
                UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.destination_account_id;
                UPDATE public.accounts SET current_balance = current_balance - NEW.total_amount WHERE id = NEW.account_id;
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_account_balance ON public.transactions;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_transaction();

-- -----------------------------------------------------------------------------
-- HELPER UTILITY FUNCTIONS
-- -----------------------------------------------------------------------------

-- Stored Procedure: Tính toán & Đồng bộ lại số dư tài khoản từ lịch sử giao dịch (Dùng khi cần Sync lại Data)
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(
    p_account_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_initial NUMERIC(15, 2);
    v_income NUMERIC(15, 2);
    v_expense NUMERIC(15, 2);
    v_transfer_out NUMERIC(15, 2);
    v_transfer_in NUMERIC(15, 2);
    v_new_balance NUMERIC(15, 2);
BEGIN
    -- Lấy số dư ban đầu
    SELECT COALESCE(initial_balance, 0.00) INTO v_initial 
    FROM public.accounts 
    WHERE id = p_account_id AND (p_user_id IS NULL OR user_id = p_user_id);

    -- Tổng Thu nhập (+)
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_income 
    FROM public.transactions 
    WHERE account_id = p_account_id AND type = 'income' AND (p_user_id IS NULL OR user_id = p_user_id);

    -- Tổng Chi tiêu (-) (Bao gồm expense & instalment từng kỳ)
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_expense 
    FROM public.transactions 
    WHERE account_id = p_account_id AND type IN ('expense', 'instalment') AND (p_user_id IS NULL OR user_id = p_user_id);

    -- Tổng Chuyển đi (-) (Bao gồm cả phí)
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_transfer_out 
    FROM public.transactions 
    WHERE account_id = p_account_id AND type = 'transfer' AND (p_user_id IS NULL OR user_id = p_user_id);

    -- Tổng Nhận chuyển khoản (+) (Chỉ lấy số tiền nhận gốc amount)
    SELECT COALESCE(SUM(amount), 0.00) INTO v_transfer_in 
    FROM public.transactions 
    WHERE destination_account_id = p_account_id AND type = 'transfer' AND (p_user_id IS NULL OR user_id = p_user_id);

    -- Tính số dư thực tế mới
    v_new_balance := v_initial + v_income - v_expense - v_transfer_out + v_transfer_in;

    -- Cập nhật vào bảng accounts
    UPDATE public.accounts 
    SET current_balance = v_new_balance, updated_at = NOW() 
    WHERE id = p_account_id 
    AND (p_user_id IS NULL OR user_id = p_user_id);

    RETURN v_new_balance;
END;
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable Row Level Security (RLS) for Supabase Security Best Practices
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instalments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 1. Accounts Policies
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
CREATE POLICY "Users can manage their own accounts" 
ON public.accounts FOR ALL TO authenticated 
USING ((SELECT auth.uid()) = user_id) 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2. Categories Policies (Cho phép xem danh mục hệ thống + quản lý danh mục riêng)
DROP POLICY IF EXISTS "Users can view system and own categories" ON public.categories;
CREATE POLICY "Users can view system and own categories" 
ON public.categories FOR SELECT TO authenticated 
USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
CREATE POLICY "Users can insert their own categories" 
ON public.categories FOR INSERT TO authenticated 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories" 
ON public.categories FOR UPDATE TO authenticated 
USING ((SELECT auth.uid()) = user_id) 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;
CREATE POLICY "Users can delete their own categories" 
ON public.categories FOR DELETE TO authenticated 
USING ((SELECT auth.uid()) = user_id);

-- 3. Statements Policies
DROP POLICY IF EXISTS "Users can manage their own statements" ON public.statements;
CREATE POLICY "Users can manage their own statements" 
ON public.statements FOR ALL TO authenticated 
USING ((SELECT auth.uid()) = user_id) 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Instalments Policies
DROP POLICY IF EXISTS "Users can manage their own instalments" ON public.instalments;
CREATE POLICY "Users can manage their own instalments" 
ON public.instalments FOR ALL TO authenticated 
USING ((SELECT auth.uid()) = user_id) 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 5. Transactions Policies
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL TO authenticated 
USING ((SELECT auth.uid()) = user_id) 
WITH CHECK ((SELECT auth.uid()) = user_id);
