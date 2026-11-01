import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.transaction import atomic_transaction
from app.models.account import Account
from app.models.card_benefit import CardBenefit
from app.models.reward import RewardTypeEnum
from app.schemas.card_recommendation import (
    CardBenefitCreate,
    CardBenefitRead,
    CardRecommendationItem,
    CardRecommendationRequest,
    CardRecommendationResponse,
    RecommendationStrategyEnum,
)


def calculate_card_grace_metrics(
    billing_day: Optional[int],
    grace_period_days: Optional[int],
    tx_date: date,
    due_day_of_month: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate billing dates, estimated due date, interest-free float days, and optimal spend date.

    Supports both fixed due day model (e.g. Day 4 for ZaloPay, Day 5 for Sacombank, Day 12 for HSBC)
    and relative elapsed days model (billing + grace days).
    """
    grace_days = (
        int(grace_period_days)
        if grace_period_days and grace_period_days > 0
        else 15
    )

    if not billing_day or billing_day < 1 or billing_day > 31:
        est_due = tx_date + timedelta(days=grace_days)
        return {
            "billing_day_of_month": None,
            "due_day_of_month": None,
            "grace_period_days": grace_days,
            "next_billing_date": None,
            "estimated_due_date": est_due,
            "interest_free_days": grace_days,
            "max_possible_grace_days": 30 + grace_days,
            "best_spend_date": None,
            "days_until_best_spend_date": None,
            "grace_period_rating": "FAIR",
            "is_golden_period": False,
            "payment_delay_tip": f"Thẻ chưa cấu hình ngày sao kê. Thời gian ân hạn ước tính: {grace_days} ngày.",
        }

    def _safe_date(year: int, month: int, day: int) -> date:
        _, max_day = calendar.monthrange(year, month)
        return date(year, month, min(day, max_day))

    # Current month's nominal billing date
    curr_month_billing = _safe_date(tx_date.year, tx_date.month, billing_day)

    if tx_date <= curr_month_billing:
        # Transaction occurs before or on this month's billing date -> billed this month
        next_billing = curr_month_billing
        prev_year, prev_month = (
            (tx_date.year - 1, 12)
            if tx_date.month == 1
            else (tx_date.year, tx_date.month - 1)
        )
        prev_billing = _safe_date(prev_year, prev_month, billing_day)
    else:
        # Transaction occurs after this month's billing date -> rolls over to next month's statement!
        next_year, next_month = (
            (tx_date.year + 1, 1)
            if tx_date.month == 12
            else (tx_date.year, tx_date.month + 1)
        )
        next_billing = _safe_date(next_year, next_month, billing_day)
        prev_billing = curr_month_billing

    # Determine estimated payment due date:
    # 1. Prefer fixed due day of the month (e.g. Day 4 for ZaloPay/MoMo, Day 5 for Sacombank, Day 12 for HSBC)
    if due_day_of_month and 1 <= due_day_of_month <= 31:
        due_year, due_month = (
            (next_billing.year + 1, 1)
            if next_billing.month == 12
            else (next_billing.year, next_billing.month + 1)
        )
        estimated_due = _safe_date(due_year, due_month, due_day_of_month)
        grace_days = (estimated_due - next_billing).days
    else:
        estimated_due = next_billing + timedelta(days=grace_days)

    interest_free_days = max(1, (estimated_due - tx_date).days)

    # Theoretical maximum interest-free days achievable on this card
    cycle_start = prev_billing + timedelta(days=1)
    max_grace_days = max(
        30, (next_billing + timedelta(days=grace_days) - cycle_start).days
    )

    # Golden spend window: within 4 days after billing date cut-off
    days_since_prev_billing = (tx_date - prev_billing).days
    is_golden_period = 1 <= days_since_prev_billing <= 4

    if tx_date <= curr_month_billing:
        best_spend_date = curr_month_billing + timedelta(days=1)
        days_until_best = (best_spend_date - tx_date).days
    else:
        if is_golden_period:
            best_spend_date = tx_date
            days_until_best = 0
        else:
            best_spend_date = next_billing + timedelta(days=1)
            days_until_best = (best_spend_date - tx_date).days

    # Rate grace period duration
    if interest_free_days >= 45:
        rating = "OPTIMAL"
    elif interest_free_days >= 35:
        rating = "GOOD"
    elif interest_free_days >= 25:
        rating = "FAIR"
    else:
        rating = "SHORT"

    # Contextual smart tip for cash flow delay
    if is_golden_period:
        tip = (
            f"🌟 Đang trong THỜI ĐIỂM VÀNG! Thẻ vừa chốt sao kê ngày {prev_billing.strftime('%d/%m')}. "
            f"Quẹt hôm nay bạn tận dụng tối đa {interest_free_days} ngày miễn lãi ngân hàng (hạn trả: {estimated_due.strftime('%d/%m/%Y')})."
        )
    elif days_until_best and 1 <= days_until_best <= 4:
        next_cycle_month = next_billing.month + 1 if next_billing.month < 12 else 1
        next_cycle_year = (
            next_billing.year if next_billing.month < 12 else next_billing.year + 1
        )
        if due_day_of_month and 1 <= due_day_of_month <= 31:
            nc_due_m = next_cycle_month + 1 if next_cycle_month < 12 else 1
            nc_due_y = next_cycle_year if next_cycle_month < 12 else next_cycle_year + 1
            next_cycle_est_due = _safe_date(nc_due_y, nc_due_m, due_day_of_month)
        else:
            next_cycle_est_due = _safe_date(
                next_cycle_year, next_cycle_month, billing_day
            ) + timedelta(days=grace_days)
        next_cycle_days = (next_cycle_est_due - best_spend_date).days

        tip = (
            f"⚡ Thẻ sắp chốt sao kê vào {curr_month_billing.strftime('%d/%m')}! "
            f"Nếu bạn lùi quẹt thẻ sang ngày {best_spend_date.strftime('%d/%m')} ({days_until_best} ngày nữa), "
            f"thời gian miễn lãi sẽ tăng vọt từ {interest_free_days} ngày lên ~{next_cycle_days} ngày "
            f"(đến hạn: {next_cycle_est_due.strftime('%d/%m/%Y')})."
        )
    else:
        tip = (
            f"Giao dịch vào {tx_date.strftime('%d/%m')} được miễn lãi {interest_free_days} ngày "
            f"(chốt sao kê: {next_billing.strftime('%d/%m')}, hạn thanh toán: {estimated_due.strftime('%d/%m/%Y')})."
        )

    return {
        "billing_day_of_month": billing_day,
        "due_day_of_month": due_day_of_month,
        "grace_period_days": grace_days,
        "next_billing_date": next_billing,
        "estimated_due_date": estimated_due,
        "interest_free_days": interest_free_days,
        "max_possible_grace_days": max_grace_days,
        "best_spend_date": best_spend_date,
        "days_until_best_spend_date": days_until_best,
        "grace_period_rating": rating,
        "is_golden_period": is_golden_period,
        "payment_delay_tip": tip,
    }


class CardRecommendationService:
    """Intelligent Card Recommendation Engine.

    Evaluates live card balances, reward structures, merchant/category mappings,
    and credit risk impact to recommend the optimal credit card for any upcoming purchase.
    """

    @staticmethod
    def _serialize_benefit(b: CardBenefit) -> CardBenefitRead:
        """Safely serialize CardBenefit ORM instance with loaded relationships."""
        acc_name = b.account.account_name if b.account else None
        bank_name = (
            b.account.institution.name
            if b.account and getattr(b.account, "institution", None)
            else None
        )
        cat_name = b.category.name if b.category else None

        return CardBenefitRead(
            id=b.id,
            account_id=b.account_id,
            account_name=acc_name,
            bank_name=bank_name,
            category_id=b.category_id,
            category_name=cat_name,
            category_keyword=b.category_keyword,
            merchant_pattern=b.merchant_pattern,
            reward_type=b.reward_type,
            reward_rate_percent=b.reward_rate_percent,
            point_multiplier=b.point_multiplier,
            min_spend_per_txn=b.min_spend_per_txn,
            max_reward_monthly=b.max_reward_monthly,
            description=b.description,
            is_active=b.is_active,
        )

    @staticmethod
    async def get_benefit_by_id(db: AsyncSession, benefit_id: UUID) -> CardBenefit:
        """Fetch a single card benefit by UUID with eager loaded account and category."""
        query = (
            select(CardBenefit)
            .options(
                selectinload(CardBenefit.account).selectinload(Account.institution),
                selectinload(CardBenefit.category),
            )
            .where(CardBenefit.id == benefit_id)
        )
        result = await db.execute(query)
        benefit = result.scalar_one_or_none()
        if not benefit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quy tắc ưu đãi thẻ với ID {benefit_id} không tồn tại",
            )
        return benefit

    @staticmethod
    async def get_all_benefits(
        db: AsyncSession, account_id: Optional[UUID] = None
    ) -> List[CardBenefitRead]:
        """Fetch all card benefit policies with relational metadata."""
        query = select(CardBenefit).options(
            selectinload(CardBenefit.account).selectinload(Account.institution),
            selectinload(CardBenefit.category),
        )
        if account_id:
            query = query.where(CardBenefit.account_id == account_id)
        query = query.order_by(
            CardBenefit.reward_rate_percent.desc(), CardBenefit.created_at.desc()
        )
        result = await db.execute(query)
        benefits = result.scalars().all()

        return [CardRecommendationService._serialize_benefit(b) for b in benefits]

    @staticmethod
    async def create_benefit(
        db: AsyncSession, payload: CardBenefitCreate
    ) -> CardBenefitRead:
        """Register a new card benefit rule and return serialized model with loaded relationships."""
        benefit = CardBenefit(**payload.model_dump())
        async with atomic_transaction(db, error_prefix="Lỗi tạo quyền lợi thẻ"):
            db.add(benefit)
            await db.flush()

        full_benefit = await CardRecommendationService.get_benefit_by_id(db, benefit.id)
        return CardRecommendationService._serialize_benefit(full_benefit)

    @staticmethod
    async def recommend_best_card(
        db: AsyncSession,
        payload: CardRecommendationRequest,
    ) -> CardRecommendationResponse:
        """Evaluate all active cards and recommend the highest reward & optimal grace period card."""
        amount = payload.amount
        cat_id = payload.category_id
        cat_name_input = payload.category_name or ""
        merch_input = payload.merchant_name or ""
        tx_date = payload.transaction_date or date.today()
        strategy = payload.strategy or RecommendationStrategyEnum.BALANCED

        # 1. Fetch live card balances with billing day & grace period
        # Auto-infer from latest statement if not explicitly set in accounts table
        sql_live = """
        SELECT
            a.id AS account_id,
            a.account_name,
            i.name AS bank_name,
            a.card_number_masked,
            a.color_hex,
            a.status,
            a.credit_limit,
            COALESCE(
                a.billing_day_of_month,
                latest_stmt.stmt_billing_day
            ) AS billing_day_of_month,
            latest_stmt.stmt_due_day AS due_day_of_month,
            COALESCE(
                latest_stmt.stmt_grace_days,
                a.grace_period_days,
                15
            ) AS grace_period_days,
            COALESCE(lb.live_current_balance, 0.00) AS live_current_balance,
            COALESCE(lb.live_available_limit, a.credit_limit) AS live_available_limit,
            COALESCE(lb.live_utilization_percentage, 0.00) AS live_utilization_percentage
        FROM accounts a
        JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN v_account_live_balance lb ON a.id = lb.account_id
        LEFT JOIN LATERAL (
            SELECT 
                EXTRACT(DAY FROM s.statement_date)::INTEGER AS stmt_billing_day,
                EXTRACT(DAY FROM s.payment_due_date)::INTEGER AS stmt_due_day,
                GREATEST(1, (s.payment_due_date - s.statement_date))::INTEGER AS stmt_grace_days
            FROM statements s
            WHERE s.account_id = a.id
            ORDER BY s.statement_date DESC
            LIMIT 1
        ) latest_stmt ON true
        WHERE a.status = 'ACTIVE'
        ORDER BY a.credit_limit DESC;
        """
        res_live = await db.execute(text(sql_live))
        active_cards = res_live.mappings().all()

        # 2. Fetch all active benefits
        benefit_stmt = select(CardBenefit).where(CardBenefit.is_active == True)  # noqa: E712
        res_ben = await db.execute(benefit_stmt)
        all_benefits = res_ben.scalars().all()

        # 3. Resolve category name if ID provided
        detected_category_label = cat_name_input or "Chi tiêu thông thường"
        if cat_id:
            sql_cat = "SELECT name FROM categories WHERE id = :cid;"
            cat_res = await db.execute(text(sql_cat), {"cid": str(cat_id)})
            c_name = cat_res.scalar_one_or_none()
            if c_name:
                detected_category_label = c_name

        evaluated_items: List[CardRecommendationItem] = []

        for card in active_cards:
            acc_id = card["account_id"]
            acc_name = card["account_name"]
            bank_name = card["bank_name"]
            card_masked = card["card_number_masked"]
            color_hex = card["color_hex"] or "#3b82f6"
            limit = Decimal(str(card["credit_limit"]))
            avail_limit = Decimal(str(card["live_available_limit"]))
            curr_balance = Decimal(str(card["live_current_balance"]))
            curr_util_pct = Decimal(str(card["live_utilization_percentage"]))

            # Calculate Grace Period & Payment Float Metrics
            b_day = card["billing_day_of_month"]
            d_day = card["due_day_of_month"]
            g_days = card["grace_period_days"]
            grace_metrics = calculate_card_grace_metrics(
                b_day, g_days, tx_date, due_day_of_month=d_day
            )

            # Match benefits for this card
            card_bens = [b for b in all_benefits if b.account_id == acc_id]

            # Priority 1: Match by Merchant Pattern
            matched_benefit: Optional[CardBenefit] = None
            if merch_input:
                for b in card_bens:
                    if b.merchant_pattern:
                        pat = b.merchant_pattern.replace("%", "").lower()
                        if pat in merch_input.lower():
                            matched_benefit = b
                            break

            # Priority 2: Match by Category ID or Keyword
            if not matched_benefit and (cat_id or cat_name_input):
                for b in card_bens:
                    if cat_id and b.category_id == cat_id:
                        matched_benefit = b
                        break
                    if b.category_keyword and detected_category_label:
                        kw = b.category_keyword.lower()
                        if any(
                            k in kw or kw in k
                            for k in detected_category_label.lower().split()
                        ):
                            matched_benefit = b
                            break

            # Priority 3: Fallback to General / Base Benefit for this card
            if not matched_benefit:
                general_bens = [
                    b
                    for b in card_bens
                    if not b.category_id
                    and (
                        not b.category_keyword
                        or "thông thường" in b.category_keyword.lower()
                    )
                ]
                if general_bens:
                    matched_benefit = general_bens[0]
                elif card_bens:
                    card_bens_sorted = sorted(
                        card_bens, key=lambda x: x.reward_rate_percent
                    )
                    matched_benefit = card_bens_sorted[0]

            # Calculate Reward values
            reward_type = (
                matched_benefit.reward_type
                if matched_benefit
                else RewardTypeEnum.CASHBACK
            )
            reward_rate = (
                Decimal(str(matched_benefit.reward_rate_percent))
                if matched_benefit
                else Decimal("0.00")
            )
            point_mult = (
                Decimal(str(matched_benefit.point_multiplier))
                if matched_benefit
                else Decimal("1.00")
            )
            desc = (
                matched_benefit.description
                if matched_benefit
                else "Ưu đãi chi tiêu cơ bản theo chính sách ngân hàng"
            )

            # Estimate reward amount (VND equivalence)
            if reward_type == RewardTypeEnum.CASHBACK:
                estimated_reward = round(amount * (reward_rate / Decimal("100.0")), 2)
                estimated_points = Decimal("0.00")
            else:
                estimated_points = round(amount * (reward_rate / Decimal("100.0")), 0)
                estimated_reward = estimated_points

            # Cap reward if monthly limit configured
            if matched_benefit and matched_benefit.max_reward_monthly:
                max_m = Decimal(str(matched_benefit.max_reward_monthly))
                if estimated_reward > max_m:
                    estimated_reward = max_m

            # Check Limit Headroom & Risk Impact
            is_sufficient = avail_limit >= amount
            projected_balance = curr_balance + amount
            projected_util_pct = (
                round((projected_balance / limit) * Decimal("100.0"), 2)
                if limit > 0
                else Decimal("0.00")
            )

            if limit == 0:
                projected_risk = "NO_LIMIT"
            elif projected_util_pct > 70:
                projected_risk = "CRITICAL (>70%)"
            elif projected_util_pct > 50:
                projected_risk = "HIGH (>50%)"
            elif projected_util_pct > 30:
                projected_risk = "MODERATE (>30%)"
            else:
                projected_risk = "OPTIMAL (<30%)"

            # Compute Composite Recommendation Score based on strategy
            reward_rate_val = float(reward_rate)
            float_days_val = float(grace_metrics["interest_free_days"])

            if strategy == RecommendationStrategyEnum.MAX_GRACE_PERIOD:
                # 80% weight on float days, 20% on rewards
                score = (float_days_val / 55.0) * 80.0 + reward_rate_val * 4.0
            elif strategy == RecommendationStrategyEnum.MAX_REWARD:
                # 80% weight on rewards, 20% on float days
                score = reward_rate_val * 15.0 + (float_days_val / 55.0) * 10.0
            else:
                # BALANCED (Default): Optimal balance of cashback and interest-free duration
                score = reward_rate_val * 10.0 + (float_days_val / 55.0) * 35.0

            if not is_sufficient:
                score -= 1000.0  # Cannot afford
            else:
                # Bonus for headroom & penalize excessive utilization
                if projected_util_pct > 70:
                    score -= 40.0
                elif projected_util_pct > 50:
                    score -= 15.0
                else:
                    score += 20.0

                # Extra bonus for cards in their golden spend window
                if grace_metrics["is_golden_period"]:
                    score += 15.0

            # Generate Reasons
            reasons = []
            if not is_sufficient:
                reasons.append(
                    f"⚠️ Hạn mức khả dụng ({avail_limit:,.0f}đ) không đủ để chi trả {amount:,.0f}đ"
                )
            else:
                # 1. Grace Period & Due Date Information
                if_days = grace_metrics["interest_free_days"]
                due_d_str = (
                    grace_metrics["estimated_due_date"].strftime("%d/%m/%Y")
                    if grace_metrics["estimated_due_date"]
                    else ""
                )
                if grace_metrics["is_golden_period"]:
                    reasons.append(
                        f"🌟 Thời điểm vàng: Hưởng trọn vẹn {if_days} ngày miễn lãi ngân hàng (hạn trả: {due_d_str})"
                    )
                elif if_days >= 40:
                    reasons.append(
                        f"⏳ Miễn lãi dài vượt trội: {if_days} ngày không bị tính lãi (hạn trả: {due_d_str})"
                    )
                else:
                    reasons.append(
                        f"🗓️ Thời gian miễn lãi: {if_days} ngày (đến hạn thanh toán ngày {due_d_str})"
                    )

                # 2. Rewards Information
                if reward_rate > Decimal("3.0"):
                    reasons.append(
                        f"🔥 Tỷ lệ hoàn tiền/tích điểm cực cao: {reward_rate}% (nhận ~{estimated_reward:,.0f} VNĐ)"
                    )
                elif reward_rate > Decimal("0.0"):
                    reasons.append(
                        f"✨ Nhận ưu đãi {reward_rate}% ({estimated_reward:,.0f} VNĐ)"
                    )
                else:
                    reasons.append("Chi tiêu tích lũy điểm tiêu chuẩn")

                # 3. Credit Utilization impact
                if projected_util_pct <= 30:
                    reasons.append(
                        f"🛡️ Rất an toàn: Tỷ lệ sử dụng sau quẹt chỉ {projected_util_pct:.1f}% (tối ưu điểm CIC)"
                    )
                elif projected_util_pct <= 50:
                    reasons.append(
                        f"Tỷ lệ sử dụng hạn mức sau giao dịch: {projected_util_pct:.1f}%"
                    )
                else:
                    reasons.append(
                        f"⚠️ Lưu ý: Tỷ lệ sử dụng sau quẹt sẽ lên {projected_util_pct:.1f}% (>50%)"
                    )

                # 4. Golden spend tip if close to cut-off
                if (
                    grace_metrics["days_until_best_spend_date"]
                    and 1 <= grace_metrics["days_until_best_spend_date"] <= 4
                    and grace_metrics["best_spend_date"]
                ):
                    reasons.append(
                        f"💡 Mẹo dòng tiền: Chờ thêm {grace_metrics['days_until_best_spend_date']} ngày "
                        f"(sau ngày chốt sao kê {grace_metrics['best_spend_date'].strftime('%d/%m')}) "
                        f"để tăng miễn lãi lên ~{grace_metrics['max_possible_grace_days']} ngày!"
                    )

                reasons.append(
                    f"Hạn mức khả dụng còn lại sau giao dịch: {(avail_limit - amount):,.0f} VNĐ"
                )

            evaluated_items.append(
                CardRecommendationItem(
                    account_id=acc_id,
                    account_name=acc_name,
                    bank_name=bank_name,
                    card_number_masked=card_masked,
                    card_color_hex=color_hex,
                    status=card["status"],
                    credit_limit=limit,
                    live_available_limit=avail_limit,
                    current_utilization_percent=curr_util_pct,
                    projected_utilization_percent=projected_util_pct,
                    projected_risk_level=projected_risk,
                    is_sufficient_limit=is_sufficient,
                    reward_type=reward_type,
                    reward_rate_percent=reward_rate,
                    point_multiplier=point_mult,
                    estimated_reward_amount=estimated_reward,
                    estimated_points_earned=estimated_points,
                    benefit_description=desc,
                    billing_day_of_month=grace_metrics["billing_day_of_month"],
                    due_day_of_month=grace_metrics["due_day_of_month"],
                    grace_period_days=grace_metrics["grace_period_days"],
                    next_billing_date=grace_metrics["next_billing_date"],
                    estimated_due_date=grace_metrics["estimated_due_date"],
                    interest_free_days=grace_metrics["interest_free_days"],
                    max_possible_grace_days=grace_metrics["max_possible_grace_days"],
                    best_spend_date=grace_metrics["best_spend_date"],
                    days_until_best_spend_date=grace_metrics["days_until_best_spend_date"],
                    grace_period_rating=grace_metrics["grace_period_rating"],
                    is_golden_period=grace_metrics["is_golden_period"],
                    payment_delay_tip=grace_metrics["payment_delay_tip"],
                    rank=0,
                    is_best_choice=False,
                    recommendation_score=score,
                    reasons=reasons,
                )
            )

        # Sort items by recommendation_score descending
        evaluated_items.sort(key=lambda x: x.recommendation_score, reverse=True)

        for idx, item in enumerate(evaluated_items):
            item.rank = idx + 1
            if idx == 0 and item.is_sufficient_limit:
                item.is_best_choice = True

        best_item = (
            evaluated_items[0]
            if evaluated_items and evaluated_items[0].is_sufficient_limit
            else None
        )

        return CardRecommendationResponse(
            requested_amount=amount,
            detected_category=detected_category_label,
            detected_merchant=merch_input or None,
            applied_strategy=strategy,
            evaluated_transaction_date=tx_date,
            best_choice=best_item,
            recommendations=evaluated_items,
            total_evaluated_cards=len(evaluated_items),
        )
