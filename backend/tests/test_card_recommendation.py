from datetime import date
import pytest
from httpx import AsyncClient

from app.services.card_recommendation_service import calculate_card_grace_metrics


def test_calculate_card_grace_metrics_golden_period():
    """Verify golden period detection and 55-day grace period right after statement cut-off."""
    # Billing day 20, Grace period 25 days, transaction on Oct 21
    res = calculate_card_grace_metrics(20, 25, date(2026, 10, 21))
    assert res["interest_free_days"] == 55
    assert res["is_golden_period"] is True
    assert res["estimated_due_date"] == date(2026, 12, 15)
    assert res["grace_period_rating"] == "OPTIMAL"
    assert "THỜI ĐIỂM VÀNG" in res["payment_delay_tip"]


def test_calculate_card_grace_metrics_pre_cutoff():
    """Verify pre-cutoff warning and wait suggestion when close to billing date."""
    # Billing day 20, Grace period 25 days, transaction on Oct 19
    res = calculate_card_grace_metrics(20, 25, date(2026, 10, 19))
    assert res["interest_free_days"] == 26
    assert res["is_golden_period"] is False
    assert res["days_until_best_spend_date"] == 2
    assert res["estimated_due_date"] == date(2026, 11, 14)
    assert res["best_spend_date"] == date(2026, 10, 21)
    assert "Lùi quẹt thẻ" in res["payment_delay_tip"] or "chốt sao kê" in res["payment_delay_tip"]


def test_calculate_card_grace_metrics_unconfigured():
    """Verify fallback behavior when billing day is not configured."""
    res = calculate_card_grace_metrics(None, 15, date(2026, 10, 15))
    assert res["interest_free_days"] == 15
    assert res["billing_day_of_month"] is None
    assert res["estimated_due_date"] == date(2026, 10, 30)


def test_calculate_card_grace_metrics_fixed_due_day_tk_tra_sau():
    """Verify TK Tra Sau with billing day 28 and fixed due day 4 of next month."""
    # Transaction on Nov 1st -> falls into billing Nov 28th -> due date is Dec 4th
    res = calculate_card_grace_metrics(28, 7, date(2026, 11, 1), due_day_of_month=4)
    assert res["estimated_due_date"] == date(2026, 12, 4)
    assert res["interest_free_days"] == 33
    assert res["is_golden_period"] is True
    assert "04/12/2026" in res["payment_delay_tip"]


@pytest.mark.asyncio
async def test_get_card_benefits(client: AsyncClient):
    response = await client.get("/api/v1/recommendations/benefits")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_recommend_best_card(client: AsyncClient):
    response = await client.post(
        "/api/v1/recommendations/best-card",
        json={
            "amount": 1500000.0,
            "category_name": "Nhà hàng & F&B",
            "merchant_name": "Starbucks Coffee",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "requested_amount" in data
    assert float(data["requested_amount"]) == 1500000.0
    assert "detected_category" in data
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)


@pytest.mark.asyncio
async def test_create_and_fetch_card_benefit(client: AsyncClient):
    # 1. Fetch existing active account
    acc_res = await client.get("/api/v1/accounts")
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    if not accounts:
        pytest.skip("No accounts seeded in database for benefit creation test")

    test_account = accounts[0]
    acc_id = test_account["id"]

    # 2. Create a test card benefit
    benefit_payload = {
        "account_id": acc_id,
        "category_keyword": "Ẩm thực cuối tuần",
        "merchant_pattern": "HIGHLANDS%",
        "reward_type": "CASHBACK",
        "reward_rate_percent": "5.00",
        "point_multiplier": "1.00",
        "min_spend_per_txn": "50000.00",
        "max_reward_monthly": "500000.00",
        "description": "Hoàn tiền 5% ăn uống cuối tuần",
        "is_active": True,
    }

    create_res = await client.post("/api/v1/recommendations/benefits", json=benefit_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()

    # Verify relationships are loaded without MissingGreenlet and fields populated
    assert created_data["account_id"] == acc_id
    assert created_data["account_name"] == test_account["account_name"]
    if test_account.get("institution"):
        assert created_data["bank_name"] == test_account["institution"]["name"]
    assert created_data["reward_rate_percent"] == "5.00"

    # 3. Verify get_all_benefits loads it properly
    list_res = await client.get(f"/api/v1/recommendations/benefits?account_id={acc_id}")
    assert list_res.status_code == 200
    benefits_list = list_res.json()
    assert any(b["id"] == created_data["id"] for b in benefits_list)
