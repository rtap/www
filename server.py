# server.py
import os
from dotenv import load_dotenv
import asyncio
import websockets
import json
import cv2
from datetime import datetime
import logging
from pathlib import Path

# Ładowanie .env
load_dotenv()

# Konfiguracja loggera
logging.basicConfig(
    level=logging.DEBUG if os.getenv('DEBUG') == 'true' else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Config:
    def __init__(self):
        self.RTSP_URL = os.getenv('RTSP_URL', 'rtsp://localhost:554/stream')
        self.WS_PORT = int(os.getenv('WS_PORT', 5001))
        self.RTSP_PORT = int(os.getenv('RTSP_PORT', 554))
        self.RTSP_USERNAME = os.getenv('RTSP_USERNAME', 'admin')
        self.RTSP_PASSWORD = os.getenv('RTSP_PASSWORD', 'admin')
        self.MAX_RECONNECT_ATTEMPTS = int(os.getenv('MAX_RECONNECT_ATTEMPTS', 5))
        self.RECONNECT_INTERVAL = int(os.getenv('RECONNECT_INTERVAL', 5000))
        self.DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
        self.METADATA_INTERVAL = int(os.getenv('METADATA_INTERVAL', 1000))
        self.MAX_METADATA_ITEMS = int(os.getenv('MAX_METADATA_ITEMS', 50))
        self.FFMPEG_PATH = os.getenv('FFMPEG_PATH', 'ffmpeg')
        self.STREAM_FPS = int(os.getenv('STREAM_FPS', 30))

class RTSPServer:
    def __init__(self, config: Config):
        self.config = config
        self.clients = set()
        self.streams = {}
        self.running = False

    async def handle_client(self, websocket, path):
        """Obsługa klienta WebSocket"""
        try:
            client_id = id(websocket)
            self.clients.add(websocket)
            logger.info(f"New client connected: {client_id}")

            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error("Invalid JSON message")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    await self.send_error(websocket, str(e))
        finally:
            await self.cleanup_client(websocket)

    async def handle_message(self, websocket, data):
        """Obsługa wiadomości od klienta"""
        message_type = data.get('type')

        if message_type == 'SETUP':
            await self.handle_setup(websocket, data)
        elif message_type == 'PLAY':
            await self.handle_play(websocket)
        elif message_type == 'PAUSE':
            await self.handle_pause(websocket)
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def handle_setup(self, websocket, data):
        """Konfiguracja strumienia RTSP"""
        try:
            rtsp_url = data.get('rtspUrl', self.config.RTSP_URL)
            stream = cv2.VideoCapture(rtsp_url)

            if not stream.isOpened():
                raise Exception("Failed to open RTSP stream")

            self.streams[websocket] = {
                'stream': stream,
                'metadata_task': None
            }

            await self.send_status(websocket, 'connected')
            await self.start_metadata_stream(websocket)

        except Exception as e:
            logger.error(f"Setup error: {e}")
            await self.send_error(websocket, str(e))

    async def start_metadata_stream(self, websocket):
        """Start strumienia metadanych"""
        async def metadata_worker():
            while websocket in self.streams:
                try:
                    metadata = self.get_stream_metadata(websocket)
                    await self.send_metadata(websocket, metadata)
                    await asyncio.sleep(self.config.METADATA_INTERVAL / 1000)
                except Exception as e:
                    logger.error(f"Metadata error: {e}")
                    break

        self.streams[websocket]['metadata_task'] = asyncio.create_task(metadata_worker())

    def get_stream_metadata(self, websocket):
        """Pobieranie metadanych ze strumienia"""
        stream = self.streams[websocket]['stream']
        return {
            'timestamp': datetime.now().isoformat(),
            'stream_info': {
                'fps': stream.get(cv2.CAP_PROP_FPS),
                'frame_count': stream.get(cv2.CAP_PROP_FRAME_COUNT),
                'width': stream.get(cv2.CAP_PROP_FRAME_WIDTH),
                'height': stream.get(cv2.CAP_PROP_FRAME_HEIGHT),
            }
        }

    async def send_metadata(self, websocket, metadata):
        """Wysyłanie metadanych"""
        if websocket.open:
            await websocket.send(json.dumps({
                'type': 'metadata',
                'data': metadata
            }))

    async def send_error(self, websocket, message):
        """Wysyłanie błędu"""
        if websocket.open:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': message
            }))

    async def send_status(self, websocket, status):
        """Wysyłanie statusu"""
        if websocket.open:
            await websocket.send(json.dumps({
                'type': 'status',
                'status': status
            }))

    async def cleanup_client(self, websocket):
        """Czyszczenie po rozłączeniu klienta"""
        if websocket in self.streams:
            if self.streams[websocket]['metadata_task']:
                self.streams[websocket]['metadata_task'].cancel()
            self.streams[websocket]['stream'].release()
            del self.streams[websocket]

        self.clients.remove(websocket)
        logger.info(f"Client disconnected: {id(websocket)}")

    async def start(self):
        """Uruchomienie serwera"""
        self.running = True
        server = await websockets.serve(
            self.handle_client,
            'localhost',
            self.config.WS_PORT
        )

        logger.info(f"Server running on port {self.config.WS_PORT}")
        await server.wait_closed()

if __name__ == '__main__':
    config = Config()
    server = RTSPServer(config)

    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")