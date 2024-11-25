// client.js
import { createCanvas, loadImage } from 'canvas';
import net from 'net';

const client = new net.Socket();

client.connect(5555, '127.0.0.1', () => {
    console.log('Połączono z serwerem RTSP');
});

let buffer = Buffer.alloc(0);

client.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);

    // Próba znalezienia kompletnej ramki
    while (buffer.length > 0) {
        // Tu należy zaimplementować logikę parsowania ramek RTSP
        // i wyodrębniania metadanych

        const frame = extractFrame(buffer);
        if (!frame) break;

        const metadata = extractMetadata(frame);
        console.log('Odebrano klatkę z metadanymi:', metadata);

        // Usunięcie przetworzonej ramki z bufora
        buffer = buffer.slice(frame.length);
    }
});

function extractFrame(buffer) {
    // Implementacja wyodrębniania ramki z bufora
    // W rzeczywistym przypadku należy zaimplementować
    // właściwą logikę parsowania protokołu RTSP
    return null;
}

function extractMetadata(frame) {
    // Implementacja wyodrębniania metadanych z ramki
    // W rzeczywistym przypadku należy zaimplementować
    // właściwą logikę parsowania metadanych
    return null;
}

client.on('close', () => {
    console.log('Połączenie zamknięte');
});

