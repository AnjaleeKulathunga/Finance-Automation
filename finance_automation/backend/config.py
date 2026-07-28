import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Finance Revenue Automation"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    BASE_DIR: Path = Path(__file__).resolve().parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "outputs"
    LOG_DIR: Path = BASE_DIR.parent / "logs"
    TEMPLATE_DIR: Path = BASE_DIR / "templates"

    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: set = {".xlsx", ".xls"}
    EMAIL_USER: str = ""
    EMAIL_PASS: str = ""
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 465
    PASSWORD_RESET_OTP_EXPIRE_MINUTES: int = 10

    AZURE_CLIENT_ID: str = ""
    AZURE_TENANT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    # 32-byte Fernet key for AES-256 state encryption. Generate once with:
    # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    STATE_ENCRYPTION_KEY: str = ""

    FLEXFIELD_SEGMENTS: dict = {
        "company": 0,
        "cost_center": 1,
        "location": 2,
        "business_line": 3,
        "product": 4,
        "account": 5,
        "technology": 6,
        "intercompany": 7,
        "project": 8,
    }

    TB_TO_MN_DIVISOR: int = 1_000_000

    SLIDE_CATEGORIES: list = [
        "Copper - Voice",
        "LTE - Voice",
        "FTTH - Voice",
        "Interconnection",
        "Local Voice Total",
        "Copper - BB (without Wi-Fi PP)",
        "Wi-Fi Prepaid Cards",
        "LTE - BB",
        "FTTH - BB",
        "On Line Top-Up Usage",
        "Total BB",
        "PEO TV",
        "Enterprise (Corp. & Govt.)",
        "Carrier Domestic",
        "SME",
        "Micro Business",
        "RAM & Retail",
        "Digital Services",
        "Local Non-Voice Total",
        "Equipment Sales",
        "Total Local Sales",
        "International",
        "Total Revenue YTD",
    ]

    SUBTOTAL_ROWS: list = [
        "Local Voice Total",
        "Total BB",
        "Local Non-Voice Total",
        "Total Local Sales",
        "Total Revenue YTD",
    ]

    BUDGET_CATEGORY_MAP: dict = {
        "Copper - Voice": ["Copper - Voice"],
        "LTE - Voice": ["LTE - Voice"],
        "FTTH - Voice": ["FTTH - Voice"],
        "Interconnection": ["Interconnection"],
        "Copper - BB (without Wi-Fi PP)": ["Broadband (ADSL)", "Copper - BB"],
        "Wi-Fi Prepaid Cards": ["Wi-Fi Prepaid Cards", "Wi-Fi Prepaid"],
        "LTE - BB": ["LTE-BB", "LTE - BB"],
        "FTTH - BB": ["FTTH-BB", "FTTH - BB"],
        "On Line Top-Up Usage": ["On Line Top-Up Usage", "On line top up"],
        "PEO TV": ["PEO TV", "IPTV"],
        "Enterprise (Corp. & Govt.)": [
            "Enterprise Business",
            "Government Business",
            "Enterprise (Corp. & Govt.)",
            "Digital Platforms",
            "Govt Strategic Initiatives",
        ],
        "Carrier Domestic": [
            "Carrier Domestic",
            "SLT Group-Mobitel",
            "Other Operators",
            "Other operators",
        ],
        "SME": ["SME", "SME Sales"],
        "Micro Business": ["Micro Business"],
        "RAM & Retail": ["RAM & Retail", "Consumer"],
        "Digital Services": ["Digital Services"],
        "Equipment Sales": [
            "Equipment sales",
            "Other Operating Income",
            "Other Value Added",
        ],
        "International": [
            "International",
            "Carrier International",
            "Transit",
            "Global Data",
            "Global SBU",
            "IRU",
            "Lease Circuit",
        ],
    }

    class Config:
        env_prefix = "FINANCE_"
        extra = "allow"


settings = Settings(_env_file=Path(__file__).resolve().parent / ".env")

for directory in [
    settings.UPLOAD_DIR,
    settings.OUTPUT_DIR,
    settings.LOG_DIR,
    settings.TEMPLATE_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)
