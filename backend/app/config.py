import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from backend root if it exists
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    PROJECT_NAME: str = "AI Drone Surveillance System API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # Server binding
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # CORS
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
        )
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'drone_surveillance.db'}"
    )

    # Storage
    _upload_dir_str: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))
    _allowed_exts: str = os.getenv(
        "ALLOWED_VIDEO_EXTENSIONS", ".mp4,.avi,.mov,.mkv"
    )

    @property
    def UPLOAD_DIR(self) -> Path:
        path = Path(self._upload_dir_str)
        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def ALLOWED_VIDEO_EXTENSIONS(self) -> List[str]:
        return [
            ext.strip().lower()
            for ext in self._allowed_exts.split(",")
            if ext.strip()
        ]

    # Security & Source Restrictions
    @property
    def ALLOWED_CAMERA_SOURCES(self) -> List[int]:
        raw = os.getenv("ALLOWED_CAMERA_SOURCES", "0,1")
        sources = []
        for s in raw.split(","):
            s = s.strip()
            if s.isdigit():
                sources.append(int(s))
        return sources

    # Detector Settings
    DETECTOR_TYPE: str = os.getenv("DETECTOR_TYPE", "mock").lower()
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "")

    # Alert Rules
    ALERT_CONFIDENCE_THRESHOLD: float = float(
        os.getenv("ALERT_CONFIDENCE_THRESHOLD", "0.60")
    )
    _alert_classes_str: str = os.getenv("ALERT_CLASSES", "human,car,drone")

    @property
    def ALERT_CLASSES(self) -> List[str]:
        return [
            cls_name.strip().lower()
            for cls_name in self._alert_classes_str.split(",")
            if cls_name.strip()
        ]

    # Video Feed Settings
    STREAM_FPS: int = int(os.getenv("STREAM_FPS", "25"))
    STREAM_JPEG_QUALITY: int = int(os.getenv("STREAM_JPEG_QUALITY", "80"))


settings = Settings()
