# Informe de fluidez — ATR-GYM (noviembre de 2026)

**Objetivo:** que la web se sienta tan fluida como una app de Apple en un iPhone SE 2022 y en un móvil de
gama media, sin cambiar contenido, textos, funciones ni lo que guarda la web.

**Resultado en una frase:** en móvil, los botones de la barra de abajo llegan a su sitio en una décima de
segundo (antes no llegaban o tardaban 1,6 s), la portada aparece 1,1 s antes, el 3D ya no frena la página
porque solo se monta al tocarlo, y hacer scroll cuesta al procesador un tercio de lo que costaba.

**Aviso importante:** el «antes» está medido en tu iPhone SE (tu grabación). El «después» está medido en
laboratorio y revisado en un navegador de escritorio en tamaño móvil, **no en el iPhone**. La comprobación en
el aparato real quedó fuera a petición tuya; ver «Lo que no se ha podido medir».

## 1. Punto de partida: tu grabación en el iPhone SE

Grabación de pantalla del 6 de noviembre sobre la web publicada (`main`, commit `13f1abf`), analizada
fotograma a fotograma (91 s, 4.833 fotogramas).

| Qué se veía | Medida |
|---|---|
| Actualizaciones de pantalla a 30 fps o peor, con la página en movimiento | 29 % (el 13 %, a 20 fps o peor) |
| Parones de 100 ms o más | 96 |
| Pantalla en negro al tocar los botones de abajo | 7 veces, 5,42 s en total, la mayor 1,43 s |
| Desde el toque hasta ver la portada | unos 2,9 s, de ellos 1,7 s de pantalla de carga |
| Escena 3D de la portada | sin terminar de montarse a los 6 s |
| Escena 3D de Boxeo | sin terminar a los 10 s; la página tardaba 2,9 s en abrirse |

## 2. Antes y después (laboratorio)

`main` (`13f1abf`, lo publicado) frente a la rama `rendimiento-iphone-se` (`3a10f64`). Medición del 11 de
noviembre con Playwright 1.65.0: **Chromium con la CPU ralentizada ×4** (aproxima un Android de gama media)
y **WebKit** (el motor de Safari), en un móvil táctil de 375 × 667 a densidad 2. Mediana de 5 pasadas.
Las órdenes para repetirlo están en [LEEME.md](LEEME.md).

### Carga (perfil móvil de Lighthouse: CPU ×4, 150 ms, 1,6 Mbps, con gzip)

| Página | Primer pintado (FCP) | Portada a la vista | Peso descargado | Bloqueo (TBT) | Saltos (CLS) |
|---|---|---|---|---|---|
| Portada | 1,06 → 1,03 s | **2,63 → 1,48 s** | 224 → 231 KB | 5 → 0 ms | 0 → 0 |
| Boxeo | 1,00 → 1,02 s | igual que el FCP | **497 → 245 KB** | 0 → 0 ms | 0 → 0 |
| Culturismo | 1,01 → 1,03 s | igual que el FCP | **500 → 244 KB** | 0 → 0 ms | 0 → 0 |
| Powerlifting | 1,02 → 1,05 s | igual que el FCP | **501 → 247 KB** | 0 → 0 ms | 0 → 0 |

- El primer pintado no cambia (las diferencias son de uno o dos fotogramas).
- «Portada a la vista» es el fin de la pantalla de carga. El LCP que da el navegador pasa de 2,71 s a 1,03 s,
  pero esa cifra favorece demasiado: en la rama el elemento más grande es el logotipo de la propia pantalla de
  carga. El dato honrado es 1,48 s.
- En las disciplinas el peso baja a la mitad porque Three.js ya no se descarga solo.

### Botones de la barra de abajo

| Botón | Motor | Antes | Después |
|---|---|---|---|
| «Calcular», desde arriba | Chromium ×4 | no llegaba: se quedaba 1.954 px fuera de sitio, con 2 parones | **103 ms**, 0 px de error, 0 parones |
| «Calcular», desde arriba | WebKit | no llegaba: 1.449 px fuera de sitio | **63 ms**, 0 px de error |
| «Inicio», desde el final | Chromium ×4 | 1.576 ms, un 10 % de fotogramas a 30 fps o peor | **67 ms**, 0 % |
| «Inicio», desde el final | WebKit | 266 ms | **52 ms** |

