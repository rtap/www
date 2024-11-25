// Skrypt do uruchomienia środowiska testowego
// run.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Uruchomienie serwera
const server = spawn('node', ['server.js'], {
    cwd: __dirname
});

// Poczekaj 2 sekundy na uruchomienie serwera
setTimeout(() => {
    // Uruchomienie klienta
    const client = spawn('node', ['client.js'], {
        cwd: __dirname
    });

    client.stdout.on('data', (data) => {
        console.log(`Klient: ${data}`);
    });

    client.stderr.on('data', (data) => {
        console.error(`Błąd klienta: ${data}`);
    });
}, 2000);

server.stdout.on('data', (data) => {
    console.log(`Serwer: ${data}`);
});

server.stderr.on('data', (data) => {
    console.error(`Błąd serwera: ${data}`);
});