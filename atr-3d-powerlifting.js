// ============================================
// ATR-GYM — la tarima de powerlifting en 3D
// Pabellón a oscuras listo para competir: tarima con plataforma de madera
// y goma, rack de sentadilla con 250 kg en discos calibrados, jueces con
// sus mandos, luces de decisión que votan de verdad, marcador LED que
// cuenta el minuto, truss con focos y la zona de calentamiento.
// ============================================
// Necesita atr-3d-motor.js cargado antes en la página.
(function () {
    'use strict';
    window.ATR3D.motor.then(({ THREE, montarEscena, dibujar, ruido, normalDe, grisDe, textura, repetida, generador, lienzo, caja, redondeada, torno, cilindro, entre, colocarEntre, tubo, malla, haz, polvo, lampara, mergeGeometries, RoundedBoxGeometry, v3, FUENTE, MONO, TEXTO }) => {
        const TAR = { w: 8, d: 8, h: .5 };               // tarima de 8 × 8 m
        const PLAT = .05;                                // grosor de la plataforma
        const SUP = TAR.h + PLAT;                        // donde se pisa
        const BARRA = v3(0, SUP + 1.45, -.55);           // barra en los ganchos
        const TRUSS = { x0: -5.2, x1: 5.2, z0: -4.4, z1: 4.4, y: 6.6, l: .29 };
        const SALA = { x: 14, z0: -9.5, z1: 14.5, alto: 9 };
        const CAL = v3(8.6, 0, 1.4);                     // plataforma de calentamiento
        const ORO = '#E8E8ED';

        // discos calibrados (radio y grosor reales en metros)
        const DISCOS = {
            25: { r: .225, g: .027, color: '#c3161c', letra: '#f4f1ea' },
            20: { r: .225, g: .0226, color: '#1d4fb5', letra: '#f4f1ea' },
            15: { r: .2, g: .0217, color: '#f0c20f', letra: '#151515' },
            10: { r: .1625, g: .021, color: '#178a3e', letra: '#f4f1ea' },
            5: { r: .1145, g: .018, color: '#ecebe6', letra: '#151515' },
            2.5: { r: .095, g: .016, color: '#161616', letra: '#f4f1ea' },
            1.25: { r: .08, g: .012, color: '#c9ccce', letra: '#202020', cromo: true }
        };
        const CUBO = .062;                               // radio del casquillo cromado de cada disco

        // ---------- texturas ----------
        function texEpoxi(T) {
            const W = T, n = ruido(W, W, { escala: 3, octavas: 5, semilla: 23 }), f = ruido(W, W, { escala: 48, octavas: 2, semilla: 29 });
            const c = lienzo(W, W), x = c.getContext('2d'), img = x.createImageData(W, W), d = img.data, rug = new Float32Array(W * W), alt = new Float32Array(W * W);
            for (let i = 0; i < W * W; i++) {
                const v = .12 + (n[i] - .5) * .06 + (f[i] - .5) * .02;
                d[i * 4] = v * 255; d[i * 4 + 1] = v * 255 * 1.02; d[i * 4 + 2] = v * 255 * 1.07; d[i * 4 + 3] = 255;
                rug[i] = .15 + n[i] * .45; alt[i] = f[i] * .25;
            }
            x.putImageData(img, 0, 0);
            // escamas del epoxi
            const az = generador(31);
            for (let i = 0; i < W * 6; i++) { const g = 60 + az() * 90; x.fillStyle = `rgba(${g},${g},${g + 6},${.25 + az() * .35})`; x.fillRect(az() * W, az() * W, 1 + az() * 1.6, 1 + az() * 1.2); }
            return { mapa: textura(c), rug: grisDe(rug, W, W), normal: normalDe(alt, W, W, 1) };
        }
        function texBloque(T) {
            const W = T / 2, filas = 6, c = lienzo(W, W), x = c.getContext('2d'), alt = new Float32Array(W * W), n = ruido(W, W, { escala: 16, octavas: 3, semilla: 3 });
            const rh = W / filas, bw = W / 2, m = 2;
            for (let y = 0; y < W; y++) {
                const fila = Math.floor(y / rh), desp = fila % 2 ? bw / 2 : 0, ly = y - fila * rh;
                for (let px = 0; px < W; px++) { const lx = (px + desp) % bw; alt[y * W + px] = (lx < m || ly < m) ? .1 : .7 + n[y * W + px] * .3; }
            }
            x.fillStyle = '#1b1c1f'; x.fillRect(0, 0, W, W);
            return normalDe(alt, W, W, 2.2);
        }
        function texMadera(W, H) {
            const c = lienzo(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data, alt = new Float32Array(W * H);
            const tablas = 8, tw = W / tablas, az = generador(61), cortes = [], tonos = [];
            for (let i = 0; i < tablas; i++) { cortes.push(H * (.15 + az() * .7)); tonos.push(.88 + az() * .24); }
            const grano = ruido(W, H, { escala: 40, octavas: 4, semilla: 13, estirar: .05 }), veta = ruido(W, H, { escala: 6, octavas: 3, semilla: 17, estirar: .3 });
            for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
                const t = Math.floor(px / tw), lx = px - t * tw, k = y * W + px;
                const junta = lx < 1.5 || Math.abs(y - cortes[t]) < 1.2;
                const g = grano[y * W + ((px + t * 53) % W)], v = (.78 + (g - .5) * .5 + (veta[k] - .5) * .18) * tonos[t] * (junta ? .45 : 1);
                d[k * 4] = Math.min(255, 182 * v); d[k * 4 + 1] = Math.min(255, 132 * v); d[k * 4 + 2] = Math.min(255, 80 * v); d[k * 4 + 3] = 255;
                alt[k] = junta ? 0 : .8 + g * .08;
            }
            x.putImageData(img, 0, 0);
            // huellas de magnesio donde se apoyan los pies y caen los discos
            [[.5, .52, .34], [.5, .44, .22], [.3, .47, .12], [.7, .47, .12], [.5, .6, .16]].forEach(([u, v, r], i) => {
                for (let k = 0; k < 9; k++) {
                    const px = W * (u + (az() - .5) * .3), py = H * (v + (az() - .5) * .12), rr = W * r * (.3 + az() * .7);
                    const g = x.createRadialGradient(px, py, 0, px, py, rr);
                    g.addColorStop(0, `rgba(245,243,236,${.05 + az() * .07})`); g.addColorStop(1, 'rgba(245,243,236,0)');
                    x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
                }
            });
            // escudo pintado en el centro y rotulación en el borde delantero
            x.textAlign = 'center'; x.textBaseline = 'middle';
            x.fillStyle = 'rgba(16,13,10,.86)'; x.font = `900 ${W * .34}px ${FUENTE}`; x.fillText('ATR', W / 2, H / 2 - W * .06);
            x.font = `800 ${W * .075}px ${FUENTE}`; x.fillText('POWERLIFTING', W / 2, H / 2 + W * .2);
            x.fillStyle = 'rgba(16,13,10,.7)'; x.font = `700 ${W * .045}px ${MONO}`; x.fillText('ATR-GYM · TERUEL · 4 × 4 M', W / 2, H - W * .1);
            return { mapa: textura(c), normal: normalDe(alt, W, H, 2) };
        }
        function texGomaLateral() {
            return dibujar(256, 728, (x, w, h) => {
                x.fillStyle = '#0d0d0e'; x.fillRect(0, 0, w, h);
                const az = generador(71);
                for (let i = 0; i < 2600; i++) { const g = 40 + az() * 50; x.fillStyle = `rgba(${g},${g},${g},${.5 + az() * .4})`; x.fillRect(az() * w, az() * h, 1.5, 1.5); }
                x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2);
                x.fillStyle = 'rgba(217,180,90,.9)'; x.font = `900 64px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR-GYM', 0, 0);
                x.restore();
            });
        }
        function texFaldon() {
            return dibujar(2048, 128, (x, w, h) => {
                x.fillStyle = '#070707'; x.fillRect(0, 0, w, h);
                x.textBaseline = 'middle'; let px = 30;
                while (px < w) {
                    x.font = `900 60px ${FUENTE}`; x.fillStyle = '#EFEDE6'; x.fillText('ATR CLASSIC', px, h / 2 + 3); px += x.measureText('ATR CLASSIC').width + 34;
                    x.font = `800 40px ${FUENTE}`; x.fillStyle = ORO; x.fillText('POWERLIFTING · TERUEL 2026', px, h / 2 + 3); px += x.measureText('POWERLIFTING · TERUEL 2026').width + 70;
                }
            });
        }
        function texPancarta() {
            return dibujar(2048, 160, (x, w, h) => {
                x.fillStyle = '#0b0b0b'; x.fillRect(0, 0, w, h);
                x.fillStyle = ORO; x.fillRect(0, 0, w, 8); x.fillRect(0, h - 8, w, 8);
                x.textAlign = 'center'; x.textBaseline = 'middle';
                x.font = `900 76px ${FUENTE}`; x.fillStyle = '#EFEDE6'; x.fillText('ATR CLASSIC', w * .27, h / 2 + 4);
                x.fillStyle = ORO; x.fillText('POWERLIFTING', w * .66, h / 2 + 4);
                x.font = `700 30px ${MONO}`; x.fillStyle = '#9a9c98'; x.fillText('TERUEL · 2026', w * .9, h / 2 + 4);
                x.fillText('CAMPEONATO', w * .08, h / 2 + 4);
            });
        }
        function texEstandarte(arriba, abajo) {
            return dibujar(256, 1024, (x, w, h) => {
                x.fillStyle = '#0c0c0c'; x.fillRect(0, 0, w, h);
                x.fillStyle = ORO; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14);
                x.textAlign = 'center'; x.textBaseline = 'middle';
                x.fillStyle = '#EFEDE6'; x.font = `900 92px ${FUENTE}`; x.fillText('ATR', w / 2, 140);
                x.save(); x.translate(w / 2, h * .58); x.rotate(-Math.PI / 2);
                x.fillStyle = ORO; x.font = `900 74px ${FUENTE}`; x.fillText(arriba, 0, 0);
                x.restore();
                x.fillStyle = '#9a9c98'; x.font = `700 26px ${MONO}`; x.fillText(abajo, w / 2, h - 70);
            });
        }
        // montantes del rack: agujeros cada 5 cm con su número
        function texAgujeros(alto) {
            const W = 128, H = 2048, c = lienzo(W, H), x = c.getContext('2d'), a = lienzo(W, H), y = a.getContext('2d');
            const pxm = W / .075, pym = H / alto, k = pym / pxm;
            x.fillStyle = '#121315'; x.fillRect(0, 0, W, H);
            const az = generador(7);
            for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${az() * .035})`; x.fillRect(az() * W, az() * H, 1.5, 1.5); }
            y.fillStyle = '#fff'; y.fillRect(0, 0, W, H);
            for (let n = 1, m = .3; m < alto - .12; m += .05, n++) {
                const cy = H - m * pym, rx = .0105 * pxm, ry = .0105 * pym;
                x.fillStyle = '#030303'; x.beginPath(); x.ellipse(W / 2, cy, rx, ry, 0, 0, 6.283); x.fill();
                x.strokeStyle = 'rgba(150,154,158,.45)'; x.lineWidth = 2; x.stroke();
                y.fillStyle = '#000'; y.beginPath(); y.ellipse(W / 2, cy, rx, ry, 0, 0, 6.283); y.fill();
                x.save(); x.translate(W * .87, cy); x.scale(1, k);
                x.fillStyle = 'rgba(235,235,230,.8)'; x.font = `700 20px ${MONO}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 0, 0);
                x.restore();
            }
            const px = y.getImageData(0, 0, W, H).data, alt = new Float32Array(W * H);
            for (let i = 0; i < alt.length; i++) alt[i] = px[i * 4] / 255;
            return { mapa: textura(c), normal: normalDe(alt, W, H, 3) };
        }
        // cara de cada disco: color, letras en relieve y su mapa de normales
        function arco(x, texto, cx, cy, rad, centro, abajo) {
            const ancho = x.measureText(texto).width;
            let a = centro + (abajo ? ancho / rad / 2 : -ancho / rad / 2);
            for (const ch of texto) {
                const da = x.measureText(ch).width / rad, am = a + (abajo ? -da / 2 : da / 2);
                x.save(); x.translate(cx + Math.cos(am) * rad, cy + Math.sin(am) * rad);
                x.rotate(am + (abajo ? -Math.PI / 2 : Math.PI / 2)); x.fillText(ch, 0, 0); x.restore();
                a += abajo ? -da : da;
            }
        }
        function texDisco(peso, d) {
            const S = 512, R = S / 2, hub = CUBO / d.r * R, c = lienzo(S, S), x = c.getContext('2d'), h = lienzo(S, S), y = h.getContext('2d');
            x.fillStyle = d.color; x.fillRect(0, 0, S, S);
            const az = generador(Math.round(peso * 10) + 3);
            for (let i = 0; i < 3500; i++) { x.fillStyle = `rgba(${az() < .5 ? '0,0,0' : '255,255,255'},${az() * .035})`; x.fillRect(az() * S, az() * S, 2, 2); }
            y.fillStyle = '#000'; y.fillRect(0, 0, S, S);
            const numero = String(peso).replace('.', ',');
            const dibuja = (k, col) => {
                k.fillStyle = col; k.strokeStyle = col; k.textAlign = 'center'; k.textBaseline = 'middle';
                k.lineWidth = S * .008; k.beginPath(); k.arc(R, R, R * .875, 0, 6.283); k.stroke();
                k.beginPath(); k.arc(R, R, hub + S * .012, 0, 6.283); k.stroke();
                const banda = R * .86 - hub, medio = hub + banda / 2;
                if (d.r > .15) {
                    k.font = `900 ${banda * .62}px ${FUENTE}`; k.fillText(numero, R, R - medio);
                    k.font = `800 ${banda * .22}px ${FUENTE}`; k.fillText('KG', R, R - medio + banda * .45);
                    k.font = `800 ${banda * .17}px ${FUENTE}`; arco(k, 'ATR-GYM · CALIBRATED', R, R, medio, Math.PI / 2, true);
                    k.font = `700 ${banda * .12}px ${MONO}`; arco(k, `${Math.round(peso * 2.2046)} LB`, R, R, medio, 0, false);
                    arco(k, 'IPF', R, R, medio, Math.PI, false);
                } else {
                    k.font = `900 ${banda * .5}px ${FUENTE}`; arco(k, `${numero} KG`, R, R, medio - banda * .05, -Math.PI / 2, false);
                    k.font = `800 ${banda * .34}px ${FUENTE}`; arco(k, 'ATR', R, R, medio, Math.PI / 2, true);
                }
            };
            dibuja(x, d.letra); dibuja(y, '#fff');
            const px = y.getImageData(0, 0, S, S).data, alt = new Float32Array(S * S);
            for (let i = 0; i < alt.length; i++) alt[i] = px[i * 4] / 255;
            return { mapa: textura(c), normal: normalDe(alt, S, S, 2.5) };
        }
        // marcador LED: intento, peso, minuto y decisión
        const INTENTOS = [
            { dorsal: '07', cat: '−93 KG · OPEN · ATR-GYM TERUEL', intento: 3, luces: ['b', 'b', 'b'] },
            { dorsal: '12', cat: '−105 KG · OPEN · CLUB INVITADO', intento: 2, luces: ['b', 'r', 'b'] },
            { dorsal: '03', cat: '−83 KG · JUNIOR · ATR-GYM TERUEL', intento: 3, luces: ['r', 'r', 'b'] },
            { dorsal: '21', cat: '−120 KG · MASTER · ATR-GYM TERUEL', intento: 1, luces: ['b', 'b', 'r'] }
        ];
        const CICLO = 20;
        function momento(t) {
            const n = Math.floor(t / CICLO), f = t - n * CICLO, a = INTENTOS[n % INTENTOS.length];
            return { a, sig: INTENTOS[(n + 1) % INTENTOS.length], reloj: f < 12 ? 60 - Math.floor(f) : null, luces: f >= 12.6 && f < 19 ? a.luces : null, levantando: f >= 12 && f < 12.6 };
        }
        function crearMarcador() {
            const W = 1280, H = 720, c = lienzo(W, H), x = c.getContext('2d'), t = textura(c);
            let clave = '';
            function pintar(m) {
                x.fillStyle = '#040506'; x.fillRect(0, 0, W, H);
                x.fillStyle = ORO; x.fillRect(0, 0, W, 84);
                x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#0b0c0d';
                x.font = `900 42px ${FUENTE}`; x.fillText('ATR CLASSIC', 40, 44);
                x.textAlign = 'right'; x.font = `700 26px ${MONO}`; x.fillText('CAMPEONATO DE POWERLIFTING · PLATAFORMA A', W - 40, 44);
                x.textAlign = 'left';
                x.fillStyle = '#8e949a'; x.font = `700 30px ${MONO}`; x.fillText(`SENTADILLA · ${m.a.intento}.º INTENTO`, 44, 142);
                x.fillStyle = '#f2f2ee'; x.font = `800 58px ${FUENTE}`; x.fillText(`DORSAL ${m.a.dorsal}`, 44, 210);
                x.fillStyle = '#7f858b'; x.font = `600 27px ${MONO}`; x.fillText(m.a.cat, 44, 266);
                x.fillStyle = '#ffffff'; x.font = `900 220px ${FUENTE}`; x.fillText('250', 30, 432);
                const wp = x.measureText('250').width;
                x.font = `900 92px ${FUENTE}`; x.fillText(',0', 30 + wp, 470);
                x.fillStyle = ORO; x.font = `900 56px ${FUENTE}`; x.fillText('KG', 46 + wp + x.measureText(',0').width, 474);
                // reloj
                x.fillStyle = '#16181b'; x.fillRect(860, 116, 380, 186);
                x.fillStyle = '#8e949a'; x.font = `700 24px ${MONO}`; x.textAlign = 'center'; x.fillText(m.reloj !== null ? 'TIEMPO PARA EMPEZAR' : m.levantando ? 'EN CURSO' : 'DECISIÓN', 1050, 146);
                const seg = m.reloj ?? 0;
                x.fillStyle = m.reloj === null ? '#4a4e52' : seg > 30 ? ORO : '#ffb020';
                x.font = `700 118px ${MONO}`; x.fillText(`${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`, 1050, 232);
                // decisión de los tres jueces
                const nombres = ['IZQ.', 'CENTRAL', 'DCHA.'];
                [920, 1050, 1180].forEach((cx, i) => {
                    const v = m.luces ? m.luces[i] : null;
                    x.beginPath(); x.arc(cx, 420, 54, 0, 6.283);
                    x.fillStyle = v === 'b' ? '#ffffff' : v === 'r' ? '#ff2a1f' : '#17191c'; x.fill();
                    x.lineWidth = 4; x.strokeStyle = '#2a2d31'; x.stroke();
                    x.fillStyle = '#6f757b'; x.font = `700 20px ${MONO}`; x.fillText(nombres[i], cx, 500);
                });
                if (m.luces) {
                    const validas = m.luces.filter(l => l === 'b').length >= 2;
                    x.fillStyle = validas ? '#ffffff' : '#ff2a1f'; x.font = `900 64px ${FUENTE}`; x.fillText(validas ? 'VÁLIDO' : 'NULO', 1050, 572);
                }
                x.textAlign = 'left';
                x.fillStyle = '#16181b'; x.fillRect(0, 630, W, 90);
                x.fillStyle = '#8e949a'; x.font = `700 28px ${MONO}`; x.fillText(`SIGUIENTE · DORSAL ${m.sig.dorsal} · 250,0 KG · ${m.sig.intento}.º INTENTO`, 44, 676);
                x.textAlign = 'right'; x.fillStyle = ORO; x.fillText('ATR-GYM', W - 40, 676);
                // rejilla de píxeles LED y juntas de los módulos
                x.fillStyle = 'rgba(0,0,0,.32)';
                for (let i = 0; i < W; i += 4) x.fillRect(i, 0, 1, H);
                for (let j = 0; j < H; j += 4) x.fillRect(0, j, W, 1);
                x.fillStyle = 'rgba(0,0,0,.6)';
                for (let i = 0; i <= W; i += 160) x.fillRect(i - 1, 0, 2, H);
                for (let j = 0; j <= H; j += 180) x.fillRect(0, j - 1, W, 2);
                t.needsUpdate = true;
            }
            return {
                textura: t,
                actualizar(m) {
                    const k = `${m.a.dorsal}|${m.reloj}|${m.luces}|${m.levantando}`;
                    if (k !== clave) { clave = k; pintar(m); }
                }
            };
        }

        // ---------- geometrías ----------
        // disco con aro exterior, cara rebajada y textura plana en las dos caras
        function geoDisco(TH, R, g) {
            const r0 = CUBO - .002, h1 = g / 2, h2 = g / 2 - .0016, e = Math.min(.004, g * .18), labio = Math.min(.016, (R - r0) * .12);
            const perfil = [
                [r0, -h1], [r0 + .01, -h1], [r0 + .01, -h1], [r0 + .014, -h2], [r0 + .014, -h2],
                [R - labio - .004, -h2], [R - labio - .004, -h2], [R - labio, -h1], [R - labio, -h1],
                [R - e, -h1], [R - e * .3, -h1 + e * .3], [R, -h1 + e], [R, h1 - e], [R - e * .3, h1 - e * .3], [R - e, h1], [R - e, h1],
                [R - labio, h1], [R - labio, h1], [R - labio - .004, h2], [R - labio - .004, h2],
                [r0 + .014, h2], [r0 + .014, h2], [r0 + .01, h1], [r0 + .01, h1], [r0, h1], [r0, h1], [r0, -h1]
            ];
            const trasera = perfil.length - 12;                        // desde aquí, la cara de atrás
            const geo = new TH.LatheGeometry(perfil.map(([r, y]) => new TH.Vector2(r, y)), R > .15 ? 72 : 48);
            geo.rotateZ(Math.PI / 2);                                  // eje del disco = X, letras hacia +X
            // proyección plana en las dos caras; la de atrás, sin espejo, para que también se lea
            const p = geo.attributes.position, uv = geo.attributes.uv;
            for (let i = 0; i < p.count; i++) {
                const j = i % perfil.length, atras = j >= trasera && j < perfil.length - 1;
                uv.setXY(i, .5 + (atras ? 1 : -1) * p.getZ(i) / (2 * R), .5 + p.getY(i) / (2 * R));
            }
            return geo;
        }
        function geoCubo(TH, g) {
            const h = g / 2 + .003;
            const geo = new TH.LatheGeometry([[.0254, -h], [.055, -h], [.055, -h], [CUBO, -h + .003], [CUBO, h - .003], [.055, h], [.055, h], [.0254, h], [.0254, h], [.0254, -h]].map(([r, y]) => new TH.Vector2(r, y)), 40);
            geo.rotateZ(Math.PI / 2);
            return geo;
        }
        // todo lo repetido (discos, butacas, celosía del truss) va en una sola llamada a la GPU
        function crearLotes(TH) {
            const mapa = new Map();
            return {
                poner(geo, mat, m4) { const k = geo.uuid + mat.uuid; if (!mapa.has(k)) mapa.set(k, { geo, mat, ms: [] }); mapa.get(k).ms.push(m4.clone()); },
                cerrar(escena) {
                    mapa.forEach(({ geo, mat, ms }) => {
                        const im = new TH.InstancedMesh(geo, mat, ms.length);
                        ms.forEach((m, i) => im.setMatrixAt(i, m));
                        im.castShadow = im.receiveShadow = true; im.computeBoundingSphere();
                        escena.add(im);
                    });
                }
            };
        }
        // barra de 20 kg: moleteado, anillos lisos, casquillos cromados y tapa con logo
        function crearBarra(TH, kit, tapa) {
            const g = new TH.Group(), mol = [], liso = [];
            const seccion = (x0, x1, lista, r = .0145) => {
                const c = new TH.CylinderGeometry(r, r, x1 - x0, 28, 1, true), uv = c.attributes.uv;
                for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * (x1 - x0) / .032);
                c.rotateZ(Math.PI / 2); c.translate((x0 + x1) / 2, 0, 0); lista.push(c);
            };
            [1, -1].forEach(s => {
                const tramo = (a, b, l) => seccion(Math.min(s * a, s * b), Math.max(s * a, s * b), l);
                tramo(.08, .2, liso); tramo(.2, .395, mol); tramo(.395, .415, liso); tramo(.415, .61, mol); tramo(.61, .655, liso);
            });
            seccion(-.08, .08, mol);
            const moleteado = new TH.MeshStandardMaterial({ color: 0xc4c7ca, metalness: 1, roughness: .38, normalMap: kit.normales.moleteado(), normalScale: new TH.Vector2(1.1, 1.1) });
            g.add(malla(mergeGeometries(mol), moleteado), malla(mergeGeometries(liso), kit.metal(0xc9ccd0, { rug: .32, escala: 2 })));
            const cromo = kit.cromo();
            [1, -1].forEach(s => {
                const brida = new TH.CylinderGeometry(.031, .031, .03, 32); brida.rotateZ(Math.PI / 2); brida.translate(s * .67, 0, 0);
                const manga = new TH.LatheGeometry([[0, -.002], [.0245, -.002], [.025, 0], [.025, .06], [.0236, .062], [.0236, .066], [.025, .068], [.025, .405], [.0235, .413], [.017, .415], [0, .415]].map(([r, y]) => new TH.Vector2(r, y)), 40);
                manga.rotateZ(-s * Math.PI / 2); manga.translate(s * .685, 0, 0);
                g.add(malla(brida, cromo), malla(manga, cromo));
                const cara = new TH.Mesh(new TH.CircleGeometry(.0168, 28), new TH.MeshStandardMaterial({ map: tapa, metalness: .7, roughness: .3 }));
                cara.position.x = s * 1.1001; cara.rotation.y = s * Math.PI / 2; g.add(cara);
            });
            return g;
        }
        // cierre de competición de 2,5 kg con su palomilla
        function crearCierre(TH, kit) {
            const g = new TH.Group();
            const cuerpo = torno([[.026, -.022], [.047, -.022], [.047, -.022], [.052, -.017], [.052, .017], [.047, .022], [.047, .022], [.026, .022], [.026, .022], [.026, -.022]], kit.metal(0xc3c6c9, { rug: .22, escala: 1 }), 44);
            cuerpo.geometry.rotateZ(Math.PI / 2); g.add(cuerpo);
            const aro = new TH.Mesh(new TH.TorusGeometry(.05, .0035, 8, 44), kit.plastico(0xc3161c, .35)); aro.rotation.y = Math.PI / 2; g.add(aro);
            const rosca = cilindro(.0065, .0065, .04, kit.cromo(), 12); rosca.position.y = .066; g.add(rosca);
            const pomo = torno([[0, 0], [.018, 0], [.02, .006], [.02, .02], [.016, .026], [0, .026]], kit.plastico(0x0c0c0c, .5), 24); pomo.position.y = .084; g.add(pomo);
            const palanca = redondeada(.012, .012, .06, .004, kit.plastico(0x0c0c0c, .5)); palanca.position.y = .1; g.add(palanca);
            return g;
        }
        function crearSilla(TH, kit, tapiz, patas) {
            const g = new TH.Group();
            const asiento = redondeada(.46, .07, .44, .03, tapiz); asiento.position.y = .47;
            const respaldo = redondeada(.46, .4, .06, .03, tapiz); respaldo.position.set(0, .8, -.21); respaldo.rotation.x = -.1;
            g.add(asiento, respaldo);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(entre(v3(sx * .2, .44, sz * .19), v3(sx * .21, 0, sz * .2), .011, patas, 8)));
            [-1, 1].forEach(s => g.add(entre(v3(s * .2, .45, -.2), v3(s * .2, .66, -.225), .011, patas, 8)));
            return g;
        }
        function crearMesa(TH, ancho, fondo, tapete, tablero) {
            const g = new TH.Group();
            g.add(caja(ancho, .035, fondo, tablero, 0, .745, 0));
            g.add(caja(ancho + .02, .72, .01, tapete, 0, .37, fondo / 2 + .005), caja(.01, .72, fondo, tapete, ancho / 2 + .005, .37, 0), caja(.01, .72, fondo, tapete, -ancho / 2 - .005, .37, 0));
            return g;
        }
        function crearMando(TH, kit) {
            const g = new TH.Group();
            const cuerpo = redondeada(.2, .05, .11, .012, kit.plastico(0x111214, .4)); cuerpo.position.y = .025; g.add(cuerpo);
            [[-.048, 0xf4f4f0], [.048, 0xd31c17]].forEach(([x, c]) => {
                const aro = cilindro(.03, .03, .008, kit.metal(0x8b8f93, { rug: .3 }), 28); aro.position.set(x, .052, 0);
                const boton = torno([[0, .017], [.016, .016], [.023, .011], [.025, 0], [0, 0]], kit.plastico(c, .25), 28); boton.position.set(x, .055, 0);
                g.add(aro, boton);
            });
            return g;
        }
        function crearCartelito(TH, texto) {
            const tex = dibujar(256, 96, (x, w, h) => { x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.font = `800 30px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, w / 2, h / 2 + 2); x.fillStyle = ORO; x.fillRect(0, h - 10, w, 10); });
            const g = new TH.Group(), mat = new TH.MeshStandardMaterial({ map: tex, roughness: .6, side: TH.DoubleSide });
            [-1, 1].forEach(s => { const p = malla(new TH.PlaneGeometry(.26, .1), mat); p.position.set(0, .046, s * .016); p.rotation.x = s * .33; if (s < 0) p.rotation.y = Math.PI; g.add(p); });
            return g;
        }
        // foco de teatro colgado del truss (apunta con su eje +Z)
        function crearFoco(TH, kit, carcasa, color, encendido) {
            const g = new TH.Group();
            const cuerpo = torno([[0, -.2], [.085, -.2], [.1, -.16], [.11, -.06], [.11, .1], [.095, .16], [.095, .19], [0, .19]], carcasa, 28);
            cuerpo.geometry.rotateX(Math.PI / 2); g.add(cuerpo);
            const visera = new TH.Mesh(new TH.CylinderGeometry(.1, .1, .12, 28, 1, true, -Math.PI * .6, Math.PI * 1.2), carcasa);
            visera.geometry.rotateX(Math.PI / 2); visera.position.z = .25; visera.material.side = TH.DoubleSide; g.add(visera);
            const lente = new TH.Mesh(new TH.CircleGeometry(.085, 28), encendido ? kit.emisivo(color, 7) : new TH.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: .08, clearcoat: 1 }));
            lente.position.z = .192; lente.userData.sinAO = true; g.add(lente);
            [-1, 1].forEach(s => g.add(caja(.016, .26, .05, carcasa, s * .125, .07, 0)));
            g.add(caja(.27, .016, .05, carcasa, 0, .2, 0));
            return g;
        }

        // ============================================
        const POWER = {
            etiqueta: 'Powerlifting',
            descripcion: 'Tarima de competición de powerlifting de ATR-GYM en 3D: plataforma de madera y goma, rack con 250 kg en discos calibrados, jueces, luces de decisión, marcador LED y zona de calentamiento.',
            fondo: 0x040506,
            niebla: [0x07080b, .026],
            exposicion: 1.05,
            bloom: .26,
            intensidadEntorno: .42,
            fondoEntorno: 0x060709,
            entorno: [
                [0, 6.3, 4.25, 5, .3, 0xfff1dc, 12],
                [0, 6.3, -4.25, 5, .3, 0xd7e4ff, 8],
                [0, 3.9, -4.4, 5.6, 3.15, 0x9fb6ff, 2.2, 0, 0],
                [0, 2.6, -4.8, 14, 4, 0x7A0C14, .35, 0, 0],
                [0, .48, 4.0, 8, .05, 0xE8E8ED, 8, 0, 0],
                [CAL.x, 6.2, CAL.z, 4, 4, 0xffe2c0, 3]
            ],
            planos: [
                { nombre: 'La tarima', titulo: 'La tarima de competición', texto: 'Plataforma reglamentaria de 4 × 4 m con centro de madera y laterales de goma, sobre una tarima de 8 m con su tira de luz. Así se prepara un campeonato.', cam: [6.6, 3.5, 12.2], mira: [0, 1.7, -.4], fov: 40, deriva: [-1.4, .2, .3] },
                { nombre: 'La barra', titulo: 'La barra cargada', texto: 'Barra de 20 kg con 250 kg en discos calibrados: cuatro de 25, uno de 10, uno de 2,5 y los cierres de competición. Moleteado, casquillos cromados y ganchos con protector.', cam: [1.85, 2.2, .75], mira: [.78, 1.98, -.55], fov: 34, deriva: [.12, .04, .18] },
                { nombre: 'Los jueces', titulo: 'Los tres jueces', texto: 'El central delante y los laterales a los lados, cada uno con su mando: blanco es válido, rojo es nulo. Con dos luces blancas el intento cuenta.', cam: [-1.7, 1.8, 8.5], mira: [.25, 1.3, 3.4], fov: 40, deriva: [.5, .05, .2] },
                { nombre: 'El marcador', titulo: 'Marcador y luces', texto: 'El marcador LED con el intento, el peso y el minuto para empezar. Las luces de decisión se encienden a la vez cuando han votado los tres jueces.', cam: [1.5, 2.25, 9.6], mira: [.9, 3.2, -4.4], fov: 36, deriva: [-.7, .1, .2] },
                { nombre: 'Calentamiento', titulo: 'Zona de calentamiento', texto: 'Plataforma de calentamiento, árboles de discos, magnesio, cinturón de palanca, rodilleras y rodillo. Aquí se hacen las series de aproximación antes de salir.', cam: [8.3, 1.7, 8.3], mira: [9.4, .55, 2.0], fov: 44, deriva: [-.6, .05, .1] }
            ],

            async construir({ THREE: TH, escena, kit, calidad, carga, respirar }) {
                const T = calidad.tex, az = generador(19);
                const vivo = {};
                const lotes = crearLotes(TH);
                const q = new TH.Quaternion(), e = new TH.Euler(), m4 = new TH.Matrix4(), pos = new TH.Vector3(), uno = new TH.Vector3(1, 1, 1), ejeY = new TH.Vector3(0, 1, 0);

                const negro = kit.pintura(0x121315, { rug: .48 });
                const cromo = kit.cromo();
                const carcasa = kit.pintura(0x0d0d0e, { rug: .55 });
                const telaNegra = kit.tela(0x0b0b0c, { escala: 8, sheen: 0x2a2a30 });
                const tapiz = kit.cuero(0x101011, { rug: .5, brillo: .4, escala: 3 });

                // ---------- el pabellón ----------
                carga('Levantando el pabellón…');
                const epo = texEpoxi(T);
                await respirar();
                const sx = SALA.x * 2, sz = SALA.z1 - SALA.z0;
                const suelo = malla(new TH.PlaneGeometry(sx, sz), new TH.MeshPhysicalMaterial({
                    map: repetida(epo.mapa, sx / 4, sz / 4), roughnessMap: repetida(epo.rug, sx / 4, sz / 4), normalMap: repetida(epo.normal, sx / 4, sz / 4), normalScale: new TH.Vector2(.25, .25),
                    roughness: .9, clearcoat: .9, clearcoatRoughness: .12
                }), { sombra: false });
                suelo.rotation.x = -Math.PI / 2; suelo.position.z = (SALA.z0 + SALA.z1) / 2; escena.add(suelo);
                await respirar();
                const bloque = texBloque(T);
                const muro = (w, h, x, y, z, ry) => {
                    const m = malla(new TH.PlaneGeometry(w, h), new TH.MeshStandardMaterial({ color: 0x1d1e21, roughness: .92, normalMap: repetida(bloque, w / 1.2, h / 1.2), normalScale: new TH.Vector2(.9, .9) }), { sombra: false });
                    m.position.set(x, y, z); m.rotation.y = ry; escena.add(m);
                };
                muro(sx, SALA.alto, 0, SALA.alto / 2, SALA.z0, 0); muro(sx, SALA.alto, 0, SALA.alto / 2, SALA.z1, Math.PI);
                muro(sz, SALA.alto, -SALA.x, SALA.alto / 2, (SALA.z0 + SALA.z1) / 2, Math.PI / 2); muro(sz, SALA.alto, SALA.x, SALA.alto / 2, (SALA.z0 + SALA.z1) / 2, -Math.PI / 2);
                const techo = malla(new TH.PlaneGeometry(sx, sz), kit.mate(0x08090a, .95), { sombra: false });
                techo.rotation.x = Math.PI / 2; techo.position.set(0, SALA.alto, (SALA.z0 + SALA.z1) / 2); escena.add(techo);
                // cerchas del techo
                const cercha = kit.pintura(0x1a1c1f, { rug: .6 });
                for (let z = -7; z <= 13; z += 5) escena.add(caja(sx, .5, .03, cercha, 0, SALA.alto - .3, z), caja(sx, .03, .22, cercha, 0, SALA.alto - .55, z));
                // estandartes y salidas de emergencia
                [[SALA.x - .02, 4.4, -2.6, 'POWER', 'TERUEL'], [SALA.x - .02, 4.4, 5.2, 'FUERZA', 'DESDE 2012']].forEach(([x, y, z, a, b]) => {
                    const m = malla(new TH.PlaneGeometry(1.5, 6), new TH.MeshStandardMaterial({ map: texEstandarte(a, b), roughness: .85 }), { sombra: false });
                    m.position.set(x, y, z); m.rotation.y = -Math.PI / 2; escena.add(m);
                });
                const salida = dibujar(256, 96, (x, w, h) => { x.fillStyle = '#0a9a4a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `800 44px ${TEXTO}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SALIDA', w * .6, h / 2 + 2); x.fillRect(22, 26, 30, 44); });
                [[SALA.x - .03, 2.7, 9.5, -Math.PI / 2], [-SALA.x + .03, 2.7, 10.5, Math.PI / 2]].forEach(([x, y, z, ry]) => {
                    const s = new TH.Mesh(new TH.PlaneGeometry(.5, .19), new TH.MeshBasicMaterial({ map: salida, color: new TH.Color(1.6, 1.6, 1.6) }));
                    s.position.set(x, y, z); s.rotation.y = ry; s.userData.sinAO = true; escena.add(s);
                });
                await respirar();

                // ---------- tarima y plataforma ----------
                carga('Montando la tarima…');
                const moqueta = kit.tela(0x1b1c1e, { escala: 24, fuerza: .5, rug: .95, sheen: 0x3a3b3f });
                const faldon = new TH.MeshStandardMaterial({ map: texFaldon(), roughness: .8, normalMap: repetida(kit.normales.tela(), 40, 3), normalScale: new TH.Vector2(.3, .3) });
                const lado = kit.tela(0x0a0a0a, { escala: 20, sheen: 0x222226 });
                const tarima = malla(new TH.BoxGeometry(TAR.w, TAR.h, TAR.d), [lado, lado, moqueta, lado, faldon, lado]);
                tarima.position.y = TAR.h / 2; escena.add(tarima);
                const led = new TH.Mesh(new TH.BoxGeometry(TAR.w, .022, .022), kit.emisivo(0xE8E8ED, 1.7)); led.position.set(0, TAR.h - .011, TAR.d / 2 + .012); led.userData.sinAO = true; escena.add(led);
                const ledBajo = new TH.Mesh(new TH.BoxGeometry(TAR.w, .012, .012), kit.emisivo(0xE8E8ED, 1.2)); ledBajo.position.set(0, .006, TAR.d / 2 + .02); ledBajo.userData.sinAO = true; escena.add(ledBajo);
                // peldaños por donde sube el atleta
                for (let i = 0; i < 2; i++) { const h = TAR.h * (i + 1) / 3; escena.add(caja(.36, h, 1.2, moqueta, -TAR.w / 2 - .18 - (1 - i) * .36, h / 2, 1.6)); }
                // plataforma: centro de madera y laterales de goma
                const mad = texMadera(T / 2, Math.round(T / 2 * 4 / 1.2));
                const madera = new TH.MeshPhysicalMaterial({ map: mad.mapa, normalMap: mad.normal, normalScale: new TH.Vector2(.5, .5), roughness: .42, clearcoat: .55, clearcoatRoughness: .3 });
                const cantoMad = new TH.MeshStandardMaterial({ color: 0x6b4a2a, roughness: .6 });
                const centro = malla(new TH.BoxGeometry(1.2, PLAT, 4), [cantoMad, cantoMad, madera, cantoMad, cantoMad, cantoMad]);
                centro.position.y = TAR.h + PLAT / 2; escena.add(centro);
                const gomaLat = new TH.MeshStandardMaterial({ map: texGomaLateral(), roughness: .9, normalMap: repetida(kit.normales.goma(), 2, 6), normalScale: new TH.Vector2(.6, .6) });
                const gomaCanto = kit.goma(0x0c0c0d);
                [-1, 1].forEach(s => { const l = malla(new TH.BoxGeometry(1.4, PLAT, 4), [gomaCanto, gomaCanto, gomaLat, gomaCanto, gomaCanto, gomaCanto]); l.position.set(s * 1.3, TAR.h + PLAT / 2, 0); escena.add(l); });
                const marco = kit.metal(0x2a2c2f, { rug: .4 });
                [[0, 2.012, 4.05, .024], [0, -2.012, 4.05, .024]].forEach(([x, z, w, d]) => escena.add(caja(w, PLAT + .004, d, marco, x, TAR.h + PLAT / 2, z)));
                [[2.012, 0], [-2.012, 0]].forEach(([x, z]) => escena.add(caja(.024, PLAT + .004, 4.05, marco, x, TAR.h + PLAT / 2, z)));
                await respirar();

                // ---------- rack de sentadilla ----------
                carga('Atornillando el rack…');
                const ALTO_M = 2.35, agu = texAgujeros(ALTO_M);
                const montanteMat = new TH.MeshPhysicalMaterial({ map: agu.mapa, normalMap: agu.normal, normalScale: new TH.Vector2(1, 1), roughness: .5, metalness: .25, clearcoat: .35, clearcoatRoughness: .5 });
                const uhmw = kit.plastico(0x0a0a0a, .55);
                const zM = BARRA.z - .08;
                const calco = dibujar(64, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.fillStyle = ORO; x.font = `900 44px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', 0, 2); x.restore(); });
                [-1, 1].forEach(s => {
                    const x = s * .6;
                    escena.add(caja(.075, ALTO_M, .075, montanteMat, x, SUP + ALTO_M / 2, zM));
                    escena.add(caja(.085, .012, .085, negro, x, SUP + ALTO_M + .006, zM));
                    const logo = new TH.Mesh(new TH.PlaneGeometry(.05, .2), new TH.MeshStandardMaterial({ map: calco, transparent: true, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 }));
                    logo.position.set(x, SUP + ALTO_M - .2, zM + .0377); escena.add(logo);
                    // pie largo, tacos de goma y tirante
                    escena.add(caja(.11, .1, 1.45, negro, x, SUP + .05, BARRA.z - .25));
                    [BARRA.z - .93, BARRA.z + .43].forEach(z => escena.add(caja(.12, .02, .12, kit.goma(0x080808), x, SUP + .01, z)));
                    const tirante = new TH.Mesh(new TH.BoxGeometry(.06, 1, .06), negro); tirante.castShadow = tirante.receiveShadow = true;
                    colocarEntre(tirante, v3(x, SUP + 1.05, zM - .03), v3(x, SUP + .1, BARRA.z - .88)); escena.add(tirante);
                    // gancho en J con su protector
                    const j = new TH.Group(); j.position.set(x, BARRA.y, BARRA.z);
                    j.add(caja(.09, .2, .012, negro, 0, -.035, -.036));
                    j.add(caja(.09, .012, .085, negro, 0, -.0215, .0005));
                    j.add(caja(.09, .055, .012, negro, 0, .0, .043));
                    j.add(caja(.08, .006, .07, uhmw, 0, -.0125, .002), caja(.08, .04, .005, uhmw, 0, .002, .0345));
                    const pasador = cilindro(.009, .009, .12, cromo, 12); pasador.rotation.x = Math.PI / 2; pasador.position.set(0, -.1, -.08); j.add(pasador);
                    escena.add(j);
                    // brazos de seguridad
                    const yS = SUP + 1.0, largo = 1.05;
                    escena.add(caja(.075, .075, largo, negro, x, yS, zM + .04 + largo / 2));
                    escena.add(caja(.065, .012, largo - .05, uhmw, x, yS + .0435, zM + .06 + largo / 2));
                    escena.add(caja(.08, .08, .01, kit.plastico(0x1a1a1a), x, yS, zM + .045 + largo));
                });
                escena.add(caja(1.31, .1, .1, negro, 0, SUP + .05, BARRA.z - .9));
                await respirar();

                // ---------- discos y barra ----------
                carga('Cargando 250 kg…');
                const geoD = {}, geoH = {}, matD = {};
                // cada disco pinta su textura: de uno en uno, con un respiro entre medias
                for (const [k, d] of Object.entries(DISCOS)) {
                    const t = texDisco(Number(k), d);
                    geoD[k] = geoDisco(TH, d.r, d.g); geoH[k] = geoCubo(TH, d.g);
                    matD[k] = d.cromo
                        ? new TH.MeshStandardMaterial({ map: t.mapa, normalMap: t.normal, metalness: 1, roughness: .14 })
                        : new TH.MeshPhysicalMaterial({ map: t.mapa, normalMap: t.normal, normalScale: new TH.Vector2(.9, .9), roughness: .38, metalness: .05, clearcoat: .85, clearcoatRoughness: .22 });
                    await respirar();
                }
                const cuboMat = kit.metal(0xd8dadc, { rug: .18, escala: 1 });
                // pone un disco con las letras mirando hacia +X girado ry (y rz), con una vuelta propia aleatoria
                const disco = (peso, x, y, z, ry = 0, rz = 0, base = null) => {
                    e.set(az() * 6.283, ry, rz, 'YZX'); q.setFromEuler(e);
                    m4.compose(pos.set(x, y, z), q, uno); if (base) m4.premultiply(base);
                    lotes.poner(geoD[peso], matD[peso], m4); lotes.poner(geoH[peso], cuboMat, m4);
                };
                const tapa = dibujar(128, 128, (x, w, h) => { x.fillStyle = '#1b1c1e'; x.fillRect(0, 0, w, h); x.fillStyle = ORO; x.font = `900 40px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, h / 2 - 12); x.fillStyle = '#ddd'; x.font = `700 20px ${MONO}`; x.fillText('20 KG', w / 2, h / 2 + 26); });
                const cargar = (cx, cy, cz, pesos, comp) => {
                    [1, -1].forEach(s => {
                        let xx = .687;
                        pesos.forEach(p => { const g = DISCOS[p].g; disco(p, cx + s * (xx + g / 2), cy, cz, s > 0 ? 0 : Math.PI); xx += g + .0012; });
                        if (comp) { const c = crearCierre(TH, kit); c.position.set(cx + s * (xx + .023), cy, cz); c.rotation.x = s > 0 ? .5 : -.4; escena.add(c); }
                        else { const p = new TH.Mesh(new TH.TorusGeometry(.03, .005, 8, 24), cromo); p.position.set(cx + s * (xx + .006), cy, cz); p.rotation.y = Math.PI / 2; escena.add(p); }
                    });
                    const b = crearBarra(TH, kit, tapa); b.position.set(cx, cy, cz); escena.add(b);
                };
                cargar(BARRA.x, BARRA.y, BARRA.z, [25, 25, 25, 25, 10, 2.5], true);
                // árboles de discos (los cargadores los tienen a mano detrás de la plataforma)
                const arbol = (x, y0, z, ry, carga) => {
                    const g = new TH.Group(); g.position.set(x, y0, z); g.rotation.y = ry; escena.add(g);
                    g.add(caja(.7, .05, .12, negro, 0, .025, 0), caja(.12, .05, .7, negro, 0, .025, 0), caja(.07, 1.5, .07, negro, 0, .78, 0));
                    const alturas = [.3, .3, .78, .78, 1.26, 1.26];
                    g.updateMatrixWorld(true);
                    carga.forEach((pesos, k) => {
                        const s = k % 2 ? 1 : -1, yy = alturas[k];
                        const p = cilindro(.024, .024, .28, cromo, 16); p.rotation.x = Math.PI / 2 - s * .06; p.position.set(0, yy, s * .17); g.add(p);
                        let zz = .05;
                        pesos.forEach(w => { const gg = DISCOS[w].g; disco(w, 0, yy + (DISCOS[w].r > .2 ? 0 : 0), s * (zz + gg / 2), s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, g.matrixWorld); zz += gg + .002; });
                    });
                };
                arbol(-3.35, TAR.h, -3.25, .25, [[25, 25, 25], [25, 25], [20, 20, 20], [20, 20], [15, 15], [10, 10, 10]]);
                arbol(3.35, TAR.h, -3.25, -.25, [[25, 25], [25, 25, 25], [20, 20], [15, 15, 15], [10, 10], [5, 5, 2.5]]);
                // discos de cambio apilados en una caja junto al árbol derecho
                const cajon = caja(.36, .12, .36, negro, 3.9, TAR.h + .06, -2.5); escena.add(cajon);
                [5, 5, 2.5, 2.5, 1.25, 1.25].reduce((y, w) => { disco(w, 3.9, y + DISCOS[w].g / 2, -2.5, 0, Math.PI / 2); return y + DISCOS[w].g + .001; }, TAR.h + .12);
                await respirar();

                // ---------- jueces ----------
                carga('Sentando a los jueces…');
                const patas = kit.metal(0xbfc3c6, { rug: .25 });
                const tablero = kit.pintura(0x18191b, { rug: .4 });
                const central = crearMesa(TH, 1.2, .62, telaNegra, tablero); central.position.set(0, 0, 5.55); central.rotation.y = Math.PI; escena.add(central);
                const sCentral = crearSilla(TH, kit, tapiz, patas); sCentral.position.set(.05, 0, 6.2); sCentral.rotation.y = Math.PI + .08; escena.add(sCentral);
                const mandoC = crearMando(TH, kit); mandoC.position.set(.12, .763, 5.62); mandoC.rotation.y = .1; escena.add(mandoC);
                escena.add(tubo(new TH.CatmullRomCurve3([v3(.12, .77, 5.56), v3(.4, .76, 5.4), v3(.58, .3, 5.3), v3(.6, .01, 5.0), v3(.9, .01, 4.2)]), .004, kit.goma(0x0a0a0a), 40, 6));
                const cartC = crearCartelito(TH, 'JUEZ CENTRAL'); cartC.position.set(-.3, .763, 5.4); escena.add(cartC);
                // hoja de intentos y bolígrafo
                const hoja = new TH.Mesh(new TH.PlaneGeometry(.21, .297), new TH.MeshStandardMaterial({ roughness: .9, map: dibujar(210, 297, (x, w, h) => { x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h); x.fillStyle = '#222'; x.font = `700 11px ${MONO}`; x.fillText('HOJA DE JUEZ · SQ', 12, 20); x.strokeStyle = '#999'; for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(12, 34 + i * 16); x.lineTo(w - 12, 34 + i * 16); x.stroke(); x.fillText(`${String(i + 1).padStart(2, '0')}   ${['✓', '✓', '✗', '✓'][i % 4]}`, 14, 30 + i * 16); } }) }));
                hoja.rotation.x = -Math.PI / 2; hoja.rotation.z = Math.PI - .15; hoja.position.set(.42, .7635, 5.55); escena.add(hoja);
                const boli = cilindro(.004, .004, .14, kit.plastico(0x1d4fb5, .3), 10); boli.rotation.z = Math.PI / 2; boli.rotation.y = .4; boli.position.set(.4, .768, 5.7); escena.add(boli);
                const agua = torno([[0, 0], [.032, 0], [.034, .01], [.034, .16], [.026, .19], [.014, .205], [0, .205]], kit.vidrio(0x9fd4ff, .5), 24); agua.position.set(-.48, .763, 5.6); escena.add(agua);
                // laterales sobre la tarima, girados hacia el centro de la plataforma
                [-1, 1].forEach(s => {
                    const x = s * 3.05, z = 1.55, ry = Math.atan2(-x, -z);
                    const silla = crearSilla(TH, kit, tapiz, patas); silla.position.set(x, TAR.h, z); silla.rotation.y = ry; escena.add(silla);
                    const mesita = new TH.Group(); mesita.position.set(x - Math.sin(ry) * -.55, TAR.h, z - Math.cos(ry) * -.55); mesita.rotation.y = ry;
                    mesita.add(cilindro(.2, .2, .025, tablero, 32)); mesita.children[0].position.y = .7;
                    const pie = cilindro(.02, .02, .7, patas, 10); pie.position.y = .35; mesita.add(pie);
                    const basePie = cilindro(.16, .18, .02, negro, 28); basePie.position.y = .01; mesita.add(basePie);
                    const mando = crearMando(TH, kit); mando.position.y = .713; mesita.add(mando);
                    escena.add(mesita);
                });
                // mesa del jurado con su portátil
                const jurado = crearMesa(TH, 2.2, .7, telaNegra, tablero); jurado.position.set(-4.6, 0, 6.7); jurado.rotation.y = Math.PI - .25; escena.add(jurado);
                [-.7, 0, .7].forEach((dx, i) => { const s = crearSilla(TH, kit, tapiz, patas); s.position.set(-4.6 + dx * Math.cos(.25) + .14, 0, 7.35 + dx * Math.sin(.25) * -1); s.rotation.y = Math.PI - .25 + (i - 1) * .1; escena.add(s); });
                const portatil = new TH.Group(); portatil.position.set(-4.5, .763, 6.65); portatil.rotation.y = Math.PI - .25;
                portatil.add(caja(.34, .018, .235, kit.metal(0x8d9196, { rug: .35 }), 0, .009, 0));
                const tapaP = new TH.Group(); tapaP.position.set(0, .018, -.115); tapaP.rotation.x = -.28;
                tapaP.add(caja(.34, .225, .007, kit.metal(0x8d9196, { rug: .35 }), 0, .1125, -.0035));
                const hojaCalc = dibujar(512, 320, (x, w, h) => {
                    x.fillStyle = '#f7f7f5'; x.fillRect(0, 0, w, h); x.fillStyle = '#1d6b3a'; x.fillRect(0, 0, w, 26);
                    x.fillStyle = '#fff'; x.font = `700 14px ${MONO}`; x.fillText('ATR CLASSIC · RESULTADOS · SQ / BP / DL', 10, 18);
                    x.font = `600 12px ${MONO}`;
                    for (let i = 0; i < 15; i++) { x.fillStyle = i % 2 ? '#eef0ec' : '#fff'; x.fillRect(0, 30 + i * 19, w, 19); x.fillStyle = '#333'; x.fillText(`${String(i + 1).padStart(2, '0')}  DORSAL ${String((i * 7) % 30 + 1).padStart(2, '0')}   ${200 + i * 7.5}   ${130 + i * 5}   ${230 + i * 10}`, 8, 44 + i * 19); x.fillStyle = i % 4 === 2 ? '#c3161c' : '#1d6b3a'; x.fillRect(w - 30, 34 + i * 19, 12, 12); }
                });
                const pant = new TH.Mesh(new TH.PlaneGeometry(.32, .2), new TH.MeshBasicMaterial({ map: hojaCalc, color: new TH.Color(.9, .9, .9) })); pant.position.set(0, .1125, .0001); pant.userData.sinAO = true; tapaP.add(pant);
                portatil.add(tapaP); escena.add(portatil);
                const cartJ = crearCartelito(TH, 'JURADO'); cartJ.position.set(-5.2, .763, 6.4); cartJ.rotation.y = -.25; escena.add(cartJ);
                await respirar();

                // ---------- luces de decisión ----------
                const torre = new TH.Group(); torre.position.set(3.55, TAR.h, 3.45); torre.rotation.y = -.18; escena.add(torre);
                torre.add(cilindro(.22, .24, .03, negro, 32)); torre.children[0].position.y = .015;
                const mastil = cilindro(.025, .025, 2.05, negro, 14); mastil.position.y = 1.04; torre.add(mastil);
                const cajaL = redondeada(.96, .34, .15, .03, negro); cajaL.position.y = 2.2; torre.add(cajaL);
                vivo.lentes = [-.3, 0, .3].map(x => {
                    const mat = new TH.MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: .12, clearcoat: 1, emissive: 0x000000 });
                    const lente = new TH.Mesh(new TH.CylinderGeometry(.115, .115, .03, 40), mat); lente.rotation.x = Math.PI / 2; lente.position.set(x, 2.2, .07); torre.add(lente);
                    const aro = new TH.Mesh(new TH.TorusGeometry(.118, .009, 8, 40), cromo); aro.position.set(x, 2.2, .085); torre.add(aro);
                    return mat;
                });
                const luzDec = new TH.PointLight(0xffffff, 0, 3, 2); luzDec.position.set(3.55, TAR.h + 2.2, 3.85); escena.add(luzDec); vivo.luzDec = luzDec;

                // ---------- fondo: cortinas, marcador y altavoces ----------
                carga('Colgando las cortinas…');
                const terciopelo = kit.tela(0x0a0a0c, { rug: .9, brillo: .8, escala: 34, fuerza: .4, sheen: 0x2d3040 });
                terciopelo.side = TH.DoubleSide;
                const cortina = (ancho, alto, pliegues, x, z, ry, semilla) => {
                    const geo = new TH.PlaneGeometry(ancho, alto, Math.round(pliegues * 10), 8), p = geo.attributes.position, r = generador(semilla), fases = [r() * 6, r() * 6];
                    for (let i = 0; i < p.count; i++) {
                        const u = p.getX(i) / ancho, y = p.getY(i) / alto + .5, f = u * pliegues * Math.PI * 2;
                        p.setZ(i, Math.sin(f + fases[0]) * .1 + Math.sin(f * 2.3 + fases[1]) * .025 + (1 - y) * Math.sin(f * .5) * .04);
                    }
                    geo.computeVertexNormals();
                    const m = malla(geo, terciopelo, { sombra: false }); m.position.set(x, alto / 2, z); m.rotation.y = ry; escena.add(m);
                    const barra = cilindro(.02, .02, ancho, negro, 8); barra.rotation.z = Math.PI / 2; barra.position.set(x, alto + .02, z); barra.rotation.y = ry; escena.add(barra);
                };
                cortina(15, 6.6, 26, 0, -4.85, 0, 3);
                cortina(3.2, 6.6, 6, -7.4, -3.3, Math.PI / 2, 5); cortina(3.2, 6.6, 6, 7.4, -3.3, -Math.PI / 2, 7);
                const marcador = crearMarcador(); vivo.marcador = marcador;
                escena.add(caja(5.78, 3.32, .12, negro, 0, 3.9, -4.51));
                const panel = new TH.Mesh(new TH.PlaneGeometry(5.6, 3.15), new TH.MeshBasicMaterial({ map: marcador.textura, color: new TH.Color(1.08, 1.08, 1.08) }));
                panel.position.set(0, 3.9, -4.444); panel.userData.sinAO = true; escena.add(panel);
                [-2.4, 2.4].forEach(x => escena.add(entre(v3(x, 5.56, -4.5), v3(x, TRUSS.y - TRUSS.l, -4.45), .004, cromo, 6)));
                const luzPantalla = new TH.RectAreaLight(0xbfd2ff, 1.6, 5.6, 3.15); luzPantalla.position.set(0, 3.9, -4.4); luzPantalla.lookAt(0, 3.9, 0); escena.add(luzPantalla);
                // altavoces line array colgados del truss delantero
                const rejilla = new TH.MeshStandardMaterial({ color: 0x0d0d0e, roughness: .7, metalness: .3, normalMap: repetida(kit.normales.goma(), 2, 1), normalScale: new TH.Vector2(1.4, 1.4) });
                [-1, 1].forEach(s => {
                    const g = new TH.Group(); g.position.set(s * (TRUSS.x1 - .3), TRUSS.y - .5, TRUSS.z1); g.rotation.y = -s * .25; escena.add(g);
                    for (let i = 0; i < 4; i++) {
                        const m = malla(new TH.BoxGeometry(.75, .26, .5), [carcasa, carcasa, carcasa, carcasa, rejilla, carcasa]);
                        m.position.set(0, -i * .265 - .13, -i * i * .012); m.rotation.x = i * .05; g.add(m);
                    }
                    g.add(caja(.8, .04, .5, negro, 0, .02, 0));
                });
                await respirar();

                // ---------- truss con focos ----------
                carga('Subiendo los focos…');
                const aluminio = kit.metal(0xc6cacd, { rug: .32, escala: 4 });
                const barraUno = new TH.CylinderGeometry(1, 1, 1, 10, 1, true);
                const tubos = [];
                const tramo = (a, b) => {
                    const d = b.clone().sub(a), L = d.length(); d.normalize();
                    const u = Math.abs(d.y) > .9 ? v3(1, 0, 0) : v3(0, 1, 0), w = new TH.Vector3().crossVectors(d, u).normalize(); u.crossVectors(w, d).normalize();
                    const h = TRUSS.l / 2, esq = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => u.clone().multiplyScalar(i * h).addScaledVector(w, j * h));
                    esq.forEach(o => tubos.push([a.clone().add(o), b.clone().add(o), .024]));
                    const n = Math.max(1, Math.round(L / TRUSS.l));
                    for (let c = 0; c < 4; c++) {
                        const o1 = esq[c], o2 = esq[(c + 1) % 4];
                        for (let k = 0; k < n; k++) {
                            const p0 = a.clone().addScaledVector(d, L * k / n), p1 = a.clone().addScaledVector(d, L * (k + 1) / n);
                            tubos.push(k % 2 ? [p0.clone().add(o2), p1.clone().add(o1), .009] : [p0.clone().add(o1), p1.clone().add(o2), .009]);
                        }
                    }
                };
                const yT = TRUSS.y - TRUSS.l / 2;
                tramo(v3(TRUSS.x0, yT, TRUSS.z1), v3(TRUSS.x1, yT, TRUSS.z1)); tramo(v3(TRUSS.x0, yT, TRUSS.z0), v3(TRUSS.x1, yT, TRUSS.z0));
                tramo(v3(TRUSS.x0, yT, TRUSS.z0), v3(TRUSS.x0, yT, TRUSS.z1)); tramo(v3(TRUSS.x1, yT, TRUSS.z0), v3(TRUSS.x1, yT, TRUSS.z1));
                [[TRUSS.x0, TRUSS.z0], [TRUSS.x1, TRUSS.z0], [TRUSS.x0, TRUSS.z1], [TRUSS.x1, TRUSS.z1]].forEach(([x, z]) => {
                    tramo(v3(x, .3, z), v3(x, TRUSS.y - TRUSS.l - .01, z));
                    escena.add(caja(TRUSS.l + .05, TRUSS.l + .05, TRUSS.l + .05, aluminio, x, yT, z), caja(.7, .02, .7, negro, x, .01, z), caja(.36, .3, .36, aluminio, x, .15, z));
                });
                const dirT = new TH.Vector3();
                tubos.forEach(([a, b, r]) => {
                    dirT.subVectors(b, a); const L = dirT.length();
                    q.setFromUnitVectors(ejeY, dirT.normalize()); m4.compose(pos.addVectors(a, b).multiplyScalar(.5), q, new TH.Vector3(r, L, r));
                    lotes.poner(barraUno, aluminio, m4);
                });
                // pancarta en la cara del truss delantero
                const pancarta = malla(new TH.PlaneGeometry(9.2, .72), new TH.MeshStandardMaterial({ map: texPancarta(), roughness: .8, side: TH.DoubleSide }), { sombra: false });
                pancarta.position.set(0, yT - .2, TRUSS.z1 + .16); escena.add(pancarta);
                // focos: los que dan luz de verdad y los que están apagados
                const objetivo = v3(0, SUP + .9, -.3);
                const focos = [
                    { p: v3(-1.6, TRUSS.y - .5, TRUSS.z1 - .2), mira: objetivo, color: 0xfff2e2, f: 470, a: .3, sombra: true },
                    { p: v3(1.6, TRUSS.y - .5, TRUSS.z1 - .2), mira: objetivo, color: 0xfff2e2, f: 470, a: .3, sombra: calidad.sombras > 1 },
                    { p: v3(-2.6, TRUSS.y - .5, TRUSS.z0 + .2), mira: v3(0, SUP, .9), color: 0xcfe0ff, f: 290, a: .34 },
                    { p: v3(2.6, TRUSS.y - .5, TRUSS.z0 + .2), mira: v3(0, SUP, .9), color: 0xcfe0ff, f: 290, a: .34 },
                    { p: v3(TRUSS.x1 - .2, TRUSS.y - .5, .2), mira: v3(0, SUP + 1.3, -.5), color: 0xffe6c8, f: 170, a: .26, sombra: calidad.sombras > 2 },
                    { p: v3(0, TRUSS.y - .5, TRUSS.z1 + .05), mira: v3(0, .76, 5.55), color: 0xfff0dc, f: 190, a: .4, haz: .04 }
                ];
                focos.forEach(f => {
                    const g = crearFoco(TH, kit, carcasa, f.color, true); g.position.copy(f.p); g.lookAt(f.mira); escena.add(g);
                    const l = new TH.SpotLight(f.color, f.f, 0, f.a, .55, 2); l.position.copy(f.p); l.target.position.copy(f.mira);
                    if (f.sombra && calidad.sombras) { l.castShadow = true; l.shadow.mapSize.set(calidad.sombraTam, calidad.sombraTam); l.shadow.bias = -.0002; l.shadow.normalBias = .02; l.shadow.radius = 5; l.shadow.camera.near = 2; l.shadow.camera.far = 16; }
                    escena.add(l, l.target);
                    const largo = f.p.distanceTo(f.mira);
                    escena.add(haz(f.p.clone().add(f.mira.clone().sub(f.p).normalize().multiplyScalar(.2)), f.mira, .08, Math.tan(f.a) * largo * .8, f.color, f.haz ?? .075));
                });
                [-3.6, -.5, .5, 3.6].forEach(x => { const g = crearFoco(TH, kit, carcasa, 0xffffff, false); g.position.set(x, TRUSS.y - .5, TRUSS.z1 - .2); g.lookAt(x * .3, 0, 0); escena.add(g); });
                [-1, 1].forEach(s => { const g = crearFoco(TH, kit, carcasa, 0xffffff, false); g.position.set(s * .8, TRUSS.y - .5, TRUSS.z0 + .2); g.lookAt(0, 0, 2); escena.add(g); g.clone(); });
                { const g = crearFoco(TH, kit, carcasa, 0xffffff, false); g.position.set(TRUSS.x0 + .2, TRUSS.y - .5, .2); g.lookAt(0, 1, 0); escena.add(g); }
                // luces que suben por las cortinas
                [-5.6, -3.4, 3.4, 5.6].forEach((x, i) => {
                    const base = new TH.Group(); base.position.set(x, 0, -4.35); escena.add(base);
                    base.add(caja(.26, .1, .2, carcasa, 0, .05, 0));
                    const lente = new TH.Mesh(new TH.PlaneGeometry(.2, .05), kit.emisivo(0xFF3A44, 4)); lente.rotation.x = -Math.PI / 2 - .5; lente.position.set(0, .1, -.04); lente.userData.sinAO = true; base.add(lente);
                    if (i % 3 === 0 || !calidad.movil) {
                        const l = new TH.SpotLight(0xC81E2A, 55, 0, .5, .8, 2); l.position.set(x, .12, -4.3); l.target.position.set(x, 4.2, -4.8); escena.add(l, l.target);
                    }
                });
                await respirar();

                // ---------- grada ----------
                carga('Colocando la grada…');
                const peldano = kit.pintura(0x1c1e21, { rug: .75 });
                const asientoG = mergeGeometries([new RoundedBoxGeometry(.42, .05, .4, 2, .02).translate(0, .43, 0), new RoundedBoxGeometry(.42, .34, .04, 2, .018).translate(0, .64, -.19).rotateX(-.06)]);
                asientoG.rotateY(Math.PI / 2);
                const butaca = kit.plastico(0x232529, .45), butacaGris = kit.plastico(0x2e3136, .45);
                for (let f = 0; f < 6; f++) {
                    const x = -8.2 - f * .85, h = .42 * (f + 1);
                    escena.add(caja(.85, h, 13, peldano, x, h / 2, 2.2));
                    for (let k = 0; k < 22; k++) {
                        const z = -4 + k * .56; m4.makeTranslation(x + .05, h, z);
                        lotes.poner(asientoG, (f * 7 + k * 3) % 5 === 0 ? butacaGris : butaca, m4);
                    }
                }
                escena.add(entre(v3(-7.75, 1.0, -4.3), v3(-7.75, 1.0, 8.7), .022, cromo, 10));
                for (let z = -4.3; z <= 8.8; z += 2.6) escena.add(entre(v3(-7.75, .42, z), v3(-7.75, 1.0, z), .02, cromo, 8));
                // cables por el suelo hasta las torres
                const cable = kit.goma(0x070707);
                [[TRUSS.x1, TRUSS.z1, 7.5, 9], [TRUSS.x0, TRUSS.z1, -6.8, 10.5]].forEach(([x, z, x2, z2]) => escena.add(tubo(new TH.CatmullRomCurve3([v3(x, .25, z), v3(x + .1, .012, z + .4), v3((x + x2) / 2, .012, (z + z2) / 2 + .3), v3(x2, .012, z2)]), .011, cable, 48, 6)));
                await respirar();

                // ---------- calentamiento ----------
                carga('Preparando el calentamiento…');
                const losa = kit.goma(0x161617, { escala: 1 });
                for (let x = 6.2; x < 12.6; x += 1) for (let z = -2.4; z < 7.4; z += 1) { const l = redondeada(.99, .02, .99, .005, losa); l.position.set(x + .5, .01, z + .5); l.castShadow = false; escena.add(l); }
                const madCal = new TH.MeshPhysicalMaterial({ map: repetida(mad.mapa, 1, .6), normalMap: repetida(mad.normal, 1, .6), roughness: .48, clearcoat: .4, clearcoatRoughness: .35 });
                escena.add(malla(new TH.BoxGeometry(1.0, .04, 2.4), [cantoMad, cantoMad, madCal, cantoMad, cantoMad, cantoMad])); escena.children.at(-1).position.set(CAL.x, .04, CAL.z);
                [-1, 1].forEach(s => { const l = malla(new TH.BoxGeometry(.7, .04, 2.4), [gomaCanto, gomaCanto, kit.goma(0x0e0e0f, { escala: 2 }), gomaCanto, gomaCanto, gomaCanto]); l.position.set(CAL.x + s * .85, .04, CAL.z); escena.add(l); });
                // barra de peso muerto en el suelo
                cargar(CAL.x, .06 + DISCOS[25].r, CAL.z + .25, [25, 25, 15], false);
                arbol(11.5, .02, -.4, -Math.PI / 2, [[25, 25], [20, 20, 20], [15, 15], [10, 10, 10], [5, 5, 5], [2.5, 2.5, 1.25, 1.25]]);
                arbol(11.5, .02, 3.6, -Math.PI / 2, [[25, 25, 25], [25, 20], [20, 20], [15], [10, 10], [5, 2.5]]);
                // magnesio
                const mg = new TH.Group(); mg.position.set(6.95, .02, 3.7); escena.add(mg);
                mg.add(torno([[0, 0], [.2, 0], [.21, .02], [.07, .05], [.04, .08], [.04, .84], [.07, .87], [0, .87]], negro, 32));
                mg.add(torno([[0, .86], [.1, .86], [.26, .95], [.31, 1.04], [.325, 1.06], [.305, 1.065], [.25, .985], [.1, .905], [0, .905]], kit.metal(0xb9bdc1, { rug: .3, escala: 2 }), 48));
                const tiza = kit.mate(0xd2cfc6, 1);
                const lecho = new TH.Mesh(new TH.CircleGeometry(.235, 40), tiza); lecho.rotation.x = -Math.PI / 2; lecho.position.y = .965; lecho.receiveShadow = true; mg.add(lecho);
                for (let i = 0; i < 5; i++) { const b = redondeada(.1, .05, .065, .012, tiza); b.position.set((az() - .5) * .28, .985, (az() - .5) * .28); b.rotation.set((az() - .5) * .5, az() * 3, (az() - .5) * .4); mg.add(b); }
                for (let i = 0; i < 6; i++) { const m = new TH.Mesh(new TH.SphereGeometry(.05, 14, 8), tiza); m.scale.set(1, .32, 1); m.position.set((az() - .5) * .3, .97, (az() - .5) * .3); mg.add(m); }
                escena.add(polvo([[6.95, 1.25, 3.7, .9, 1, .9]], calidad.movil ? 14 : 26, 0x8c8c8c, .022));
                // banco con cinturón, rodilleras, muñequeras y bolsa
                const banco = new TH.Group(); banco.position.set(10.5, 0, 4.5); escena.add(banco);
                banco.add(redondeada(1.2, .09, .3, .03, tapiz)); banco.children[0].position.y = .44;
                [-.5, .5].forEach(x => { banco.add(caja(.06, .39, .06, negro, x, .2, 0), caja(.06, .05, .45, negro, x, .025, 0)); });
                banco.add(caja(1.0, .05, .06, negro, 0, .37, 0));
                const cuero = kit.cuero(0x141414, { rug: .45, brillo: .5, escala: 4 });
                const cint = new TH.Mesh(new TH.CylinderGeometry(.2, .2, .1, 48, 1, true), cuero); cint.material.side = TH.DoubleSide; cint.scale.set(1.35, 1, 1); cint.position.set(-.2, .54, 0); cint.castShadow = true; banco.add(cint);
                const hebilla = caja(.1, .055, .03, cromo, -.2 + .27, .54, .02); banco.add(hebilla);
                const letrasC = new TH.Mesh(new TH.PlaneGeometry(.18, .07), new TH.MeshStandardMaterial({ transparent: true, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2, map: dibujar(256, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = ORO; x.font = `900 62px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, h / 2 + 3); }) }));
                letrasC.position.set(-.32, .54, .203); banco.add(letrasC);
                const neopreno = kit.tela(0x0d0d0d, { escala: 3, sheen: 0x333333 });
                [[.25, .07], [.42, -.06]].forEach(([x, z]) => { const r = new TH.Mesh(new TH.CylinderGeometry(.075, .07, .3, 32, 1, true), neopreno); r.material.side = TH.DoubleSide; r.rotation.z = Math.PI / 2; r.rotation.y = .3; r.position.set(x, .565, z); r.castShadow = true; banco.add(r); });
                [[.15, .3, 0x111111], [.32, .3, 0xa8141c]].forEach(([x, z, c]) => { const w = cilindro(.035, .035, .08, kit.tela(c, { escala: 2 }), 20); w.rotation.x = Math.PI / 2; w.position.set(x - .55, .03, z + .05); banco.add(w); });
                const bolsa = redondeada(.62, .3, .3, .12, kit.tela(0x141414, { escala: 5 })); bolsa.position.set(9.75, .17, 5.55); bolsa.rotation.y = .5; escena.add(bolsa);
                const rodillo = cilindro(.075, .075, .45, kit.goma(0x22324a, { escala: 1 }), 32); rodillo.rotation.z = Math.PI / 2; rodillo.rotation.y = .7; rodillo.position.set(7.7, .095, 5.1); escena.add(rodillo);
                const shaker = torno([[0, 0], [.045, 0], [.05, .02], [.05, .17], [.045, .2], [0, .2]], kit.plastico(0x111111, .35), 24); shaker.position.set(10.05, .02, 5.15); escena.add(shaker);
                await respirar();

                // ---------- luz de sala ----------
                carga('Encendiendo el pabellón…');
                escena.add(new TH.HemisphereLight(0xc9d4ff, 0x0b0b0c, .16));
                [[8.4, 1.0], [10.2, 3.2]].forEach(([x, z], i) => lampara(kit, x, 6.4, z, { techo: SALA.alto, fuerza: 520, angulo: .62, color: 0xffe6c8, sombra: i === 0 && calidad.sombras > 2, calidad, haces: false, objetivo: v3(x, 0, z) }).forEach(o => escena.add(o)));
                escena.add(polvo([[0, 1.4, 0, 4.5, 4.6, 4.5], [CAL.x, 1, CAL.z, 3, 4, 3]], Math.round(calidad.polvo * .45), 0xb9b4aa, .03));

                lotes.cerrar(escena);

                return {
                    actualizar(t) {
                        const m = momento(t);
                        marcador.actualizar(m);
                        const on = m.luces;
                        vivo.lentes.forEach((mat, i) => {
                            const v = on ? on[i] : null;
                            mat.emissive.set(v === 'b' ? 0xffffff : v === 'r' ? 0xff1a10 : 0x000000);
                            mat.emissiveIntensity = v ? 1.5 : 0;
                        });
                        const blancas = on ? on.filter(l => l === 'b').length : 0;
                        vivo.luzDec.intensity = on ? 1.2 : 0;
                        vivo.luzDec.color.set(blancas >= 2 ? 0xffffff : 0xff3020);
                    }
                };
            }
        };

        montarEscena('powerlifting', POWER);
    }).catch(err => console.error(err));
})();
