// server.js
require('dotenv').config();
const WebSocket = require('ws');
const Stream = require('node-rtsp-stream');
const express = require('express');
const http = require('http');
const cors = require('cors');

// Konfiguracja z .env
const config = {
    rtspUrl: process.env.RTSP_URL,
    wsPort: parseInt(process.env.WS_PORT) || 5001,
    rtspPort: parseInt(process.env.RTSP_PORT) || 554,
    username: process.env.RTSP_USERNAME,
    password: process.env.RTSP_PASSWORD,
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 5,
    reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL) || 5000,
    debug: process.env.DEBUG === 'true',
    metadataInterval: parseInt(process.env.METADATA_INTERVAL) || 1000,
    maxMetadataItems: parseInt(process.env.MAX_METADATA_ITEMS) || 50,
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    streamFps: parseInt(process.env.STREAM_FPS) || 30
};

// Logger pomocniczy
const logger = {
    log: (...args) => config.debug && console.log(...args),
    error: (...args) => config.debug && console.error(...args),
    info: (...args) => config.debug && console.info(...args)
};

class RTSPStreamServer {
    constructor(config) {
        this.config = config;
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.streams = new Map();

        this.setupServer();
    }

    setupServer() {
        this.app.use(cors());
        this.app.use(express.static('public'));

        // Endpoint dla sprawdzenia statusu
        this.app.get('/status', (req, res) => {
            res.json({
                streams: this.streams.size,
                uptime: process.uptime(),
                config: {
                    ...this.config,
                    password: undefined // Nie zwracamy hasła
                }
            });
        });

        this.wss.on('connection', this.handleConnection.bind(this));
    }

    handleConnection(ws) {
        logger.log('New WebSocket connection');

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                logger.log('Received:', data);

                switch (data.type) {
                    case 'SETUP':
                        await this.handleSetup(ws, data);
                        break;
                    case 'PLAY':
                        await this.handlePlay(ws);
                        break;
                    case 'PAUSE':
                        await this.handlePause(ws);
                        break;
                    default:
                        throw new Error(`Unknown message type: ${data.type}`);
                }
            } catch (error) {
                logger.error('Message handling error:', error);
                this.sendError(ws, error.message);
            }
        });

        ws.on('close', () => {
            logger.log('Client disconnected');
            this.cleanupConnection(ws);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
            this.cleanupConnection(ws);
        });
    }

    async handleSetup(ws, data) {
        const streamUrl = data.rtspUrl || this.config.rtspUrl;

        try {
            const stream = new Stream({
                name: `stream_${Date.now()}`,
                streamUrl,
                wsPort: this.config.wsPort,
                ffmpegOptions: {
                    '-stats': '',
                    '-r': this.config.streamFps,
                    '-rtsp_transport': 'tcp',
                    '-metadata': ''
                }
            });

            this.streams.set(ws, stream);

            this.sendStatus(ws, 'connected');
            this.startMetadataStream(ws);

        } catch (error) {
            logger.error('Stream setup error:', error);
            throw new Error('Failed to setup stream');
        }
    }

    async handlePlay(ws) {
        const stream = this.streams.get(ws);
        if (!stream) {
            throw new Error('No active stream');
        }

        this.sendStatus(ws, 'playing');
    }

    async handlePause(ws) {
        const stream = this.streams.get(ws);
        if (!stream) {
            throw new Error('No active stream');
        }

        this.sendStatus(ws, 'paused');
    }

    startMetadataStream(ws) {
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                this.sendMetadata(ws);
            } else {
                clearInterval(interval);
            }
        }, this.config.metadataInterval);

        ws.metadataInterval = interval;
    }

    sendMetadata(ws) {
        const stream = this.streams.get(ws);
        if (!stream) return;

        const metadata = {
            timestamp: Date.now(),
            streamInfo: {
                url: stream.streamUrl,
                fps: this.config.streamFps,
                status: 'active'
            },
            stats: {
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        };

        ws.send(JSON.stringify({
            type: 'metadata',
            data: metadata
        }));
    }

    sendError(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'error',
                message
            }));
        }
    }

    sendStatus(ws, status) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'status',
                status
            }));
        }
    }

    cleanupConnection(ws) {
        const stream = this.streams.get(ws);
        if (stream) {
            stream.stop();
            this.streams.delete(ws);
        }

        if (ws.metadataInterval) {
            clearInterval(ws.metadataInterval);
        }
    }

    start() {
        this.server.listen(this.config.wsPort, () => {
            logger.info(`Server running on port ${this.config.wsPort}`);
        });
    }
}

// Uruchomienie serwera
const streamServer = new RTSPStreamServer(config);
streamServer.start();