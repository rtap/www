// rtspHandler.js
const Stream = require('node-rtsp-stream');
const { spawn } = require('child_process');

class RTSPHandler {
    constructor(config) {
        this.config = config;
        this.stream = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async testRTSPConnection(url) {
        return new Promise((resolve, reject) => {
            // Używamy ffprobe do sprawdzenia połączenia RTSP
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-rtsp_transport', 'tcp', // Próbuj TCP jako pierwszy
                '-i', url,
                '-show_entries', 'stream=width,height,codec_type',
                '-of', 'json'
            ]);

            let outputData = '';
            let errorData = '';

            ffprobe.stdout.on('data', (data) => {
                outputData += data;
            });

            ffprobe.stderr.on('data', (data) => {
                errorData += data;
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const streamInfo = JSON.parse(outputData);
                        resolve(streamInfo);
                    } catch (e) {
                        reject(new Error('Invalid stream data'));
                    }
                } else {
                    // Próbujemy UDP jeśli TCP nie zadziałało
                    this.testRTSPWithUDP(url)
                        .then(resolve)
                        .catch(() => reject(new Error(`Failed to connect: ${errorData}`)));
                }
            });
        });
    }

    async testRTSPWithUDP(url) {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-rtsp_transport', 'udp',
                '-i', url,
                '-show_entries', 'stream=width,height,codec_type',
                '-of', 'json'
            ]);

            let outputData = '';
            let errorData = '';

            ffprobe.stdout.on('data', (data) => {
                outputData += data;
            });

            ffprobe.stderr.on('data', (data) => {
                errorData += data;
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const streamInfo = JSON.parse(outputData);
                        resolve(streamInfo);
                    } catch (e) {
                        reject(new Error('Invalid stream data'));
                    }
                } else {
                    reject(new Error(`Failed to connect with UDP: ${errorData}`));
                }
            });
        });
    }

    async startStream(url, wsPort) {
        try {
            console.log(`Testing RTSP connection to: ${url}`);
            const streamInfo = await this.testRTSPConnection(url);
            console.log('Stream info:', streamInfo);

            this.stream = new Stream({
                name: 'stream',
                streamUrl: url,
                wsPort: wsPort,
                ffmpegOptions: {
                    '-rtsp_transport': 'tcp', // Domyślnie używamy TCP
                    '-stats': '',
                    '-r': 30,
                    '-q:v': 3,  // Jakość wideo (1-31, mniejsza = lepsza)
                    '-preset': 'ultrafast',
                    '-tune': 'zerolatency',
                    '-probesize': '32',
                    '-analyzeduration': '0',
                    '-fflags': 'nobuffer'
                }
            });

            // Nasłuchiwanie na błędy strumienia
            this.stream.on('error', (error) => {
                console.error('Stream error:', error);
                this.handleStreamError(error, url, wsPort);
            });

            return {
                success: true,
                info: streamInfo
            };
        } catch (error) {
            console.error('Failed to start stream:', error);
            throw error;
        }
    }

    handleStreamError(error, url, wsPort) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
            this.reconnectAttempts++;

            // Próba ponownego połączenia z UDP jeśli TCP zawiodło
            const newOptions = {
                ...this.stream.options,
                ffmpegOptions: {
                    ...this.stream.options.ffmpegOptions,
                    '-rtsp_transport': this.reconnectAttempts % 2 === 0 ? 'tcp' : 'udp'
                }
            };

            setTimeout(() => {
                this.startStream(url, wsPort);
            }, 2000);
        } else {
            console.error('Max reconnection attempts reached');
            this.stream.stop();
        }
    }

    stop() {
        if (this.stream) {
            this.stream.stop();
            this.stream = null;
        }
    }
}

module.exports = RTSPHandler;