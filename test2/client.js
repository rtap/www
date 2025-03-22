
// client.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';

export class RTSPClient {
    constructor(port, host) {
        this.port = port;
        this.host = host;
        this.ffmpegProcess = null;
        this.frameCount = 0;

        // Inicjalizacja Tesseract
        Tesseract.createWorker({
            logger: m => console.log(m)
        }).then(worker => {
            this.worker = worker;
        });

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
            '-frame_pts', '1',
            path.join('received_frames', 'frame-%d.jpg')
        ]);

        this.ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            if (!output.includes('frame=') && !output.includes('config')) {
                console.log('FFmpeg Client:', output);
            }
        });

        this.ffmpegProcess.on('error', (error) => {
            console.error('Błąd FFmpeg:', error);
        });

        // Monitorowanie katalogu z klatkami
        fs.watch('./received_frames', async (eventType, filename) => {
            if (eventType === 'rename' && filename.startsWith('frame-') && filename.endsWith('.jpg')) {
                const framePath = path.join('received_frames', filename);
                // Poczekaj chwilę, aby upewnić się, że plik jest zapisany
                setTimeout(() => {
                    this.extractMetadataFromFrame(framePath, filename);
                }, 100);
            }
        });
    }

    async extractMetadataFromFrame(framePath, filename) {
        try {
            const { data } = await this.worker.recognize(framePath);
            const text = data.text;

            // Szukanie metadanych w tekście
            const metadataMatch = text.match(/METADATA:(\{.*\})/);
            if (metadataMatch) {
                const metadata = JSON.parse(metadataMatch[1]);
                console.log(`Metadane dla ${filename}:`, metadata);

                // Zapisz metadane obok klatki
                const metadataFile = framePath.replace('.jpg', '.json');
                fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
            }
        } catch (error) {
            console.error('Błąd odczytu metadanych:', error);
        }
    }

    stop() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGTERM');
        }
        if (this.worker) {
            this.worker.terminate();
        }
    }
}
