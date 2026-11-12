# ATR-GYM

Web de un gimnasio con tres disciplinas —**Powerlifting, Boxeo y Culturismo**—, escenas 3D que se pueden explorar, calculadoras, rutinas y una guía de suplementación.

## Qué tiene

- **4 páginas**: la portada (`index.html`) y una por disciplina (`powerlifting.html`, `boxeo.html`, `culturismo.html`).
- **3D interactivo** con [Three.js](https://threejs.org): la fachada del gimnasio y una escena por disciplina. En el móvil se ve primero una imagen y el 3D se monta al tocarla.
- **Portada completa**: disciplinas, instalaciones, por dónde empezar, suplementación, rutinas, consejos, test, preguntas frecuentes, mitos, glosario, comunidad, historia, tienda, calculadoras y contacto.
- **Se instala como app** (PWA): `manifest.json` y un `service-worker.js` que guarda la web en caché para abrirla sin conexión.
- **Accesible y rápida**: zonas de toque de 40 px, formularios con etiquetas, un perfil ligero para móviles y un presupuesto de rendimiento que se comprueba automáticamente.

## Cómo verla

Ábrela con un servidor local: el service worker (modo sin conexión e instalación como app) solo funciona con `http://`.

- **VS Code**: botón **Go Live** (extensión Live Server).
- **Terminal**: `python3 -m http.server 8000` dentro de la carpeta y entra en <http://localhost:8000>.

## Estructura

```
├── index.html, powerlifting.html, boxeo.html, culturismo.html
├── atr.css               estilos de toda la web
├── bootstrap-atr.css     Bootstrap recortado a lo que se usa
├── atr-*.js              interfaz, animaciones, barra de abajo y efecto cristal
├── atr-3d*.js            escenas 3D
├── img/                  imágenes e iconos
├── manifest.json         datos para instalarla como app
├── service-worker.js     caché para usarla sin conexión
├── herramientas/         scripts para medir el rendimiento (no forman parte de la web)
└── .github/workflows/    comprobación automática del rendimiento con Lighthouse
```

## Rendimiento

Cada pull request hacia `main` pasa por Lighthouse en modo móvil (CPU ×4 y 4G lenta) y falla si alguna página se sale del presupuesto de `lighthouserc.json`:

| Métrica | Límite |
|---|---|
| FCP (primer contenido) | ≤ 1,8 s |
| LCP (contenido principal) | ≤ 2,5 s |
| TBT (bloqueo total) | ≤ 200 ms |
| CLS (saltos de diseño) | ≤ 0,1 |
| Peso de la página | ≤ 400 KB |

Las mejoras y sus medidas, antes y después, están en [`herramientas/rendimiento/INFORME.md`](herramientas/rendimiento/INFORME.md).

## Créditos

- Iconos: [Phosphor Icons](https://phosphoricons.com) (licencia MIT).
- Resto de licencias de terceros: [`LICENCIAS.txt`](LICENCIAS.txt).

Proyecto personal de Iván Ibáñez Benedicto.
