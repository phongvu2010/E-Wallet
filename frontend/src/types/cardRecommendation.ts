import { RewardType } from "./reward";

export interface CardBenefit {
  id: string;
  account_id: string;
  account_name?: string;
  bank_name?: string;
  category_id?: string;
  category_name?: string;
  category_keyword?: string;
  merchant_pattern?: string;
  reward_type: RewardType;
  reward_rate_percent: number;
  point_multiplier: number;
  min_spend_per_txn: number;
  max_reward_monthly?: number;
  description?: string;
  is_active: boolean;
}

export type RecommendationStrategy = "BALANCED" | "MAX_REWARD" | "MAX_GRACE_PERIOD";

export interface CardRecommendationRequest {
  amount: number;
  category_id?: string;
  category_name?: string;
  merchant_name?: string;
  transaction_date?: string;
  strategy?: RecommendationStrategy;
}

export interface CardRecommendationItem {
  account_id: string;
  account_name: string;
  bank_name: string;
  card_number_masked: string;
  card_color_hex?: string;
  status: string;

  credit_limit: number;
  live_available_limit: number;
  current_utilization_percent: number;
  projected_utilization_percent: number;
  projected_risk_level: string;
  is_sufficient_limit: boolean;

  reward_type: RewardType;
  reward_rate_percent: number;
  point_multiplier: number;
  estimated_reward_amount: number;
  estimated_points_earned: number;
  benefit_description: string;

  // Grace Period & Interest-Free Float Optimization
  billing_day_of_month?: number;
  due_day_of_month?: number;
  grace_period_days: number;
  next_billing_date?: string;
  estimated_due_date?: string;
  interest_free_days: number;
  max_possible_grace_days: number;
  best_spend_date?: string;
  days_until_best_spend_date?: number;
  grace_period_rating: "OPTIMAL" | "GOOD" | "FAIR" | "SHORT";
  is_golden_period: boolean;
  payment_delay_tip?: string;

  rank: number;
  is_best_choice: boolean;
  recommendation_score: number;
  reasons: string[];
}

export interface CardRecommendationResponse {
  requested_amount: number;
  detected_category: string;
  detected_merchant?: string;
  applied_strategy: RecommendationStrategy;
  evaluated_transaction_date: string;
  best_choice?: CardRecommendationItem;
  recommendations: CardRecommendationItem[];
  total_evaluated_cards: number;
}
