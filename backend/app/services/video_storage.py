import os
import shutil
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException
import cv2

from backend.app.config import settings


class VideoStorageService:
    @staticmethod
    def get_upload_dir() -> Path:
        upload_dir = settings.UPLOAD_DIR
        upload_dir.mkdir(parents=True, exist_ok=True)
        return upload_dir

    @classmethod
    def validate_and_save(cls, file: UploadFile) -> Tuple[str, Path, float]:
        """
        Validates uploaded video file by extension and size, saves it safely,
        and verifies it can be parsed by OpenCV.

        Returns:
            Tuple of (sanitized_filename, full_saved_path, size_in_mb)
        """
        # Validate filename and extension
        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
            allowed = ", ".join(settings.ALLOWED_VIDEO_EXTENSIONS)
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported video format '{ext}'. Allowed extensions are: {allowed}",
            )

        # Sanitize filename to prevent directory traversal
        raw_name = Path(file.filename).name
        clean_name = "".join(c for c in raw_name if c.isalnum() or c in ("-", "_", "."))
        unique_name = f"{uuid.uuid4().hex[:8]}_{clean_name}"
        dest_path = cls.get_upload_dir() / unique_name

        # Save chunks while enforcing size limit
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        total_size = 0

        try:
            with open(dest_path, "wb") as buffer:
                while chunk := file.file.read(1024 * 1024):  # 1MB chunks
                    total_size += len(chunk)
                    if total_size > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Video file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
                        )
                    buffer.write(chunk)
        except Exception:
            if dest_path.exists():
                dest_path.unlink()
            raise

        # Verify OpenCV can open the video file header
        cap = cv2.VideoCapture(str(dest_path))
        if not cap.isOpened():
            if dest_path.exists():
                dest_path.unlink()
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is not a valid or readable video stream.",
            )
        cap.release()

        size_mb = round(total_size / (1024 * 1024), 3)
        if size_mb == 0.0 and total_size > 0:
            size_mb = 0.001
        return unique_name, dest_path, size_mb

    @classmethod
    def resolve_video_path(cls, filename: str) -> Path:
        """
        Safely resolves a filename within the upload directory,
        preventing directory traversal attacks.
        """
        clean_filename = Path(filename).name
        resolved_path = (cls.get_upload_dir() / clean_filename).resolve()

        # Security check: must reside inside UPLOAD_DIR
        upload_dir_resolved = cls.get_upload_dir().resolve()
        if upload_dir_resolved not in resolved_path.parents and resolved_path != upload_dir_resolved:
            raise HTTPException(status_code=400, detail="Invalid video path access attempt.")

        if not resolved_path.exists() or not resolved_path.is_file():
            raise HTTPException(status_code=404, detail=f"Video file '{clean_filename}' not found.")

        return resolved_path


video_storage = VideoStorageService()
