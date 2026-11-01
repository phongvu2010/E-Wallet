from decimal import Decimal
from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.analytics import (
    CreditUtilizationRead,
    DailySpendingComparisonItem,
    DailySpendingComparisonRead,
    DashboardOverviewRead,
    MonthlyCashFlowRead,
    MonthlyCategorySpendingRead,
    NetWorthOverviewRead,
    UpcomingObligationRead,
)


class AnalyticsService:
    """Financial Analytics & Wealth Management Service layer.

    Aggregates data from dedicated PostgreSQL analytical views:
    - `v_net_worth_overview`: Total liquid assets, credit debt, and net worth.
    - `v_monthly_cash_flow`: Monthly income, expense, and savings rate.
    - `v_monthly_category_spending`: Net monthly category spending trend.
    - `v_credit_utilization`: Credit limit utilization percentage and risk tier.
    - `v_upcoming_payment_obligations`: Consolidated statement and installment due dates.
    - Dashboard high-level KPIs and risk health scores.
    """

    @staticmethod
    async def get_net_worth_overview(db: AsyncSession) -> NetWorthOverviewRead:
        """Fetch consolidated Net Worth and wealth allocation metrics from `v_net_worth_overview`."""
        sql = "SELECT * FROM v_net_worth_overview;"
        result = await db.execute(text(sql))
        row = result.mappings().one_or_none()
        if not row:
            return NetWorthOverviewRead(
                total_liquid_assets=Decimal("0.00"),
                total_bank_assets=Decimal("0.00"),
                total_cash_assets=Decimal("0.00"),
                total_ewallet_assets=Decimal("0.00"),
                total_savings_assets=Decimal("0.00"),
                total_credit_debt=Decimal("0.00"),
                total_credit_limit=Decimal("0.00"),
                total_available_credit=Decimal("0.00"),
                net_worth=Decimal("0.00"),
                active_asset_accounts_count=0,
                active_credit_cards_count=0,
            )
        return NetWorthOverviewRead(**dict(row))

    @staticmethod
    async def get_monthly_cash_flow(
        db: AsyncSession,
        limit: int = 12,
    ) -> List[MonthlyCashFlowRead]:
        """Fetch monthly cash flow (Income vs Expense vs Savings) from `v_monthly_cash_flow`."""
        sql = "SELECT * FROM v_monthly_cash_flow LIMIT :limit;"
        result = await db.execute(text(sql), {"limit": limit})
        rows = result.mappings().all()
        return [MonthlyCashFlowRead(**dict(row)) for row in rows]

    @staticmethod
    async def get_monthly_spending(
        db: AsyncSession,
        limit: int = 200,
    ) -> List[MonthlyCategorySpendingRead]:
        """Query historical monthly spending aggregated by transaction category."""
        sql = """
        SELECT * FROM v_monthly_category_spending
        ORDER BY month DESC, total_spending DESC
        LIMIT :limit;
        """
        result = await db.execute(text(sql), {"limit": limit})
        rows = result.mappings().all()
        return [MonthlyCategorySpendingRead(**dict(row)) for row in rows]

    @staticmethod
    async def get_credit_utilization(db: AsyncSession) -> List[CreditUtilizationRead]:
        """Fetch credit utilization matrix across all cards with risk level assessment."""
        sql = "SELECT * FROM v_credit_utilization ORDER BY utilization_percentage DESC;"
        result = await db.execute(text(sql))
        rows = result.mappings().all()
        return [CreditUtilizationRead(**dict(row)) for row in rows]

    @staticmethod
    async def get_upcoming_obligations(
        db: AsyncSession,
        days_ahead: int = 30,
    ) -> List[UpcomingObligationRead]:
        """Retrieve payment deadlines due within the specified horizon."""
        sql = """
        SELECT * FROM v_upcoming_payment_obligations
        WHERE days_remaining <= :days_ahead
        ORDER BY due_date ASC;
        """
        result = await db.execute(text(sql), {"days_ahead": days_ahead})
        rows = result.mappings().all()
        return [UpcomingObligationRead(**dict(row)) for row in rows]

    @staticmethod
    async def get_dashboard_overview(db: AsyncSession) -> DashboardOverviewRead:
        """Compute consolidated financial KPIs for dashboard hero cards."""
        # 1. Net worth and liquid assets
        nw = await AnalyticsService.get_net_worth_overview(db)

        # 2. Credit limit and utilization
        total_limit = nw.total_credit_limit
        total_balance = nw.total_credit_debt
        total_available = nw.total_available_credit
        cards_count = nw.active_credit_cards_count

        overall_utilization = Decimal("0.00")
        if total_limit > 0:
            overall_utilization = round(
                (total_balance / total_limit) * Decimal("100.0"), 2
            )

        if total_limit == 0:
            risk_lvl = "NO_LIMIT"
        elif overall_utilization > 70:
            risk_lvl = "CRITICAL (>70%)"
        elif overall_utilization > 50:
            risk_lvl = "HIGH (>50%)"
        elif overall_utilization > 30:
            risk_lvl = "MODERATE (>30%)"
        else:
            risk_lvl = "OPTIMAL (<30%)"

        # 3. Upcoming obligations (30 days)
        sql_upcoming = """
        SELECT
            COUNT(*) AS total_count,
            COALESCE(SUM(total_amount_due), 0) AS total_due
        FROM v_upcoming_payment_obligations
        WHERE days_remaining <= 30;
        """
        res_upcoming = await db.execute(text(sql_upcoming))
        row_upcoming = res_upcoming.mappings().one()

        # 4. Monthly spending & income in current month (accounting for salary: 26 to end of month allocated to next month)
        sql_spending = """
        WITH normalized_tx AS (
            SELECT
                t.transaction_type,
                t.amount,
                t.total_amount,
                t.transaction_date,
                CASE
                    -- Chỉ áp dụng riêng cho Tiền lương (loại trừ Tiền thưởng, Hoa hồng, Làm nhiệm vụ, Freelance...)
                    WHEN t.transaction_type = 'INCOME' 
                         AND EXTRACT(DAY FROM t.transaction_date) >= 26
                         -- Loại trừ rõ ràng Thưởng, Hoa hồng, Nhiệm vụ, Freelance
                         AND LOWER(COALESCE(c.name, '')) NOT LIKE '%thưởng%'
                         AND LOWER(COALESCE(c.name, '')) NOT LIKE '%hoa hồng%'
                         AND LOWER(COALESCE(c.name, '')) NOT LIKE '%bonus%'
                         AND LOWER(COALESCE(c.name, '')) NOT LIKE '%freelance%'
                         AND (t.category_id IS NULL OR t.category_id != 'aaaaaaaa-3e4a-4be6-9333-18ebaf270002') -- Không phải 'Tiền thưởng & Hoa hồng'
                         AND (t.category_id IS NULL OR t.category_id != 'aaaaaaaa-3e4a-4be6-9333-18ebaf270003') -- Không phải 'Thu nhập Freelance'
                         AND (
                             -- Khớp chính xác danh mục Tiền lương hàng tháng
                             t.category_id = 'aaaaaaaa-3e4a-4be6-9333-18ebaf270001'
                             -- Hoặc danh mục con trực tiếp chứa 'lương' / 'salary' (và không phải nhóm cha 'Lương & Thu nhập')
                             OR (
                                 (LOWER(COALESCE(c.name, '')) LIKE '%lương%' OR LOWER(COALESCE(c.name, '')) LIKE '%salary%')
                                 AND LOWER(COALESCE(c.name, '')) != 'lương & thu nhập'
                             )
                             -- Hoặc giao dịch chưa gắn danh mục nhưng nội dung mô tả là nhận lương
                             OR (
                                 t.category_id IS NULL AND (
                                     LOWER(COALESCE(t.raw_description, '')) LIKE '%lương%'
                                     OR LOWER(COALESCE(t.raw_description, '')) LIKE '%salary%'
                                     OR LOWER(COALESCE(t.raw_description, '')) LIKE '%luong%'
                                     OR LOWER(COALESCE(t.note, '')) LIKE '%lương%'
                                     OR LOWER(COALESCE(t.note, '')) LIKE '%salary%'
                                     OR LOWER(COALESCE(t.note, '')) LIKE '%luong%'
                                 )
                                 AND LOWER(COALESCE(t.raw_description, '')) NOT LIKE '%thưởng%'
                                 AND LOWER(COALESCE(t.note, '')) NOT LIKE '%thưởng%'
                                 AND LOWER(COALESCE(t.raw_description, '')) NOT LIKE '%nhiệm vụ%'
                                 AND LOWER(COALESCE(t.note, '')) NOT LIKE '%nhiệm vụ%'
                             )
                         )
                        THEN (DATE_TRUNC('month', t.transaction_date) + INTERVAL '1 month')::DATE
                    ELSE DATE_TRUNC('month', t.transaction_date)::DATE
                END AS budget_month
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories pc ON c.parent_id = pc.id
        )
        SELECT
            COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' AND budget_month = DATE_TRUNC('month', CURRENT_DATE)::DATE THEN amount ELSE 0 END), 0) AS current_month_income,
            COALESCE(SUM(CASE WHEN transaction_type IN ('PURCHASE', 'INSTALLMENT_MONTHLY', 'FEE', 'INTEREST', 'CASH_ADVANCE') AND budget_month = DATE_TRUNC('month', CURRENT_DATE)::DATE THEN total_amount ELSE 0 END), 0) AS current_month_spending
        FROM normalized_tx;
        """
        res_spending = await db.execute(text(sql_spending))
        row_spending = res_spending.mappings().one()

        return DashboardOverviewRead(
            total_liquid_assets=nw.total_liquid_assets,
            total_bank_assets=nw.total_bank_assets,
            total_cash_assets=nw.total_cash_assets,
            total_ewallet_assets=nw.total_ewallet_assets,
            total_credit_limit=total_limit,
            total_live_balance=total_balance,
            total_available_limit=total_available,
            net_worth=nw.net_worth,
            overall_utilization_percentage=overall_utilization,
            overall_risk_level=risk_lvl,
            active_cards_count=cards_count,
            active_asset_accounts_count=nw.active_asset_accounts_count,
            upcoming_obligations_count=int(row_upcoming["total_count"]),
            total_upcoming_due_30d=Decimal(str(row_upcoming["total_due"])),
            monthly_spending_current_month=Decimal(
                str(row_spending["current_month_spending"])
            ),
            monthly_income_current_month=Decimal(
                str(row_spending["current_month_income"])
            ),
        )

    @staticmethod
    async def get_daily_spending_comparison(
        db: AsyncSession,
        current_month: Optional[str] = None,
        previous_month: Optional[str] = None,
    ) -> DailySpendingComparisonRead:
        """Retrieve cumulative and daily spending timeline comparing this month vs last month (Days 1 to 31)."""
        import calendar
        from datetime import date

        # 1. Resolve current_month if not specified
        if not current_month:
            sql_latest = """
            SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS m
            FROM transactions
            WHERE transaction_type IN (
                'PURCHASE', 'INSTALLMENT_MONTHLY', 'INSTALLMENT_PRINCIPAL',
                'FEE', 'INTEREST', 'CASH_ADVANCE', 'REFUND', 'ADJUSTMENT'
            )
            ORDER BY transaction_date DESC
            LIMIT 1;
            """
            res_latest = await db.execute(text(sql_latest))
            row_latest = res_latest.mappings().one_or_none()
            if row_latest and row_latest["m"]:
                current_month = str(row_latest["m"])
            else:
                current_month = date.today().strftime("%Y-%m")

        # 2. Resolve previous_month if not specified
        if not previous_month:
            curr_y, curr_m = [int(x) for x in current_month.split("-")]
            if curr_m == 1:
                previous_month = f"{curr_y - 1}-12"
            else:
                previous_month = f"{curr_y}-{curr_m - 1:02d}"

        curr_y, curr_m = [int(x) for x in current_month.split("-")]
        prev_y, prev_m = [int(x) for x in previous_month.split("-")]

        days_in_curr = calendar.monthrange(curr_y, curr_m)[1]
        days_in_prev = calendar.monthrange(prev_y, prev_m)[1]
        max_days = max(days_in_curr, days_in_prev)

        today = date.today()
        is_curr_calendar = (curr_y == today.year and curr_m == today.month)
        as_of_day = min(today.day, days_in_curr) if is_curr_calendar else days_in_curr

        # 3. Query daily spending aggregated by day of month (1 to 31)
        sql_daily = """
        WITH date_series AS (
            SELECT generate_series(1, :max_days) AS day_num
        ),
        tx_filtered AS (
            SELECT
                EXTRACT(DAY FROM t.transaction_date)::INT AS day_num,
                TO_CHAR(t.transaction_date, 'YYYY-MM') AS month_str,
                t.total_amount
            FROM transactions t
            WHERE t.transaction_type IN (
                'PURCHASE', 'INSTALLMENT_MONTHLY', 'INSTALLMENT_PRINCIPAL',
                'FEE', 'INTEREST', 'CASH_ADVANCE', 'REFUND', 'ADJUSTMENT'
            )
            AND (
                TO_CHAR(t.transaction_date, 'YYYY-MM') = :month1
                OR TO_CHAR(t.transaction_date, 'YYYY-MM') = :month2
            )
        ),
        daily_agg AS (
            SELECT
                day_num,
                month_str,
                COALESCE(SUM(total_amount), 0) AS daily_spending,
                COUNT(*) AS tx_count
            FROM tx_filtered
            GROUP BY day_num, month_str
        )
        SELECT
            ds.day_num AS day,
            COALESCE(curr.daily_spending, 0) AS daily_current,
            COALESCE(curr.tx_count, 0) AS count_current,
            COALESCE(prev.daily_spending, 0) AS daily_previous,
            COALESCE(prev.tx_count, 0) AS count_previous
        FROM date_series ds
        LEFT JOIN daily_agg curr ON ds.day_num = curr.day_num AND curr.month_str = :month1
        LEFT JOIN daily_agg prev ON ds.day_num = prev.day_num AND prev.month_str = :month2
        ORDER BY ds.day_num ASC;
        """
        res_daily = await db.execute(
            text(sql_daily),
            {
                "max_days": max_days,
                "month1": current_month,
                "month2": previous_month,
            },
        )
        rows = res_daily.mappings().all()

        cum_curr = Decimal("0.00")
        cum_prev = Decimal("0.00")
        prev_same_day = Decimal("0.00")

        items: List[DailySpendingComparisonItem] = []
        for r in rows:
            day_num = int(r["day"])
            d_curr = Decimal(str(r["daily_current"]))
            d_prev = Decimal(str(r["daily_previous"]))
            c_curr = int(r["count_current"])
            c_prev = int(r["count_previous"])

            cum_prev += d_prev
            if day_num <= as_of_day:
                cum_curr += d_curr
                prev_same_day += d_prev
                cum_curr_val = cum_curr
            else:
                if is_curr_calendar:
                    cum_curr_val = None
                else:
                    cum_curr += d_curr
                    cum_curr_val = cum_curr

            items.append(
                DailySpendingComparisonItem(
                    day=day_num,
                    daily_current=d_curr,
                    daily_previous=d_prev,
                    cumulative_current=cum_curr_val,
                    cumulative_previous=cum_prev,
                    tx_count_current=c_curr,
                    tx_count_previous=c_prev,
                )
            )

        total_spending_current = cum_curr
        total_spending_previous = cum_prev
        diff_amount_same_day = total_spending_current - prev_same_day
        diff_percent_same_day = (
            round((diff_amount_same_day / prev_same_day) * Decimal("100.0"), 1)
            if prev_same_day > 0
            else Decimal("0.0")
        )

        return DailySpendingComparisonRead(
            current_month=current_month,
            previous_month=previous_month,
            days_in_current_month=days_in_curr,
            days_in_previous_month=days_in_prev,
            as_of_day=as_of_day,
            is_current_calendar_month=is_curr_calendar,
            total_spending_current=total_spending_current,
            total_spending_previous=total_spending_previous,
            total_spending_previous_same_day=prev_same_day,
            diff_amount_same_day=diff_amount_same_day,
            diff_percent_same_day=diff_percent_same_day,
            items=items,
        )
