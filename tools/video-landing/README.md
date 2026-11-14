# Vídeo 3D fly-over da landing (FactoryTrack)

14,5 s, 1440x1152, 60 fps, H.264. Filme em WebGL2 (`film.html`, tudo calculado em `FILM.seek(t)`).

```
npm install
npx playwright install chromium
node capture.js          # captura a landing ao vivo em cap/
node render.js stills    # 7 quadros de conferência em saida/
node render.js final     # MP4 final em saida/FactoryTrack-flyover-3D.mp4
```
Trilha opcional: defina `FT_TRACK=caminho\musica.mp3` antes do `render.js final`.
