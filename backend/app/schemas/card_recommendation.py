from datetime import date
from decimal import Decimal
import enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.reward import RewardTypeEnum


class RecommendationStrategyEnum(str, enum.Enum):
    BALANCED = "BALANCED"                    # Cân bằng giữa Hoàn tiền & Ngày miễn lãi
    MAX_REWARD = "MAX_REWARD"                # Tối đa hóa tỷ lệ hoàn tiền / tích điểm
    MAX_GRACE_PERIOD = "MAX_GRACE_PERIOD"    # Tối đa hóa thời gian chiếm dụng vốn miễn lãi (Float Days)


class CardBenefitBase(BaseModel):
    account_id: UUID
    category_id: Optional[UUID] = None
    category_keyword: Optional[str] = None
    merchant_pattern: Optional[str] = None
    reward_type: RewardTypeEnum = RewardTypeEnum.CASHBACK
    reward_rate_percent: Decimal = Decimal("0.00")
    point_multiplier: Decimal = Decimal("1.00")
    min_spend_per_txn: Decimal = Decimal("0.00")
    max_reward_monthly: Optional[Decimal] = None
    description: Optional[str] = None
    is_active: bool = True


class CardBenefitCreate(CardBenefitBase):
    pass


class CardBenefitRead(CardBenefitBase):
    id: UUID
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    category_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CardRecommendationRequest(BaseModel):
    amount: Decimal = Field(
        ..., gt=0, description="Số tiền dự kiến chi tiêu / quẹt thẻ (VNĐ)"
    )
    category_id: Optional[UUID] = Field(
        None, description="Danh mục chi tiêu (Cấp 1 hoặc Cấp 2)"
    )
    category_name: Optional[str] = Field(
        None, description="Tên danh mục chi tiêu (VD: 'Ăn uống', 'Online')"
    )
    merchant_name: Optional[str] = Field(
        None, description="Tên cửa hàng / merchant (VD: 'Shopee', 'Starbucks')"
    )
    transaction_date: Optional[date] = Field(
        None, description="Ngày dự kiến giao dịch quẹt thẻ (Mặc định hôm nay)"
    )
    strategy: Optional[RecommendationStrategyEnum] = Field(
        default=RecommendationStrategyEnum.BALANCED,
        description="Chiến lược đề xuất: BALANCED, MAX_REWARD, MAX_GRACE_PERIOD",
    )


class CardRecommendationItem(BaseModel):
    account_id: UUID
    account_name: str
    bank_name: str
    card_number_masked: str
    card_color_hex: Optional[str] = "#3b82f6"
    status: str

    # Live balance & limit details
    credit_limit: Decimal
    live_available_limit: Decimal
    current_utilization_percent: Decimal
    projected_utilization_percent: Decimal
    projected_risk_level: str
    is_sufficient_limit: bool

    # Reward & benefit details
    reward_type: RewardTypeEnum
    reward_rate_percent: Decimal
    point_multiplier: Decimal
    estimated_reward_amount: (
        Decimal  # Số tiền hoàn (VNĐ) hoặc số điểm quy đổi tương đương
    )
    estimated_points_earned: Decimal  # Số điểm thưởng tích lũy (nếu là POINT)
    benefit_description: str

    # Grace Period & Interest-Free Float Optimization
    billing_day_of_month: Optional[int] = None
    due_day_of_month: Optional[int] = None
    grace_period_days: int = 15
    next_billing_date: Optional[date] = None
    estimated_due_date: Optional[date] = None
    interest_free_days: int = 0
    max_possible_grace_days: int = 45
    best_spend_date: Optional[date] = None
    days_until_best_spend_date: Optional[int] = None
    grace_period_rating: str = "GOOD"  # OPTIMAL, GOOD, FAIR, SHORT
    is_golden_period: bool = False
    payment_delay_tip: Optional[str] = None

    # Scoring & ranking
    rank: int
    is_best_choice: bool
    recommendation_score: float  # Điểm tổng hợp dựa trên reward rate, grace days, limit headroom, và risk
    reasons: List[str]  # Các lý do gợi ý


class CardRecommendationResponse(BaseModel):
    requested_amount: Decimal
    detected_category: str
    detected_merchant: Optional[str] = None
    applied_strategy: RecommendationStrategyEnum = RecommendationStrategyEnum.BALANCED
    evaluated_transaction_date: date
    best_choice: Optional[CardRecommendationItem] = None
    recommendations: List[CardRecommendationItem] = []
    total_evaluated_cards: int
