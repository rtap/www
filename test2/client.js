
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const RETRY_INTERVAL = 5000;
const MAX_RETRIES = 5;

export class RTSPClient {
    constructor(port, host) {
        this.port = port;
        this.host = host;
        this.retries = 0;
        this.connected = false;
        this.ffmpegProcess = null;

        if (!fs.existsSync('./received_frames')) {
            fs.mkdirSync('./received_frames');
        }

        this.setupConnection();
    }

    setupConnection() {
        try {
            const streamUrl = `rtmp://${this.host}:${this.port}/live/stream`;
            console.log(`Próba połączenia z ${streamUrl}`);

            this.ffmpegProcess = spawn('ffmpeg', [
                '-i', streamUrl,
                '-vf', 'fps=3',
                '-f', 'image2',
                '-update', '1',
                path.join('received_frames', 'frame%d.jpg')
            ]);

            this.ffmpegProcess.stderr.on('data', (data) => {
                console.log('FFmpeg Client:', data.toString());
            });

            this.ffmpegProcess.on('error', (error) => {
                console.error('Błąd FFmpeg:', error);
                this.tryReconnect();
            });

            this.ffmpegProcess.on('exit', (code) => {
                console.log('FFmpeg zakończył z kodem:', code);
                if (code !== 0) {
                    this.tryReconnect();
                }
            });

            this.connected = true;
        } catch (error) {
            console.error('Błąd konfiguracji:', error);
            this.tryReconnect();
        }
    }

    tryReconnect() {
        if (this.retries >= MAX_RETRIES) {
            console.error('Przekroczono maksymalną liczbę prób połączenia');
            return;
        }

        this.retries++;
        console.log(`Ponowna próba połączenia (${this.retries}/${MAX_RETRIES}) za ${RETRY_INTERVAL/1000}s...`);

        setTimeout(() => {
            if (!this.connected) {
                this.setupConnection();
            }
        }, RETRY_INTERVAL);
    }

    stop() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill();
        }
    }
}

