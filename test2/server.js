// server.js
import { createCanvas } from 'canvas';
import NodeMediaServer from 'node-media-server';
import moment from 'moment';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import fs from 'fs';

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

const nms = new NodeMediaServer(config);

// Dodanie obsługi metadanych w serwerze RTMP
nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[PrePublish]', `id=${id} StreamPath=${StreamPath}`, args);
});

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[PostPublish]', `id=${id} StreamPath=${StreamPath}`, args);
    // Wysyłanie metadanych do strumienia
    const session = nms.getSession(id);
    if (session) {
        session.sendStreamStatus(StreamPath, {
            width: 640,
            height: 480,
            fps: 3,
            codec: 'h264'
        });
    }
});

nms.run();

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

                // Przygotowanie metadanych jako tekstu na klatce
                const metadata = {
                    timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
                    frameNumber: this.frameCount,
                    objectPosition: { x, y: 200 }
                };

                // Dodanie metadanych jako tekst w specjalnym formacie
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(`METADATA:${JSON.stringify(metadata)}`, 10, 470);
                this.ctx.fillText(`Frame: ${this.frameCount}`, 10, 20);

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

const streamGenerator = new VideoStreamGenerator();

// FFmpeg z konfiguracją dla przesyłania metadanych
const ffmpegPublish = spawn('ffmpeg', [
    '-re',
    '-f', 'image2pipe',
    '-framerate', '3',
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-movflags', '+faststart',
    '-metadata', 'encoder=ffmpeg',
    '-metadata', 'creation_time=now',
    '-f', 'flv',
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
