// ============================================
// ATR-GYM — el gimnasio en 3D
// Una sola nave con cuatro zonas: tarima de powerlifting, ring de boxeo,
// escenario de culturismo y peso libre. Cada página abre en su zona
// (data-zona en el contenedor .gym3d) y se puede recorrer entera.
// Todo se modela aquí con Three.js: sin modelos ni texturas que descargar.
// ============================================
// Es un script normal (no un módulo) para que también funcione al abrir la web
// con doble clic desde el ordenador; Three.js se descarga de jsDelivr con import().
(function () {
    'use strict';
    const modulos = [
        'three',
        'three/addons/environments/RoomEnvironment.js',
        'three/addons/geometries/RoundedBoxGeometry.js',
        'three/addons/postprocessing/EffectComposer.js',
        'three/addons/postprocessing/RenderPass.js',
        'three/addons/postprocessing/UnrealBloomPass.js',
        'three/addons/postprocessing/OutputPass.js',
    ];
    // Three.js pesa unos 700 KB: se pide cuando la página ya ha cargado y el
    // navegador está libre, o antes si el gimnasio se acerca a la pantalla.
    cuandoHagaFalta('.gym3d', () => Promise.all(modulos.map(m => import(m))).then(([THREE, { RoomEnvironment }, { RoundedBoxGeometry }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }]) => {
        fuentes3D();
        const VOLTIO = 0xE8E8ED;
        const TINTA = '#0D0D0C';
        const FUENTE = "'Big Shoulders Display', 'Arial Narrow', sans-serif";
        const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

        // [cámara], [punto al que mira]
        const ZONAS = {
            entrada: {
                nombre: 'Entrada', titulo: 'Bienvenido al templo',
                texto: 'Cuatro zonas bajo el mismo techo: tarima, ring, escenario y peso libre. Toca una zona para ir.',
                cam: [0, 6.2, 23.5], mira: [0, 2, -3]
            },
            powerlifting: {
                nombre: 'Powerlifting', titulo: 'La tarima',
                texto: 'Tarima reglamentaria de 4 × 4 m, discos calibrados y las tres luces blancas. Aquí se viene a hacer total.',
                cam: [-4.6, 3.1, 12.4], mira: [-10.5, 1.4, 4.2], enlace: 'powerlifting.html', etiqueta: 'Guía de powerlifting'
            },
            boxeo: {
                nombre: 'Boxeo', titulo: 'El ring',
                texto: 'Ring de 6 × 6 m con cuatro cuerdas y una fila de sacos pesados. Guardia alta y a trabajar.',
                cam: [2.6, 4.8, 5.6], mira: [10.8, 1.5, -5.4], enlace: 'boxeo.html', etiqueta: 'Guía de boxeo'
            },
            culturismo: {
                nombre: 'Culturismo', titulo: 'El escenario',
                texto: 'Focos, espejos y la tarima de un campeonato para ensayar las poses obligatorias.',
                cam: [-6.4, 3.2, -1.4], mira: [-10.6, 2.2, -12], enlace: 'culturismo.html', etiqueta: 'Guía de culturismo'
            },
            pesas: {
                nombre: 'Peso libre', titulo: 'Peso libre',
                texto: 'Mancuernas, bancos y rack: donde se hace el trabajo de cada semana.',
                cam: [6.4, 3.1, 14.2], mira: [14.2, 1.1, 7], enlace: 'index.html#rutinas', etiqueta: 'Ver mis rutinas'
            }
        };
        const ORDEN = ['entrada', 'powerlifting', 'boxeo', 'culturismo', 'pesas'];

        // ---------- utilidades ----------
        let semilla = 7;
        const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
        const lerp = (a, b, t) => a + (b - a) * t;
        const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // deja pintar un fotograma antes de seguir con el siguiente trozo de trabajo
        const respiro = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
        // Compila los shaders por tandas pequeñas. Tras cada tanda se espera a la gráfica con una
        // «valla» que se consulta entre fotogramas: preguntar por cada shader (como hace compileAsync)
        // obliga a esperar a que terminen todos y congelaba la página casi dos segundos.
        // Se compilan para la textura intermedia donde dibuja el postproceso: para la pantalla
        // saldrían otras variantes y se volverían a compilar al dibujar.
        function valla(renderer) {
            const gl = renderer.getContext();
            if (!gl.fenceSync) return respiro();
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
                if (performance.now() - t0 > 8) { await respiro(); t0 = performance.now(); }
            }
        }

        function lienzo(w, h, dibujar, opciones = {}) {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const x = c.getContext('2d');
            dibujar(x, w, h);
            const t = new THREE.CanvasTexture(c);
            t.colorSpace = opciones.datos ? THREE.NoColorSpace : THREE.SRGBColorSpace;
            t.anisotropy = 8;
            if (opciones.repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opciones.repetir); }
            return t;
        }
        function ruido(x, w, h, n, colores, rmin, rmax) {
            for (let i = 0; i < n; i++) {
                x.fillStyle = colores[(azar() * colores.length) | 0];
                x.beginPath(); x.arc(azar() * w, azar() * h, rmin + azar() * (rmax - rmin), 0, 6.283); x.fill();
            }
        }

        // ---------- texturas hechas a mano ----------
        const tex = {
            goma: () => lienzo(512, 512, (x, w, h) => {
                x.fillStyle = '#1a1a19'; x.fillRect(0, 0, w, h);
                ruido(x, w, h, 5000, ['#262624', '#121211', '#2f2f2c', '#1f1f1d'], .6, 1.6);
                ruido(x, w, h, 260, ['#3b3a35', '#4a4842'], .5, 1.2);
                x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = 3; x.strokeRect(1, 1, w - 2, h - 2);
                x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1; x.strokeRect(4, 4, w - 8, h - 8);
            }, { repetir: [1, 1] }),
            madera: () => lienzo(1024, 1024, (x, w, h) => {
                const tablas = 8, alto = h / tablas;
                for (let i = 0; i < tablas; i++) {
                    const tono = 150 + azar() * 40;
                    x.fillStyle = `rgb(${tono},${tono * .68 | 0},${tono * .42 | 0})`;
                    x.fillRect(0, i * alto, w, alto);
                    for (let k = 0; k < 40; k++) {
                        const y0 = i * alto + azar() * alto, a = azar() * 6, f = .004 + azar() * .01;
                        x.strokeStyle = `rgba(${azar() > .5 ? '90,52,24' : '210,170,120'},${.08 + azar() * .18})`;
                        x.lineWidth = .6 + azar() * 1.6;
                        x.beginPath();
                        for (let px = 0; px <= w; px += 16) x.lineTo(px, y0 + Math.sin(px * f + a) * 4);
                        x.stroke();
                    }
                    x.fillStyle = 'rgba(40,22,10,.55)'; x.fillRect(0, i * alto, w, 2);
                }
            }),
            hormigon: () => lienzo(512, 512, (x, w, h) => {
                x.fillStyle = '#2b2a27'; x.fillRect(0, 0, w, h);
                for (let i = 0; i < 70; i++) {
                    const px = azar() * w, py = azar() * h, r = 20 + azar() * 90, g = x.createRadialGradient(px, py, 0, px, py, r);
                    g.addColorStop(0, azar() > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                    x.fillStyle = g; x.fillRect(0, 0, w, h);
                }
                ruido(x, w, h, 1800, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.06)'], .4, 1.1);
            }, { repetir: [4, 2] }),
            lona: () => lienzo(1024, 1024, (x, w, h) => {
                x.fillStyle = '#9da3ab'; x.fillRect(0, 0, w, h);
                x.globalAlpha = .07;
                for (let i = 0; i < w; i += 3) { x.fillStyle = i % 6 ? '#000' : '#fff'; x.fillRect(i, 0, 1, h); x.fillRect(0, i, w, 1); }
                x.globalAlpha = 1;
                const c = w / 2;
                x.fillStyle = TINTA; x.beginPath(); x.arc(c, c, 230, 0, 6.283); x.fill();
                x.strokeStyle = '#E8E8ED'; x.lineWidth = 14; x.beginPath(); x.arc(c, c, 210, 0, 6.283); x.stroke();
                x.fillStyle = '#EFEDE6'; x.textAlign = 'center'; x.textBaseline = 'middle';
                x.font = `900 92px ${FUENTE}`; x.fillText('ATR', c, c - 38);
                x.fillStyle = '#E8E8ED'; x.font = `800 46px ${FUENTE}`; x.fillText('BOXING', c, c + 46);
                x.fillStyle = 'rgba(13,13,12,.55)'; x.font = `800 40px ${FUENTE}`;
                x.fillText('ATR-GYM · TERUEL', c, 120); x.save(); x.translate(c, h - 120); x.rotate(Math.PI); x.fillText('ATR-GYM · TERUEL', 0, 0); x.restore();
            }),
            faldon: () => lienzo(2048, 128, (x, w, h) => {
                x.fillStyle = '#0d0d0c'; x.fillRect(0, 0, w, h);
                x.font = `900 62px ${FUENTE}`; x.textBaseline = 'middle';
                let px = 30;
                while (px < w) {
                    x.fillStyle = '#EFEDE6'; x.fillText('ATR-GYM', px, h / 2 + 2); px += x.measureText('ATR-GYM').width + 30;
                    x.fillStyle = '#E8E8ED'; x.fillText('BOXING CLUB', px, h / 2 + 2); px += x.measureText('BOXING CLUB').width + 60;
                }
            }, { repetir: [1, 1] }),
            neon: (texto, opciones = {}) => {
                const tam = opciones.tam || 150, fuente = opciones.fuente || FUENTE, peso = opciones.peso || 900;
                const medir = document.createElement('canvas').getContext('2d');
                medir.font = `${peso} ${tam}px ${fuente}`;
                const ancho = Math.ceil(medir.measureText(texto).width + tam * .9), alto = Math.ceil(tam * 1.6);
                const t = lienzo(ancho, alto, (x, w, h) => {
                    x.font = `${peso} ${tam}px ${fuente}`; x.textAlign = 'center'; x.textBaseline = 'middle';
                    if (opciones.espaciado) x.letterSpacing = opciones.espaciado + 'px';
                    x.shadowColor = opciones.halo || '#E8E8ED'; x.shadowBlur = tam * .22;
                    x.fillStyle = opciones.color || '#FFF1CF';
                    x.fillText(texto, w / 2, h / 2); x.fillText(texto, w / 2, h / 2);
                });
                t.userData.aspecto = ancho / alto;
                return t;
            },
            marcador: () => lienzo(1024, 512, (x, w, h) => {
                x.fillStyle = '#050505'; x.fillRect(0, 0, w, h);
                x.strokeStyle = '#E8E8ED'; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28);
                x.fillStyle = '#8a8a82'; x.font = `700 34px ${MONO}`; x.fillText('ATR-GYM OPEN · CATEGORÍA -93 KG', 50, 78);
                x.fillStyle = '#EFEDE6'; x.font = `900 66px ${FUENTE}`; x.fillText('SENTADILLA', 50, 178);
                x.fillStyle = '#E8E8ED'; x.font = `900 150px ${FUENTE}`; x.fillText('250,0', 50, 340);
                x.fillStyle = '#EFEDE6'; x.font = `800 54px ${FUENTE}`; x.fillText('KG', 620, 340);
                x.fillStyle = '#8a8a82'; x.font = `700 32px ${MONO}`; x.fillText('3er INTENTO · DOTS 412,6', 50, 430);
                for (let i = 0; i < 3; i++) {
                    const g = x.createRadialGradient(800 + i * 70, 430, 0, 800 + i * 70, 430, 30);
                    g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#f3f3ea'); g.addColorStop(1, 'rgba(255,255,255,0)');
                    x.fillStyle = g; x.beginPath(); x.arc(800 + i * 70, 430, 30, 0, 6.283); x.fill();
                }
            }),
            fondoEscenario: () => lienzo(1024, 560, (x, w, h) => {
                const g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#16150f'); g.addColorStop(1, '#050505');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                for (let i = 0; i < 26; i++) {
                    const px = 20 + i * 38;
                    const lg = x.createLinearGradient(0, 0, 0, h);
                    lg.addColorStop(0, 'rgba(255,255,255,.0)'); lg.addColorStop(.5, 'rgba(255,255,255,.22)'); lg.addColorStop(1, 'rgba(255,255,255,.0)');
                    x.fillStyle = lg; x.fillRect(px, 0, 2, h);
                }
                x.textAlign = 'center';
                x.fillStyle = '#c9a45c'; x.font = `700 30px ${MONO}`; x.fillText('CAMPEONATO · CLASSIC PHYSIQUE', w / 2, 118);
                x.shadowColor = 'rgba(255,255,255,.6)'; x.shadowBlur = 30;
                const lg = x.createLinearGradient(0, 160, 0, 300);
                lg.addColorStop(0, '#f7e3ad'); lg.addColorStop(1, '#a8823f');
                x.fillStyle = lg; x.font = `900 112px ${FUENTE}`; x.fillText('ATR CLASSIC', w / 2, 284);
                x.shadowBlur = 0; x.fillStyle = 'rgba(239,237,230,.6)'; x.font = `700 28px ${MONO}`; x.fillText('POSES OBLIGATORIAS · RONDA FINAL', w / 2, 360);
            }),
            discoCara: (color, texto) => lienzo(256, 256, (x, w, h) => {
                const c = w / 2;
                x.fillStyle = color; x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 5; x.beginPath(); x.arc(c, c, 92, 0, 6.283); x.stroke();
                x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
                x.font = `900 46px ${FUENTE}`; x.fillText(texto, c, c - 58);
                x.font = `800 22px ${FUENTE}`; x.fillText('ATR-GYM', c, c + 64);
                x.fillStyle = '#c9c9c9'; x.beginPath(); x.arc(c, c, 26, 0, 6.283); x.fill();
                x.fillStyle = '#2b2b2b'; x.beginPath(); x.arc(c, c, 14, 0, 6.283); x.fill();
            }),
            haz: () => lienzo(32, 256, (x, w, h) => {
                const g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
            }),
            logoSuelo: () => lienzo(512, 512, (x, w, h) => {
                const c = w / 2;
                x.clearRect(0, 0, w, h);
                x.strokeStyle = '#E8E8ED'; x.lineWidth = 10; x.beginPath(); x.arc(c, c, 236, 0, 6.283); x.stroke();
                x.lineWidth = 3; x.beginPath(); x.arc(c, c, 214, 0, 6.283); x.stroke();
                x.fillStyle = '#EFEDE6'; x.fillRect(c - 150, c - 9, 300, 18);
                x.fillStyle = '#E8E8ED';
                [[-128, 40, 150], [-92, 26, 104], [92, 26, 104], [128, 40, 150]].forEach(([dx, wd, hg]) => {
                    x.beginPath(); x.roundRect(c + dx - wd / 2, c - hg / 2, wd, hg, 10); x.fill();
                });
                x.font = `900 44px ${FUENTE}`; x.textAlign = 'center'; x.fillStyle = '#EFEDE6'; x.fillText('ATR-GYM', c, c + 150);
            }),
            chispa: () => lienzo(64, 64, (x, w, h) => {
                const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
                g.addColorStop(0, 'rgba(255,248,220,1)'); g.addColorStop(.4, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
            })
        };

        // ---------- materiales ----------
        function crearMateriales() {
            const goma = tex.goma();
            return {
                goma, // la textura se clona por superficie para ajustar la repetición
                pasillo: new THREE.MeshPhysicalMaterial({ color: 0x0b0b0a, roughness: .16, metalness: .1, clearcoat: 1, clearcoatRoughness: .08 }),
                pared: new THREE.MeshStandardMaterial({ map: tex.hormigon(), roughness: .92, color: 0x8b8984 }),
                techo: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: .9 }),
                nogal: new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: .45, metalness: .05 }),
                laton: new THREE.MeshStandardMaterial({ color: 0xc9a45c, roughness: .26, metalness: 1 }),
                acero: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: .42, metalness: .55 }),
                aceroClaro: new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: .35, metalness: .7 }),
                cromo: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .1, metalness: 1 }),
                cuero: new THREE.MeshPhysicalMaterial({ color: 0x121212, roughness: .5, clearcoat: .35, clearcoatRoughness: .4 }),
                cueroRojo: new THREE.MeshPhysicalMaterial({ color: 0x6d0f14, roughness: .45, clearcoat: .45, clearcoatRoughness: .35 }),
                gomaNegra: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .8 }),
                madera: new THREE.MeshStandardMaterial({ map: tex.madera(), roughness: .5, color: 0xffffff }),
                escenario: new THREE.MeshPhysicalMaterial({ color: 0x080808, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }),
                espejo: new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: .02, metalness: 1 }),
                voltio: new THREE.MeshBasicMaterial({ color: new THREE.Color(VOLTIO).multiplyScalar(1.6), toneMapped: false }),
                luzBlanca: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff3dd).multiplyScalar(2.2), toneMapped: false })
            };
        }

        function gomaSuelo(M, ancho, fondo) {
            const t = M.goma.clone(); t.needsUpdate = true; t.repeat.set(ancho, fondo);
            return new THREE.MeshStandardMaterial({ map: t, roughness: .86, color: 0xb8b8b0 });
        }
        function caja(w, h, d, mat, x = 0, y = 0, z = 0, sombra = true) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = sombra; m.receiveShadow = true;
            return m;
        }
        function redondeada(w, h, d, r, mat) {
            const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
            m.castShadow = true; m.receiveShadow = true;
            return m;
        }
        function cartel(textura, alto, mat) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * textura.userData.aspecto, alto), mat || new THREE.MeshBasicMaterial({
                map: textura, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5)
            }));
            return m;
        }

        // ---------- piezas del gimnasio ----------
        const DISCOS = {
            25: { color: '#c8102e', r: .225, g: .027 },
            20: { color: '#0b3fa8', r: .225, g: .022 },
            15: { color: '#f2b705', r: .225, g: .021 },
            10: { color: '#0a7a3d', r: .1625, g: .021 },
            5: { color: '#f4f4f0', r: .1145, g: .018 }
        };
        const cacheDiscos = {};
        function disco(kg) {
            if (!cacheDiscos[kg]) {
                const d = DISCOS[kg];
                const perfil = [
                    new THREE.Vector2(.026, -d.g / 2), new THREE.Vector2(.06, -d.g / 2), new THREE.Vector2(.065, -d.g / 2 - .004),
                    new THREE.Vector2(d.r - .02, -d.g / 2 + .002), new THREE.Vector2(d.r - .004, -d.g / 2), new THREE.Vector2(d.r, -d.g / 2 + .004),
                    new THREE.Vector2(d.r, d.g / 2 - .004), new THREE.Vector2(d.r - .004, d.g / 2), new THREE.Vector2(d.r - .02, d.g / 2 - .002),
                    new THREE.Vector2(.065, d.g / 2 + .004), new THREE.Vector2(.06, d.g / 2), new THREE.Vector2(.026, d.g / 2)
                ];
                const geo = new THREE.LatheGeometry(perfil, 56);
                geo.rotateZ(Math.PI / 2);
                const mat = new THREE.MeshPhysicalMaterial({ color: d.color, roughness: .32, metalness: .15, clearcoat: 1, clearcoatRoughness: .12 });
                const cara = new THREE.MeshPhysicalMaterial({ map: tex.discoCara(d.color, kg + ' KG'), roughness: .3, clearcoat: 1, clearcoatRoughness: .1 });
                cacheDiscos[kg] = { geo, mat, cara, d };
            }
            const { geo, mat, cara, d } = cacheDiscos[kg];
            const g = new THREE.Group();
            const cuerpo = new THREE.Mesh(geo, mat); cuerpo.castShadow = true; cuerpo.receiveShadow = true;
            const etiqueta = new THREE.Mesh(new THREE.CircleGeometry(d.r * .82, 48), cara);
            etiqueta.rotation.y = Math.PI / 2; etiqueta.position.x = d.g / 2 + .0025;
            g.add(cuerpo, etiqueta);
            g.userData.grosor = d.g;
            return g;
        }
        // barra olímpica con discos; el eje va en X
        function barraCargada(M, discos) {
            const g = new THREE.Group();
            const eje = new THREE.Mesh(new THREE.CylinderGeometry(.0145, .0145, 1.31, 20), M.aceroClaro);
            eje.rotation.z = Math.PI / 2; eje.castShadow = true;
            g.add(eje);
            [-1, 1].forEach(lado => {
                const tope = new THREE.Mesh(new THREE.CylinderGeometry(.038, .038, .03, 28), M.cromo);
                tope.rotation.z = Math.PI / 2; tope.position.x = lado * .67; g.add(tope);
                const manga = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .415, 28), M.cromo);
                manga.rotation.z = Math.PI / 2; manga.position.x = lado * (.685 + .2075); manga.castShadow = true; g.add(manga);
                let x = .69;
                discos.forEach(kg => {
                    const p = disco(kg), gro = p.userData.grosor;
                    p.position.x = lado * (x + gro / 2);
                    if (lado < 0) p.rotation.y = Math.PI;
                    g.add(p); x += gro + .002;
                });
                const cierre = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .06, 24), M.cromo);
                cierre.rotation.z = Math.PI / 2; cierre.position.x = lado * (x + .03); g.add(cierre);
            });
            return g;
        }

        function tarimaPowerlifting(M) {
            const z = new THREE.Group();
            // escenario negro con canto de latón y escalones
            z.add(caja(6.4, .35, 6.4, M.escenario, 0, .175, 0));
            [[0, .35, 3.2, 6.44, .02, .02], [0, .35, -3.2, 6.44, .02, .02], [3.2, .35, 0, .02, .02, 6.44], [-3.2, .35, 0, .02, .02, 6.44]].forEach(([x, y, zz, w, h, d]) => z.add(caja(w, h, d, M.laton, x, y, zz, false)));
            z.add(caja(2.4, .12, .45, M.escenario, 0, .06, 3.45), caja(2.4, .24, .4, M.escenario, 0, .12, 3.25));
            // tarima: madera en el centro, goma a los lados
            const madera = caja(2.4, .06, 4, M.madera, 0, .38, 0, false);
            madera.material = M.madera.clone(); madera.material.map = M.madera.map.clone(); madera.material.map.needsUpdate = true;
            madera.material.map.repeat.set(1, 1.6); madera.material.map.wrapS = madera.material.map.wrapT = THREE.RepeatWrapping;
            z.add(madera);
            const gomaLado = gomaSuelo(M, .8, 4);
            z.add(caja(.8, .06, 4, gomaLado, -1.6, .38, 0, false), caja(.8, .06, 4, gomaLado, 1.6, .38, 0, false));
            // rack de competición (monolift sencillo)
            const rack = new THREE.Group();
            [-.62, .62].forEach(x => {
                rack.add(caja(.08, 2.1, .08, M.acero, x, 1.06, -.25));
                rack.add(caja(.08, .08, 1.1, M.acero, x, .04, .05));
                rack.add(caja(.08, .9, .08, M.acero, x, .45, .45));
                rack.add(caja(.07, .05, .62, M.cromo, x, 1.05, .2)); // brazos de seguridad
                const gancho = caja(.06, .09, .12, M.gomaNegra, x, 1.45, -.17); rack.add(gancho);
            });
            rack.add(caja(1.32, .08, .08, M.acero, 0, 2.1, -.25), caja(1.32, .08, .08, M.acero, 0, .04, -.25));
            const placa = new THREE.Mesh(new THREE.PlaneGeometry(.5, .16), M.voltio);
            placa.position.set(0, 1.9, -.205); rack.add(placa);
            rack.position.set(0, .41, -.4);
            z.add(rack);
            const barra = barraCargada(M, [25, 25, 25, 20, 15]);
            barra.position.set(0, .41 + 1.52, -.55);
            z.add(barra);
            // barra en el suelo para el peso muerto
            const muerto = barraCargada(M, [25, 25, 25, 25, 20, 10]);
            muerto.position.set(0, .41 + .225, 1.25);
            z.add(muerto);
            // soporte de tiza: pie negro y cuenco de latón
            const tiza = new THREE.Group();
            tiza.add(caja(.36, .03, .36, M.acero, 0, .015, 0));
            const pie = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .82, 16), M.acero); pie.position.y = .44; pie.castShadow = true; tiza.add(pie);
            const cuenco = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.04, 0), new THREE.Vector2(.2, .03), new THREE.Vector2(.27, .13), new THREE.Vector2(.26, .14), new THREE.Vector2(.19, .05), new THREE.Vector2(0, .04)], 40), M.laton);
            cuenco.position.y = .85; cuenco.castShadow = true; tiza.add(cuenco);
            const polvo = new THREE.Mesh(new THREE.CircleGeometry(.23, 32), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 1 }));
            polvo.rotation.x = -Math.PI / 2; polvo.position.y = .96; tiza.add(polvo);
            tiza.position.set(2.75, .35, -2.5); z.add(tiza);
            // las tres luces de los jueces
            const luces = new THREE.Group();
            luces.add(caja(1.1, .42, .2, M.acero, 0, 0, 0));
            for (let i = -1; i <= 1; i++) {
                const l = new THREE.Mesh(new THREE.CircleGeometry(.12, 32), M.luzBlanca);
                l.position.set(i * .34, 0, .102); luces.add(l);
            }
            luces.add(caja(.06, 1.6, .06, M.acero, 0, -1, -.05));
            luces.position.set(-2.6, 2.05, -2.4); luces.rotation.y = .35;
            z.add(luces);
            return z;
        }

        function ringBoxeo(M) {
            const z = new THREE.Group();
            const lado = 7.2, alto = 1.0, interior = 6.1;
            // base y faldón con el nombre del club
            const faldonTex = tex.faldon(); faldonTex.wrapS = THREE.RepeatWrapping; faldonTex.repeat.set(1.15, 1);
            const faldon = new THREE.MeshStandardMaterial({ map: faldonTex, roughness: .7 });
            const base = caja(lado, alto, lado, [faldon, faldon, M.gomaNegra, M.gomaNegra, faldon, faldon], 0, alto / 2, 0);
            base.material = [faldon, faldon, M.gomaNegra, M.gomaNegra, faldon, faldon];
            z.add(base);
            const lona = new THREE.Mesh(new THREE.BoxGeometry(lado + .1, .06, lado + .1), [M.gomaNegra, M.gomaNegra, new THREE.MeshStandardMaterial({ map: tex.lona(), roughness: .85 }), M.gomaNegra, M.gomaNegra, M.gomaNegra]);
            lona.position.y = alto + .03; lona.receiveShadow = true; z.add(lona);
            // postes con protecciones de esquina
            const colores = [0xb3141c, 0x1440a8, 0xeeeeee, 0xeeeeee];
            const esquinas = [[-1, -1], [1, 1], [1, -1], [-1, 1]];
            const s = interior / 2;
            esquinas.forEach(([ex, ez], i) => {
                const poste = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 1.5, 20), M.cromo);
                poste.position.set(ex * s, alto + .75, ez * s); poste.castShadow = true; z.add(poste);
                const pad = redondeada(.26, 1.2, .26, .06, new THREE.MeshPhysicalMaterial({ color: colores[i], roughness: .45, clearcoat: .5 }));
                pad.position.set(ex * (s - .08), alto + .82, ez * (s - .08)); pad.rotation.y = Math.PI / 4; z.add(pad);
            });
            // cuatro cuerdas por lado
            const cuerdaMat = [new THREE.MeshPhysicalMaterial({ color: 0xb3141c, roughness: .4, clearcoat: .6 }), new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: .4, clearcoat: .6 })];
            [.42, .75, 1.08, 1.4].forEach((h, k) => {
                [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dz]) => {
                    const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, interior - .1, 12), cuerdaMat[k % 2]);
                    cuerda.castShadow = true;
                    if (dx === 0) { cuerda.rotation.z = Math.PI / 2; cuerda.position.set(0, alto + h, dz * s); }
                    else { cuerda.rotation.x = Math.PI / 2; cuerda.position.set(dx * s, alto + h, 0); }
                    z.add(cuerda);
                });
            });
            // escalones de acceso
            const escalera = new THREE.Group();
            for (let i = 0; i < 3; i++) escalera.add(caja(1.1, .33 * (i + 1), .4, M.acero, 0, .165 * (i + 1), -i * .4));
            escalera.position.set(-2.2, 0, lado / 2 + 1.0); z.add(escalera);
            return z;
        }

        function sacos(M) {
            const z = new THREE.Group();
            z.add(caja(7.6, .22, .22, M.acero, 0, 6.6, 0));
            [-2.8, -.9, 1, 2.9].forEach((x, i) => {
                const saco = new THREE.Group();
                const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(.19, 1.0, 8, 24), i % 2 ? M.cuero : M.cueroRojo);
                cuerpo.castShadow = true; saco.add(cuerpo);
                const aro = new THREE.Mesh(new THREE.TorusGeometry(.19, .015, 8, 32), M.cromo);
                aro.rotation.x = Math.PI / 2; aro.position.y = .5; saco.add(aro);
                const cadena = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 6.6 - 2.45, 6), M.cromo);
                cadena.position.y = .69 + (6.6 - 2.45) / 2; saco.add(cadena);
                saco.position.set(x, 1.76, 0);
                saco.rotation.z = (azar() - .5) * .05;
                saco.userData.fase = azar() * 6;
                z.add(saco);
            });
            return z;
        }

        function escenarioCulturismo(M, textHaz) {
            const z = new THREE.Group();
            z.add(caja(7.2, .5, 3.6, M.escenario, 0, .25, 0));
            const borde = new THREE.Mesh(new THREE.BoxGeometry(7.24, .03, .03), M.voltio);
            borde.position.set(0, .5, 1.8); z.add(borde);
            z.add(caja(2.2, .17, .4, M.escenario, 0, .085, 2.0), caja(2.2, .34, .35, M.escenario, 0, .17, 1.82));
            // telón de fondo con marco de latón
            const fondo = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 4.6), new THREE.MeshStandardMaterial({ map: tex.fondoEscenario(), roughness: .6, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
            fondo.material.emissiveMap = fondo.material.map; fondo.material.emissiveIntensity = .55;
            fondo.position.set(0, .5 + 2.3, -1.95); z.add(fondo);
            [[0, 5.12, 8.6, .08], [0, .52, 8.6, .08], [-4.26, 2.82, .08, 4.68], [4.26, 2.82, .08, 4.68]].forEach(([x, y, w, h]) => z.add(caja(w, h, .1, M.laton, x, y, -1.92, false)));
            // focos con su haz de luz
            [-2.4, 0, 2.4].forEach(x => {
                const foco = new THREE.Group();
                const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(.16, .22, .42, 24), M.acero);
                foco.add(cuerpo);
                const lente = new THREE.Mesh(new THREE.CircleGeometry(.15, 24), M.luzBlanca);
                lente.rotation.x = Math.PI / 2; lente.position.y = -.215; foco.add(lente);
                foco.position.set(x, 6.7, .8);
                z.add(foco);
                const haz = new THREE.Mesh(new THREE.CylinderGeometry(.14, 1.25, 6.2, 32, 1, true), new THREE.MeshBasicMaterial({
                    map: textHaz, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xfff1d6, toneMapped: false
                }));
                haz.position.set(x, 6.7 - 3.1, .8); z.add(haz);
            });
            // trofeos en un pedestal
            const pedestal = caja(1.6, 1.0, .6, M.escenario, 4.4, .5, 1.6);
            z.add(pedestal);
            [-.5, 0, .5].forEach((dx, i) => {
                const copa = new THREE.Mesh(new THREE.LatheGeometry([
                    new THREE.Vector2(0, 0), new THREE.Vector2(.12, 0), new THREE.Vector2(.12, .03), new THREE.Vector2(.04, .06), new THREE.Vector2(.03, .2),
                    new THREE.Vector2(.05, .24), new THREE.Vector2(.13, .3), new THREE.Vector2(.15, .42), new THREE.Vector2(.14, .46), new THREE.Vector2(.0, .46)
                ].map(v => v.multiplyScalar(i === 1 ? 1.25 : 1)), 40), M.laton);
                copa.position.set(4.4 + dx, 1.0, 1.6); copa.castShadow = true; z.add(copa);
            });
            return z;
        }

        function zonaPesas(M) {
            const z = new THREE.Group();
            // estantería de mancuernas de dos alturas a lo largo de la pared
            const largo = 5.2;
            z.add(caja(.7, .06, largo, M.acero, 0, .55, 0), caja(.7, .06, largo, M.acero, -.12, .95, 0));
            [-largo / 2 + .05, 0, largo / 2 - .05].forEach(dz => { z.add(caja(.06, .95, .06, M.acero, .25, .48, dz), caja(.06, .95, .06, M.acero, -.3, .48, dz)); });
            const cabezas = [], mangos = [];
            for (let fila = 0; fila < 2; fila++) {
                for (let i = 0; i < 12; i++) {
                    const kg = 10 + (fila * 12 + i) * 2;
                    const r = .065 + kg * .0011, l = .085 + kg * .0012;
                    const y = (fila ? .98 : .58) + r, x = fila ? -.12 : 0, dz = -largo / 2 + .22 + i * (largo - .44) / 11;
                    mangos.push([x, y, dz]);
                    cabezas.push([x, y, dz - .085 - l / 2, r, l], [x, y, dz + .085 + l / 2, r, l]);
                }
            }
            const geoCabeza = new THREE.CylinderGeometry(1, 1, 1, 6); geoCabeza.rotateX(Math.PI / 2);
            const icab = new THREE.InstancedMesh(geoCabeza, M.gomaNegra, cabezas.length);
            const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3();
            cabezas.forEach(([x, y, dz, r, l], i) => { m4.compose(e.set(x, y, dz), q, new THREE.Vector3(r, r, l)); icab.setMatrixAt(i, m4); });
            icab.castShadow = true; z.add(icab);
            const geoMango = new THREE.CylinderGeometry(.018, .018, .17, 12); geoMango.rotateX(Math.PI / 2);
            const iman = new THREE.InstancedMesh(geoMango, M.cromo, mangos.length);
            mangos.forEach(([x, y, dz], i) => { m4.makeTranslation(x, y, dz); iman.setMatrixAt(i, m4); });
            z.add(iman);
            return z;
        }
        function banco(M) {
            const b = new THREE.Group();
            const asiento = redondeada(.3, .09, .5, .035, M.cuero); asiento.position.set(0, .46, .42);
            const respaldo = redondeada(.3, .09, 1.1, .035, M.cuero); respaldo.position.set(0, .62, -.38); respaldo.rotation.x = .3;
            b.add(asiento, respaldo);
            b.add(caja(.08, .06, 1.5, M.acero, 0, .32, 0), caja(.5, .06, .08, M.acero, 0, .03, .7), caja(.5, .06, .08, M.acero, 0, .03, -.7), caja(.08, .3, .08, M.acero, 0, .17, .62), caja(.08, .3, .08, M.acero, 0, .17, -.62));
            return b;
        }
        function rackPotencia(M) {
            const r = new THREE.Group();
            [[-.62, -.6], [.62, -.6], [-.62, .6], [.62, .6]].forEach(([x, z]) => r.add(caja(.08, 2.35, .08, M.acero, x, 1.175, z)));
            [[0, 2.35, -.6, 1.32, .08, .08], [0, 2.35, .6, 1.32, .08, .08], [-.62, 2.35, 0, .08, .08, 1.28], [.62, 2.35, 0, .08, .08, 1.28], [-.62, .04, 0, .08, .08, 1.28], [.62, .04, 0, .08, .08, 1.28]].forEach(([x, y, z, w, h, d]) => r.add(caja(w, h, d, M.acero, x, y, z)));
            const barra = barraCargada(M, [20, 15, 10]); barra.position.set(0, 1.35, -.6 + .06); r.add(barra);
            const placa = new THREE.Mesh(new THREE.PlaneGeometry(.6, .12), M.voltio); placa.position.set(0, 2.35, .645); r.add(placa);
            return r;
        }

        // ---------- la nave ----------
        function construirGimnasio(escena, M, calidad) {
            const X = 17, FONDO = -15, FRENTE = 16, ALTO = 7.2;
            const hazTex = tex.haz();

            // suelo de goma y pasillo central de resina brillante
            const suelo = new THREE.Mesh(new THREE.PlaneGeometry(X * 2, FRENTE - FONDO), gomaSuelo(M, X * 2, FRENTE - FONDO));
            suelo.rotation.x = -Math.PI / 2; suelo.position.z = (FRENTE + FONDO) / 2; suelo.receiveShadow = true;
            escena.add(suelo);
            const pasillo = new THREE.Mesh(new THREE.PlaneGeometry(5, FRENTE - FONDO), M.pasillo);
            pasillo.rotation.x = -Math.PI / 2; pasillo.position.set(0, .004, (FRENTE + FONDO) / 2); pasillo.receiveShadow = true;
            escena.add(pasillo);
            [-2.5, 2.5].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(.04, .01, FRENTE - FONDO), M.voltio); l.position.set(x, .008, (FRENTE + FONDO) / 2); escena.add(l); });
            const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: tex.logoSuelo(), transparent: true, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05), depthWrite: false }));
            logo.rotation.x = -Math.PI / 2; logo.position.set(0, .01, 11.5); escena.add(logo);

            // paredes y techo
            const paredAtras = new THREE.Mesh(new THREE.PlaneGeometry(X * 2, ALTO), M.pared);
            paredAtras.position.set(0, ALTO / 2, FONDO); paredAtras.receiveShadow = true; escena.add(paredAtras);
            [-1, 1].forEach(lado => {
                const p = new THREE.Mesh(new THREE.PlaneGeometry(FRENTE - FONDO, ALTO), M.pared);
                p.rotation.y = -lado * Math.PI / 2; p.position.set(lado * X, ALTO / 2, (FRENTE + FONDO) / 2); p.receiveShadow = true; escena.add(p);
            });
            const techo = new THREE.Mesh(new THREE.PlaneGeometry(X * 2, FRENTE - FONDO), M.techo);
            techo.rotation.x = Math.PI / 2; techo.position.set(0, ALTO, (FRENTE + FONDO) / 2); escena.add(techo);
            // tiras de luz en el techo
            [-12, -6, 0, 6, 12].forEach(x => {
                const tira = new THREE.Mesh(new THREE.BoxGeometry(.12, .04, FRENTE - FONDO - 3), M.luzBlanca);
                tira.position.set(x, ALTO - .03, (FRENTE + FONDO) / 2 + 1); escena.add(tira);
            });
            // vigas
            for (let z = FONDO + 3; z < FRENTE; z += 6) escena.add(caja(X * 2, .35, .22, M.acero, 0, ALTO - .3, z, false));

            // pilastras pegadas a las paredes con remates de latón (no tapan las zonas)
            [-1, 1].forEach(lado => [-12, -1.5, 12.5].forEach(z => {
                const x = lado * (X - .25);
                escena.add(caja(.5, ALTO, .6, M.pared, x, ALTO / 2, z));
                escena.add(caja(.56, .14, .66, M.laton, x, .07, z, false), caja(.56, .06, .66, M.laton, x, 2.6, z, false), caja(.56, .06, .66, M.laton, x, ALTO - .7, z, false));
            }));

            // pared del fondo: lamas de nogal, neón de la marca y lema
            const lamas = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, ALTO - .4, .08), M.nogal, 46);
            const m4 = new THREE.Matrix4();
            for (let i = 0; i < 46; i++) { m4.makeTranslation(-5.4 + i * .24, ALTO / 2 - .2, FONDO + .05); lamas.setMatrixAt(i, m4); }
            lamas.receiveShadow = true; escena.add(lamas);
            const marca = cartel(tex.neon('ATR-GYM', { tam: 170 }), 2.0); marca.position.set(0, 4.8, FONDO + .12); escena.add(marca);
            const lema = cartel(tex.neon('ENTRENA CON MÉTODO', { tam: 64, fuente: MONO, peso: 700, color: '#EFEDE6', halo: 'rgba(239,237,230,.6)' }), .42);
            lema.position.set(0, 3.4, FONDO + .12); escena.add(lema);

            // carteles de cada zona
            const neonZona = (texto, x, y, z, rotY) => { const c = cartel(tex.neon(texto, { tam: 120 }), .9); c.position.set(x, y, z); c.rotation.y = rotY; escena.add(c); };
            neonZona('POWERLIFTING', -X + .08, 5.1, 4.8, Math.PI / 2);
            neonZona('BOXEO', 10.6, 5.7, FONDO + .1, 0);
            neonZona('PESO LIBRE', X - .08, 5.1, 7, -Math.PI / 2);

            // ---- zonas ----
            const pl = tarimaPowerlifting(M); pl.position.set(-10.5, 0, 4.5); escena.add(pl);
            const marcador = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: tex.marcador(), toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }));
            marcador.rotation.y = Math.PI / 2; marcador.position.set(-X + .06, 3.1, 4.6); escena.add(marcador);
            escena.add(caja(.08, 2.3, 4.4, M.acero, -X + .03, 3.1, 4.6, false));

            const ring = ringBoxeo(M); ring.position.set(10.6, 0, -6.2); escena.add(ring);
            const bolsas = sacos(M); bolsas.position.set(10.6, 0, .6); escena.add(bolsas);

            const cult = escenarioCulturismo(M, hazTex); cult.position.set(-10.6, 0, -11.1); escena.add(cult);
            const espejo = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), M.espejo);
            espejo.rotation.y = Math.PI / 2; espejo.position.set(-X + .05, 1.75, -4.6); escena.add(espejo);
            escena.add(caja(.06, .08, 7.1, M.laton, -X + .06, .43, -4.6, false), caja(.06, .08, 7.1, M.laton, -X + .06, 3.07, -4.6, false));

            const pesas = zonaPesas(M); pesas.position.set(X - .6, 0, 7.2); escena.add(pesas);
            const espejo2 = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.1), M.espejo);
            espejo2.rotation.y = -Math.PI / 2; espejo2.position.set(X - .05, 2.35, 7.2); escena.add(espejo2);
            const b1 = banco(M); b1.position.set(11.6, 0, 5.4); b1.rotation.y = .5; escena.add(b1);
            const b2 = banco(M); b2.position.set(12.4, 0, 9.4); b2.rotation.y = -.35; escena.add(b2);
            const rp = rackPotencia(M); rp.position.set(9.6, 0, 11.6); rp.rotation.y = .25; escena.add(rp);

            // ---- luces ----
            escena.add(new THREE.HemisphereLight(0xfff1dc, 0x0b0b0a, .2));
            const focos = [];
            const foco = (color, intensidad, pos, mira, angulo, sombra) => {
                const l = new THREE.SpotLight(color, intensidad, 0, angulo, .55, 2);
                l.position.set(...pos); l.target.position.set(...mira);
                if (sombra && calidad.sombras) {
                    l.castShadow = true; l.shadow.mapSize.set(calidad.sombraTam, calidad.sombraTam);
                    l.shadow.bias = -.0004; l.shadow.normalBias = .02; l.shadow.radius = 4;
                }
                escena.add(l, l.target); focos.push(l);
                return l;
            };
            foco(0xfff0dc, 520, [-10.5, ALTO - .2, 5.5], [-10.5, 0, 4.4], .62, true);
            foco(0xffffff, 240, [10.6, ALTO - .2, -5.6], [10.6, 1, -6.2], .7, calidad.sombras > 1);
            foco(0xffe6c2, 300, [-10.6, ALTO - .3, -9.6], [-10.6, .5, -11], .55, calidad.sombras > 1);
            foco(0xfff3e4, 240, [11.6, ALTO - .2, 7.8], [11.8, 0, 7.4], .75, false);
            foco(0xfff3e4, 260, [14.6, ALTO - .2, 7.2], [16.3, .6, 7.2], .7, false);
            foco(0xfff3e4, 180, [0, ALTO - .2, 4], [0, 0, 2], .9, false);
            [[0, 4.5, FONDO + 1.2, VOLTIO, 5], [-X + 1, 5, 4.8, VOLTIO, 2.5], [10.6, 5.6, FONDO + 1, VOLTIO, 2.5]].forEach(([x, y, z, c, i]) => {
                const p = new THREE.PointLight(c, i, 9, 2); p.position.set(x, y, z); escena.add(p);
            });

            // motas de polvo flotando en la luz
            const n = calidad.polvo, pos = new Float32Array(n * 3);
            const zonasPolvo = [[-10.5, 4.5], [10.6, -6.2], [-10.6, -10.3], [0, 2]];
            for (let i = 0; i < n; i++) {
                const [cx, cz] = zonasPolvo[i % zonasPolvo.length];
                pos[i * 3] = cx + (azar() - .5) * 4; pos[i * 3 + 1] = .5 + azar() * 6; pos[i * 3 + 2] = cz + (azar() - .5) * 4;
            }
            const geoPolvo = new THREE.BufferGeometry(); geoPolvo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const polvo = new THREE.Points(geoPolvo, new THREE.PointsMaterial({ map: tex.chispa(), size: .045, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff4dc }));
            escena.add(polvo);

            return { bolsas, polvo };
        }

        // ---------- visor ----------
        function crearUI(contenedor, zonaInicial, paginaActual) {
            const sinEnlaces = 'sinEnlaces' in contenedor.dataset;
            const ui = document.createElement('div');
            ui.className = 'gym3d-ui';
            ui.innerHTML = `
                <div class="gym3d-carga" role="status"><span class="gym3d-spinner" aria-hidden="true"></span><span class="gym3d-carga-txt">Montando el gimnasio…</span></div>
                <div class="gym3d-ficha" aria-live="polite">
                    <span class="gym3d-zona"></span>
                    <strong class="gym3d-titulo"></strong>
                    <span class="gym3d-texto"></span>
                    <a class="gym3d-enlace" hidden></a>
                </div>
                <span class="gym3d-pista" aria-hidden="true">Arrastra para mirar</span>
                <div class="gym3d-zonas" role="group" aria-label="Zonas del gimnasio">
                    ${ORDEN.map((z, i) => `<button type="button" data-zona="${z}" aria-pressed="false"><b>${String(i + 1).padStart(2, '0')}</b>${ZONAS[z].nombre}</button>`).join('')}
                </div>`;
            contenedor.appendChild(ui);
            const ficha = {
                zona: ui.querySelector('.gym3d-zona'), titulo: ui.querySelector('.gym3d-titulo'),
                texto: ui.querySelector('.gym3d-texto'), enlace: ui.querySelector('.gym3d-enlace')
            };
            const pintar = (clave) => {
                const z = ZONAS[clave], i = ORDEN.indexOf(clave) + 1;
                ficha.zona.textContent = `Zona ${String(i).padStart(2, '0')} · ${z.nombre}`;
                ficha.titulo.textContent = z.titulo;
                ficha.texto.textContent = z.texto;
                const propia = sinEnlaces || (z.enlace && paginaActual && z.enlace.split('#')[0] === paginaActual);
                ficha.enlace.hidden = !z.enlace || propia;
                if (z.enlace) { ficha.enlace.href = z.enlace; ficha.enlace.textContent = z.etiqueta + ' →'; }
                ui.querySelectorAll('.gym3d-zonas button').forEach(b => {
                    const activo = b.dataset.zona === clave;
                    b.setAttribute('aria-pressed', String(activo));
                    if (activo && b.parentNode.scrollWidth > b.parentNode.clientWidth) b.parentNode.scrollTo({ left: b.offsetLeft - b.parentNode.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
                });
            };
            pintar(zonaInicial);
            return { ui, pintar };
        }

        async function montar(contenedor) {
            if (contenedor.dataset.montado) return;
            contenedor.dataset.montado = '1';
            const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
            const movil = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
            const zonaInicial = ZONAS[contenedor.dataset.zona] ? contenedor.dataset.zona : 'entrada';
            const pagina = (location.pathname.split('/').pop() || 'index.html');
            const { ui, pintar } = crearUI(contenedor, zonaInicial, pagina);

            const lienzoGL = document.createElement('canvas');
            lienzoGL.className = 'gym3d-canvas';
            lienzoGL.setAttribute('role', 'img');
            lienzoGL.setAttribute('aria-label', 'Gimnasio ATR-GYM en 3D con tarima de powerlifting, ring de boxeo, escenario de culturismo y zona de peso libre');
            contenedor.prepend(lienzoGL);

            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({ canvas: lienzoGL, antialias: !movil, powerPreference: 'high-performance' });
            } catch (e) {
                contenedor.classList.add('gym3d-sin-webgl');
                ui.querySelector('.gym3d-carga-txt').textContent = 'Tu navegador no puede mostrar el gimnasio en 3D.';
                return;
            }
            const calidad = movil ? { sombras: 1, sombraTam: 1024, polvo: 160, pixeles: 1.5, bloom: .5 } : { sombras: 2, sombraTam: 2048, polvo: 380, pixeles: 2, bloom: 1 };
            renderer.setPixelRatio(Math.min(devicePixelRatio || 1, calidad.pixeles));
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = .95;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            // las sombras solo cambian cuando se mecen los sacos: se recalculan un fotograma sí y otro no
            renderer.shadowMap.autoUpdate = false;

            // los rótulos se dibujan con las fuentes de la web
            await Promise.race([fuentes3D(), new Promise(r => setTimeout(r, 1500))]);

            // el montaje va por partes, con un respiro entre cada una para que la página siga fluida
            await respiro();
            const escena = new THREE.Scene();
            escena.background = new THREE.Color(0x080807);
            escena.fog = new THREE.Fog(0x080807, 30, 70);
            const pmrem = new THREE.PMREMGenerator(renderer);
            escena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
            pmrem.dispose();
            escena.environmentIntensity = .22;

            await respiro();
            const M = crearMateriales();
            await respiro();
            const { bolsas, polvo } = construirGimnasio(escena, M, calidad);
            await respiro();

            const camara = new THREE.PerspectiveCamera(42, 1, .1, 120);
            const composer = new EffectComposer(renderer);
            composer.addPass(new RenderPass(escena, camara));
            const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .38, .4, 1.0);
            composer.addPass(bloom);
            composer.addPass(new OutputPass());

            // ---- cámara: recorrido entre zonas + mirar arrastrando ----
            const estado = { desde: null, hasta: null, t: 1, inicio: 0, yaw: 0, pitch: 0, yawObj: 0, pitchObj: 0 };
            const vCam = new THREE.Vector3(), vMira = new THREE.Vector3();
            function vista(clave) {
                const z = ZONAS[clave];
                const cam = new THREE.Vector3(...z.cam), mira = new THREE.Vector3(...z.mira);
                const aspecto = lienzoGL.clientWidth / Math.max(1, lienzoGL.clientHeight);
                if (aspecto < 1.25) cam.sub(mira).multiplyScalar(1 + (1.25 - aspecto) * (clave === 'entrada' ? .05 : .3)).add(mira);
                return { cam, mira };
            }
            let zonaActual = zonaInicial;
            function ir(clave, instantaneo) {
                zonaActual = clave;
                const destino = vista(clave);
                estado.desde = { cam: vCam.clone(), mira: vMira.clone() };
                estado.hasta = destino;
                estado.t = instantaneo || reducir ? 1 : 0;
                estado.inicio = performance.now();
                estado.yawObj = 0; estado.pitchObj = 0;
                if (estado.t === 1) { vCam.copy(destino.cam); vMira.copy(destino.mira); }
                pintar(clave);
                pedirFrame();
            }
            ui.querySelectorAll('.gym3d-zonas button').forEach(b => b.addEventListener('click', () => ir(b.dataset.zona)));

            // arrastrar en horizontal gira la vista; en vertical se deja hacer scroll a la página
            let arrastre = null;
            lienzoGL.addEventListener('pointerdown', e => {
                arrastre = { x: e.clientX, y: e.clientY, yaw: estado.yawObj, pitch: estado.pitchObj };
                contenedor.classList.add('gym3d-tocado');
            });
            addEventListener('pointermove', e => {
                if (!arrastre) return;
                estado.yawObj = Math.max(-1.1, Math.min(1.1, arrastre.yaw - (e.clientX - arrastre.x) * .005));
                if (e.pointerType === 'mouse') estado.pitchObj = Math.max(-.22, Math.min(.3, arrastre.pitch + (e.clientY - arrastre.y) * .003));
                pedirFrame();
            });
            addEventListener('pointerup', () => { arrastre = null; });
            addEventListener('pointercancel', () => { arrastre = null; });

            const off = new THREE.Vector3(), esf = new THREE.Spherical();
            // hasta que los shaders están compilados no se dibuja nada (así no hay tirones)
            let listo = false;
            // ---- tamaño ----
            function ajustar() {
                const w = lienzoGL.clientWidth, h = lienzoGL.clientHeight;
                if (!w || !h) return;
                renderer.setSize(w, h, false);
                composer.setSize(w, h);
                bloom.resolution.set(w * calidad.bloom, h * calidad.bloom);
                camara.aspect = w / h;
                camara.fov = w / h < 1 ? 58 : 42;
                camara.updateProjectionMatrix();
                if (estado.t >= 1 && estado.hasta) { const v = vista(zonaActual); estado.hasta = v; vCam.copy(v.cam); vMira.copy(v.mira); colocarCamara(performance.now() / 1000); if (listo) composer.render(); }
                pedirFrame();
            }
            new ResizeObserver(ajustar).observe(lienzoGL);

            // ---- bucle: solo mientras se ve ----
            let visible = false, raf = 0, ultimo = performance.now(), cuadro = 0, previo = 0, suma = 0, medidos = 0;
            // si la escena no llega a unos 54 fps de media se baja la resolución un poco cada vez
            // (fluidez antes que nitidez); el ajuste se recuerda para la próxima visita
            let pixeles = Math.min(devicePixelRatio || 1, calidad.pixeles);
            try { pixeles = Math.max(1, pixeles - (Number(localStorage.getItem('atr3d-calidad-portada')) || 0) * .25); } catch (e) { }
            renderer.setPixelRatio(pixeles); composer.setPixelRatio(pixeles);
            function bajarResolucion() {
                if (pixeles <= 1) return false;
                pixeles = Math.max(1, pixeles - .25); renderer.setPixelRatio(pixeles); composer.setPixelRatio(pixeles);
                try { localStorage.setItem('atr3d-calidad-portada', String((Number(localStorage.getItem('atr3d-calidad-portada')) || 0) + 1)); } catch (e) { }
                return true;
            }
            // la cámara mira a su zona, con el giro del arrastre y un balanceo muy suave
            function colocarCamara(t) {
                const balanceo = reducir || arrastre ? 0 : Math.sin(t * .18) * .06;
                off.copy(vCam).sub(vMira); esf.setFromVector3(off);
                esf.theta += estado.yaw + balanceo; esf.phi = Math.max(.35, Math.min(1.5, esf.phi - estado.pitch));
                camara.position.copy(vMira).add(off.setFromSpherical(esf));
                camara.lookAt(vMira);
            }
            function frame(ahora) {
                raf = 0;
                const dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
                const intervalo = previo ? ahora - previo : 0; previo = ahora;
                if (intervalo) { medidos++; suma += Math.min(intervalo, 100); }
                if (medidos >= 30) { if (suma / medidos > 18.5 && bajarResolucion()) ajustar(); medidos = suma = 0; }
                const t = ahora / 1000;
                if (estado.t < 1) {
                    estado.t = Math.min(1, (ahora - estado.inicio) / 1700);
                    const k = suave(estado.t);
                    vCam.lerpVectors(estado.desde.cam, estado.hasta.cam, k);
                    vCam.y += Math.sin(k * Math.PI) * 2.2;
                    vMira.lerpVectors(estado.desde.mira, estado.hasta.mira, k);
                }
                estado.yaw = lerp(estado.yaw, estado.yawObj, .08);
                estado.pitch = lerp(estado.pitch, estado.pitchObj, .08);
                colocarCamara(t);
                if (!reducir) {
                    bolsas.children.forEach(s => { if (s.userData.fase !== undefined) s.rotation.z = Math.sin(t * 1.3 + s.userData.fase) * .025; });
                    polvo.position.y = Math.sin(t * .2) * .15; polvo.rotation.y = t * .01;
                    if ((cuadro++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
                }
                composer.render();
                const quieto = estado.t >= 1 && Math.abs(estado.yaw - estado.yawObj) < .0005 && Math.abs(estado.pitch - estado.pitchObj) < .0005;
                if (visible && !document.hidden && (!reducir || !quieto)) pedirFrame(); else previo = 0;
            }
            function pedirFrame() { if (!raf && visible && listo) { ultimo = performance.now(); raf = requestAnimationFrame(frame); } }
            new IntersectionObserver(en => { visible = en[0].isIntersecting; if (visible) pedirFrame(); }, { rootMargin: '120px' }).observe(contenedor);
            document.addEventListener('visibilitychange', () => { if (!document.hidden) pedirFrame(); });

            ajustar();
            ir(zonaInicial, true);
            colocarCamara(performance.now() / 1000);
            // shaders y texturas se preparan por partes antes de quitar la pantalla de carga
            await respiro();
            await compilar(renderer, escena, camara, composer.renderTarget1);
            await subirTexturas(renderer, escena);
            // primer dibujo en dos tiempos: la escena con sus sombras, y después el postproceso
            renderer.shadowMap.needsUpdate = true;
            renderer.setRenderTarget(composer.renderTarget1); renderer.render(escena, camara); renderer.setRenderTarget(null);
            await valla(renderer);
            composer.render();
            listo = true;
            contenedor.classList.add('gym3d-listo');
            contenedor.gym3d = { ir, zonas: ORDEN };
            pedirFrame();
            // cuando la pantalla de carga termina de fundirse se quita: así el spinner deja de girar
            setTimeout(() => { const carga = contenedor.querySelector('.gym3d-carga'); if (carga) carga.remove(); }, 900);
        }

        document.querySelectorAll('.gym3d').forEach(el => {
            // se monta a pantalla y media de verse, y por partes, para que el scroll no se trabe
            const obs = new IntersectionObserver(en => {
                if (en[0].isIntersecting) { obs.disconnect(); montar(el).catch(err => { console.error(err); el.classList.add('gym3d-sin-webgl'); }); }
            }, { rootMargin: '150% 0px' });
            obs.observe(el);
        });
    }).catch(err => avisarFallo('.gym3d', err)));
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
            l.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=JetBrains+Mono:wght@600;700&display=swap';
            l._lista = new Promise(r => { l.onload = l.onerror = r; });
            document.head.appendChild(l);
        }
        return l._lista.then(() => Promise.all([
            document.fonts.load('900 64px "Big Shoulders Display"'), document.fonts.load('800 64px "Big Shoulders Display"'),
            document.fonts.load('700 32px "JetBrains Mono"'), document.fonts.load('600 32px "JetBrains Mono"')
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
