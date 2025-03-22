ffplay rtmp://localhost:1935/live/stream

2. **Drugi Plik WebM: Przesuwający się Tekst**

Wywołanie FFmpeg, aby stworzyć tekst przesuwający się na ekranie:

```bash
ffmpeg -f lavfi -i color=c=black:size=1280x720:rate=30 -vf "drawtext=fontfile=/path/to/font.ttf:text='Drugie video Animacja':fontcolor=white:fontsize=172:x=w-tw-10*mod(t\,10):y=h-th-100" -t 10 -c:v libvpx -auto-alt-ref 0 video_segment_2.webm
```

### Objaśnienie Parametrów

- `-f lavfi -i color=c=blue:size=1280x720:rate=30`: Ustawiamy tło niebieskie o rozdzielczości 1280x720 pikseli oraz 30 klatek na sekundę.

- `-vf gradients`: Filtr generowania gradientu, zmienia się w czasie od czerwonego do czarnego do żółtego, przez 10 sekund.

- `drawtext`: Filtr do nanoszenia tekstu na wideo. Tekst przesuwa się w poziomie po ekranie. Upewnij się, że podana ścieżka do fontu jest poprawna.

- `-t 10`: Czas trwania filmu ustawiony na 10 sekund.

- `-c:v libvpx`: Używamy kodeka VP8 do enkodowania video WebM.

- `-auto-alt-ref 0`: Używamy tego ustawienia aby uniknąć problemów z kompatybilnością w niektórych systemach odtwarzających WebM.