### Scroll de toda la página

| Página | Motor | Fotograma más largo | Fotogramas a 30 fps o peor | Parones ≥ 100 ms | Trabajo del hilo principal |
|---|---|---|---|---|---|
| Portada | Chromium ×4 | 133 → **33 ms** | 0,77 → 0,08 % | 1 → 0 | 12,0 → **4,3 s** |
| Portada | WebKit | 32 → 28 ms | 0,08 → 0 % | 0 → 0 | no disponible |
| Boxeo ¹ | Chromium ×4 | 117 → **17 ms** | 2,4 → 0 % | 1 → 0 | 3,8 → 1,8 s |
| Boxeo ¹ | WebKit | 45 → 23 ms | 0,4 → 0 % | 0 → 0 | no disponible |

¹ Medido el 7 de noviembre, antes de los últimos retoques (con Chromium 1248 y WebKit 2370).

Abrir el menú no cambia: 16,7–18 ms por fotograma antes y después, en los dos motores.

### Lo que hay que pintar en móvil

| En la portada, en táctil | Antes | Después |
|---|---|---|
| Elementos con desenfoque de fondo | 23 | 2 (la barra de arriba y la de abajo) |
| Peso de pintado por pantalla (sombras grandes, máscaras, degradados cónicos) | 76 | 3 |
| Textos y menús que entran desenfocados | sí | no (opacidad y desplazamiento) |

En ordenador no cambia nada de esto.

### Escenas 3D en móvil

| | Antes | Después |
|---|---|---|
| Qué se ve al llegar | caja vacía mientras se monta | imagen de la escena, al instante |
| Three.js (unos 700 KB) | se descargaba solo | solo al tocar «Toca para explorar en 3D» |
| Código de shaders que compilar, portada | 1.000 KB | 808 KB (−19 %) |
| Código de shaders, Boxeo / Culturismo / Powerlifting | 2.062 / 2.319 / 2.338 KB | 1.571 / 1.638 / 1.640 KB (−24 / −29 / −30 %) |
| Luz media frente a la versión completa | — | a un 5 / 0,7 / 3,5 / 4,8 % |
| De tocar a escena lista (en un Mac, no en un móvil) | — | 0,7–1,5 s la portada; 1,5–1,9 s las disciplinas |

Con la escena en marcha, la página sigue a 60 fps en la revisión en navegador (95 % de los fotogramas por
debajo de 17,5 ms). Las cifras de shaders y de luz son del 7 de noviembre.

## 3. Presupuesto

| Objetivo | Resultado | |
|---|---|---|
| FCP ≤ 1,8 s y LCP ≤ 2,5 s | 1,03–1,05 s; portada a la vista en 1,48 s | Cumple (laboratorio) |
| TBT ≤ 200 ms | 0 ms | Cumple |
| CLS ≤ 0,1 | 0 | Cumple |
| Respuesta de la barra de pestañas ≤ 100 ms | 52–103 ms | Cumple (laboratorio) |
| Scroll sin fotogramas de más de 50 ms | máximo 33 ms en Chromium ×4 | Cumple, salvo el caso de abajo |
| Descarga inicial ≤ 400 KB | 231–247 KB | Cumple |
| 3D visible en ≤ 3 s y sin congelar la página | imagen inmediata; el 3D, al tocar | Cumple en laboratorio; sin medir en el iPhone |
| Animaciones solo con `transform` y `opacity` | entradas y menús sí; la barra de pestañas al recogerse no | Parcial, a propósito |
| Memoria del 3D | — | Sin medir |

- **Caso que no cumple:** la primera vez que alguien llega al final de la portada se apunta el logro «Recorrido
  completo» y queda un fotograma de unos 110 ms (antes 160–175 ms). Pasa una sola vez por persona.
- **La barra de pestañas** sigue animando su tamaño al recogerse. Probé a hacerlo solo con `transform`:
  ahorraba trabajo (618 → 12 maquetaciones) pero casi no cambiaba los fotogramas, y la barra dejaba de
  encogerse en la cápsula estrecha. Lo revertí para conservar tu diseño.

## 4. Comprobaciones externas

- **axe-core 4.10.2** (accesibilidad), `main` → rama, cuatro páginas en móvil y escritorio: **0 reglas nuevas o
  peores**. (Medido el 7 de noviembre; se repite con la versión final.)
