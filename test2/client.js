
// client.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class RTSPClient {
    constructor(port, host) {
        this.port = port;
        this.host = host;
        this.ffmpegProcess = null;

        const framesDir = './received_frames';
        if (fs.existsSync(framesDir)) {
            fs.readdirSync(framesDir).forEach(file => {
                fs.unlinkSync(path.join(framesDir, file));
            });
        } else {
            fs.mkdirSync(framesDir);
        }

        this.setupConnection();
    }

    setupConnection() {
        const streamUrl = `rtmp://${this.host}:${this.port}/live/stream`;
        console.log(`Próba połączenia z ${streamUrl}`);

        this.ffmpegProcess = spawn('ffmpeg', [
            '-i', streamUrl,
            '-vf', 'fps=3',
            '-f', 'image2',
            '-update', '1',
            '-v', 'error',
            path.join('received_frames', 'frame%d.jpg')
        ]);

        this.ffmpegProcess.stderr.on('data', (data) => {
            console.log('FFmpeg Client:', data.toString());
        });

        this.ffmpegProcess.on('error', (error) => {
            console.error('Błąd FFmpeg:', error);
        });

        this.ffmpegProcess.on('exit', (code) => {
            console.log(`FFmpeg zakończył z kodem: ${code}`);
        });
    }

    stop() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGTERM');
        }
    }
}