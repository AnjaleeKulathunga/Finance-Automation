from typing import Optional


def format_number_mn(value: float, show_decimals: bool = False) -> str:
    if value == 0:
        return "0"
    if show_decimals:
        formatted = f"{value:,.1f}"
    else:
        formatted = f"{value:,.0f}"
    return formatted


def format_variance(value: float) -> str:
    if value == 0:
        return "0"
    if value < 0:
        return f"({abs(value):,.0f})"
    return f"{value:,.0f}"


def format_variance_pct(value: Optional[float]) -> str:
    if value is None:
        return "#DIV/0!"
    if abs(value) >= 1000:
        return f"{value:,.0f}%"
    if abs(value) < 1:
        return f"{value:.2f}%"
    return f"{value:.0f}%"


def format_number_bracket(value: float) -> str:
    if value == 0:
        return "0"
    if value < 0:
        return f"({abs(value):,.0f})"
    return f"{value:,.0f}"


def safe_divide(numerator: float, denominator: float) -> Optional[float]:
    if denominator == 0:
        return None
    return (numerator / denominator) * 100
