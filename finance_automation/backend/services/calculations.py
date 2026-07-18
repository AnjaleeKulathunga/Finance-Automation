from typing import Dict, List, Optional
from models import RevenueResult
from utils.logger import logger
from utils.formatters import safe_divide
from config import settings


def calculate_revenue(
    cy_tb_data: Dict[str, Dict[str, float]],
    py_tb_data: Dict[str, Dict[str, float]],
    budget_processor,
) -> List[RevenueResult]:
    results = []

    month_subs = {
        "Local Voice Total": [
            "Copper - Voice",
            "LTE - Voice",
            "FTTH - Voice",
            "Interconnection",
        ],
        "Total BB": [
            "Copper - BB (without Wi-Fi PP)",
            "Wi-Fi Prepaid Cards",
            "LTE - BB",
            "FTTH - BB",
            "On Line Top-Up Usage",
        ],
        "Local Non-Voice Total": [
            "Total BB",
            "PEO TV",
            "Enterprise (Corp. & Govt.)",
            "Carrier Domestic",
            "SME",
            "Micro Business",
            "RAM & Retail",
            "Digital Services",
        ],
        "Total Local Sales": [
            "Local Voice Total",
            "Local Non-Voice Total",
            "Equipment Sales",
        ],
        "Total Revenue YTD": [
            "Total Local Sales",
            "International",
        ],
    }

    for category in settings.SLIDE_CATEGORIES:
        if category in settings.SUBTOTAL_ROWS:
            continue

        cy_data = cy_tb_data.get(
            category, {"period_activity": 0.0, "ending_balance": 0.0}
        )
        py_data = py_tb_data.get(
            category, {"period_activity": 0.0, "ending_balance": 0.0}
        )

        month_actual = cy_data["period_activity"]
        ytd_actual = cy_data["ending_balance"]
        py_month_actual = py_data["period_activity"]
        py_ytd_actual = py_data["ending_balance"]

        month_budget = budget_processor.get_monthly_budget(category)
        ytd_budget = budget_processor.get_ytd_budget(category)

        month_variance = month_actual - month_budget
        month_variance_pct = safe_divide(month_variance, month_budget)

        ytd_variance = ytd_actual - ytd_budget
        ytd_variance_pct = safe_divide(ytd_variance, ytd_budget)

        result = RevenueResult(
            category=category,
            month_actual=month_actual,
            month_budget=month_budget,
            month_variance=month_variance,
            month_variance_pct=month_variance_pct,
            py_month_actual=py_month_actual,
            ytd_actual=ytd_actual,
            ytd_budget=ytd_budget,
            ytd_variance=ytd_variance,
            ytd_variance_pct=ytd_variance_pct,
            py_ytd_actual=py_ytd_actual,
            is_subtotal=False,
            is_grand_total=False,
        )
        results.append(result)

    for sub_name, sub_components in month_subs.items():
        month_act = sum(r.month_actual for r in results if r.category in sub_components)
        month_bud = sum(r.month_budget for r in results if r.category in sub_components)
        month_var = month_act - month_bud
        month_var_pct = safe_divide(month_var, month_bud)

        py_month_act = sum(
            r.py_month_actual for r in results if r.category in sub_components
        )

        ytd_act = sum(r.ytd_actual for r in results if r.category in sub_components)
        ytd_bud = sum(r.ytd_budget for r in results if r.category in sub_components)
        ytd_var = ytd_act - ytd_bud
        ytd_var_pct = safe_divide(ytd_var, ytd_bud)

        py_ytd_act = sum(
            r.py_ytd_actual for r in results if r.category in sub_components
        )

        sub_result = RevenueResult(
            category=sub_name,
            month_actual=month_act,
            month_budget=month_bud,
            month_variance=month_var,
            month_variance_pct=month_var_pct,
            py_month_actual=py_month_act,
            ytd_actual=ytd_act,
            ytd_budget=ytd_bud,
            ytd_variance=ytd_var,
            ytd_variance_pct=ytd_var_pct,
            py_ytd_actual=py_ytd_act,
            is_subtotal=True,
            is_grand_total=(sub_name == "Total Revenue YTD"),
        )
        results.append(sub_result)

    ordered_results = []
    for category in settings.SLIDE_CATEGORIES:
        for r in results:
            if r.category == category:
                ordered_results.append(r)
                break

    logger.info(f"Revenue calculated for {len(ordered_results)} categories")
    return ordered_results
