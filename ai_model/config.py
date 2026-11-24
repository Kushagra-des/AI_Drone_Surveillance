import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = Path(__file__).with_name("config.yaml")


def load_config(path: str | Path = DEFAULT_CONFIG) -> dict:
    config_path = Path(path).resolve()
    with config_path.open(encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}

    if len(config.get("zone_points", [])) < 3:
        raise ValueError("zone_points must contain at least three points")
    if len(config.get("line_points", [])) != 2:
        raise ValueError("line_points must contain exactly two points")
    if any(len(point) != 2 for point in config["zone_points"] + config["line_points"]):
        raise ValueError("zone_points and line_points must contain (x, y) pairs")
    if not config.get("classes"):
        raise ValueError("classes cannot be empty")
    confidence = float(config.get("confidence_threshold", 0.45))
    if not 0 <= confidence <= 1:
        raise ValueError("confidence_threshold must be between 0 and 1")
    if float(config.get("loitering_seconds", 0)) < 0:
        raise ValueError("loitering_seconds cannot be negative")

    for key in ("alerts_dir", "events_db"):
        path_value = Path(config[key])
        config[key] = path_value if path_value.is_absolute() else (config_path.parent / path_value).resolve()

    model_path = Path(config["model_path"])
    if not model_path.is_absolute() and (PROJECT_ROOT / model_path).exists():
        config["model_path"] = PROJECT_ROOT / model_path
    elif not model_path.is_absolute() and model_path.suffix:
        config["model_path"] = (config_path.parent / model_path).resolve()

    source = config["video_source"]
    if isinstance(source, str) and source.isdigit():
        config["video_source"] = int(source)
    elif isinstance(source, str) and not Path(source).is_absolute():
        config["video_source"] = (PROJECT_ROOT / source).resolve()

    load_dotenv(PROJECT_ROOT / ".env")
    config["bot_token"] = os.getenv("BOT_TOKEN")
    config["chat_id"] = os.getenv("CHAT_ID")
    return config
