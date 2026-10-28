// ============================================
// ATR-GYM — motor de las escenas 3D realistas
// Render con sombras suaves, oclusión ambiental, reflejos, haces de luz
// y grano de película. Las texturas (cuero, tela, ladrillo, moleteado…)
// se generan aquí mismo: no hay que descargar ni una imagen.
// Cada disciplina tiene su escena (atr-3d-boxeo.js, etc.) y la monta
// con montarEscena('boxeo', definicion) en un <div class="escena3d">.
// ============================================
// Es un script normal (no un módulo) para que también funcione al abrir la web
// con doble clic desde el ordenador; Three.js se descarga de jsDelivr con import().
(function () {
    'use strict';
    const modulos = [
        'three',
        'three/addons/postprocessing/EffectComposer.js',
        'three/addons/postprocessing/RenderPass.js',
        'three/addons/postprocessing/UnrealBloomPass.js',
        'three/addons/postprocessing/GTAOPass.js',
        'three/addons/postprocessing/OutputPass.js',
        'three/addons/postprocessing/ShaderPass.js',
        'three/addons/geometries/RoundedBoxGeometry.js',
        'three/addons/lights/RectAreaLightUniformsLib.js',
        'three/addons/objects/Reflector.js',
        'three/addons/utils/BufferGeometryUtils.js',
    ];
    window.ATR3D = window.ATR3D || {};
    // Three.js pesa unos 700 KB: se pide con la página ya cargada y el navegador libre,
    // o antes si la escena se acerca a la pantalla (las escenas esperan a esta promesa)
    let arrancar;
    window.ATR3D.motor = new Promise(r => { arrancar = r; }).then(() => Promise.all(modulos.map(m => import(m)))).then(([THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { GTAOPass }, { OutputPass }, { ShaderPass }, { RoundedBoxGeometry }, { RectAreaLightUniformsLib }, { Reflector }, { mergeGeometries }]) => {
        fuentes3D();
        const FUENTE = "'Big Shoulders Display', 'Arial Narrow', sans-serif";
        const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
        const TEXTO = "'Archivo', 'Segoe UI', system-ui, sans-serif";

        // ---------- calidad según el aparato ----------
        function calidadDispositivo() {
            const movil = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
            const justo = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
            // en Mac, iPhone e iPad la oclusión ambiental sale negra (la escena se ve solo a trozos): ahí no se usa
            const apple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '') || /Macintosh|iPhone|iPad/.test(navigator.userAgent || '');
            // y en Apple se dibuja como el recorrido de la portada: sin antialias en el postproceso y a resolución entera
            const entera = Math.max(1, Math.min(2, Math.round(devicePixelRatio || 1)));
            if (movil) return { movil: true, apple, sombras: 1, sombraTam: 1024, ao: false, reflejos: false, muestras: apple ? 0 : 2, pixeles: apple ? entera : Math.min(devicePixelRatio || 1, justo ? 1.25 : 1.6), tex: 512, polvo: 110 };
            return { movil: false, apple, sombras: 3, sombraTam: 2048, ao: !justo && !apple, reflejos: true, muestras: apple ? 0 : 4, pixeles: apple ? entera : Math.min(devicePixelRatio || 1, 1.75), tex: 1024, polvo: 280 };
        }

        // ---------- utilidades ----------
        function generador(semilla = 1) {
            let s = semilla % 2147483647; if (s <= 0) s += 2147483646;
            return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
        }
        const lerp = (a, b, t) => a + (b - a) * t;
        const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
        // deja pintar el fotograma y sigue justo después (no dentro de él), para no retrasarlo
        const respirar = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
        // Compila los shaders por tandas pequeñas. Tras cada tanda se espera a la gráfica con una
        // «valla» que se consulta entre fotogramas: preguntar por cada shader (como hace compileAsync)
        // obliga a esperar a que terminen todos y congelaba la página casi dos segundos.
        // Se compilan para la textura intermedia donde dibuja el postproceso: para la pantalla
        // saldrían otras variantes y se volverían a compilar al dibujar.
        function valla(renderer) {
            const gl = renderer.getContext();
            if (!gl.fenceSync) return respirar();
            const f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl.flush();
            return new Promise(r => {
                const mirar = () => { if (gl.getSyncParameter(f, gl.SYNC_STATUS) === gl.SIGNALED) { gl.deleteSync(f); r(); } else setTimeout(mirar, 8); };
                setTimeout(mirar, 8);
            });
        }
        async function compilar(renderer, escena, camara, destino) {
            const antes = renderer.getRenderTarget(), vistos = new Set(), piezas = [];
            escena.traverse(o => {
                if (!o.material || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
                const clave = (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.uuid).join() + (o.isInstancedMesh ? 'i' : '') + (o.isSkinnedMesh ? 's' : '') + (o.isPoints ? 'p' : o.isLine ? 'l' : '');
                if (!vistos.has(clave)) { vistos.add(clave); piezas.push(o); }
            });
            for (let i = 0; i < piezas.length; i += 3) {
                renderer.setRenderTarget(destino);
                try { piezas.slice(i, i + 3).forEach(o => renderer.compile(o, camara, escena)); } catch (e) { }
                renderer.setRenderTarget(antes);
                await valla(renderer);
            }
        }
        // sube las texturas a la gráfica por tandas cortas (si no, lo haría de golpe el primer fotograma)
        async function subirTexturas(renderer, escena) {
            const texturas = new Set();
            escena.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => {
                for (const k in m) if (m[k] && m[k].isTexture) texturas.add(m[k]);
                if (m.uniforms) Object.values(m.uniforms).forEach(u => { if (u && u.value && u.value.isTexture) texturas.add(u.value); });
            }));
            let t0 = performance.now();
            for (const t of texturas) {
                renderer.initTexture(t);
                if (performance.now() - t0 > 8) { await respirar(); t0 = performance.now(); }
            }
        }

        function lienzo(w, h) {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            return c;
        }
        function textura(c, { color = true, repetir = null, aniso = 8 } = {}) {
            const t = new THREE.CanvasTexture(c);
            t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            if (repetir) t.repeat.set(repetir[0], repetir[1]);
            t.anisotropy = aniso;
            return t;
        }
        // misma imagen, otra repetición (la GPU la comparte)
        function repetida(t, rx, ry) {
            const c = t.clone();
            c.repeat.set(rx, ry);
            c.needsUpdate = true;
            return c;
        }
        function dibujar(w, h, fn, opciones) {
            const c = lienzo(w, h);
            fn(c.getContext('2d'), w, h);
            return textura(c, opciones);
        }

        // ---------- ruido continuo y que se repite sin costuras ----------
        function ruido(w, h, { escala = 8, octavas = 4, semilla = 3, estirar = 1 } = {}) {
            const out = new Float32Array(w * h);
            const az = generador(semilla);
            let amp = 1, total = 0;
            for (let o = 0; o < octavas; o++) {
                const gx = Math.max(1, Math.round(escala * Math.pow(2, o))), gy = Math.max(1, Math.round(escala * Math.pow(2, o) * estirar));
                const g = new Float32Array(gx * gy);
                for (let i = 0; i < g.length; i++) g[i] = az();
                for (let y = 0; y < h; y++) {
                    const fy = y / h * gy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
                    const r0 = (y0 % gy) * gx, r1 = ((y0 + 1) % gy) * gx;
                    for (let x = 0; x < w; x++) {
                        const fx = x / w * gx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
                        const a = g[r0 + x0 % gx], b = g[r0 + (x0 + 1) % gx], c = g[r1 + x0 % gx], d = g[r1 + (x0 + 1) % gx];
                        out[y * w + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
                    }
                }
                total += amp; amp *= .5;
            }
            for (let i = 0; i < out.length; i++) out[i] /= total;
            return out;
        }
        // celdas (granulado del cuero, gránulos de goma)
        function celdas(w, h, { n = 24, semilla = 5, forma = 'grano' } = {}) {
            const az = generador(semilla), pts = [];
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + .15 + az() * .7) / n, (j + .15 + az() * .7) / n]);
            const out = new Float32Array(w * h);
            for (let y = 0; y < h; y++) {
                const v = y / h, cj = Math.floor(v * n);
                for (let x = 0; x < w; x++) {
                    const u = x / w, ci = Math.floor(u * n);
                    let d1 = 9, d2 = 9;
                    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
                        const ii = (ci + di + n) % n, jj = (cj + dj + n) % n, p = pts[jj * n + ii];
                        let dx = Math.abs(u - p[0]), dy = Math.abs(v - p[1]);
                        if (dx > .5) dx = 1 - dx; if (dy > .5) dy = 1 - dy;
                        const d = dx * dx + dy * dy;
                        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
                    }
                    const f = (Math.sqrt(d2) - Math.sqrt(d1)) * n;
                    out[y * w + x] = forma === 'grano' ? Math.min(1, f * 1.6) : 1 - Math.min(1, Math.sqrt(d1) * n * 1.4);
                }
            }
            return out;
        }
        // mapa de normales a partir de alturas (0..1)
        function normalDe(alt, w, h, fuerza = 2, repetir) {
            const c = lienzo(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
            for (let j = 0; j < h; j++) {
                const ju = ((j - 1 + h) % h) * w, jd = ((j + 1) % h) * w, jc = j * w;
                for (let i = 0; i < w; i++) {
                    const il = (i - 1 + w) % w, ir = (i + 1) % w;
                    const dx = (alt[jc + ir] - alt[jc + il]) * fuerza, dy = (alt[jd + i] - alt[ju + i]) * fuerza;
                    const l = Math.sqrt(dx * dx + dy * dy + 1), k = (jc + i) * 4;
                    d[k] = (-dx / l * .5 + .5) * 255; d[k + 1] = (dy / l * .5 + .5) * 255; d[k + 2] = (1 / l * .5 + .5) * 255; d[k + 3] = 255;
                }
            }
            x.putImageData(img, 0, 0);
            return textura(c, { color: false, repetir });
        }
        function grisDe(val, w, h, { min = 0, max = 1, repetir } = {}) {
            const c = lienzo(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
            for (let i = 0; i < val.length; i++) { const g = (min + (max - min) * val[i]) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g; d[i * 4 + 3] = 255; }
            x.putImageData(img, 0, 0);
            return textura(c, { color: false, repetir });
        }

        // ---------- kit de materiales realistas ----------
        function crearKit(calidad) {
            const T = calidad.tex, cache = {};
            const una = (k, fn) => cache[k] || (cache[k] = fn());
            const normales = {
                cuero: () => una('cuero', () => normalDe(celdas(T / 2, T / 2, { n: 40, semilla: 11 }), T / 2, T / 2, 1.2)),
                tela: () => una('tela', () => {
                    const s = T / 2, a = new Float32Array(s * s), p = s / 64;
                    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
                        const cx = Math.floor(x / p), cy = Math.floor(y / p), arriba = (cx + cy) % 2;
                        const fx = Math.sin((x % p) / p * Math.PI), fy = Math.sin((y % p) / p * Math.PI);
                        a[y * s + x] = arriba ? .55 + .45 * fy : .55 + .45 * fx;
                    }
                    return normalDe(a, s, s, 1.6);
                }),
                rizo: () => una('rizo', () => normalDe(celdas(T / 2, T / 2, { n: 70, semilla: 21, forma: 'bulto' }), T / 2, T / 2, 3)),
                moleteado: () => una('moleteado', () => {
                    const s = 256, a = new Float32Array(s * s), f = 16;
                    const tri = v => 1 - 2 * Math.abs(v - Math.floor(v) - .5);
                    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
                        const u = x / s * f, v = y / s * f;
                        a[y * s + x] = Math.min(tri(u + v), tri(u - v));
                    }
                    return normalDe(a, s, s, 6);
                }),
                goma: () => una('goma', () => {
                    const s = T / 2, a = ruido(s, s, { escala: 32, octavas: 3, semilla: 7 }), g = celdas(s, s, { n: 60, semilla: 9, forma: 'bulto' });
                    for (let i = 0; i < a.length; i++) a[i] = a[i] * .5 + g[i] * .5;
                    return normalDe(a, s, s, 2.2);
                }),
                cepillado: () => una('cepillado', () => {
                    const s = 256, a = ruido(s, s, { escala: 2, octavas: 5, semilla: 31, estirar: 40 });
                    return normalDe(a, s, s, 1.1);
                }),
                fino: () => una('fino', () => normalDe(ruido(T / 2, T / 2, { escala: 24, octavas: 3, semilla: 41 }), T / 2, T / 2, 1.2))
            };
            const rugosidad = {
                uso: () => una('uso', () => grisDe(ruido(T / 2, T / 2, { escala: 4, octavas: 5, semilla: 51 }), T / 2, T / 2, { min: .25, max: 1 })),
                cepillado: () => una('rcep', () => grisDe(ruido(256, 256, { escala: 2, octavas: 5, semilla: 61, estirar: 40 }), 256, 256, { min: .55, max: 1 }))
            };
            const n2 = (s) => new THREE.Vector2(s, s);
            return {
                normales, rugosidad,
                // genera los relieves de uno en uno, con un respiro entre cada uno: así ninguno
                // se junta con los demás en el mismo trozo de trabajo al montar la escena
                async precalentar(respirar) {
                    for (const hacer of [...Object.values(normales), ...Object.values(rugosidad)]) { hacer(); await respirar(); }
                },
                cuero: (color, { rug = .42, brillo = .7, escala = 4, fuerza = .5 } = {}) => new THREE.MeshPhysicalMaterial({
                    color, roughness: rug, roughnessMap: repetida(rugosidad.uso(), 1, 1), clearcoat: brillo, clearcoatRoughness: .32,
                    normalMap: repetida(normales.cuero(), escala, escala), normalScale: n2(fuerza)
                }),
                tela: (color, { rug = .82, brillo = 1, escala = 6, fuerza = .45, sheen } = {}) => new THREE.MeshPhysicalMaterial({
                    color, roughness: rug, sheen: brillo, sheenRoughness: .45, sheenColor: sheen !== undefined ? new THREE.Color(sheen) : new THREE.Color(color).lerp(new THREE.Color(0xffffff), .35),
                    normalMap: repetida(normales.tela(), escala, escala), normalScale: n2(fuerza)
                }),
                rizo: (color, escala = 3) => new THREE.MeshPhysicalMaterial({
                    color, roughness: .95, sheen: 1, sheenRoughness: .7, sheenColor: new THREE.Color(0xffffff), normalMap: repetida(normales.rizo(), escala, escala), normalScale: n2(1)
                }),
                metal: (color, { rug = .35, cepillado = true, escala = 1 } = {}) => new THREE.MeshStandardMaterial({
                    color, metalness: 1, roughness: rug, roughnessMap: cepillado ? repetida(rugosidad.cepillado(), escala, escala) : null,
                    normalMap: cepillado ? repetida(normales.cepillado(), escala, escala) : null, normalScale: n2(.15)
                }),
                cromo: () => una('m-cromo', () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .07 })),
                laton: () => una('m-laton', () => new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: .22 })),
                oro: () => una('m-oro', () => new THREE.MeshPhysicalMaterial({ color: 0xf1c45c, metalness: 1, roughness: .16, clearcoat: .6, clearcoatRoughness: .1 })),
                pintura: (color, { rug = .5, escala = 2 } = {}) => new THREE.MeshPhysicalMaterial({
                    color, roughness: rug, metalness: .15, clearcoat: .35, clearcoatRoughness: .55,
                    normalMap: repetida(normales.fino(), escala, escala), normalScale: n2(.18)
                }),
                goma: (color, { rug = .88, escala = 2 } = {}) => new THREE.MeshStandardMaterial({
                    color, roughness: rug, normalMap: repetida(normales.goma(), escala, escala), normalScale: n2(.7)
                }),
                plastico: (color, rug = .4) => new THREE.MeshPhysicalMaterial({ color, roughness: rug, clearcoat: .5, clearcoatRoughness: .3 }),
                vidrio: (color = 0xffffff, opacidad = .35) => new THREE.MeshPhysicalMaterial({ color, roughness: .05, metalness: 0, transparent: true, opacity: opacidad, clearcoat: 1, depthWrite: false }),
                emisivo: (color, fuerza = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(fuerza), toneMapped: false }),
                mate: (color, rug = .9) => new THREE.MeshStandardMaterial({ color, roughness: rug })
            };
        }

        // ---------- piezas reutilizables ----------
        function malla(geo, mat, { sombra = true, recibe = true } = {}) {
            const m = new THREE.Mesh(geo, mat);
            m.castShadow = sombra; m.receiveShadow = recibe;
            return m;
        }
        function caja(w, h, d, mat, x = 0, y = 0, z = 0, opciones) {
            const m = malla(new THREE.BoxGeometry(w, h, d), mat, opciones);
            m.position.set(x, y, z);
            return m;
        }
        function redondeada(w, h, d, r, mat, opciones) {
            return malla(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * .999), mat, opciones);
        }
        function torno(perfil, mat, segmentos = 48, opciones) {
            return malla(new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), segmentos), mat, opciones);
        }
        function cilindro(r1, r2, h, mat, seg = 32, opciones) {
            return malla(new THREE.CylinderGeometry(r1, r2, h, seg), mat, opciones);
        }
        // cilindro entre dos puntos (cuerdas tensas, cables, barras)
        function entre(a, b, r, mat, seg = 12) {
            const largo = a.distanceTo(b);
            const m = malla(new THREE.CylinderGeometry(r, r, 1, seg), mat);
            colocarEntre(m, a, b);
            m.userData.largo = largo;
            return m;
        }
        const _ejeY = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();
        function colocarEntre(m, a, b) {
            _dir.subVectors(b, a);
            const largo = _dir.length();
            m.scale.set(1, largo, 1);
            m.position.copy(a).addScaledVector(_dir, .5);
            m.quaternion.setFromUnitVectors(_ejeY, _dir.normalize());
        }
        // cuerda que cuelga por su peso
        function catenaria(a, b, caida = .05, n = 24) {
            const pts = [];
            for (let i = 0; i <= n; i++) {
                const t = i / n, p = new THREE.Vector3().lerpVectors(a, b, t);
                p.y -= caida * 4 * t * (1 - t);
                pts.push(p);
            }
            return new THREE.CatmullRomCurve3(pts);
        }
        function tubo(curva, r, mat, tubular = 48, radial = 10, opciones) {
            return malla(new THREE.TubeGeometry(curva, tubular, r, radial, false), mat, opciones);
        }
        // cadena de eslabones de acero
        function cadena(a, b, mat, { grosor = .006, largo = .05 } = {}) {
            const dist = a.distanceTo(b), n = Math.max(2, Math.round(dist / (largo * .78)));
            const geo = new THREE.TorusGeometry(largo * .32, grosor, 6, 14);
            geo.scale(1, 1.55, 1);
            const im = new THREE.InstancedMesh(geo, mat, n);
            const q = new THREE.Quaternion().setFromUnitVectors(_ejeY, _dir.subVectors(b, a).normalize());
            const giro = new THREE.Quaternion().setFromAxisAngle(_ejeY, Math.PI / 2), m4 = new THREE.Matrix4(), p = new THREE.Vector3(), uno = new THREE.Vector3(1, 1, 1);
            for (let i = 0; i < n; i++) {
                p.lerpVectors(a, b, (i + .5) / n);
                const qi = q.clone(); if (i % 2) qi.multiply(giro);
                m4.compose(p, qi, uno); im.setMatrixAt(i, m4);
            }
            im.castShadow = true;
            return im;
        }
        function fusionar(geos) {
            return mergeGeometries(geos.map(g => g.index ? g : g), false);
        }

        // ---------- haces de luz en el ambiente (polvo iluminado) ----------
        const hazVert = /* glsl */`
        uniform float uLargo;
        varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main(){
            vH = clamp(1.0 - position.z / uLargo, 0.0, 1.0);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            vW = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * mv;
        }`;
        const hazFrag = /* glsl */`
        uniform vec3 uColor; uniform float uFuerza; uniform float uTiempo;
        varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float rn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){
            float borde = pow(abs(dot(vN, vV)), 2.2);
            float caida = pow(vH, 1.25) * smoothstep(0.0, 0.08, 1.0 - vH);
            float n = rn(vW * 1.6 + vec3(0.0, uTiempo * .12, uTiempo * .05)) * .55 + rn(vW * 4.0 - vec3(uTiempo * .08)) * .25 + .35;
            float a = borde * caida * n * uFuerza;
            gl_FragColor = vec4(uColor * a, a);
        }`;
        function haz(desde, hacia, rIni, rFin, color = 0xfff1d8, fuerza = .25, lados = 40) {
            const largo = desde.distanceTo(hacia);
            const geo = new THREE.CylinderGeometry(rIni, rFin, largo, lados, 1, true);
            geo.translate(0, -largo / 2, 0);
            geo.rotateX(-Math.PI / 2);
            const mat = new THREE.ShaderMaterial({
                vertexShader: hazVert, fragmentShader: hazFrag,
                uniforms: { uColor: { value: new THREE.Color(color) }, uFuerza: { value: fuerza }, uLargo: { value: largo }, uTiempo: { value: 0 } },
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
            });
            const m = new THREE.Mesh(geo, mat);
            m.position.copy(desde); m.lookAt(hacia);
            m.userData.sinAO = true; m.userData.haz = true;
            m.renderOrder = 5;
            return m;
        }

        // motas de polvo flotando
        function polvo(zonas, n, color = 0xfff2d6, tam = .035) {
            const pos = new Float32Array(n * 3), fase = new Float32Array(n), az = generador(77);
            for (let i = 0; i < n; i++) {
                const z = zonas[i % zonas.length];
                pos[i * 3] = z[0] + (az() - .5) * z[3]; pos[i * 3 + 1] = z[1] + az() * z[4]; pos[i * 3 + 2] = z[2] + (az() - .5) * z[5];
                fase[i] = az() * 6.28;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
            const mat = new THREE.ShaderMaterial({
                uniforms: { uTiempo: { value: 0 }, uColor: { value: new THREE.Color(color) }, uTam: { value: tam * 600 } },
                vertexShader: `attribute float fase; uniform float uTiempo; uniform float uTam; varying float vA;
                    void main(){ vec3 p = position + vec3(sin(uTiempo*.21+fase)*.25, sin(uTiempo*.13+fase*1.7)*.35, cos(uTiempo*.17+fase)*.25);
                    vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = uTam / -mv.z; vA = .45 + .55*sin(uTiempo*.6+fase*3.0); gl_Position = projectionMatrix * mv; }`,
                fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d) * vA * .55; gl_FragColor = vec4(uColor*a, a); }`,
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
            });
            const p = new THREE.Points(geo, mat);
            p.userData.sinAO = true; p.frustumCulled = false;
            return p;
        }

        // lámpara industrial colgante con su foco real
        function lampara(kit, x, y, z, { techo = 6, color = 0xffd7a6, fuerza = 260, angulo = .75, sombra = false, calidad, haces = true, objetivo = null } = {}) {
            const g = new THREE.Group();
            const pantalla = torno([[0.03, .12], [.06, .11], [.09, .06], [.2, -.06], [.235, -.1], [.24, -.105], [.225, -.1], [.19, -.065], [.08, .05], [.03, .09]], kit.pintura(0x1d1f1c, { rug: .55 }), 40);
            const interior = torno([[.215, -.098], [.18, -.06], [.07, .05], [.0, .07]], kit.mate(0xf2efe6, .6), 40, { sombra: false });
            const bombilla = new THREE.Mesh(new THREE.SphereGeometry(.055, 20, 14), kit.emisivo(color, 3));
            bombilla.position.y = -.03;
            g.add(pantalla, interior, bombilla);
            const cable = entre(v3(0, .12, 0), v3(0, techo - y, 0), .006, kit.mate(0x111111, .6), 6);
            g.add(cable);
            g.position.set(x, y, z);
            const luz = new THREE.SpotLight(color, fuerza, 0, angulo, .65, 2);
            luz.position.set(x, y - .06, z);
            luz.target.position.copy(objetivo || v3(x, 0, z));
            if (sombra && calidad && calidad.sombras) {
                luz.castShadow = true; luz.shadow.mapSize.set(calidad.sombraTam, calidad.sombraTam);
                luz.shadow.bias = -.0003; luz.shadow.normalBias = .03; luz.shadow.radius = 6;
            }
            const piezas = [g, luz, luz.target];
            if (haces) piezas.push(haz(v3(x, y - .08, z), objetivo ? objetivo.clone() : v3(x, 0, z), .19, Math.tan(angulo) * (y - .1) * .85, color, .1));
            return piezas;
        }

        // entorno para los reflejos: una sala oscura con los paneles de luz de la escena
        function entorno(renderer, paneles, fondo = 0x0b0b0a) {
            const s = new THREE.Scene();
            s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 14, 40), new THREE.MeshBasicMaterial({ color: fondo, side: THREE.BackSide })));
            paneles.forEach(([x, y, z, w, h, color, fuerza, rx = -Math.PI / 2, ry = 0]) => {
                const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(fuerza), side: THREE.DoubleSide }));
                p.position.set(x, y, z); p.rotation.set(rx, ry, 0);
                s.add(p);
            });
            const pm = new THREE.PMREMGenerator(renderer);
            const rt = pm.fromScene(s, .035);
            pm.dispose();
            return rt.texture;
        }

        // ---------- grano, viñeta y una pizca de aberración: el acabado de cámara ----------
        const PeliculaShader = {
            uniforms: { tDiffuse: { value: null }, uTiempo: { value: 0 }, uGrano: { value: .035 }, uVineta: { value: .42 } },
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `uniform sampler2D tDiffuse; uniform float uTiempo; uniform float uGrano; uniform float uVineta; varying vec2 vUv;
                float az(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
                void main(){
                    vec2 d = vUv - .5;
                    float ca = .0018 * dot(d, d) * 4.0;
                    vec3 c = vec3(texture2D(tDiffuse, vUv + d * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ca).b);
                    float v = smoothstep(.9, .28, length(d * vec2(1.0, .92)));
                    c *= mix(1.0 - uVineta, 1.0, v);
                    c += (az(vUv * 1000.0 + fract(uTiempo * 7.3) * 91.7) - .5) * uGrano;
                    gl_FragColor = vec4(c, 1.0);
                }`
        };

        // ---------- interfaz ----------
        function crearUI(contenedor, def) {
            const ui = document.createElement('div');
            ui.className = 'escena3d-ui';
            ui.innerHTML = `
                <div class="escena3d-carga" role="status"><span class="escena3d-spinner" aria-hidden="true"></span><span class="escena3d-carga-txt">Montando la escena…</span></div>
                <div class="escena3d-ficha" aria-live="polite"><span class="escena3d-plano"></span><strong class="escena3d-titulo"></strong><span class="escena3d-texto"></span></div>
                <div class="escena3d-arriba">
                    <span class="escena3d-pista" aria-hidden="true">Arrastra para mirar</span>
                    <button type="button" class="escena3d-btn escena3d-auto" aria-pressed="true" title="Recorrido automático">▶ Auto</button>
                    <button type="button" class="escena3d-btn escena3d-pantalla" title="Pantalla completa" aria-label="Pantalla completa">⛶</button>
                </div>
                <div class="escena3d-planos" role="group" aria-label="Planos de la escena">
                    ${def.planos.map((p, i) => `<button type="button" data-plano="${i}" aria-pressed="false"><b>${String(i + 1).padStart(2, '0')}</b>${p.nombre}</button>`).join('')}
                </div>`;
            contenedor.appendChild(ui);
            const q = s => ui.querySelector(s);
            const carga = q('.escena3d-carga-txt');
            if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) q('.escena3d-pantalla').hidden = true;
            return {
                ui, carga: t => { carga.textContent = t; },
                pintar(i) {
                    const p = def.planos[i];
                    q('.escena3d-plano').textContent = `${def.etiqueta} · Plano ${String(i + 1).padStart(2, '0')}`;
                    q('.escena3d-titulo').textContent = p.titulo;
                    q('.escena3d-texto').textContent = p.texto;
                    ui.querySelectorAll('.escena3d-planos button').forEach(b => {
                        const activo = Number(b.dataset.plano) === i;
                        b.setAttribute('aria-pressed', String(activo));
                        const fila = b.parentNode;
                        if (activo && fila.scrollWidth > fila.clientWidth) fila.scrollTo({ left: b.offsetLeft - fila.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
                    });
                },
                auto(activo) { const b = q('.escena3d-auto'); b.setAttribute('aria-pressed', String(activo)); b.textContent = activo ? '❚❚ Auto' : '▶ Auto'; }
            };
        }

        // ---------- montaje ----------
        async function iniciar(contenedor, def) {
            if (contenedor.dataset.montado) return;
            contenedor.dataset.montado = '1';
            const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
            const calidad = calidadDispositivo();
            const UI = crearUI(contenedor, def);

            const c = document.createElement('canvas');
            c.className = 'escena3d-canvas';
            c.setAttribute('role', 'img');
            c.setAttribute('aria-label', def.descripcion);
            contenedor.prepend(c);

            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({ canvas: c, antialias: false, powerPreference: 'high-performance' });
                if (!renderer.capabilities.isWebGL2) throw new Error('Sin WebGL2');
            } catch (e) {
                contenedor.classList.add('escena3d-sin-webgl');
                UI.carga('Tu navegador no puede mostrar la escena en 3D.');
                return;
            }
            let pixeles = calidad.pixeles;
            renderer.setPixelRatio(pixeles);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = def.exposicion || 1;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            // las sombras se calculan una sola vez por fotograma (sin esto, la oclusión
            // ambiental y los espejos las volvían a dibujar en cada una de sus pasadas)
            renderer.shadowMap.autoUpdate = false;
            RectAreaLightUniformsLib.init();

            await Promise.race([fuentes3D(), new Promise(r => setTimeout(r, 1500))]);

            const escena = new THREE.Scene();
            escena.background = new THREE.Color(def.fondo || 0x050505);
            if (def.niebla) escena.fog = new THREE.FogExp2(def.niebla[0], def.niebla[1]);
            const camara = new THREE.PerspectiveCamera(40, 1, .05, 120);

            const kit = crearKit(calidad);
            const ctx = { THREE, escena, kit, calidad, renderer, camara, carga: UI.carga, respirar, reducir };
            UI.carga('Modelando…');
            await respirar();
            await kit.precalentar(respirar);
            const vivo = await def.construir(ctx) || {};
            if (def.entorno) {
                escena.environment = entorno(renderer, def.entorno, def.fondoEntorno);
                escena.environmentIntensity = def.intensidadEntorno ?? .35;
            }
            UI.carga('Iluminando…');
            await respirar();

            // postproceso
            const composer = calidad.muestras
                ? new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: calidad.muestras }))
                : new EffectComposer(renderer);
            composer.addPass(new RenderPass(escena, camara));
            let gtao = null;
            if (calidad.ao) {
                try {
                    gtao = new GTAOPass(escena, camara, 1, 1, undefined, { radius: .45, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 16 });
                    gtao.blendIntensity = .9;
                    const original = gtao.overrideVisibility.bind(gtao);
                    gtao.overrideVisibility = function () { original(); escena.traverse(o => { if (o.userData.sinAO) o.visible = false; }); };
                    composer.addPass(gtao);
                } catch (e) { console.warn('Sin oclusión ambiental:', e); gtao = null; }
            }
            const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), def.bloom ?? .32, .5, .95);
            composer.addPass(bloom);
            composer.addPass(new OutputPass());
            const pelicula = new ShaderPass(PeliculaShader);
            pelicula.uniforms.uGrano.value = calidad.movil ? .025 : .035;
            composer.addPass(pelicula);

            // ---- cámara: planos de cine con transición, deriva lenta y arrastre ----
            const planos = def.planos.map(p => ({ ...p, cam: v3(...p.cam), mira: v3(...p.mira) }));
            const est = { i: 0, desde: null, t: 1, inicio: 0, yaw: 0, pitch: 0, yawObj: 0, pitchObj: 0, ultimoToque: -1e9, auto: !reducir };
            const cam = new THREE.Vector3(), mira = new THREE.Vector3();
            let fov = 40;
            function encuadre(p) {
                const a = c.clientWidth / Math.max(1, c.clientHeight);
                const out = { cam: p.cam.clone(), mira: p.mira.clone(), fov: p.fov || 40 };
                if (a < 1.2) {
                    // en vertical se abre el plano y se retrocede un poco para que quepa lo importante
                    out.fov = Math.min(68, out.fov * (1 + (1.2 - a) * .75));
                    out.cam.sub(out.mira).multiplyScalar(1 + (1.2 - a) * .18).add(out.mira);
                }
                return out;
            }
            function ir(i, instantaneo) {
                est.i = (i + planos.length) % planos.length;
                est.desde = { cam: cam.clone(), mira: mira.clone(), fov };
                est.t = instantaneo || reducir ? 1 : 0;
                est.inicio = performance.now();
                est.yawObj = 0; est.pitchObj = 0;
                if (est.t === 1) { const e = encuadre(planos[est.i]); cam.copy(e.cam); mira.copy(e.mira); fov = e.fov; }
                UI.pintar(est.i);
                pedir();
            }
            function tocar() {
                est.ultimoToque = performance.now();
                if (est.auto) { est.auto = false; UI.auto(false); }
            }
            UI.ui.querySelectorAll('.escena3d-planos button').forEach(b => b.addEventListener('click', () => { tocar(); ir(Number(b.dataset.plano)); }));
            UI.ui.querySelector('.escena3d-auto').addEventListener('click', () => {
                est.auto = !est.auto; UI.auto(est.auto); est.ultimoCambio = performance.now(); pedir();
            });
            UI.ui.querySelector('.escena3d-pantalla').addEventListener('click', () => {
                const dentro = document.fullscreenElement || document.webkitFullscreenElement;
                if (dentro) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                else (contenedor.requestFullscreen || contenedor.webkitRequestFullscreen).call(contenedor).catch?.(() => { });
            });
            UI.auto(est.auto);

            let arrastre = null;
            c.addEventListener('pointerdown', e => {
                arrastre = { x: e.clientX, y: e.clientY, yaw: est.yawObj, pitch: est.pitchObj };
                contenedor.classList.add('escena3d-tocada');
                tocar();
            });
            addEventListener('pointermove', e => {
                if (!arrastre) return;
                est.yawObj = Math.max(-.85, Math.min(.85, arrastre.yaw - (e.clientX - arrastre.x) * .0045));
                if (e.pointerType === 'mouse') est.pitchObj = Math.max(-.2, Math.min(.28, arrastre.pitch + (e.clientY - arrastre.y) * .003));
                est.ultimoToque = performance.now();
                pedir();
            });
            const soltar = () => { arrastre = null; };
            addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);

            const off = new THREE.Vector3(), esf = new THREE.Spherical();
            function colocar(t) {
                const p = planos[est.i];
                // deriva lenta, como un travelling de cámara
                const d = reducir ? 0 : Math.sin(t * .11) * .5 + .5;
                const deriva = p.deriva ? v3(...p.deriva).multiplyScalar(d - .5) : v3(0, 0, 0);
                off.copy(cam).add(deriva).sub(mira); esf.setFromVector3(off);
                esf.theta += est.yaw; esf.phi = Math.max(.25, Math.min(1.62, esf.phi - est.pitch));
                camara.position.copy(mira).add(off.setFromSpherical(esf));
                camara.lookAt(mira);
                if (Math.abs(camara.fov - fov) > .01) { camara.fov = fov; camara.updateProjectionMatrix(); }
            }

            // ---- tamaño ----
            function ajustar() {
                const w = c.clientWidth, h = c.clientHeight;
                if (!w || !h) return;
                renderer.setSize(w, h, false);
                composer.setSize(w, h);
                bloom.resolution.set(w * .5, h * .5);
                camara.aspect = w / h;
                camara.updateProjectionMatrix();
                if (est.t >= 1) { const e = encuadre(planos[est.i]); cam.copy(e.cam); mira.copy(e.mira); fov = e.fov; colocar(performance.now() / 1000); if (listo) { renderer.shadowMap.needsUpdate = true; composer.render(); } }
                pedir();
            }
            // hasta que los shaders están compilados no se dibuja nada (así no hay tirones)
            let listo = false, conTiempo = [];
            new ResizeObserver(ajustar).observe(c);

            // ---- bucle ----
            let visible = false, raf = 0, ultimo = performance.now(), previo = 0, suma = 0, medidos = 0, cuadro = 0;
            // Escalones de calidad si la escena no llega a unos 54 fps de media (por debajo, en una
            // pantalla de 60 Hz los fotogramas salen a destiempo y se nota el tirón): primero la resolución, después
            // los espejos (que vuelven a dibujar la escena entera) a media resolución, luego los
            // espejos un fotograma sí y otro no y, por último, las sombras igual (solo se mueven
            // piezas pequeñas, no se nota). El escalón se recuerda para la próxima visita.
            const espejos = [];
            const claveCalidad = 'atr3d-calidad-' + (contenedor.dataset.escena || def.etiqueta || '');
            let escalon = 0;
            function bajarCalidad() {
                if (pixeles > 1) { pixeles = calidad.apple ? 1 : Math.max(1, pixeles - .25); renderer.setPixelRatio(pixeles); composer.setPixelRatio(pixeles); }
                else if (espejos.length && escalon < 1) { escalon = 1; espejos.forEach(e => { const rt = e.getRenderTarget(); rt.setSize(Math.round(rt.width / 2), Math.round(rt.height / 2)); }); }
                else if (espejos.length && escalon < 2) {
                    escalon = 2;
                    espejos.forEach(e => { const reflejar = e.onBeforeRender; e.onBeforeRender = function () { if (cuadro & 1) return; reflejar.apply(this, arguments); }; });
                }
                else if (escalon < 3) escalon = 3;
                else return false;
                try { localStorage.setItem(claveCalidad, String((Number(localStorage.getItem(claveCalidad)) || 0) + 1)); } catch (e) { }
                return true;
            }
            est.ultimoCambio = performance.now();
            function frame(ahora) {
                raf = 0;
                const dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
                const intervalo = previo ? ahora - previo : 0; previo = ahora; cuadro++;
                const t = ahora / 1000;
                if (est.t < 1) {
                    est.t = Math.min(1, (ahora - est.inicio) / 2200);
                    const k = suave(est.t), e = encuadre(planos[est.i]);
                    cam.lerpVectors(est.desde.cam, e.cam, k);
                    cam.y += Math.sin(k * Math.PI) * .6;
                    mira.lerpVectors(est.desde.mira, e.mira, k);
                    fov = lerp(est.desde.fov, e.fov, k);
                    if (est.t >= 1) est.ultimoCambio = ahora;
                }
                // recorrido automático: cambia de plano cada ~9 s si nadie toca
                if (est.auto && est.t >= 1 && ahora - est.ultimoCambio > 9000) ir(est.i + 1);
                // tras un rato sin tocar, la mirada vuelve sola al encuadre
                if (!arrastre && ahora - est.ultimoToque > 5000) { est.yawObj *= .985; est.pitchObj *= .985; }
                est.yaw = lerp(est.yaw, est.yawObj, .08);
                est.pitch = lerp(est.pitch, est.pitchObj, .08);
                colocar(t);
                if (vivo.actualizar && !reducir) vivo.actualizar(t, dt, est.i);
                for (const m of conTiempo) m.uniforms.uTiempo.value = t;
                pelicula.uniforms.uTiempo.value = t;
                if (escalon < 3 || !(cuadro & 1)) renderer.shadowMap.needsUpdate = true;
                composer.render();
                // si el aparato no llega, se baja la resolución. Se mide el tiempo real entre dos
                // fotogramas seguidos: antes se contaba desde que se pedía el fotograma, así que
                // uno lento nunca salía lento y la escena se quedaba a 20 fps con toda la resolución
                // (la primera tanda es corta para que el ajuste llegue cuanto antes)
                if (intervalo) { medidos++; suma += Math.min(intervalo, 100); }
                if (medidos >= (cuadro < 60 ? 20 : 40)) {
                    if (suma / medidos > 18.5 && bajarCalidad()) ajustar();
                    medidos = suma = 0;
                }
                if (visible && !document.hidden && (!reducir || est.t < 1 || Math.abs(est.yaw - est.yawObj) > .0005)) pedir(); else previo = 0;
            }
            function pedir() { if (!raf && visible && listo) { ultimo = performance.now(); raf = requestAnimationFrame(frame); } }
            new IntersectionObserver(en => { visible = en[0].isIntersecting; if (visible) pedir(); }, { rootMargin: '80px' }).observe(contenedor);
            document.addEventListener('visibilitychange', () => { if (!document.hidden) pedir(); });

            ajustar();
            ir(0, true);
            colocar(performance.now() / 1000);
            UI.carga('Puliendo detalles…');
            await respirar();
            // shaders y texturas se preparan por partes, sin congelar la página
            await compilar(renderer, escena, camara, composer.renderTarget1);
            await subirTexturas(renderer, escena);
            // los materiales con reloj propio (haces, polvo…) se reúnen una vez, no en cada fotograma
            escena.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uTiempo && !conTiempo.includes(o.material)) conTiempo.push(o.material); });
            // si en otra visita hubo que bajar la calidad, se empieza ya en ese escalón
            escena.traverse(o => { if (o.isReflector) espejos.push(o); });
            let aprendido = 0;
            try { aprendido = Number(localStorage.getItem(claveCalidad)) || 0; } catch (e) { }
            for (let i = 0; i < aprendido; i++) { const antes = localStorage.getItem(claveCalidad); if (!bajarCalidad()) break; try { localStorage.setItem(claveCalidad, antes); } catch (e) { } }
            if (aprendido) ajustar();
            // primer dibujo en dos tiempos: la escena con sus sombras, y después el postproceso
            renderer.shadowMap.needsUpdate = true;
            renderer.setRenderTarget(composer.renderTarget1); renderer.render(escena, camara); renderer.setRenderTarget(null);
            await valla(renderer);
            composer.render();
            listo = true;
            pedir();
            contenedor.classList.add('escena3d-lista');
            // cuando la pantalla de carga termina de fundirse se quita: así el spinner deja de girar
            setTimeout(() => { const carga = contenedor.querySelector('.escena3d-carga'); if (carga) carga.remove(); }, 1000);
            if (/diagnostico/.test(location.hash + location.search)) {
                const pre = document.createElement('pre'); pre.className = 'escena3d-diagnostico'; contenedor.appendChild(pre);
                const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
                const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
                setInterval(() => {
                    pre.textContent = [
                        navigator.userAgent, 'GPU: ' + gpu,
                        `lienzo CSS ${c.clientWidth}×${c.clientHeight} · píxeles ${c.width}×${c.height} · buffer ${gl.drawingBufferWidth}×${gl.drawingBufferHeight}`,
                        `ratio ${pixeles} (pantalla ${devicePixelRatio}) · postproceso ${composer.renderTarget1.width}×${composer.renderTarget1.height}`,
                        `calidad ${JSON.stringify(calidad)}`
                    ].join('\n');
                }, 1000);
            }
            contenedor.escena3d = { ir, planos: def.planos.length };
        }

        function montarEscena(nombre, def) {
            document.querySelectorAll(`.escena3d[data-escena="${nombre}"]`).forEach(el => {
                const obs = new IntersectionObserver(en => {
                    if (en[0].isIntersecting) {
                        obs.disconnect();
                        iniciar(el, def).catch(err => { console.error(err); el.classList.add('escena3d-sin-webgl'); const t = el.querySelector('.escena3d-carga-txt'); if (t) t.textContent = 'No se ha podido cargar la escena 3D.'; });
                    }
                }, { rootMargin: '500px' });
                obs.observe(el);
            });
        }

        return { THREE, RoundedBoxGeometry, Reflector, mergeGeometries, FUENTE, MONO, TEXTO, calidadDispositivo, generador, lerp, suave, v3, respirar, lienzo, textura, repetida, dibujar, ruido, celdas, normalDe, grisDe, crearKit, malla, caja, redondeada, torno, cilindro, entre, colocarEntre, catenaria, tubo, cadena, fusionar, haz, polvo, lampara, entorno, montarEscena };
    });
    window.ATR3D.motor.catch(err => avisarFallo('.escena3d', err));
    cuandoHagaFalta('.escena3d', () => arrancar());
    // pide el 3D cuando hace falta: con la página ya cargada y el navegador libre,
    // o en cuanto la escena está a dos pantallas (con «ahorro de datos», solo entonces)
    function cuandoHagaFalta(selector, empezar) {
        const els = document.querySelectorAll(selector);
        if (!els.length) return;
        let hecho = false, obs = null;
        const ir = () => { if (hecho) return; hecho = true; if (obs) obs.disconnect(); empezar(); };
        if (!('IntersectionObserver' in window)) { ir(); return; }
        obs = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) ir(); }, { rootMargin: '200% 0px' });
        els.forEach(el => obs.observe(el));
        const red = navigator.connection;
        if (red && (red.saveData || /2g/.test(red.effectiveType || ''))) return;
        const libre = () => window.requestIdleCallback ? requestIdleCallback(ir, { timeout: 4000 }) : setTimeout(ir, 1200);
        if (document.readyState === 'complete') setTimeout(libre, 300); else addEventListener('load', () => setTimeout(libre, 300), { once: true });
    }
    // las fuentes de los rótulos 3D solo se piden cuando se monta una escena (la web usa la del sistema)
    function fuentes3D() {
        let l = document.getElementById('fuentes3d');
        if (!l) {
            l = document.createElement('link');
            l.id = 'fuentes3d'; l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=JetBrains+Mono:wght@600;700&family=Archivo:wght@700;800&display=swap';
            l._lista = new Promise(r => { l.onload = l.onerror = r; });
            document.head.appendChild(l);
        }
        return l._lista.then(() => Promise.all([
            document.fonts.load('900 64px "Big Shoulders Display"'), document.fonts.load('800 64px "Big Shoulders Display"'),
            document.fonts.load('700 32px "JetBrains Mono"'), document.fonts.load('600 32px "JetBrains Mono"'),
            document.fonts.load('800 32px "Archivo"'), document.fonts.load('700 32px "Archivo"')
        ])).catch(() => { });
    }
    // si el 3D no llega a cargar (sin conexión o navegador antiguo) se avisa en vez de dejar la caja vacía
    function avisarFallo(selector, err) {
        console.error(err);
        document.querySelectorAll(selector).forEach(el => {
            if (el.querySelector('.atr3d-aviso')) return;
            const p = document.createElement('p');
            p.className = 'atr3d-aviso'; p.setAttribute('role', 'status');
            p.textContent = 'No se ha podido cargar el 3D. Revisa la conexión a internet o actualiza el navegador y recarga la página.';
            el.appendChild(p);
        });
    }
})();
