import pandas as pd
from typing import Dict, List
from utils.logger import logger
from config import settings


def process_trial_balance(
    tb_df: pd.DataFrame, divisor: int = None
) -> Dict[str, Dict[str, float]]:
    if divisor is None:
        divisor = settings.TB_TO_MN_DIVISOR

    results = {}

    for category in settings.SLIDE_CATEGORIES:
        if category in settings.SUBTOTAL_ROWS:
            continue

        cat_rows = tb_df[tb_df["revenue_category"] == category]

        if cat_rows.empty:
            results[category] = {
                "period_activity": 0.0,
                "ending_balance": 0.0,
                "beginning_balance": 0.0,
            }
            continue

        pa_sum = cat_rows["period_activity"].sum()
        eb_sum = cat_rows["ending_balance"].sum()
        bb_sum = cat_rows["beginning_balance"].sum()

        results[category] = {
            "period_activity": -pa_sum / divisor,
            "ending_balance": -eb_sum / divisor,
            "beginning_balance": -bb_sum / divisor,
        }

        logger.debug(
            f"TB Processed '{category}': PA={results[category]['period_activity']:.1f}, "
            f"EB={results[category]['ending_balance']:.1f}"
        )

    logger.info(f"Trial balance processed for {len(results)} categories")
    return results


def get_tb_totals(tb_df: pd.DataFrame, divisor: int = None) -> Dict[str, float]:
    if divisor is None:
        divisor = settings.TB_TO_MN_DIVISOR

    pa_total = -tb_df["period_activity"].sum() / divisor
    eb_total = -tb_df["ending_balance"].sum() / divisor
    bb_total = -tb_df["beginning_balance"].sum() / divisor

    logger.info(f"TB totals: PA={pa_total:.1f}, EB={eb_total:.1f}, BB={bb_total:.1f}")
    return {
        "period_activity": pa_total,
        "ending_balance": eb_total,
        "beginning_balance": bb_total,
    }
