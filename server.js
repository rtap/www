const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const Stream = require('node-rtsp-stream');
const { createLogger, format, transports } = require('winston');
const fs = require('fs');

// Dodaj te konfiguracje do serwera
const FFMPEG_OPTIONS = {
    // Podstawowe opcje
    '-rtsp_transport': 'tcp',
    '-rtsp_flags': 'prefer_tcp',
    '-timeout': '5000000',

    // Buforowanie i synchronizacja
    '-fflags': '+genpts+igndts',
    '-flags': 'low_delay',
    '-strict': 'experimental',

    // Dekodowanie H.264
    '-vcodec': 'h264_ffmpeg',
    '-tune': 'zerolatency',
    '-preset': 'ultrafast',

    // Parametry dekodowania
    '-analyzeduration': '1000000',
    '-probesize': '1000000',
    '-thread_queue_size': '512',

    // Parametry wyjściowe
    '-r': '30',
    '-g': '30',
    '-f': 'mpegts',
    '-codec:v': 'mpeg1video',
    '-b:v': '1000k',
    '-maxrate': '1000k',
    '-bufsize': '2000k',

    // Dodatkowe parametry dekodowania H.264
    '-max_delay': '0',
    '-max_muxing_queue_size': '1024',
};

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
        this.initFFmpeg();
        this.setupServer();
        this.startPerformanceMonitoring();
    }

    async initFFmpeg() {
        try {
            // Sprawdzenie wersji FFmpeg
            const { exec } = require('child_process');
            exec('ffmpeg -version', (error, stdout, stderr) => {
                if (error) {
                    logger.error('FFmpeg not found', { error: error.message });
                    return;
                }
                logger.info('FFmpeg version:', { version: stdout.split('\n')[0] });
            });
        } catch (error) {
            logger.error('Error initializing FFmpeg', { error: error.message });
        }
    }

    async handleSetup(ws, data, clientId) {
        logger.info('Setting up stream', {
            clientId,
            rtspUrl: data.rtspUrl
        });

        try {
            // Test połączenia RTSP
            await this.testRTSPConnection(data.rtspUrl);

            const streamConfig = {
                name: `stream_${clientId}`,
                streamUrl: data.rtspUrl,
                wsPort: this.getRandomPort(),
                ffmpegOptions: FFMPEG_OPTIONS
            };

            // Utworzenie strumienia z obsługą błędów
            const stream = new Stream(streamConfig);

            // Monitorowanie strumienia
            this.monitorStream(stream, clientId);

            this.streams.set(clientId, stream);

            // Wysłanie konfiguracji do klienta
            ws.send(JSON.stringify({
                type: 'SETUP_SUCCESS',
                streamPort: streamConfig.wsPort,
                wsUrl: `ws://localhost:${streamConfig.wsPort}`,
                config: {
                    codec: 'h264',
                    fps: FFMPEG_OPTIONS['-r'],
                    bitrate: FFMPEG_OPTIONS['-b:v']
                }
            }));

            logger.info('Stream setup completed', {
                clientId,
                wsPort: streamConfig.wsPort
            });

        } catch (error) {
            this.handleStreamError(ws, error, clientId);
        }
    }

    monitorStream(stream, clientId) {
        // Monitorowanie FFmpeg
        stream.on('ffmpeg_stderr', (data) => {
            const stderr = data.toString();

            // Analiza błędów H.264
            if (stderr.includes('non-existing PPS') ||
                stderr.includes('decode_slice_header error') ||
                stderr.includes('no frame')) {

                logger.warn('H.264 decoding issue', {
                    clientId,
                    error: stderr
                });

                // Próba naprawy strumienia
                this.handleDecodingIssue(stream, clientId);
            }

            // Logowanie innych błędów FFmpeg
            if (stderr.includes('Error')) {
                logger.error('FFmpeg error', {
                    clientId,
                    error: stderr
                });
            }
        });

        // Monitorowanie danych
        let frameCount = 0;
        let lastCheck = Date.now();

        stream.on('data', () => {
            frameCount++;

            // Sprawdzanie FPS co sekundę
            if (Date.now() - lastCheck >= 1000) {
                logger.debug('Stream stats', {
                    clientId,
                    fps: frameCount,
                    timestamp: new Date().toISOString()
                });

                // Reset liczników
                frameCount = 0;
                lastCheck = Date.now();
            }
        });
    }

    async handleDecodingIssue(stream, clientId) {
        try {
            logger.info('Attempting to fix decoding issues', { clientId });

            // Zatrzymanie bieżącego strumienia
            stream.stop();

            // Rekonfiguracja z nowymi parametrami
            const newOptions = {
                ...FFMPEG_OPTIONS,
                '-vcodec': 'h264_ffmpeg', // Wymuszenie dekodera programowego
                '-skip_frame': 'none',
                '-vsync': '0',
                '-async': '1'
            };

            // Restart strumienia
            await new Promise(resolve => setTimeout(resolve, 1000));
            stream.start(newOptions);

            logger.info('Stream restarted with new configuration', { clientId });
        } catch (error) {
            logger.error('Failed to fix decoding issues', {
                clientId,
                error: error.message
            });
        }
    }

    async testRTSPConnection(url) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-rtsp_transport', 'tcp',
                '-i', url,
                '-show_entries', 'stream=codec_name,width,height',
                '-of', 'json'
            ]);

            let output = '';
            let error = '';

            ffprobe.stdout.on('data', (data) => {
                output += data;
            });

            ffprobe.stderr.on('data', (data) => {
                error += data;
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const streamInfo = JSON.parse(output);
                        logger.info('Stream probe successful', {
                            url,
                            info: streamInfo
                        });
                        resolve(streamInfo);
                    } catch (e) {
                        reject(new Error('Invalid stream data'));
                    }
                } else {
                    reject(new Error(`FFprobe failed: ${error}`));
                }
            });
        });
    }

    handleStreamError(ws, error, clientId) {
        logger.error('Stream error', {
            clientId,
            error: error.message,
            stack: error.stack
        });

        ws.send(JSON.stringify({
            type: 'error',
            message: 'Stream setup failed: ' + error.message,
            details: {
                timestamp: new Date().toISOString(),
                errorType: error.name,
                clientId
            }
        }));
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