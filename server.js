const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const Stream = require('node-rtsp-stream');
const { createLogger, format, transports } = require('winston');
const fs = require('fs');

// Konfiguracja loggera
const logger = createLogger({
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        format.printf(({ timestamp, level, message, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
        })
    ),
    transports: [
        new transports.Console({
            level: 'debug',
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        }),
        new transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new transports.File({
            filename: 'logs/rtsp.log'
        })
    ]
});

class RTSPServer {
    constructor(config) {
        this.config = config;
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.streams = new Map();
        this.clientStats = new Map();

        // Tworzenie katalogu na logi jeśli nie istnieje
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
        }

        this.setupServer();
        this.startPerformanceMonitoring();
    }

    setupServer() {
        logger.info('Initializing RTSP Server', { config: this.config });

        // Konfiguracja CORS
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        }));

        logger.debug('CORS configured');

        // Serwowanie statycznych plików
        this.app.use(express.static('public'));

        // Monitorowanie połączeń HTTP
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            logger.debug(`HTTP ${req.method} ${req.url}`, {
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.on('finish', () => {
                const duration = Date.now() - startTime;
                logger.debug(`HTTP Response ${req.method} ${req.url}`, {
                    status: res.statusCode,
                    duration: `${duration}ms`,
                    contentLength: res.get('content-length')
                });
            });

            next();
        });

        // Status endpoint
        this.app.get('/status', (req, res) => {
            const status = {
                activeStreams: this.streams.size,
                activeClients: this.clientStats.size,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                streamStats: this.getStreamStats()
            };

            logger.debug('Status request', status);
            res.json(status);
        });

        // WebSocket handling
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            this.setupWebSocketClient(ws, req, clientId);
        });

        logger.info('Server setup completed');
    }

    setupWebSocketClient(ws, req, clientId) {
        logger.info('New WebSocket connection', {
            clientId,
            ip: req.socket.remoteAddress,
            protocol: req.headers['sec-websocket-protocol']
        });

        // Inicjalizacja statystyk klienta
        this.clientStats.set(clientId, {
            connected: Date.now(),
            messagesSent: 0,
            messagesReceived: 0,
            errors: 0,
            lastActivity: Date.now()
        });

        ws.on('message', async (message) => {
            try {
                const stats = this.clientStats.get(clientId);
                stats.messagesReceived++;
                stats.lastActivity = Date.now();

                const data = JSON.parse(message);
                logger.debug('Received message', {
                    clientId,
                    type: data.type,
                    timestamp: new Date().toISOString()
                });

                await this.handleClientMessage(ws, data, clientId);
            } catch (error) {
                const stats = this.clientStats.get(clientId);
                stats.errors++;

                logger.error('Error processing message', {
                    clientId,
                    error: error.message,
                    stack: error.stack
                });

                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        });

        ws.on('close', () => {
            logger.info('Client disconnected', {
                clientId,
                duration: Date.now() - this.clientStats.get(clientId).connected
            });

            this.cleanup(clientId);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error', {
                clientId,
                error: error.message
            });

            const stats = this.clientStats.get(clientId);
            if (stats) {
                stats.errors++;
            }
        });
    }

    async handleClientMessage(ws, data, clientId) {
        switch (data.type) {
            case 'SETUP':
                await this.handleSetup(ws, data, clientId);
                break;
            case 'STOP':
                await this.handleStop(clientId);
                break;
            default:
                logger.warn('Unknown message type', {
                    clientId,
                    type: data.type
                });
        }
    }

    async handleSetup(ws, data, clientId) {
        logger.info('Setting up stream', {
            clientId,
            rtspUrl: data.rtspUrl
        });

        try {
            // Sprawdzenie dostępności RTSP
            await this.checkRTSPAvailability(data.rtspUrl);

            const streamConfig = {
                name: `stream_${clientId}`,
                streamUrl: data.rtspUrl,
                wsPort: this.getRandomPort(),
                ffmpegOptions: {
                    '-rtsp_transport': 'tcp',
                    '-stats': '',
                    '-r': 30,
                    '-q:v': 3,
                    '-preset': 'ultrafast',
                    '-tune': 'zerolatency',
                    '-f': 'mpegts',
                    '-codec:v': 'mpeg1video',
                    '-b:v': '800k'
                }
            };

            logger.debug('Stream configuration', {
                clientId,
                config: streamConfig
            });

            const stream = new Stream(streamConfig);
            this.streams.set(clientId, stream);

            // Monitorowanie strumienia
            stream.on('data', (data) => {
                const stats = this.clientStats.get(clientId);
                if (stats) {
                    stats.bytesTransferred = (stats.bytesTransferred || 0) + data.length;
                }
            });

            // Start wysyłania metadanych
            this.startMetadataStream(ws, clientId, streamConfig);

            logger.info('Stream setup successful', {
                clientId,
                wsPort: streamConfig.wsPort
            });

            ws.send(JSON.stringify({
                type: 'SETUP_SUCCESS',
                streamPort: streamConfig.wsPort,
                wsUrl: `ws://localhost:${streamConfig.wsPort}`
            }));

        } catch (error) {
            logger.error('Stream setup failed', {
                clientId,
                error: error.message,
                stack: error.stack
            });

            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    }

    async checkRTSPAvailability(url) {
        logger.debug('Checking RTSP availability', { url });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                logger.warn('RTSP connection timeout', { url });
                reject(new Error('RTSP connection timeout'));
            }, 5000);

            const testStream = new Stream({
                name: 'test',
                streamUrl: url,
                wsPort: this.getRandomPort()
            });

            testStream.on('data', () => {
                clearTimeout(timeout);
                testStream.stop();
                resolve();
            });

            testStream.on('error', (error) => {
                clearTimeout(timeout);
                testStream.stop();
                logger.error('RTSP test failed', {
                    url,
                    error: error.message
                });
                reject(error);
            });
        });
    }

    startMetadataStream(ws, clientId, streamConfig) {
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const stats = this.clientStats.get(clientId);
                const metadata = {
                    timestamp: Date.now(),
                    streamInfo: {
                        port: streamConfig.wsPort,
                        format: 'mpeg1',
                        bitrate: '800k'
                    },
                    clientStats: {
                        uptime: Date.now() - stats.connected,
                        messagesSent: stats.messagesSent,
                        messagesReceived: stats.messagesReceived,
                        errors: stats.errors,
                        bytesTransferred: stats.bytesTransferred
                    }
                };

                stats.messagesSent++;
                ws.send(JSON.stringify({
                    type: 'metadata',
                    data: metadata
                }));

                logger.debug('Sent metadata', {
                    clientId,
                    metadata
                });
            }
        }, 1000);

        // Zapisanie interwału do późniejszego czyszczenia
        this.clientStats.get(clientId).metadataInterval = interval;
    }

    cleanup(clientId) {
        logger.info('Cleaning up client resources', { clientId });

        const stream = this.streams.get(clientId);
        if (stream) {
            stream.stop();
            this.streams.delete(clientId);
        }

        const stats = this.clientStats.get(clientId);
        if (stats && stats.metadataInterval) {
            clearInterval(stats.metadataInterval);
        }

        this.clientStats.delete(clientId);
    }

    startPerformanceMonitoring() {
        setInterval(() => {
            const stats = {
                memory: process.memoryUsage(),
                activeStreams: this.streams.size,
                activeClients: this.clientStats.size,
                uptime: process.uptime()
            };

            logger.info('Server performance stats', stats);
        }, 60000); // Co minutę
    }

    getStreamStats() {
        const stats = {};
        this.streams.forEach((stream, clientId) => {
            const clientStats = this.clientStats.get(clientId);
            stats[clientId] = {
                uptime: clientStats ? Date.now() - clientStats.connected : 0,
                bytesTransferred: clientStats ? clientStats.bytesTransferred : 0,
                errors: clientStats ? clientStats.errors : 0
            };
        });
        return stats;
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getRandomPort() {
        return Math.floor(Math.random() * (65535 - 10000) + 10000);
    }

    start() {
        const port = this.config.port || 5001;
        this.server.listen(port, () => {
            logger.info(`Server started on port ${port}`);
        });
    }
}

// Start serwera
const server = new RTSPServer({
    port: 5001,
    logLevel: 'debug'
});

// Obsługa błędów procesu
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
    });
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection', {
        error: error.message,
        stack: error.stack
    });
});

server.start();