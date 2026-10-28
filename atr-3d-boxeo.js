// ============================================
// ATR-GYM — el club de boxeo en 3D
// Nave de ladrillo con un ventanal por el que entra el sol de la tarde,
// ring reglamentario, sacos colgados de cadenas, pera, saco de doble
// anclaje, reloj de asaltos que cuenta de verdad y el material del club.
// ============================================
// Necesita atr-3d-motor.js cargado antes en la página.
(function () {
    'use strict';
    window.ATR3D.motor.then(({ THREE, montarEscena, dibujar, ruido, normalDe, grisDe, textura, repetida, generador, lienzo, caja, redondeada, torno, cilindro, entre, colocarEntre, catenaria, tubo, cadena, malla, haz, polvo, lampara, mergeGeometries, Reflector, v3, FUENTE, MONO, TEXTO }) => {
        const ANCHO = 11, FONDO = 10, ALTO = 6.2;          // nave de 22 × 20 m
        const RC = v3(-2.5, 0, .5);                          // centro del ring
        const LONA = 1.0, MEDIO = 3.65, POSTE = 3.15, CUERDA = 3.05;
        const ALTURAS = [.45, .8, 1.15, 1.5];
        const SOL_DIR = v3(20, -13, -5).normalize();         // sol de tarde que entra por el ventanal

        // ---------- texturas propias del club ----------
        function texLadrillo(T) {
            const W = T, H = T, filas = 8, porFila = 4, rowH = H / filas, bw = W / porFila, m = Math.max(2, T / 170);
            const az = generador(91), tonos = [], alt = new Float32Array(W * H), rug = new Float32Array(W * H);
            for (let i = 0; i < filas * porFila * 2; i++) tonos.push([.42 + az() * .14, .2 + az() * .07, .14 + az() * .05, az() < .12 ? .7 : 1]);
            const n = ruido(W, H, { escala: 32, octavas: 3, semilla: 5 }), n2 = ruido(W, H, { escala: 6, octavas: 4, semilla: 8 });
            const c = lienzo(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
            for (let y = 0; y < H; y++) {
                const fila = Math.floor(y / rowH), desp = fila % 2 ? bw / 2 : 0, ly = y - fila * rowH;
                for (let px = 0; px < W; px++) {
                    const xx = (px + desp) % W, col = Math.floor(xx / bw), lx = xx - col * bw, k = y * W + px;
                    const junta = lx < m || ly < m;
                    const borde = Math.min(lx - m, bw - lx, ly - m, rowH - ly);
                    let r, g, b;
                    if (junta) {
                        const v = .5 + n[k] * .14; r = v * 1.0; g = v * .96; b = v * .9;
                        alt[k] = .18 + n[k] * .1; rug[k] = .97;
                    } else {
                        const t = tonos[(fila * porFila + col) % tonos.length], v = .8 + n[k] * .35 + (n2[k] - .5) * .25;
                        r = t[0] * v * t[3]; g = t[1] * v * t[3]; b = t[2] * v * t[3];
                        alt[k] = .72 + .28 * Math.min(1, borde / (m * 2.5)) + (n[k] - .5) * .12;
                        rug[k] = .82 + n[k] * .14;
                    }
                    d[k * 4] = Math.min(255, r * 255); d[k * 4 + 1] = Math.min(255, g * 255); d[k * 4 + 2] = Math.min(255, b * 255); d[k * 4 + 3] = 255;
                }
            }
            x.putImageData(img, 0, 0);
            return { mapa: textura(c), normal: normalDe(alt, W, H, 3.2), rug: grisDe(rug, W, H) };
        }
        function texHormigon(T) {
            const W = T, n = ruido(W, W, { escala: 3, octavas: 6, semilla: 17 }), f = ruido(W, W, { escala: 40, octavas: 2, semilla: 19 });
            const c = lienzo(W, W), x = c.getContext('2d'), img = x.createImageData(W, W), d = img.data, rug = new Float32Array(W * W), alt = new Float32Array(W * W);
            for (let i = 0; i < W * W; i++) {
                const px = i % W, py = (i / W) | 0;
                const junta = px < 2 || py < 2;
                const v = (.46 + (n[i] - .5) * .32 + (f[i] - .5) * .06) * (junta ? .55 : 1);
                d[i * 4] = v * 255 * 1.0; d[i * 4 + 1] = v * 255 * .98; d[i * 4 + 2] = v * 255 * .93; d[i * 4 + 3] = 255;
                rug[i] = junta ? .9 : .28 + n[i] * .38 + (f[i] - .5) * .1;
                alt[i] = junta ? 0 : .6 + f[i] * .1;
            }
            x.putImageData(img, 0, 0);
            return { mapa: textura(c), rug: grisDe(rug, W, W), normal: normalDe(alt, W, W, 2) };
        }
        function texLona(T) {
            return dibujar(T, T, (x, w, h) => {
                x.fillStyle = '#a3a8ae'; x.fillRect(0, 0, w, h);
                const az = generador(33);
                // manchas de sudor y rozaduras
                for (let i = 0; i < 70; i++) {
                    const px = w * (.15 + az() * .7), py = h * (.15 + az() * .7), r = w * (.01 + az() * .06), g = x.createRadialGradient(px, py, 0, px, py, r);
                    g.addColorStop(0, `rgba(70,62,52,${.05 + az() * .09})`); g.addColorStop(1, 'rgba(70,62,52,0)');
                    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
                }
                x.strokeStyle = 'rgba(40,40,40,.08)'; x.lineWidth = w / 600;
                for (let i = 0; i < 160; i++) { const px = az() * w, py = az() * h, a = az() * 6.28, l = w * (.01 + az() * .05); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
                const c = w / 2;
                x.fillStyle = 'rgba(12,12,12,.92)'; x.beginPath(); x.arc(c, c, w * .17, 0, 6.283); x.fill();
                x.strokeStyle = '#E8E8ED'; x.lineWidth = w * .012; x.beginPath(); x.arc(c, c, w * .155, 0, 6.283); x.stroke();
                x.fillStyle = '#EFEDE6'; x.textAlign = 'center'; x.textBaseline = 'middle';
                x.font = `900 ${w * .075}px ${FUENTE}`; x.fillText('ATR', c, c - w * .03);
                x.fillStyle = '#E8E8ED'; x.font = `800 ${w * .032}px ${FUENTE}`; x.fillText('BOXING CLUB', c, c + w * .05);
                x.fillStyle = 'rgba(20,20,20,.5)'; x.font = `800 ${w * .03}px ${FUENTE}`;
                [[c, h * .1, 0], [c, h * .9, Math.PI], [w * .1, c, -Math.PI / 2], [w * .9, c, Math.PI / 2]].forEach(([px, py, r]) => { x.save(); x.translate(px, py); x.rotate(r); x.fillText('ATR-GYM · TERUEL', 0, 0); x.restore(); });
            });
        }
        function texFaldon() {
            const t = dibujar(2048, 256, (x, w, h) => {
                x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, w, h);
                x.font = `900 120px ${FUENTE}`; x.textBaseline = 'middle';
                let px = 40;
                while (px < w) {
                    x.fillStyle = '#EFEDE6'; x.fillText('ATR-GYM', px, h / 2 + 6); px += x.measureText('ATR-GYM').width + 50;
                    x.fillStyle = '#E8E8ED'; x.fillText('BOXING CLUB', px, h / 2 + 6); px += x.measureText('BOXING CLUB').width + 90;
                }
                x.fillStyle = '#E8E8ED'; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10);
            });
            return t;
        }
        function texCartel(i) {
            const datos = [
                ['VELADA', 'FIGHT NIGHT', 'SÁBADO 21:00 · PABELLÓN DE TERUEL', '#b51f1f', 'CAMPEONATO AMATEUR · 6 COMBATES'],
                ['ATR-GYM', 'GUANTES DE ORO', 'TORNEO PROVINCIAL · TERUEL', '#1b3f8f', 'CATEGORÍAS JUNIOR Y SENIOR'],
                ['SPARRING', 'NOCHE DE CLUB', 'VIERNES · ENTRADA LIBRE', '#c47a12', 'TRAE TUS GUANTES · 3 × 3 MIN']
            ][i % 3];
            return dibujar(512, 740, (x, w, h) => {
                const az = generador(101 + i);
                x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, w, h);
                for (let k = 0; k < 2500; k++) { x.fillStyle = `rgba(90,70,40,${az() * .06})`; x.fillRect(az() * w, az() * h, 2, 2); }
                x.fillStyle = datos[3]; x.fillRect(30, 30, w - 60, 200);
                x.fillStyle = '#f5ecd6'; x.textAlign = 'center';
                x.font = `900 46px ${FUENTE}`; x.fillText(datos[0], w / 2, 100);
                x.font = `900 62px ${FUENTE}`; x.fillText(datos[1].split(' ')[0], w / 2, 178);
                x.fillStyle = '#1a1714'; x.font = `900 76px ${FUENTE}`; x.fillText(datos[1].split(' ').slice(1).join(' ') || 'NIGHT', w / 2, 330);
                // tramado de puntos como en la imprenta
                for (let yy = 370; yy < 560; yy += 9) for (let xx = 40; xx < w - 40; xx += 9) { const r = 3.6 * Math.abs(Math.sin(xx * .02) * Math.cos(yy * .03)); x.fillStyle = datos[3]; x.beginPath(); x.arc(xx, yy, r, 0, 6.28); x.fill(); }
                x.fillStyle = '#1a1714'; x.font = `800 26px ${TEXTO}`; x.fillText(datos[2], w / 2, 610);
                x.font = `600 22px ${MONO}`; x.fillText(datos[4], w / 2, 650);
                x.fillRect(60, 676, w - 120, 3);
                x.font = `700 20px ${MONO}`; x.fillText('ATR-GYM · LA VERDAD DEL GIMNASIO', w / 2, 708);
                // envejecido
                const g = x.createRadialGradient(w / 2, h / 2, h * .2, w / 2, h / 2, h * .75);
                g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(110,80,35,.38)');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2;
                x.beginPath(); x.moveTo(0, h * .48); x.lineTo(w, h * .5); x.stroke();
                x.beginPath(); x.moveTo(w * .5, 0); x.lineTo(w * .49, h); x.stroke();
                x.fillStyle = 'rgba(235,230,200,.55)'; [[0, 0], [w - 70, 0], [0, h - 34], [w - 70, h - 34]].forEach(([px, py]) => x.fillRect(px, py, 70, 34));
            });
        }
        function texSaco(color, banda) {
            return dibujar(512, 512, (x, w, h) => {
                x.fillStyle = color; x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 3;
                for (let i = 0; i < 4; i++) { const px = i * w / 4 + 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
                x.setLineDash([6, 6]); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2;
                for (let i = 0; i < 4; i++) { const px = i * w / 4; [px - 8, px + 12].forEach(q => { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, h); x.stroke(); }); }
                [h * .16, h * .84].forEach(py => { x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke(); });
                x.setLineDash([]);
                x.fillStyle = banda; x.fillRect(0, h * .2, w, 14); x.fillRect(0, h * .78, w, 14);
                x.save(); x.translate(w * .125, h / 2); x.rotate(-Math.PI / 2);
                x.fillStyle = '#EFEDE6'; x.font = `900 52px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR-GYM', 0, 0);
                x.restore();
                x.save(); x.translate(w * .625, h / 2); x.rotate(-Math.PI / 2);
                x.fillStyle = banda; x.font = `800 30px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('HEAVY BAG · 45 KG', 0, 0);
                x.restore();
            });
        }
        function texEsquina(color, texto) {
            return dibujar(128, 512, (x, w, h) => {
                x.fillStyle = color; x.fillRect(0, 0, w, h);
                x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2);
                x.fillStyle = 'rgba(255,255,255,.92)'; x.font = `900 46px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, 0, 0);
                x.restore();
            });
        }

        // ---------- el reloj de asaltos (cuenta de verdad) ----------
        function crearReloj() {
            const c = lienzo(512, 280), x = c.getContext('2d'), t = textura(c);
            let ultimo = -1;
            function pintar(seg) {
                const ciclo = 240, s = Math.floor(seg) % ciclo, enDescanso = s >= 180, quedan = enDescanso ? ciclo - s : 180 - s;
                const asalto = (Math.floor(Math.floor(seg) / ciclo) % 12) + 1;
                x.fillStyle = '#050505'; x.fillRect(0, 0, 512, 280);
                const col = enDescanso ? '#33ff77' : '#ff2b2b';
                x.textAlign = 'center'; x.textBaseline = 'middle';
                x.shadowColor = col; x.shadowBlur = 24; x.fillStyle = col;
                x.font = `700 150px ${MONO}`;
                x.fillText(`${Math.floor(quedan / 60)}:${String(quedan % 60).padStart(2, '0')}`, 256, 128);
                x.shadowBlur = 10; x.font = `700 34px ${MONO}`;
                x.fillStyle = enDescanso ? '#33ff77' : '#ffcf3a';
                x.fillText(enDescanso ? 'DESCANSO' : `ASALTO ${asalto}`, 256, 240);
                x.shadowBlur = 0;
                t.needsUpdate = true;
            }
            pintar(0);
            return { textura: t, actualizar(seg) { const s = Math.floor(seg); if (s !== ultimo) { ultimo = s; pintar(seg); } } };
        }

        // ---------- guantes ----------
        function geometriasGuante(TH) {
            const cuerpo = new TH.SphereGeometry(1, 40, 28), p = cuerpo.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
                y *= 1.22;
                if (z > 0) z *= .84;
                x *= 1 + .09 * y;
                if (z < 0) z *= 1 - .28 * Math.exp(-((y + .15) ** 2) / .05);
                p.setXYZ(i, x * .072, y * .088, z * .068);
            }
            cuerpo.computeVertexNormals();
            const pulgar = new TH.CapsuleGeometry(.024, .07, 6, 16); pulgar.rotateZ(.42); pulgar.rotateX(-.3); pulgar.translate(-.062, .018, -.032);
            const puno = new TH.CylinderGeometry(.06, .066, .13, 40, 1, true); puno.scale(1, 1, .86); puno.translate(0, .155, 0);
            const interior = new TH.CircleGeometry(.058, 32); interior.rotateX(-Math.PI / 2); interior.scale(1, 1, .86); interior.translate(0, .214, 0);
            const borde = new TH.TorusGeometry(.061, .0075, 8, 44); borde.rotateX(Math.PI / 2); borde.scale(1, 1, .86); borde.translate(0, .218, 0);
            const lazos = [];
            for (let k = 0; k < 4; k++) {
                const y0 = .102 + k * .026, y1 = y0 + .026;
                [[-.024, .024], [.024, -.024]].forEach(([a, b]) => lazos.push(new TH.TubeGeometry(new TH.LineCurve3(v3(a, y0, -.057), v3(b, y1, -.057)), 2, .0026, 5, false)));
            }
            return {
                cuero: mergeGeometries([cuerpo, pulgar, puno]),
                blanco: mergeGeometries([borde, ...lazos]),
                oscuro: interior
            };
        }
        function crearGuante(TH, kit, geos, color, logo) {
            const g = new TH.Group();
            g.add(malla(geos.cuero, kit.cuero(color, { rug: .36, brillo: .9, escala: 2, fuerza: .35 })));
            g.add(malla(geos.blanco, kit.tela(0xf4f2ec, { escala: 3 })));
            g.add(malla(geos.oscuro, kit.mate(0x080808), { sombra: false }));
            if (logo) {
                const pl = new TH.PlaneGeometry(.075, .04, 8, 4), pp = pl.attributes.position;
                for (let i = 0; i < pp.count; i++) pp.setZ(i, -(pp.getX(i) ** 2) * 5);
                const parche = new TH.Mesh(pl, new TH.MeshPhysicalMaterial({ map: logo, transparent: true, roughness: .35, clearcoat: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
                parche.position.set(0, .03, .0575); parche.rotation.x = -.18;
                g.add(parche);
            }
            return g;
        }

        // ---------- toalla colgada de la cuerda ----------
        function geometriaToalla(TH, ancho, largo, r) {
            const geo = new TH.PlaneGeometry(ancho, largo, 18, 60), p = geo.attributes.position, az = generador(3);
            const ondas = [az() * 6, az() * 6];
            for (let i = 0; i < p.count; i++) {
                const u = p.getX(i), s = p.getY(i);
                const arco = Math.PI * r;
                let y, z;
                if (Math.abs(s) <= arco / 2) { const a = s / r; y = r * Math.cos(a); z = r * Math.sin(a); }
                else { const lado = Math.sign(s), resto = Math.abs(s) - arco / 2; y = -resto; z = lado * (r + resto * .07); }
                const pliegue = Math.sin(u * 22 + ondas[0]) * .008 * Math.min(1, Math.max(0, -y) * 3) + Math.sin(u * 47 + ondas[1]) * .003;
                p.setXYZ(i, u + Math.sin(y * 3) * .01, y, z + pliegue * Math.sign(z || 1));
            }
            geo.computeVertexNormals();
            return geo;
        }

        // ============================================
        const BOXEO = {
            etiqueta: 'Boxeo',
            descripcion: 'Club de boxeo de ATR-GYM en 3D: ring con cuerdas, sacos colgados de cadenas, pera, reloj de asaltos y un ventanal por el que entra el sol.',
            fondo: 0x070605,
            niebla: [0x0b0907, .018],
            exposicion: 1.0,
            bloom: .34,
            intensidadEntorno: .45,
            fondoEntorno: 0x0c0a08,
            entorno: [
                [-10.8, 3.6, 2.5, 6, 2.8, 0xffe2bc, 7, 0, Math.PI / 2],
                [RC.x - 1.6, 4.7, RC.z - 1.6, .6, .6, 0xffd7a6, 9], [RC.x + 1.6, 4.7, RC.z - 1.6, .6, .6, 0xffd7a6, 9],
                [RC.x - 1.6, 4.7, RC.z + 1.6, .6, .6, 0xffd7a6, 9], [RC.x + 1.6, 4.7, RC.z + 1.6, .6, .6, 0xffd7a6, 9],
                [6.8, 4.4, -2, .6, 5, 0xffd7a6, 6]
            ],
            planos: [
                { nombre: 'El ring', titulo: 'El ring', texto: 'Ring reglamentario de 6,1 m entre cuerdas, cuatro cuerdas forradas, protectores de esquina y la lona con el escudo del club.', cam: [6.4, 3.4, 10.4], mira: [-2.4, 1.25, .2], fov: 40, deriva: [-1.2, .2, .4] },
                { nombre: 'La esquina', titulo: 'La esquina roja', texto: 'Taburete, cubo, toalla en la cuerda y los guantes colgados por los cordones. El minuto entre asaltos pasa aquí.', cam: [-2.2, 2.25, 7.9], mira: [-4.9, 1.55, 3.3], fov: 32, deriva: [.5, .05, -.2] },
                { nombre: 'Los sacos', titulo: 'Los sacos pesados', texto: 'Sacos de 45 kg colgados de cadena con giratorio. Aguantan potencia, pero también enseñan a encadenar golpes sin perder la guardia.', cam: [1.6, 2.1, 6.4], mira: [6.8, 1.45, -2.0], fov: 38, deriva: [.6, .05, .4] },
                { nombre: 'Pera y reloj', titulo: 'Pera y reloj de asaltos', texto: 'La pera para el ritmo y la coordinación, el saco de doble anclaje para la distancia y el reloj marcando 3 minutos de trabajo y 1 de descanso.', cam: [6.0, 2.05, -4.6], mira: [3.1, 2.0, -9.2], fov: 46, deriva: [.5, .05, .3] },
                { nombre: 'El material', titulo: 'El material del club', texto: 'Guantes de 10 a 16 oz por colores, vendas, combas y el espejo para corregir la guardia mientras haces sombra.', cam: [6.3, 1.9, 6.6], mira: [10.5, 1.35, 7.0], fov: 40, deriva: [-.3, .05, .5] }
            ],

            async construir({ THREE: TH, escena, kit, calidad, carga, respirar, renderer }) {
                const T = calidad.tex;
                const vivo = { sacos: [], pera: null, dobleAncla: null, guantes: [], reloj: null };

                // ---------- la nave ----------
                const lad = texLadrillo(T);
                const pared = (largo, alto, pintada) => {
                    const m = pintada ? kit.pintura(0x1c2420, { rug: .62 }) : new TH.MeshStandardMaterial({ map: repetida(lad.mapa, largo / .9, alto / .6), normalMap: repetida(lad.normal, largo / .9, alto / .6), roughnessMap: repetida(lad.rug, largo / .9, alto / .6), roughness: 1, normalScale: new TH.Vector2(1.1, 1.1) });
                    if (pintada) { m.normalMap = repetida(lad.normal, largo / .9, alto / .6); m.normalScale.set(.8, .8); }
                    return m;
                };
                const muro = (w, h, x, y, z, ry, pintada) => {
                    const m = malla(new TH.PlaneGeometry(w, h), pared(w, h, pintada), { sombra: true });
                    m.position.set(x, y, z); m.rotation.y = ry; escena.add(m); return m;
                };
                const ZOC = 1.2; // zócalo pintado
                // fondo y derecha
                muro(ANCHO * 2, ZOC, 0, ZOC / 2, -FONDO, 0, true); muro(ANCHO * 2, ALTO - ZOC, 0, ZOC + (ALTO - ZOC) / 2, -FONDO, 0);
                muro(FONDO * 2, ZOC, ANCHO, ZOC / 2, 0, -Math.PI / 2, true); muro(FONDO * 2, ALTO - ZOC, ANCHO, ZOC + (ALTO - ZOC) / 2, 0, -Math.PI / 2);
                muro(ANCHO * 2, ZOC, 0, ZOC / 2, FONDO, Math.PI, true); muro(ANCHO * 2, ALTO - ZOC, 0, ZOC + (ALTO - ZOC) / 2, FONDO, Math.PI);
                // izquierda con el hueco del ventanal
                const V = { z0: -.6, z1: 5.6, y0: 2.1, y1: 5.0 };
                muro(FONDO * 2, ZOC, -ANCHO, ZOC / 2, 0, Math.PI / 2, true);
                muro(FONDO * 2, V.y0 - ZOC, -ANCHO, ZOC + (V.y0 - ZOC) / 2, 0, Math.PI / 2);
                muro(FONDO * 2, ALTO - V.y1, -ANCHO, V.y1 + (ALTO - V.y1) / 2, 0, Math.PI / 2);
                muro(V.z0 + FONDO, V.y1 - V.y0, -ANCHO, (V.y0 + V.y1) / 2, (V.z0 - FONDO) / 2, Math.PI / 2);
                muro(FONDO - V.z1, V.y1 - V.y0, -ANCHO, (V.y0 + V.y1) / 2, (V.z1 + FONDO) / 2, Math.PI / 2);
                // el muro tiene grosor: jambas del hueco
                const jamba = kit.mate(0x3a2a22, .9);
                escena.add(caja(.35, .05, V.z1 - V.z0, jamba, -ANCHO - .17, V.y0 - .025, (V.z0 + V.z1) / 2), caja(.35, .05, V.z1 - V.z0, jamba, -ANCHO - .17, V.y1 + .025, (V.z0 + V.z1) / 2));
                // ventanal de perfiles de acero con cristales de fábrica
                const acero = kit.pintura(0x15171a, { rug: .55 });
                const mullones = [];
                for (let k = 0; k <= 6; k++) mullones.push(caja(.07, V.y1 - V.y0, .06, acero, -ANCHO - .05, (V.y0 + V.y1) / 2, V.z0 + k * (V.z1 - V.z0) / 6));
                for (let k = 0; k <= 3; k++) mullones.push(caja(.07, .06, V.z1 - V.z0, acero, -ANCHO - .05, V.y0 + k * (V.y1 - V.y0) / 3, (V.z0 + V.z1) / 2));
                mullones.forEach(m => escena.add(m));
                const cristal = new TH.Mesh(new TH.PlaneGeometry(V.z1 - V.z0, V.y1 - V.y0), kit.vidrio(0xdfe8e4, .16));
                cristal.position.set(-ANCHO - .04, (V.y0 + V.y1) / 2, (V.z0 + V.z1) / 2); cristal.rotation.y = Math.PI / 2; cristal.userData.sinAO = true;
                escena.add(cristal);
                // cielo de la tarde detrás del ventanal
                const cielo = new TH.Mesh(new TH.PlaneGeometry(14, 9), new TH.MeshBasicMaterial({
                    toneMapped: false, map: dibujar(256, 256, (x, w, h) => {
                        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe3b5'); g.addColorStop(.6, '#ffc98a'); g.addColorStop(1, '#f2a35c');
                        x.fillStyle = g; x.fillRect(0, 0, w, h);
                    }), color: new TH.Color(2.2, 2.0, 1.7)
                }));
                cielo.position.set(-ANCHO - 2.5, 4, 2.5); cielo.rotation.y = Math.PI / 2; cielo.userData.sinAO = true;
                escena.add(cielo);

                // suelo de hormigón pulido y techo con vigas
                const horm = texHormigon(T);
                const suelo = malla(new TH.PlaneGeometry(ANCHO * 2, FONDO * 2), new TH.MeshStandardMaterial({
                    map: repetida(horm.mapa, 22 / 3, 20 / 3), roughnessMap: repetida(horm.rug, 22 / 3, 20 / 3), normalMap: repetida(horm.normal, 22 / 3, 20 / 3), roughness: 1, metalness: 0, normalScale: new TH.Vector2(.4, .4)
                }), { sombra: false });
                suelo.rotation.x = -Math.PI / 2; escena.add(suelo);
                const techo = malla(new TH.PlaneGeometry(ANCHO * 2, FONDO * 2), kit.mate(0x0d0d0d, .95), { sombra: false });
                techo.rotation.x = Math.PI / 2; techo.position.y = ALTO; escena.add(techo);
                const viga = kit.pintura(0x22252a, { rug: .6 });
                for (let z = -8; z <= 8; z += 4) {
                    escena.add(caja(ANCHO * 2, .36, .02, viga, 0, ALTO - .22, z), caja(ANCHO * 2, .02, .2, viga, 0, ALTO - .41, z), caja(ANCHO * 2, .02, .2, viga, 0, ALTO - .04, z));
                }
                // conducto de ventilación con sus anillos
                const conducto = cilindro(.34, .34, FONDO * 2, kit.metal(0x9aa0a4, { rug: .45, escala: 6 }), 32);
                conducto.rotation.x = Math.PI / 2; conducto.position.set(3.2, ALTO - .75, 0); escena.add(conducto);
                const anillos = new TH.InstancedMesh(new TH.TorusGeometry(.345, .018, 6, 32), kit.metal(0x8a9095, { rug: .5 }), 14), m4 = new TH.Matrix4();
                for (let i = 0; i < 14; i++) { m4.makeRotationX(Math.PI / 2).setPosition(3.2, ALTO - .75, -9.2 + i * 1.42); anillos.setMatrixAt(i, m4); }
                escena.add(anillos);
                await respirar();

                // ---------- el ring ----------
                carga('Montando el ring…');
                const ring = new TH.Group(); ring.position.copy(RC); escena.add(ring);
                const faldonTex = texFaldon();
                const faldonMat = kit.tela(0x101010, { escala: 10, fuerza: .3, sheen: 0x3a3a3a }); faldonMat.map = repetida(faldonTex, 1, 1); faldonMat.color.set(0xffffff);
                const base = caja(MEDIO * 2, LONA - .06, MEDIO * 2, faldonMat, 0, (LONA - .06) / 2, 0);
                ring.add(base);
                const lonaMat = kit.tela(0xffffff, { escala: 70, fuerza: .55, rug: .92, sheen: 0x6c7176 }); lonaMat.map = texLona(T);
                const lona = malla(new TH.BoxGeometry(MEDIO * 2 + .1, .06, MEDIO * 2 + .1), [faldonMat, faldonMat, lonaMat, faldonMat, faldonMat, faldonMat]);
                lona.position.y = LONA - .03; ring.add(lona);
                // borde acolchado de la lona
                const reborde = kit.cuero(0x111111, { escala: 8 });
                [[0, MEDIO + .02, MEDIO * 2 + .2, .07], [0, -MEDIO - .02, MEDIO * 2 + .2, .07]].forEach(([x, z, w, d]) => { ring.add(redondeada(w, .1, d, .03, reborde)).children.at(-1).position.set(x, LONA, z); });
                [[MEDIO + .02, 0], [-MEDIO - .02, 0]].forEach(([x, z]) => { const r = redondeada(.07, .1, MEDIO * 2 + .2, .03, reborde); r.position.set(x, LONA, z); ring.add(r); });

                // postes, protectores de esquina y tensores
                const esquinas = [
                    { x: -1, z: 1, color: 0xa3141b, texto: 'ATR' }, { x: 1, z: -1, color: 0x153a94, texto: 'ATR' },
                    { x: 1, z: 1, color: 0xe9e6de, texto: 'ATR' }, { x: -1, z: -1, color: 0xe9e6de, texto: 'ATR' }
                ];
                esquinas.forEach(e => {
                    const poste = cilindro(.055, .06, 1.6, kit.cromo(), 24); poste.position.set(e.x * POSTE, LONA + .78, e.z * POSTE); ring.add(poste);
                    const base = cilindro(.11, .13, .06, kit.metal(0x222222, { rug: .4 }), 24); base.position.set(e.x * POSTE, LONA + .03, e.z * POSTE); ring.add(base);
                    const mat = kit.cuero(0xffffff, { rug: .38, brillo: .85, escala: 3 }); mat.map = texEsquina('#' + new TH.Color(e.color).getHexString(), e.texto);
                    const pad = redondeada(.26, 1.2, .26, .07, mat); pad.position.set(e.x * (POSTE - .1), LONA + .9, e.z * (POSTE - .1)); pad.rotation.y = Math.atan2(e.x, e.z) + Math.PI; ring.add(pad);
                    ALTURAS.forEach(h => { const t = cilindro(.018, .018, .2, kit.cromo(), 10); t.rotation.z = Math.PI / 2; t.rotation.y = Math.atan2(e.z, -e.x) + Math.PI / 4; t.position.set(e.x * (POSTE - .02), LONA + h, e.z * (POSTE - .02)); ring.add(t); });
                });
                // cuerdas con su caída natural
                const colores = [0xf1efe9, 0x1b3c96, 0xf1efe9, 0xa8141c];
                const lados = [[v3(-1, 0, 1), v3(1, 0, 1)], [v3(1, 0, 1), v3(1, 0, -1)], [v3(1, 0, -1), v3(-1, 0, -1)], [v3(-1, 0, -1), v3(-1, 0, 1)]];
                ALTURAS.forEach((h, k) => {
                    const mat = kit.tela(colores[k], { escala: 30, fuerza: .3, rug: .55 });
                    lados.forEach(([a, b]) => {
                        const pa = a.clone().multiplyScalar(CUERDA).setY(LONA + h), pb = b.clone().multiplyScalar(CUERDA).setY(LONA + h);
                        ring.add(tubo(catenaria(pa, pb, .035 + k * .006, 28), .023, mat, 64, 12));
                    });
                });
                // cintas que unen las cuerdas
                const cinta = kit.tela(0xf0eee8, { escala: 4 });
                lados.forEach(([a, b]) => [1 / 3, 2 / 3].forEach(t => {
                    const p = a.clone().lerp(b, t).multiplyScalar(CUERDA);
                    const c = caja(Math.abs(b.x - a.x) > 0 ? .05 : .014, 1.12, Math.abs(b.x - a.x) > 0 ? .014 : .05, cinta, p.x, LONA + .97, p.z);
                    ring.add(c);
                }));
                // escaleras metálicas
                const escal = new TH.Group(), chapa = kit.metal(0x7c8288, { rug: .4, escala: 2 }), lateral = kit.pintura(0x16181b, { rug: .5 });
                for (let i = 0; i < 4; i++) {
                    const h = .245 * (i + 1);
                    escal.add(caja(.96, h - .03, .28, lateral, 0, (h - .03) / 2, -i * .28));
                    escal.add(caja(1.0, .03, .3, chapa, 0, h - .015, -i * .28));
                }
                [-.52, .52].forEach(x => escal.add(entre(v3(x, 1.05, .05), v3(x, 1.85, -.9), .02, kit.cromo(), 10), entre(v3(x, .3, .1), v3(x, 1.05, .05), .02, kit.cromo(), 10)));
                escal.position.set(MEDIO - .9, 0, MEDIO + 1.15); ring.add(escal);
                await respirar();

                // ---------- la esquina roja ----------
                carga('Preparando la esquina…');
                const madera = new TH.MeshStandardMaterial({ color: 0x6b4426, roughness: .55, normalMap: repetida(kit.normales.cepillado(), 3, 3), normalScale: new TH.Vector2(.3, .3) });
                const taburete = new TH.Group();
                taburete.add(redondeada(.4, .05, .38, .015, madera)); taburete.children[0].position.y = .52;
                [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
                    const pata = entre(v3(sx * .16, .5, sz * .15), v3(sx * .2, 0, sz * .19), .02, madera, 10); taburete.add(pata);
                });
                [[-1], [1]].forEach(([s]) => taburete.add(entre(v3(s * .18, .18, -.17), v3(s * .18, .18, .17), .012, madera, 8)));
                taburete.position.set(-POSTE + .55, LONA, POSTE - .55); taburete.rotation.y = .7; ring.add(taburete);
                // cubo y botella
                const cubo = torno([[0, 0], [.14, 0], [.15, .01], [.17, .3], [.18, .31], [.172, .312], [.162, .31], [.15, .02], [0, .02]], kit.plastico(0xb51d1d, .35), 40);
                cubo.position.set(RC.x - MEDIO - .5, 0, RC.z + MEDIO + .55); escena.add(cubo);
                const asa = tubo(new TH.CatmullRomCurve3(new TH.EllipseCurve(0, 0, .17, .14, 0, Math.PI).getPoints(16).map(p => v3(p.x, p.y, 0))), .004, kit.cromo(), 24, 6);
                asa.position.set(cubo.position.x, .31, cubo.position.z); asa.rotation.y = .5; escena.add(asa);
                const botella = new TH.Group();
                botella.add(torno([[0, 0], [.035, 0], [.037, .01], [.037, .17], [.028, .2], [.016, .215], [0, .215]], kit.vidrio(0x8fd0ff, .55), 28));
                const tapon = cilindro(.017, .017, .03, kit.plastico(0x111111), 16); tapon.position.y = .23; botella.add(tapon);
                botella.position.set(RC.x - MEDIO - .15, LONA, RC.z + MEDIO - .15); escena.add(botella);
                // toalla sobre la cuerda de arriba
                const toalla = malla(geometriaToalla(TH, .42, 1.1, .03), kit.rizo(0xf1eee7, 4), { sombra: true });
                toalla.material.side = TH.DoubleSide;
                toalla.position.set(-CUERDA + .9, LONA + ALTURAS[3] - .005, CUERDA - .005); toalla.rotation.y = 0; ring.add(toalla);

                // guantes colgados de la cuerda
                const geosG = geometriasGuante(TH);
                const logo = dibujar(256, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = `900 78px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, h / 2 + 4); });
                [-1, 1].forEach((s, k) => {
                    const par = new TH.Group();
                    const gu = crearGuante(TH, kit, geosG, 0xa3121a, logo);
                    gu.rotation.set(0, s * .35, s * .08);
                    gu.position.set(0, -.33, 0);
                    par.add(gu);
                    const cordon = tubo(new TH.CatmullRomCurve3([v3(0, .02, 0), v3(s * .01, -.05, -.01), v3(0, -.115, -.02)]), .003, kit.tela(0xf2f0ea), 12, 5);
                    par.add(cordon);
                    par.position.set(-1.35 + s * .09, LONA + ALTURAS[3] - .02, CUERDA + .03);
                    ring.add(par); vivo.guantes.push({ g: par, fase: k * 1.7 });
                });
                await respirar();

                // ---------- sacos pesados ----------
                carga('Colgando los sacos…');
                const vigaSacos = caja(.18, .3, 12, kit.pintura(0x1f2226, { rug: .55 }), 6.8, ALTO - .45, -1.5); escena.add(vigaSacos);
                const tipos = [['#151515', '#a3141b'], ['#7b1418', '#EFEDE6'], ['#5a3a22', '#E8E8ED'], ['#151515', '#E8E8ED']];
                const correa = kit.cuero(0x0e0e0e, { escala: 2 });
                [-5.5, -3, -.5, 2].forEach((z, i) => {
                    const pivote = new TH.Group(); pivote.position.set(6.8, 2.42, z); escena.add(pivote);
                    const mat = kit.cuero(0xffffff, { rug: .4, brillo: .75, escala: 6, fuerza: .45 }); mat.map = texSaco(tipos[i][0], tipos[i][1]);
                    const cuerpo = malla(new TH.CapsuleGeometry(.18, .95, 10, 40), mat); cuerpo.position.y = -1.0; pivote.add(cuerpo);
                    const tapa = cilindro(.1, .175, .05, correa, 32); tapa.position.y = -.36; pivote.add(tapa);
                    const giratorio = cilindro(.018, .018, .07, kit.cromo(), 12); giratorio.position.y = -.02; pivote.add(giratorio);
                    [0, 1, 2, 3].forEach(k => {
                        const a = k * Math.PI / 2 + Math.PI / 4, pa = v3(Math.cos(a) * .15, -.36, Math.sin(a) * .15), pb = v3(0, -.06, 0);
                        const c = entre(pa, pb, .009, correa, 6); c.scale.x = 2.4; pivote.add(c);
                        const d = new TH.Mesh(new TH.TorusGeometry(.016, .004, 6, 12), kit.cromo()); d.position.copy(pa); d.lookAt(pb); pivote.add(d);
                    });
                    const fondoAnilla = new TH.Mesh(new TH.TorusGeometry(.03, .006, 6, 16), kit.cromo()); fondoAnilla.position.y = -1.66; fondoAnilla.rotation.x = Math.PI / 2; pivote.add(fondoAnilla);
                    escena.add(cadena(v3(6.8, ALTO - .6, z), v3(6.8, 2.44, z), kit.metal(0xb8bcc0, { rug: .3, cepillado: false })));
                    vivo.sacos.push({ g: pivote, fase: i * 1.37, amp: i === 1 ? .07 : .022 });
                });
                // losetas de goma bajo los sacos
                const losa = kit.goma(0x1b1b1a, { escala: 1 });
                for (let x = 5.4; x < 8.3; x += 1) for (let z = -7; z < 3.5; z += 1) { const l = redondeada(.985, .025, .985, .006, losa); l.position.set(x + .5, .0125, z + .5); l.castShadow = false; escena.add(l); }
                await respirar();

                // ---------- pera, doble anclaje y reloj ----------
                carga('Ajustando la pera…');
                const PX = 3.0, PZ = -FONDO + .38;
                const plataforma = cilindro(.34, .34, .06, madera, 48); plataforma.position.set(PX, 2.32, PZ); escena.add(plataforma);
                const canto = new TH.Mesh(new TH.TorusGeometry(.34, .012, 6, 48), kit.pintura(0x111111)); canto.rotation.x = Math.PI / 2; canto.position.set(PX, 2.32, PZ); escena.add(canto);
                [-.22, .22].forEach(dx => { escena.add(caja(.04, .04, .4, acero, PX + dx, 2.37, PZ - .18)); escena.add(entre(v3(PX + dx, 2.36, PZ), v3(PX + dx, 1.85, -FONDO + .01), .016, acero, 8)); });
                escena.add(caja(.6, .12, .02, acero, PX, 1.85, -FONDO + .01), caja(.6, .1, .02, acero, PX, 2.37, -FONDO + .01));
                const pera = new TH.Group(); pera.position.set(PX, 2.27, PZ);
                const peraCuerpo = torno([[0, -.272], [.012, -.27], [.02, -.25], [.045, -.235], [.075, -.2], [.098, -.15], [.105, -.1], [.095, -.05], [.06, -.01], [0, 0]], kit.cuero(0x8a4b22, { rug: .38, escala: 2 }), 36);
                peraCuerpo.rotation.x = Math.PI; peraCuerpo.position.y = -.272; pera.add(peraCuerpo);
                const peraGiro = cilindro(.012, .012, .05, kit.cromo(), 10); peraGiro.position.y = .01; pera.add(peraGiro);
                escena.add(pera); vivo.pera = pera;
                // saco de doble anclaje
                const bola = malla(new TH.SphereGeometry(.105, 32, 24), kit.cuero(0xa3141b, { rug: .35, escala: 2 }));
                bola.position.set(1.0, 1.62, -8.1); escena.add(bola);
                const gomaNegra = kit.goma(0x0b0b0b, { escala: 1 });
                const cordArriba = entre(v3(1, ALTO, -8.1), v3(1, 1.72, -8.1), .006, gomaNegra, 6), cordAbajo = entre(v3(1, 1.52, -8.1), v3(1, .02, -8.1), .006, gomaNegra, 6);
                escena.add(cordArriba, cordAbajo);
                const anclaje = cilindro(.04, .05, .02, kit.metal(0x555555), 16); anclaje.position.set(1, .01, -8.1); escena.add(anclaje);
                vivo.dobleAncla = { bola, cordArriba, cordAbajo, base: bola.position.clone() };
                // reloj de asaltos
                const reloj = crearReloj(); vivo.reloj = reloj;
                const caja3 = redondeada(1.1, .62, .12, .03, kit.pintura(0x101112, { rug: .45 })); caja3.position.set(5.6, 3.25, -FONDO + .07); escena.add(caja3);
                const pantalla = new TH.Mesh(new TH.PlaneGeometry(.96, .52), new TH.MeshBasicMaterial({ map: reloj.textura, toneMapped: false, color: new TH.Color(1.6, 1.6, 1.6) }));
                pantalla.position.set(5.6, 3.25, -FONDO + .135); escena.add(pantalla);
                const cristalReloj = new TH.Mesh(new TH.PlaneGeometry(.98, .54), kit.vidrio(0xffffff, .08)); cristalReloj.position.set(5.6, 3.25, -FONDO + .14); cristalReloj.userData.sinAO = true; escena.add(cristalReloj);
                const luzReloj = new TH.PointLight(0xff3020, 1.2, 2.2, 2); luzReloj.position.set(5.6, 3.25, -FONDO + .5); escena.add(luzReloj); vivo.luzReloj = luzReloj;
                await respirar();

                // ---------- carteles ----------
                const cartel = (i, x, y, z, ry, giro) => {
                    const geo = new TH.PlaneGeometry(.66, .95, 8, 10), p = geo.attributes.position, az = generador(200 + i);
                    for (let k = 0; k < p.count; k++) p.setZ(k, (az() - .5) * .006 + Math.sin(p.getY(k) * 6 + i) * .004);
                    geo.computeVertexNormals();
                    const m = malla(geo, new TH.MeshStandardMaterial({ map: texCartel(i), roughness: .78 }), { sombra: false });
                    m.position.set(x, y, z); m.rotation.set(0, ry, giro); escena.add(m);
                };
                cartel(0, -4.2, 2.6, -FONDO + .012, 0, .02); cartel(1, -6.6, 2.55, -FONDO + .012, 0, -.015); cartel(2, -ANCHO + .012, 2.6, -5.6, Math.PI / 2, .01);
                cartel(0, -ANCHO + .012, 2.5, -7.9, Math.PI / 2, -.02);

                // ---------- material del club: estantería, guantes, vendas, combas ----------
                carga('Ordenando el material…');
                const est = new TH.Group(); est.position.set(ANCHO - .26, 0, 7.0); escena.add(est);
                const balda = new TH.MeshStandardMaterial({ color: 0x5c3a20, roughness: .6, normalMap: repetida(kit.normales.cepillado(), 4, 1), normalScale: new TH.Vector2(.25, .25) });
                [.55, 1.1, 1.65, 2.2].forEach(y => est.add(caja(.42, .035, 3.0, balda, 0, y, 0)));
                [-1.48, 0, 1.48].forEach(z => est.add(caja(.4, 2.25, .04, acero, 0, 1.12, z)));
                const colG = [0xa3121a, 0x152f86, 0x111111, 0xe9e6de, 0xa3121a, 0xc79a2a, 0x111111, 0x152f86];
                const gCuero = new TH.InstancedMesh(geosG.cuero, kit.cuero(0xffffff, { rug: .36, brillo: .85, escala: 2, fuerza: .35 }), 18);
                const gBlanco = new TH.InstancedMesh(geosG.blanco, kit.tela(0xf2f0ea), 18), gOsc = new TH.InstancedMesh(geosG.oscuro, kit.mate(0x080808), 18);
                const q = new TH.Quaternion(), e = new TH.Euler(), pos = new TH.Vector3(), esc = new TH.Vector3(1, 1, 1), az = generador(55);
                let k = 0;
                [.57, 1.12, 1.67].forEach((y, fila) => {
                    for (let i = 0; i < 6; i++) {
                        const z = -1.25 + i * .5 + (fila % 2) * .1;
                        e.set(Math.PI + (az() - .5) * .12, Math.PI / 2 + (az() - .5) * .5, (az() - .5) * .08, 'YXZ');
                        q.setFromEuler(e); pos.set(-.02, y + .0175 + .218, z);
                        m4.compose(pos, q, esc);
                        [gCuero, gBlanco, gOsc].forEach(im => im.setMatrixAt(k, m4));
                        gCuero.setColorAt(k, new TH.Color(colG[(k + fila) % colG.length]));
                        k++;
                    }
                });
                [gCuero, gBlanco, gOsc].forEach(im => { im.castShadow = true; im.receiveShadow = true; est.add(im); });
                // vendas enrolladas
                const colV = [0xa3121a, 0x111111, 0xe9e6de, 0x152f86, 0xE8E8ED, 0x111111];
                colV.forEach((c, i) => { const v = cilindro(.045, .045, .055, kit.tela(c, { escala: 3 }), 24); v.position.set(.05, 2.22 + .045, -1.2 + i * .22); v.rotation.z = Math.PI / 2; est.add(v); });
                // combas colgadas
                [[ANCHO - .05, 2.25, 4.9], [ANCHO - .05, 2.25, 5.25]].forEach(([x, y, z], i) => {
                    const curva = new TH.CatmullRomCurve3([v3(0, 0, -.06), v3(0, -.5, -.1), v3(0, -.95, 0), v3(0, -.5, .1), v3(0, 0, .06)]);
                    const comba = tubo(curva, .0045, kit.plastico(i ? 0x111111 : 0xa3121a, .5), 64, 6); comba.position.set(x - .03, y, z); escena.add(comba);
                    [-1, 1].forEach(s => { const mango = cilindro(.014, .014, .15, kit.plastico(0x111111, .35), 12); mango.position.set(x - .03, y + .06, z + s * .06); escena.add(mango); });
                    const gancho = cilindro(.006, .006, .08, kit.cromo(), 8); gancho.rotation.z = Math.PI / 2; gancho.position.set(x - .03, y + .14, z); escena.add(gancho);
                });
                // extintor reglamentario
                const ext = new TH.Group();
                ext.add(torno([[0, 0], [.075, 0], [.08, .02], [.08, .48], [.06, .56], [.02, .6], [0, .6]], kit.pintura(0xb5121b, { rug: .3 }), 32));
                const val = cilindro(.02, .02, .08, kit.cromo(), 12); val.position.y = .64; ext.add(val);
                const manguera = tubo(new TH.CatmullRomCurve3([v3(.02, .62, 0), v3(.1, .55, .02), v3(.11, .3, .03), v3(.09, .1, .02)]), .009, kit.goma(0x0a0a0a), 24, 6); ext.add(manguera);
                ext.position.set(ANCHO - .12, .95, 4.3); escena.add(ext);
                const senal = new TH.Mesh(new TH.PlaneGeometry(.3, .3), new TH.MeshStandardMaterial({ roughness: .5, map: dibujar(128, 128, (x, w, h) => { x.fillStyle = '#c8102e'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `800 18px ${TEXTO}`; x.textAlign = 'center'; x.fillText('EXTINTOR', w / 2, h - 16); x.fillRect(w / 2 - 12, 22, 24, 64); x.fillRect(w / 2 - 6, 14, 12, 10); }) }));
                senal.position.set(ANCHO - .01, 1.95, 4.3); senal.rotation.y = -Math.PI / 2; escena.add(senal);

                // banco con la bolsa de deporte
                const banco = new TH.Group();
                [-.12, 0, .12].forEach(z => banco.add(caja(1.6, .035, .1, madera, 0, .45, z)));
                [-.7, .7].forEach(x => { banco.add(caja(.04, .43, .04, acero, x, .215, -.12), caja(.04, .43, .04, acero, x, .215, .12), caja(.04, .04, .3, acero, x, .05, 0)); });
                banco.position.set(-1.6, 0, -FONDO + .55); escena.add(banco);
                const bolsa = redondeada(.62, .3, .3, .12, kit.tela(0x141414, { escala: 5 })); bolsa.position.set(-1.9, .62, -FONDO + .55); escena.add(bolsa);
                const asaB = tubo(new TH.CatmullRomCurve3([v3(-.12, 0, 0), v3(-.08, .12, 0), v3(.08, .12, 0), v3(.12, 0, 0)]), .012, kit.tela(0x141414), 20, 6); asaB.position.set(-1.9, .77, -FONDO + .55); escena.add(asaB);
                const parBanco = crearGuante(TH, kit, geosG, 0x152f86, logo); parBanco.rotation.set(-Math.PI / 2, 0, .4); parBanco.position.set(-1.15, .52, -FONDO + .55); escena.add(parBanco);

                // espejo grande frente a los sacos
                const marcoE = kit.pintura(0x111111, { rug: .4 });
                escena.add(caja(.05, 2.5, 9.2, marcoE, ANCHO - .03, 1.55, -2.0));
                if (calidad.reflejos) {
                    const espejo = new Reflector(new TH.PlaneGeometry(9, 2.3), { textureWidth: 1024, textureHeight: 512, color: 0xb9bcbd, clipBias: .003, multisample: calidad.muestras });
                    espejo.position.set(ANCHO - .06, 1.55, -2.0); espejo.rotation.y = -Math.PI / 2; espejo.userData.sinAO = true; escena.add(espejo);
                } else {
                    const espejo = new TH.Mesh(new TH.PlaneGeometry(9, 2.3), new TH.MeshStandardMaterial({ color: 0xc8cccd, metalness: 1, roughness: .04 }));
                    espejo.position.set(ANCHO - .06, 1.55, -2.0); espejo.rotation.y = -Math.PI / 2; escena.add(espejo);
                }
                await respirar();

                // ---------- luz ----------
                carga('Encendiendo las lámparas…');
                escena.add(new TH.HemisphereLight(0xffe9cf, 0x14100c, .25));
                const sol = new TH.DirectionalLight(0xffd9a6, 3.2);
                sol.position.copy(v3(-2.5, 0, 2.5).addScaledVector(SOL_DIR, -24)); sol.target.position.set(-2.5, 0, 2.5);
                if (calidad.sombras) {
                    sol.castShadow = true; sol.shadow.mapSize.set(calidad.sombraTam * (calidad.movil ? 1 : 1), calidad.sombraTam);
                    const sc = sol.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 12; sc.bottom = -12; sc.near = 4; sc.far = 50;
                    sol.shadow.bias = -.0004; sol.shadow.normalBias = .04; sol.shadow.radius = 3;
                }
                escena.add(sol, sol.target);
                // rectángulo de luz del ventanal (rebote suave)
                const ventLuz = new TH.RectAreaLight(0xffe3bd, 5, V.z1 - V.z0, V.y1 - V.y0);
                ventLuz.position.set(-ANCHO + .1, (V.y0 + V.y1) / 2, (V.z0 + V.z1) / 2); ventLuz.lookAt(0, (V.y0 + V.y1) / 2, (V.z0 + V.z1) / 2); escena.add(ventLuz);
                // haces de sol entrando por cada fila del ventanal
                for (let fila = 0; fila < 3; fila++) {
                    const y = V.y0 + (fila + .5) * (V.y1 - V.y0) / 3, z = (V.z0 + V.z1) / 2;
                    const desde = v3(-ANCHO + .02, y, z), hacia = desde.clone().addScaledVector(SOL_DIR, (y - .05) / -SOL_DIR.y);
                    const h = haz(desde, hacia, 1, 1.15, 0xffdcae, .085, 4);
                    h.geometry.rotateZ(Math.PI / 4); h.scale.set((V.z1 - V.z0) / 2 / Math.SQRT1_2 * .92, (V.y1 - V.y0) / 6 / Math.SQRT1_2 * .8, 1);
                    escena.add(h);
                }
                // lámparas
                [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([dx, dz], i) => {
                    lampara(kit, RC.x + dx, 4.6, RC.z + dz, { techo: ALTO, fuerza: 165, angulo: .62, sombra: calidad.sombras > 1 && i < 2, calidad, objetivo: v3(RC.x + dx * .55, LONA, RC.z + dz * .55) }).forEach(o => escena.add(o));
                });
                [[6.8, -4.2], [6.8, .8]].forEach(([x, z], i) => lampara(kit, x, 4.3, z, { techo: ALTO, fuerza: 220, angulo: .7, sombra: calidad.sombras > 2 && i === 0, calidad, objetivo: v3(x, 0, z) }).forEach(o => escena.add(o)));
                lampara(kit, 3.6, 4.5, -7.6, { techo: ALTO, fuerza: 180, angulo: .75, calidad, objetivo: v3(3.6, 0, -8.6) }).forEach(o => escena.add(o));
                lampara(kit, 9.6, 4.2, 6.8, { techo: ALTO, fuerza: 70, angulo: .8, calidad, haces: false, objetivo: v3(10.6, 1, 7) }).forEach(o => escena.add(o));

                escena.add(polvo([[RC.x, 1.2, RC.z, 6, 3.6, 6], [-6, 2, 2.5, 8, 3, 6], [6.8, 1, -1.5, 3, 3, 10]], calidad.polvo));

                // ---------- vida ----------
                return {
                    actualizar(t) {
                        vivo.sacos.forEach(s => { s.g.rotation.z = Math.sin(t * 1.25 + s.fase) * s.amp; s.g.rotation.x = Math.sin(t * .9 + s.fase * 2) * s.amp * .6; });
                        // la pera rebota: tres golpes por ciclo
                        const fase = (t * 4.2) % 3, golpe = Math.abs(Math.sin(fase * Math.PI));
                        vivo.pera.rotation.x = Math.sin(t * 24) * .9 * golpe;
                        vivo.pera.rotation.z = Math.sin(t * 17) * .25 * golpe;
                        const d = vivo.dobleAncla, ox = Math.sin(t * 2.1) * .06, oz = Math.sin(t * 2.9 + 1) * .04;
                        d.bola.position.set(d.base.x + ox, d.base.y + Math.sin(t * 3.1) * .015, d.base.z + oz);
                        colocarEntre(d.cordArriba, v3(1, ALTO, -8.1), v3(d.bola.position.x, d.bola.position.y + .1, d.bola.position.z));
                        colocarEntre(d.cordAbajo, v3(d.bola.position.x, d.bola.position.y - .1, d.bola.position.z), v3(1, .02, -8.1));
                        vivo.guantes.forEach(g => { g.g.rotation.x = Math.sin(t * 1.1 + g.fase) * .04; g.g.rotation.z = Math.sin(t * .8 + g.fase) * .03; });
                        vivo.reloj.actualizar(t);
                        const descanso = Math.floor(t) % 240 >= 180;
                        vivo.luzReloj.color.set(descanso ? 0x30ff70 : 0xff3020);
                    }
                };
            }
        };

        montarEscena('boxeo', BOXEO);
    }).catch(err => console.error(err));
})();
