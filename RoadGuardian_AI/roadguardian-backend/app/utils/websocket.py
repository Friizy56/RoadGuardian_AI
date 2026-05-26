"""
Module 10: Asynchronous WebSocket Connection Manager
=====================================================
Purpose: Centralized manager for handling active WebSocket client sockets 
         and broadcasting real-time hazard updates without circular imports.
Dependencies: fastapi, typing
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Asynchronous connection manager to handle real-time WebSockets.
    Tracks active channels and broadcasts JSON messages to all connected clients.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accepts a client connection and pushes it to active sockets list"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"🔌 WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Removes a client connection safely from active list"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"🔌 WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcasts a JSON message to all active WebSocket clients"""
        logger.info(f"📢 Broadcasting real-time WebSocket update: {message.get('type')}")
        # Iterate over copy of list to allow safe removal if connections fail during broadcast
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"⚠️ Failed to transmit socket message to client, disconnecting: {e}")
                self.disconnect(connection)


# Global singleton instance
manager = ConnectionManager()