- **pixelmatch 5.3.0** (diferencias visuales, sección a sección): en escritorio, 19 de 22 secciones de la
  portada son idénticas y el resto difiere menos de un 1,7 % (suavizado de texto). En móvil cada sección difiere
  entre un 1,5 y un 7 %: son las sombras, los desenfoques y los bordes de luz quitados a propósito.
- **Lighthouse CI** en GitHub Actions (`.github/workflows/presupuesto.yml` y `lighthouserc.json`): falla un
  pull request hacia `main` si alguna página se sale del presupuesto. **No se ha ejecutado todavía**: este Mac
  no tiene Node; correrá en GitHub con el primer pull request.
- **Revisión en navegador** (Chromium, escritorio y tamaño móvil táctil): las cuatro páginas sin errores de
  consola ni desbordes; saltos, buscador, menú, pantalla de carga, logro y 3D comprobados uno a uno. De esa
  revisión salieron cuatro de los arreglos de la lista de abajo.

## 5. Lo que no se ha podido medir

1. **El iPhone SE después de los cambios.** No hay grabación ni traza del «después» en el aparato real.
2. **Traza de Safari Web Inspector** y respuesta real a los toques (INP) en el iPhone.
3. **Un Android de gama media real.** Chromium con la CPU ×4 lo aproxima, pero usa la gráfica del Mac.
4. **El efecto real de quitar desenfoques y sombras en la gráfica de un móvil.** Se estima por lo que deja de
   pintarse, no por fotogramas medidos en el aparato.
5. **PageSpeed y Lighthouse reales**: la API pública devolvió «cuota agotada» los dos días.
6. **WebPageTest**: pide una cuenta.
7. **La prueba a ciegas** con dos o tres personas.
8. **Grabaciones de referencia de Apple a 120 fps.**
9. **Memoria del 3D** y pérdidas de contexto WebGL en un uso largo.
10. **El tiempo de montaje del 3D en el iPhone.** Para verlo: abre `boxeo.html?diagnostico` en el móvil y toca
    la escena; sale un recuadro con lo que tarda cada fase.

## 6. Problemas conocidos que no he tocado

- **Accesibilidad que ya estaba así** (igual antes y después): contraste del pie de página, orden de
  encabezados, falta de `<main>` en la portada, la lista `#ruta`, el enlace de las migas y las tablas con
  scroll sin foco de teclado. Arreglarlo toca marcado y colores.
- **Modo de bajo consumo del iPhone:** Safari limita las animaciones a 30 fps y la escalera de calidad del 3D
  lo toma por lentitud y baja la resolución, como ya hacía antes. Ahora al menos no deja guardado el modo de
  30 fps.
- **Culturismo en ordenador** dio 35 fps recién montada en la revisión. Ese código no ha cambiado y no lo he
  comparado con `main`.

## 7. Cambios, uno por commit

Cada uno se puede deshacer por separado con `git revert <código>`.

| Commit | Qué hace |
|---|---|
| `557f465` | Quita `content-visibility`: los botones de la barra aterrizaban hasta 2.400 px fuera de sitio |
| `8a24e02` | Saltos largos directos y cortos animados (fin de las pantallas en negro) |
| `fb08d2b` | Perfil táctil ligero: fuera desenfoques, sombras grandes y bordes de luz en móvil |
| `1fdded3` y `d6fa0ff` | Barra de abajo solo con `transform`, y su reversión por cambiar el diseño |
| `8ba5568` | Pantalla de carga de 1,5 s a 0,35 s |
| `cd835b5` | 3D de la portada en táctil: imagen al instante y montaje al tocar |
| `3187b9a` | Lo mismo en Boxeo, Culturismo y Powerlifting |
| `fca05a7` | Presupuesto de rendimiento en Lighthouse CI |
| `c1b30fd` | El logro del final se apunta fuera del scroll y sin arrancar el audio en balde |
| `db27afd` | «Inicio» también salta directo en Chrome |
| `2e0426e` | Táctil: menú sin texto fantasma, selectores del 3D legibles, botón del 3D de cristal |
| `3a10f64` | 3D: un parón no rebaja la calidad y los 30 fps no se guardan |
| `02286e7` | Herramientas para repetir las medidas |
