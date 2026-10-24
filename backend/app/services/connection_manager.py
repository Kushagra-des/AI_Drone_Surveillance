import asyncio
import logging
from typing import List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections and thread-safe broadcasting.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Remaining clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Asynchronously send a JSON message to all connected clients."""
        if not self.active_connections:
            return

        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.debug(f"Failed to send to client, removing: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

    def broadcast_threadsafe(self, message: dict):
        """
        Thread-safe method to dispatch broadcast from background worker threads
        onto the main asyncio event loop.
        """
        if not self.active_connections:
            return

        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(self.broadcast(message), self.loop)
        else:
            logger.debug("Event loop not running; skipped broadcast.")

    @property
    def client_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()
