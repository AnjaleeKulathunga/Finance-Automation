import re
import openpyxl
from typing import Dict, List, Tuple, Optional
from utils.logger import logger
from config import settings


class BudgetProcessor:
    def __init__(self):
        self.monthly_budgets: Dict[str, Dict[str, float]] = {}
        self.ytd_budgets: Dict[str, float] = {}
        self.month_index: int = -1
        self.detected_month: str = ""

    def load_budget(self, budget_path: str, report_month: str, report_year: int):
        wb = openpyxl.load_workbook(budget_path, read_only=True, data_only=True)

        frm_sheet = None
        for name in wb.sheetnames:
            if name.strip().upper() == "FRM":
                frm_sheet = wb[name]
                break

        if frm_sheet is None:
            wb.close()
            logger.error("FRM sheet not found in budget workbook")
            return

        month_col_map = self._detect_month_columns(frm_sheet, report_year)
        self.month_index = self._get_month_index(report_month)

        logger.info(f"Budget month columns: {month_col_map}")
        logger.info(f"Report month index: {self.month_index}")

        budget_data = self._extract_budget_data(frm_sheet, month_col_map)

        wb.close()

        self._map_to_slide_categories(budget_data)

        logger.info(f"Budget loaded for {len(self.monthly_budgets)} categories")

    def _detect_month_columns(self, ws, report_year: int) -> Dict[str, int]:
        month_map = {
            1: "January",
            2: "February",
            3: "March",
            4: "April",
            5: "May",
            6: "June",
            7: "July",
            8: "August",
            9: "September",
            10: "October",
            11: "November",
            12: "December",
        }

        col_map = {}
        for row in ws.iter_rows(min_row=1, max_row=10, values_only=False):
            for cell in row:
                if cell.value is None:
                    continue
                val = str(cell.value).strip()
                if report_year == 2025 and "2025" in val:
                    pass
                try:
                    from datetime import datetime

                    if isinstance(cell.value, datetime):
                        if cell.value.year == report_year:
                            month_num = cell.value.month
                            col_map[month_map[month_num]] = cell.column
                except Exception:
                    pass

                if str(report_year) in val:
                    for m_num, m_name in month_map.items():
                        if m_name.lower()[:3] in val.lower():
                            col_map[m_name] = cell.column
                            break

        if not col_map:
            logger.warning(
                "Could not detect month columns from header dates, using fixed positions"
            )
            for m_num, m_name in month_map.items():
                col_map[m_name] = 9 + m_num

        return col_map

    def _get_month_index(self, month_name: str) -> int:
        months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]
        try:
            return months.index(month_name)
        except ValueError:
            return -1

    def _extract_budget_data(
        self, ws, month_col_map: Dict[str, int]
    ) -> Dict[str, List[dict]]:
        budget_rows = []
        months_list = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]

        for row_idx, row in enumerate(
            ws.iter_rows(min_row=8, values_only=False), start=8
        ):
            col_h_val = row[7].value if len(row) > 7 else None
            col_g_val_raw = row[6].value if len(row) > 6 else None

            if col_h_val is None and col_g_val_raw is None:
                continue

            line_item = str(col_h_val).strip() if col_h_val else ""
            if not line_item and not col_g_val_raw:
                continue

            col_f_val = (
                str(row[5].value).strip() if len(row) > 5 and row[5].value else ""
            )
            col_g_val = (
                str(row[6].value).strip() if len(row) > 6 and row[6].value else ""
            )
            col_d_val = (
                str(row[3].value).strip() if len(row) > 3 and row[3].value else ""
            )
            col_e_val = (
                str(row[4].value).strip() if len(row) > 4 and row[4].value else ""
            )

            monthly_values = {}
            for m_name in months_list:
                if m_name in month_col_map:
                    col_idx = month_col_map[m_name] - 1
                    if col_idx < len(row):
                        val = row[col_idx].value
                        if val is not None:
                            try:
                                monthly_values[m_name] = float(val)
                            except (ValueError, TypeError):
                                monthly_values[m_name] = 0.0
                        else:
                            monthly_values[m_name] = 0.0
                    else:
                        monthly_values[m_name] = 0.0
                else:
                    monthly_values[m_name] = 0.0

            budget_rows.append(
                {
                    "line_item": line_item,
                    "col_f": col_f_val,
                    "col_g": col_g_val,
                    "col_d": col_d_val,
                    "col_e": col_e_val,
                    "monthly": monthly_values,
                }
            )

        logger.info(f"Extracted {len(budget_rows)} budget line items")
        return budget_rows

    def _map_to_slide_categories(self, budget_rows: List[dict]):
        months_list = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]

        for category in settings.SLIDE_CATEGORIES:
            if category in settings.SUBTOTAL_ROWS:
                continue
            self.monthly_budgets[category] = {}
            for m in months_list:
                self.monthly_budgets[category][m] = 0.0

        unmapped_budget = []
        named_totals_seen = set()

        for brow in budget_rows:
            matched_category = self._match_budget_to_category(brow)

            if matched_category:
                col_g = brow.get("col_g", "").strip()
                col_g_norm = col_g.replace("\u2013", "-").replace("\u2014", "-")
                col_g_norm = re.sub(r" {2,}", " ", col_g_norm).strip()
                is_total_row = col_g_norm in settings.SLIDE_CATEGORIES

                if is_total_row:
                    named_totals_seen.add(matched_category)
                    for m in months_list:
                        self.monthly_budgets[matched_category][m] = 0.0
                    for m_name, val in brow["monthly"].items():
                        self.monthly_budgets[matched_category][m_name] += val
                elif matched_category not in named_totals_seen:
                    for m_name, val in brow["monthly"].items():
                        self.monthly_budgets[matched_category][m_name] += val
            else:
                unmapped_budget.append(brow["line_item"])

        if unmapped_budget:
            logger.debug(f"Unmapped budget items: {unmapped_budget[:10]}...")

        if self.month_index >= 0:
            current_month = months_list[self.month_index]
            for category in self.monthly_budgets:
                ytd = sum(
                    self.monthly_budgets[category][m]
                    for m in months_list[: self.month_index + 1]
                )
                self.ytd_budgets[category] = ytd

    def _match_budget_to_category(self, brow: dict) -> Optional[str]:
        line_item = brow["line_item"].lower()
        col_f = brow["col_f"].lower()
        col_g = brow["col_g"].lower()
        col_d = brow["col_d"].lower()
        col_e = brow["col_e"].lower()

        all_text = f"{line_item} {col_f} {col_g} {col_d} {col_e}"

        if "total revenue" in all_text and "xyntac" in all_text:
            return None
        if "xyntac" in all_text:
            return None
        if "board revenue" in all_text:
            return None
        if "no of raws" in all_text:
            return None
        if col_f == "total revenue including xyntac":
            return None
        if "price revision" in all_text:
            return None

        if col_g in (
            "total local sales",
            "local non-voice total",
            "local voice total",
            "total bb",
            "total revenue including xyntac",
        ):
            return None
        if col_f.startswith("2-1") and col_g.startswith("2-1") and len(col_g) > 4:
            pass
        elif col_f.startswith("2-1") and not col_g:
            return None

        g_code = col_g.replace(" ", "")
        h_code = line_item.replace(" ", "")
        f_code = col_f.replace(" ", "")

        def _code_starts(prefix):
            return (
                g_code.startswith(prefix)
                or h_code.startswith(prefix)
                or f_code.startswith(prefix)
            )

        def _is_code_row(code_str):
            parts = code_str.split("-")
            return len(parts) >= 2 and all(p.isdigit() for p in parts[:2])

        if "copper" in all_text and "voice" in all_text and "bb" not in all_text:
            return "Copper - Voice"
        if "lte" in all_text and "voice" in all_text and "bb" not in all_text:
            return "LTE - Voice"
        if "ftth" in all_text and "voice" in all_text and "bb" not in all_text:
            return "FTTH - Voice"
        if "interconnection" in all_text and "carrier" not in all_text:
            return "Interconnection"
        if _code_starts("1-1") and not _code_starts("1-1-"):
            return "Copper - Voice"
        if _code_starts("1-3") and not _code_starts("1-3-"):
            return "LTE - Voice"
        if _code_starts("1-4") and not _code_starts("1-4-"):
            return "FTTH - Voice"
        if _code_starts("1-5") and not _code_starts("1-5-"):
            return "Interconnection"

        if "cdma" in all_text or "citylink" in all_text:
            return None
        if _code_starts("1-2") and not _code_starts("1-2-"):
            return None

        if "broadband" in all_text and "adsl" in all_text:
            return "Copper - BB (without Wi-Fi PP)"
        if "copper" in all_text and "bb" in all_text:
            return "Copper - BB (without Wi-Fi PP)"
        if _code_starts("2-1-1") and not _code_starts("2-1-1-"):
            return "Copper - BB (without Wi-Fi PP)"

        if "wifi" in all_text or "wi-fi" in all_text or "wi fi" in all_text:
            return "Wi-Fi Prepaid Cards"

        if "lte" in all_text and "bb" in all_text:
            return "LTE - BB"
        if _code_starts("2-1-2") and not _code_starts("2-1-2-"):
            return "LTE - BB"

        if "ftth" in all_text and ("bb" in all_text or "broadband" in all_text):
            return "FTTH - BB"
        if _code_starts("2-1-3") and not _code_starts("2-1-3-"):
            return "FTTH - BB"

        if (
            "on line top" in all_text
            or "on-line top" in all_text
            or "online top" in all_text
        ):
            return "On Line Top-Up Usage"
        if "top-up" in all_text and "usage" in all_text:
            return "On Line Top-Up Usage"
        if _code_starts("2-1-4") and not _code_starts("2-1-4-"):
            return "On Line Top-Up Usage"

        if "peo tv" in all_text or "iptv" in all_text:
            return "PEO TV"
        if "megaline" in all_text and "iptv" in all_text:
            return "PEO TV"
        if col_f.startswith("2-2") or col_e.startswith("2-2"):
            return "PEO TV"
        if _code_starts("2-2") and not _code_starts("2-2-"):
            return "PEO TV"

        if "enterprise" in all_text and "government" in all_text:
            return "Enterprise (Corp. & Govt.)"
        if col_f.startswith("2-7") or col_e.startswith("2-7"):
            return "Enterprise (Corp. & Govt.)"
        if col_f.startswith("2-8") or col_e.startswith("2-8"):
            return "Enterprise (Corp. & Govt.)"
        if _code_starts("2-7") and not _code_starts("2-7-"):
            return "Enterprise (Corp. & Govt.)"
        if _code_starts("2-8") and not _code_starts("2-8-"):
            return "Enterprise (Corp. & Govt.)"
        if (
            "government" in line_item or "government" in col_g
        ) and "carrier" not in all_text:
            return "Enterprise (Corp. & Govt.)"
        if "digital platform" in (line_item + " " + col_g):
            return "Enterprise (Corp. & Govt.)"
        if "govt strategic" in (line_item + " " + col_g):
            return "Enterprise (Corp. & Govt.)"
        if col_f.startswith("2-7") or col_e.startswith("2-7"):
            return "Enterprise (Corp. & Govt.)"
        if col_f.startswith("2-8") or col_e.startswith("2-8"):
            return "Enterprise (Corp. & Govt.)"
        if _code_starts("2-7") and not _code_starts("2-7-"):
            return "Enterprise (Corp. & Govt.)"
        if _code_starts("2-8") and not _code_starts("2-8-"):
            return "Enterprise (Corp. & Govt.)"
        if (
            ("enterprise" in line_item or "enterprise" in col_g)
            and "voice" not in all_text
            and "peotv" not in all_text.replace(" ", "")
        ):
            return "Enterprise (Corp. & Govt.)"
        if "government" in all_text:
            return "Enterprise (Corp. & Govt.)"
        if "digital platform" in all_text:
            return "Enterprise (Corp. & Govt.)"
        if "govt strategic" in all_text:
            return "Enterprise (Corp. & Govt.)"
        if (
            "enterprise" in all_text
            and "business" in all_text
            and "government" not in all_text
        ):
            return "Enterprise (Corp. & Govt.)"
        if col_f.startswith("2-7") or col_e.startswith("2-7"):
            return "Enterprise (Corp. & Govt.)"
        if col_f.startswith("2-8") or col_e.startswith("2-8"):
            return "Enterprise (Corp. & Govt.)"
        if _code_starts("2-7") and not _code_starts("2-7-"):
            return "Enterprise (Corp. & Govt.)"
        if _code_starts("2-8") and not _code_starts("2-8-"):
            return "Enterprise (Corp. & Govt.)"
        if "government" in all_text:
            return "Enterprise (Corp. & Govt.)"
        if "digital platform" in all_text:
            return "Enterprise (Corp. & Govt.)"
        if "govt strategic" in all_text:
            return "Enterprise (Corp. & Govt.)"

        if "carrier domestic" in all_text or "mobitel" in all_text:
            return "Carrier Domestic"
        if col_f.startswith("2-9") or col_e.startswith("2-9"):
            return "Carrier Domestic"
        if _code_starts("2-9") and not _code_starts("2-9-"):
            return "Carrier Domestic"
        if "other operator" in all_text and "carrier" in all_text:
            return "Carrier Domestic"

        if "sme" in all_text:
            return "SME"
        if col_f.startswith("2-5") or col_e.startswith("2-5"):
            return "SME"
        if _code_starts("2-5") and not _code_starts("2-5-"):
            return "SME"

        if "micro" in all_text:
            return "Micro Business"
        if col_f.startswith("2-6") or col_e.startswith("2-6"):
            return "Micro Business"
        if _code_starts("2-6") and not _code_starts("2-6-"):
            return "Micro Business"

        if "ram" in all_text or "retail" in all_text or "consumer" in all_text:
            return "RAM & Retail"
        if col_f.startswith("2-4") or col_e.startswith("2-4"):
            if "micro" not in all_text:
                return "RAM & Retail"
        if _code_starts("2-4") and not _code_starts("2-4-"):
            return "RAM & Retail"

        if "digital service" in all_text:
            return "Digital Services"
        if col_f.startswith("2-3") or col_e.startswith("2-3"):
            return "Digital Services"
        if _code_starts("2-3") and not _code_starts("2-3-"):
            return "Digital Services"

        if "non operating income" in all_text and "other value added" in all_text:
            return "Equipment Sales"
        if col_f.startswith("2-10") or "other operating income" in all_text:
            if "equipment" in all_text or "consignment" in all_text:
                return "Equipment Sales"
            if "tele life" in all_text or "insurance" in all_text:
                return "Equipment Sales"
            if "railway" in all_text or "echannelling" in all_text:
                return "Equipment Sales"
            if "prison" in all_text or "network monitoring" in all_text:
                return "Equipment Sales"
            if "revenue sharing" in all_text or "kaspersky" in all_text:
                return "Equipment Sales"
            if "m3 vpn" in all_text or "doc call" in all_text:
                return "Equipment Sales"
            if "telehealth" in all_text:
                return "Equipment Sales"
            return "Equipment Sales"
        if _code_starts("2-10") and not _code_starts("2-10-"):
            return "Equipment Sales"
        if "equipment" in all_text and (
            "sales" in all_text or "consignment" in all_text
        ):
            return "Equipment Sales"

        if col_f.startswith("3.") or col_f.startswith("3-") or col_e.startswith("3."):
            return "International"
        if _code_starts("3.") or _code_starts("3-"):
            return "International"
        if "international" in all_text or "transit" in all_text:
            return "International"
        if "global" in all_text and (
            "data" in all_text or "sbu" in all_text or "connectivity" in all_text
        ):
            return "International"
        if "iru" in all_text or "iplc" in all_text:
            return "International"
        if "cables" in all_text and "capacity" in all_text:
            return "International"
        if "on-net" in all_text or "off-net" in all_text:
            return "International"

        return None

    def get_monthly_budget(self, category: str, month: str = None) -> float:
        if category in settings.SUBTOTAL_ROWS:
            return 0.0
        if month is None and self.month_index >= 0:
            months_list = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ]
            month = months_list[self.month_index]
        if category in self.monthly_budgets and month in self.monthly_budgets[category]:
            return self.monthly_budgets[category][month]
        return 0.0

    def get_ytd_budget(self, category: str) -> float:
        if category in settings.SUBTOTAL_ROWS:
            return 0.0
        return self.ytd_budgets.get(category, 0.0)
