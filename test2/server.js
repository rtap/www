// server.js
import { createCanvas } from 'canvas';
import NodeMediaServer from 'node-media-server';
import moment from 'moment';
import { spawn } from 'child_process';
import { Readable } from 'stream';

const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8008,
        mediaroot: './media',
        allow_origin: '*'
    }
};

class VideoStreamGenerator extends Readable {
    constructor(options) {
        super(options);
        this.canvas = createCanvas(640, 480);
        this.ctx = this.canvas.getContext('2d');
        this.frameCount = 0;
        this.running = true;
    }

    _read() {
        if (!this.running) return;
        this.generateNextFrame();
    }

    generateNextFrame() {
        setTimeout(() => {
            if (!this.running) return;

            try {
                // Czyszczenie canvas
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(0, 0, 640, 480);

                // Rysowanie czerwonego kwadratu
                this.ctx.fillStyle = 'red';
                const x = this.frameCount % 580;
                this.ctx.fillRect(x, 200, 60, 60);

                // Metadane
                const metadata = {
                    timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
                    frameNumber: this.frameCount,
                    objectPosition: { x, y: 200 }
                };

                // Dodanie tekstu metadanych na klatkę
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(JSON.stringify(metadata), 10, 20);

                this.frameCount++;

                const frameBuffer = this.canvas.toBuffer('image/jpeg');
                this.push(frameBuffer);

                this.generateNextFrame();
            } catch (error) {
                console.error('Błąd generowania klatki:', error);
                this.generateNextFrame();
            }
        }, 333); // ~3 FPS
    }

    stop() {
        this.running = false;
        this.push(null);
    }
}

// Inicjalizacja serwera RTMP
const nms = new NodeMediaServer(config);

nms.on('preConnect', (id, args) => {
    console.log('[PreConnect]', `id=${id}`, args);
});

nms.on('postConnect', (id, args) => {
    console.log('[PostConnect]', `id=${id}`, args);
});

nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[PrePublish]', `id=${id} StreamPath=${StreamPath}`, args);
});

nms.run();

// Inicjalizacja generatora strumienia
const streamGenerator = new VideoStreamGenerator();

// Uruchomienie FFmpeg jako osobny proces
const ffmpeg = spawn('ffmpeg', [
    '-f', 'image2pipe',
    '-framerate', '3',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-f', 'flv',
    '-s', '640x480',
    '-r', '3',
    'rtmp://localhost:1935/live/stream'
]);

ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg:', data.toString());
});

ffmpeg.on('error', (error) => {
    console.error('FFmpeg error:', error);
});

ffmpeg.on('exit', (code, signal) => {
    console.log('FFmpeg zakończył działanie z kodem:', code);
});

// Podłączenie generatora do FFmpeg
streamGenerator.pipe(ffmpeg.stdin);

process.on('SIGINT', () => {
    console.log('Zatrzymywanie...');
    streamGenerator.stop();
    ffmpeg.kill();
    nms.stop();
    process.exit();
});

