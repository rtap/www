// server.js
import { createCanvas } from 'canvas';
import NodeMediaServer from 'node-media-server';
import moment from 'moment';

// Konfiguracja serwera RTSP
const config = {
    rtsp_server: {
        port: 5555,
        chunk_size: 60000,
        gop_cache: true,
        gop_cache_size: 60,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8008,
        allow_origin: '*'
    }
};

const nms = new NodeMediaServer(config);
nms.run();

// Generowanie klatek wideo
const canvas = createCanvas(640, 480);
const ctx = canvas.getContext('2d');
let frameCount = 0;

function generateFrame() {
    // Czyszczenie canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 640, 480);

    // Rysowanie przykładowego obiektu
    ctx.fillStyle = 'red';
    ctx.fillRect(frameCount % 580, 200, 60, 60);

    // Generowanie metadanych
    const metadata = {
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
        frameNumber: frameCount,
        imageSize: {
            width: 640,
            height: 480
        },
        colorInfo: {
            dominantColor: 'red',
            brightness: 0.5,
            contrast: 0.8
        },
        detectedObjects: [
            {
                type: 'square',
                position: {
                    x: frameCount % 580,
                    y: 200
                },
                size: {
                    width: 60,
                    height: 60
                }
            }
        ]
    };

    // Dodawanie metadanych jako tekst na klatkę
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(JSON.stringify(metadata), 10, 20);

    frameCount++;
    return {
        frame: canvas.toBuffer('image/jpeg'),
        metadata: metadata
    };
}

// Wysyłanie klatek co 333ms (3 FPS)
setInterval(() => {
    const { frame, metadata } = generateFrame();
    // Tu należy dodać kod do wysyłania ramki przez RTSP
    // Przykład wykorzystania node-media-server do publikowania strumienia
    // nms.publish('stream', frame, metadata);
}, 333);
