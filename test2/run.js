import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { RTSPClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Konfiguracja
const SERVER_PORT = 8008;
const RTMP_PORT = 1935;

console.log(`Uruchamianie serwera na portach HTTP: ${SERVER_PORT}, RTMP: ${RTMP_PORT}`);

// Uruchomienie serwera
const server = spawn('node', ['server.js'], {
    cwd: __dirname
});

server.stdout.on('data', (data) => {
    console.log(`Serwer: ${data}`);
});

server.stderr.on('data', (data) => {
    console.error(`Błąd serwera: ${data}`);
});

// Poczekaj na uruchomienie serwera
setTimeout(() => {
    console.log('Uruchamianie klienta...');
    const client = new RTSPClient(RTMP_PORT, '127.0.0.1');
    client.connect();
}, 5000);  // Zwiększony czas oczekiwania do 5 sekund

process.on('unhandledRejection', (reason, promise) => {
    console.error('Nieobsłużone odrzucenie obietnicy:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Nieobsłużony wyjątek:', error);
});