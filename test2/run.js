// run.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { RTSPClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Konfiguracja
const SERVER_PORT = 8008;
const RTMP_PORT = 1935;

let clientInstance = null;

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

// Poczekaj na uruchomienie serwera i strumienia
setTimeout(() => {
    console.log('Uruchamianie klienta...');
    clientInstance = new RTSPClient(RTMP_PORT, '127.0.0.1');
}, 5000);

process.on('SIGINT', () => {
    console.log('Zamykanie aplikacji...');
    if (clientInstance) {
        clientInstance.stop();
    }
    server.kill();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Nieobsłużone odrzucenie obietnicy:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Nieobsłużony wyjątek:', error);
    if (error?.code === 'EPIPE') {
        console.log('Ignorowanie błędu EPIPE...');
        return;
    }
    process.exit(1);
});
