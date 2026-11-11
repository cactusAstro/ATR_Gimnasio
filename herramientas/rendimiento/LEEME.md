# Medidas de rendimiento de ATR-GYM

Herramientas con las que se midió el trabajo de fluidez de noviembre de 2026 (resultados en
[INFORME.md](INFORME.md)). No forman parte de la web: sirven para repetir las medidas, para comprobar
que un cambio futuro no la vuelve lenta y para regenerar las imágenes previas del 3D.

Miden con Playwright en dos motores: **Chromium con la CPU ralentizada ×4** (aproxima un Android de gama
media) y **WebKit** (el motor de Safari). Siempre en un contexto de móvil táctil (375 × 667, densidad 2)
salvo que se indique `--escritorio`.

## Preparar (una vez)

Hace falta macOS con Python 3. Playwright y sus navegadores (unos 900 MB) se instalan en una carpeta de
trabajo **fuera de la web**, que al acabar se borra entera.

```bash
cd ruta/a/la/web
LAB=~/atr-lab
python3 -m venv "$LAB/venv"
"$LAB/venv/bin/pip" install playwright==1.65.0
PLAYWRIGHT_BROWSERS_PATH="$LAB/navegadores" "$LAB/venv/bin/playwright" install chromium webkit
mkdir -p herramientas/rendimiento/vendor
curl -sSfL -o herramientas/rendimiento/vendor/axe.min.js https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js
curl -sSfL -o herramientas/rendimiento/vendor/pixelmatch.js https://cdn.jsdelivr.net/npm/pixelmatch@5.3.0/index.js
herramientas/rendimiento/preparar.sh "$LAB"
export PLAYWRIGHT_BROWSERS_PATH="$LAB/navegadores"
PY="$LAB/venv/bin/python"; H=herramientas/rendimiento
```

`preparar.sh` deja dos copias de la web en `$LAB/snap`: **`antes`** (la versión publicada antes de este
trabajo, commit `13f1abf`; con `ANTES=<commit>` se elige otra) y **`despues`** (la carpeta tal como está
ahora). Y arranca dos servidores que solo escuchan en este ordenador: el puerto **8770** sin comprimir y
el **8771** con gzip, como GitHub Pages. Tras cambiar algo en la web, vuelve a ejecutar `preparar.sh`.

## Medir

Cada orden repite el escenario en un navegador limpio y da la mediana (y mínimo y máximo). Para comparar,
ejecútala con `antes` y con `despues`. Nunca dos medidas a la vez: se estorban.

| Qué | Orden |
|---|---|
| Carga (perfil móvil de Lighthouse: CPU ×4, 150 ms, 1,6 Mbps, gzip) | `$PY $H/lab.py carga http://127.0.0.1:8771/despues/index.html --cpu 4 --red lighthouse --pasadas 5` |
| Botón «Calcular» de la barra de abajo | `$PY $H/lab.py salto http://127.0.0.1:8770/despues/index.html --motor chromium --cpu 4 --pasadas 5` |
| Botón «Inicio» desde el final de la página | `$PY $H/lab.py salto http://127.0.0.1:8770/despues/index.html --motor chromium --cpu 4 --pasadas 5 --selector '.barra-pestanas a[data-id="top"]' --destino '#top' --desde 45000 --arriba` |
| Scroll de toda la página | `$PY $H/lab.py scroll http://127.0.0.1:8770/despues/index.html --motor chromium --cpu 4 --pasadas 5` |
| Abrir el menú | `$PY $H/lab.py menu http://127.0.0.1:8770/despues/index.html --motor chromium --cpu 4 --pasadas 5` |
| Montaje automático del 3D (versión `antes`, o escritorio) | `$PY $H/lab.py 3d http://127.0.0.1:8770/antes/boxeo.html --motor webkit --pasadas 3 --limite 90` |
| 3D en táctil: de tocar la imagen a escena lista | `$PY $H/flujo3d.py http://127.0.0.1:8770/despues/boxeo.html chromium 4 /tmp/flujo.png` |
| 3D: perfil ligero frente a completo (shaders y luz media) | `$PY $H/comparar3d.py http://127.0.0.1:8770/despues/boxeo.html 4` |
| Peso visual en pantalla (desenfoques, sombras, máscaras) | `$PY $H/auditoria.py http://127.0.0.1:8770/despues/index.html --paso 450` |
| Quién causa los fotogramas largos al hacer scroll | `$PY $H/loaf.py http://127.0.0.1:8771/despues/index.html 4` |
| Accesibilidad: reglas de axe nuevas o peores | `$PY $H/axe.py http://127.0.0.1:8770 antes despues index.html boxeo.html culturismo.html powerlifting.html` |
| Diferencias visuales, sección a sección | `$PY $H/visual.py http://127.0.0.1:8770 antes despues index.html móvil "$LAB/capturas"` |

En todas las de `lab.py`, `--motor webkit` mide en el motor de Safari (ahí `--cpu` no tiene efecto).

## Qué significa cada cifra

- **fcp / lcp**: primer pintado y pintado del elemento más grande (ms). **listo**: fin de la pantalla de carga,
  cuando la portada queda a la vista. **tbt**: bloqueo total del hilo principal. **cls**: saltos de maquetación.
  **kb**: lo descargado.
- **fr_p50 / fr_p95 / fr_max**: tiempo entre fotogramas (ms). 16,7 ms son 60 fps; 33,3 ms, 30 fps.
- **fr_pct33**: porcentaje de fotogramas a 30 fps o peor. **fr_paradas100**: parones de 100 ms o más.
- **llegada_ms**: desde el toque hasta que el destino queda quieto en su sitio. **error_aterrizaje_px**: a
  cuántos píxeles del sitio correcto queda.
- **TaskDuration / RecalcStyleDuration**: segundos de trabajo del hilo principal (solo Chromium).
- **tareas_largas**: tareas de más de 50 ms.

## Imágenes previas del 3D

En móviles y tablets cada escena 3D muestra primero una imagen (`img/3d/…-vertical.webp` y
`…-horizontal.webp`) hecha con el mismo perfil que se monta al tocarla. **Si cambias una escena, regenera
sus imágenes** para que al aparecer el 3D no se note el cambio:

```bash
$PY $H/posters.py http://127.0.0.1:8770/despues/index.html .gym3d img/3d/gimnasio
for e in boxeo culturismo powerlifting; do $PY $H/posters.py http://127.0.0.1:8770/despues/$e.html .escena3d img/3d/$e; done
```

## En el móvil de verdad

Añade `?diagnostico` a la dirección de cualquier página con 3D (por ejemplo `boxeo.html?diagnostico`) y,
al montar la escena, aparece un recuadro con lo que ha tardado cada fase, la cadencia real de fotogramas y
los shaders compilados. Es la forma de medir en un iPhone o un Android concretos.

## Recoger

```bash
herramientas/rendimiento/preparar.sh "$LAB" parar
rm -rf "$LAB" herramientas/rendimiento/vendor
```
