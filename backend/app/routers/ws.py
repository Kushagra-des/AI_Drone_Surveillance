import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.connection_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/detections")
async def websocket_detections_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming real-time detection metadata and alert notifications.
    Payloads conform to the shared detection and alert schemas.
    """
    await manager.connect(websocket)
    try:
        # Send initial confirmation message
        await websocket.send_json({
            "event": "connected",
            "message": "Connected to AI Drone Surveillance WebSocket stream.",
        })

        # Keep connection alive and receive client messages (e.g. heartbeat ping)
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client error: {e}")
        manager.disconnect(websocket)
