from typing import List
from pathlib import Path
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

from backend.app.schemas.common import VideoUploadResponse
from backend.app.services.video_storage import video_storage
from backend.app.services.pipeline import pipeline
from backend.app.config import settings

router = APIRouter(tags=["Video"])


@router.post("/videos/upload", response_model=VideoUploadResponse, status_code=201)
def upload_video(file: UploadFile = File(...)):
    """
    Accepts validated video uploads with file-type and file-size restrictions.
    Verifies stream readability and isolates storage to prevent directory traversal.
    """
    filename, file_path, size_mb = video_storage.validate_and_save(file)
    return VideoUploadResponse(
        filename=filename,
        file_path=str(file_path),
        file_size_mb=size_mb,
        message="Video uploaded and validated successfully.",
    )


@router.get("/videos", response_model=List[str])
def list_uploaded_videos():
    """
    List filenames of uploaded and available videos in the storage directory.
    """
    upload_dir = video_storage.get_upload_dir()
    videos = []
    for f in upload_dir.iterdir():
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_VIDEO_EXTENSIONS:
            videos.append(f.name)
    return sorted(videos)


@router.get("/video-feed")
def get_video_feed():
    """
    Streams processed and annotated video frames using MJPEG multipart replace.
    Shares the single background processing pipeline.
    """
    return StreamingResponse(
        pipeline.get_stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
