
// server.js
import { createCanvas } from 'canvas';
import NodeMediaServer from 'node-media-server';
import moment from 'moment';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import fs from 'fs';

// Upewnij się, że katalogi istnieją
if (!fs.existsSync('./media/live')) {
    fs.mkdirSync('./media/live', { recursive: true });
}

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
        if (!this.running) {
            this.push(null);
            return;
        }
        this.generateNextFrame();
    }

    generateNextFrame() {
        if (!this.running) return;

        setTimeout(() => {
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
                    objectPosition: { x, y: 200 },
                    // random: randomInt(1000, 9999)
                };

                // Dodanie tekstu metadanych na klatkę
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(JSON.stringify(metadata), 10, 20);

                this.frameCount++;

                const frameBuffer = this.canvas.toBuffer('image/jpeg');
                this.push(frameBuffer);
            } catch (error) {
                console.error('Błąd generowania klatki:', error);
                this.push(null);
            }
        }, 333);
    }

    stop() {
        this.running = false;
    }
}

const nms = new NodeMediaServer(config);
nms.run();

const streamGenerator = new VideoStreamGenerator();

// Użyj FFmpeg do publikowania strumienia
const ffmpegPublish = spawn('ffmpeg', [
    '-re',  // Odtwarzanie z prędkością rzeczywistą
    '-f', 'image2pipe',
    '-framerate', '3',
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize',
    'rtmp://localhost:1935/live/stream'
]);

ffmpegPublish.stderr.on('data', (data) => {
    console.log('FFmpeg:', data.toString());
});

ffmpegPublish.on('error', (error) => {
    console.error('FFmpeg error:', error);
});

streamGenerator.pipe(ffmpegPublish.stdin);

process.on('SIGINT', () => {
    console.log('Zatrzymywanie...');
    streamGenerator.stop();
    ffmpegPublish.kill();
    nms.stop();
});
