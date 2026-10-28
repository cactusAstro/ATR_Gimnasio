// ============================================
// ATR-GYM — el escenario de culturismo en 3D
// Teatro preparado para el campeonato: escenario negro brillante que
// refleja las luces, telón de terciopelo, cartel luminoso ATR CLASSIC,
// cabezas móviles barriendo la tarima, mesa de jueces, trofeos con base
// de mármol y el backstage con su espejo de bombillas.
// ============================================
// Necesita atr-3d-motor.js cargado antes en la página.
(function () {
    'use strict';
    window.ATR3D.motor.then(({ THREE, montarEscena, dibujar, ruido, normalDe, grisDe, textura, repetida, generador, lienzo, caja, redondeada, torno, cilindro, entre, tubo, malla, haz, polvo, lampara, mergeGeometries, RoundedBoxGeometry, Reflector, v3, FUENTE, MONO, TEXTO }) => {
        const ESC = { x0: -8, x1: 8, z0: -6.5, z1: 1.6, y: 1.1 };      // escenario a 1,1 m del suelo
        const BOCA = { x: 6.4, y: 8.0, z: 1.4 };                          // boca del escenario (embocadura)
        const SALA = { x: 14, z1: 20, alto: 10 };
        const BACK = { x0: 8.6, x1: 14, z0: -6.5, z1: 1.3 };            // backstage
        const ORO = '#E2B35A';

        // ---------- texturas ----------
        function texCartel() {
            const W = 2048, H = 640;
            const pinta = (x, mascara) => {
                if (!mascara) {
                    const g = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * .55);
                    g.addColorStop(0, '#2a1d0c'); g.addColorStop(.6, '#0d0905'); g.addColorStop(1, '#040302');
                    x.fillStyle = g; x.fillRect(0, 0, W, H);
                    x.strokeStyle = 'rgba(226,179,90,.55)'; x.lineWidth = 4; x.strokeRect(26, 26, W - 52, H - 52);
                    x.strokeStyle = 'rgba(226,179,90,.25)'; x.lineWidth = 2; x.strokeRect(44, 44, W - 88, H - 88);
                } else { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); }
                x.textAlign = 'center'; x.textBaseline = 'middle';
                const oro = x.createLinearGradient(0, 120, 0, 400);
                oro.addColorStop(0, '#fff3c4'); oro.addColorStop(.45, '#f0c867'); oro.addColorStop(.55, '#b07d28'); oro.addColorStop(1, '#f6d784');
                x.font = `900 250px ${FUENTE}`;
                if (!mascara) { x.shadowColor = 'rgba(255,190,90,.6)'; x.shadowBlur = 40; }
                x.fillStyle = mascara ? '#fff' : oro; x.fillText('ATR CLASSIC', W / 2, 262);
                x.shadowBlur = 0;
                if (mascara) return;
                x.fillStyle = '#f2ece0'; x.font = `800 58px ${FUENTE}`; x.fillText('CULTURISMO · FITNESS · CLASSIC PHYSIQUE', W / 2, 452);
                x.fillStyle = ORO; x.font = `700 36px ${MONO}`; x.fillText('CAMPEONATO DE ARAGÓN · TERUEL 2026', W / 2, 540);
                x.fillRect(W / 2 - 520, 372, 1040, 3);
            };
            const c = lienzo(W, H), m = lienzo(W, H);
            pinta(c.getContext('2d'), false); pinta(m.getContext('2d'), true);
            return { mapa: textura(c), mascara: textura(m, { color: false }) };
        }
        function texFleco() {
            return dibujar(256, 64, (x, w, h) => {
                x.clearRect(0, 0, w, h);
                x.fillStyle = '#d6a64c'; x.fillRect(0, 0, w, 12);
                for (let i = 0; i < w; i += 4) { const l = h * (.75 + Math.sin(i * .7) * .08); const g = x.createLinearGradient(0, 0, 0, l); g.addColorStop(0, '#f2cd78'); g.addColorStop(1, '#8a6224'); x.fillStyle = g; x.fillRect(i, 10, 2.4, l - 10); }
            });
        }
        function texAlfombra() {
            return dibujar(256, 256, (x, w, h) => {
                x.fillStyle = '#2b0b10'; x.fillRect(0, 0, w, h);
                const az = generador(13);
                for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${az() < .5 ? '0,0,0' : '120,40,40'},${az() * .18})`; x.fillRect(az() * w, az() * h, 1.5, 1.5); }
                x.strokeStyle = 'rgba(214,166,76,.32)'; x.lineWidth = 3;
                [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]].forEach(([cx, cy]) => { x.beginPath(); x.moveTo(cx, cy - 34); x.lineTo(cx + 34, cy); x.lineTo(cx, cy + 34); x.lineTo(cx - 34, cy); x.closePath(); x.stroke(); });
                x.fillStyle = 'rgba(214,166,76,.3)'; [[w / 2, 0], [0, h / 2], [w, h / 2], [w / 2, h]].forEach(([cx, cy]) => { x.beginPath(); x.arc(cx, cy, 6, 0, 6.283); x.fill(); });
            });
        }
        function texMarmol(S, semilla = 41) {
            const n = ruido(S, S, { escala: 3, octavas: 6, semilla }), c = lienzo(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
            for (let i = 0; i < S * S; i++) {
                const px = i % S, py = (i / S) | 0;
                const v = Math.abs(Math.sin((px / S * 2 + py / S * 1 + n[i] * 5) * Math.PI));
                const vena = Math.pow(1 - v, 16) + Math.pow(1 - Math.abs(Math.sin((px / S * 5 - py / S * 3 + n[i] * 9) * Math.PI)), 40) * .5;
                const b = .045 + n[i] * .05;
                d[i * 4] = Math.min(255, (b + vena * .78) * 255); d[i * 4 + 1] = Math.min(255, (b + vena * .58) * 255); d[i * 4 + 2] = Math.min(255, (b + vena * .28) * 255); d[i * 4 + 3] = 255;
            }
            x.putImageData(img, 0, 0);
            return textura(c);
        }
        function texPlaca(linea1, linea2) {
            return dibujar(256, 96, (x, w, h) => {
                const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#a8792c'); g.addColorStop(.5, '#f3d488'); g.addColorStop(1, '#9a6c22');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(60,40,10,.7)'; x.lineWidth = 3; x.strokeRect(6, 6, w - 12, h - 12);
                x.fillStyle = '#2a1c08'; x.textAlign = 'center'; x.textBaseline = 'middle';
                x.font = `900 30px ${FUENTE}`; x.fillText(linea1, w / 2, 38); x.font = `700 17px ${MONO}`; x.fillText(linea2, w / 2, 68);
            });
        }
        function texHormigon(T) {
            const W = T / 2, n = ruido(W, W, { escala: 4, octavas: 5, semilla: 17 }), c = lienzo(W, W), x = c.getContext('2d'), img = x.createImageData(W, W), d = img.data;
            for (let i = 0; i < W * W; i++) { const v = .3 + (n[i] - .5) * .18; d[i * 4] = v * 255; d[i * 4 + 1] = v * 252; d[i * 4 + 2] = v * 246; d[i * 4 + 3] = 255; }
            x.putImageData(img, 0, 0);
            return { mapa: textura(c), rug: grisDe(n, W, W, { min: .45, max: .9 }) };
        }
        function texBloque(T) {
            const W = T / 2, filas = 6, alt = new Float32Array(W * W), n = ruido(W, W, { escala: 16, octavas: 3, semilla: 3 }), rh = W / filas, bw = W / 2;
            for (let y = 0; y < W; y++) {
                const fila = Math.floor(y / rh), desp = fila % 2 ? bw / 2 : 0, ly = y - fila * rh;
                for (let px = 0; px < W; px++) { const lx = (px + desp) % bw; alt[y * W + px] = (lx < 2 || ly < 2) ? .1 : .7 + n[y * W + px] * .3; }
            }
            return normalDe(alt, W, W, 2.2);
        }
        function texBata() {
            return dibujar(1024, 512, (x, w, h) => {
                x.fillStyle = '#0c0b0a'; x.fillRect(0, 0, w, h);
                x.fillStyle = ORO; x.fillRect(0, h - 26, w, 10); x.fillRect(0, h - 10, w, 4);
                // la espalda queda en el centro de la textura
                x.textAlign = 'center'; x.textBaseline = 'middle';
                const g = x.createLinearGradient(0, 120, 0, 260); g.addColorStop(0, '#fbe3a0'); g.addColorStop(.5, '#c99335'); g.addColorStop(1, '#f2cf7d');
                x.fillStyle = g; x.font = `900 120px ${FUENTE}`; x.fillText('ATR', w / 2, 190);
                x.font = `800 34px ${FUENTE}`; x.fillText('CLASSIC TEAM', w / 2, 270);
                x.font = `700 22px ${MONO}`; x.fillStyle = '#d8d2c4'; x.fillText('Nº 14 · TERUEL', w / 2, 316);
            });
        }

        // ---------- piezas ----------
        // trofeo: base de mármol, placa dorada, copa con asas y remate
        function crearTrofeo(TH, kit, { alto = 1, metal, marmol, placa }) {
            const g = new TH.Group(), s = alto;
            const base = malla(new RoundedBoxGeometry(.3 * s, .16 * s, .3 * s, 2, .01 * s), new TH.MeshPhysicalMaterial({ map: marmol, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }));
            base.position.y = .08 * s; g.add(base);
            const escalon = malla(new RoundedBoxGeometry(.22 * s, .07 * s, .22 * s, 2, .008 * s), base.material); escalon.position.y = .195 * s; g.add(escalon);
            if (placa) {
                const p = new TH.Mesh(new TH.PlaneGeometry(.2 * s, .075 * s), new TH.MeshStandardMaterial({ map: placa, metalness: .85, roughness: .25 }));
                p.position.set(0, .08 * s, .1501 * s); g.add(p);
            }
            const perfil = [[0, .23], [.11, .23], [.115, .24], [.09, .26], [.04, .29], [.025, .33], [.025, .45], [.05, .47], [.05, .49], [.03, .51], [.03, .55], [.06, .58], [.12, .64], [.16, .72], [.175, .8], [.18, .86], [.19, .87], [.19, .88], [.175, .88], [.165, .8], [.15, .72], [.11, .65], [.05, .6], [0, .59]];
            const copa = torno(perfil.map(([r, y]) => [r * s, y * s]), metal, 64); g.add(copa);
            [-1, 1].forEach(k => {
                const asa = new TH.Mesh(new TH.TorusGeometry(.085 * s, .011 * s, 10, 28, Math.PI * 1.1), metal);
                asa.position.set(k * .175 * s, .74 * s, 0); asa.rotation.z = k > 0 ? -Math.PI * .55 : Math.PI * 1.55; asa.castShadow = true; g.add(asa);
            });
            const tapa = torno([[0, .9], [.16, .9], [.17, .91], [.12, .94], [.05, .97], [.03, 1.0], [.02, 1.04], [0, 1.05]].map(([r, y]) => [r * s, y * s]), metal, 48); g.add(tapa);
            const estrella = new TH.Mesh(new TH.OctahedronGeometry(.05 * s, 0), metal); estrella.position.y = 1.1 * s; estrella.scale.set(1, 1.4, .35); g.add(estrella);
            return g;
        }
        function crearSilla(TH, tapiz, patas) {
            const g = new TH.Group();
            const asiento = redondeada(.46, .07, .44, .03, tapiz); asiento.position.y = .47;
            const respaldo = redondeada(.46, .44, .06, .03, tapiz); respaldo.position.set(0, .82, -.21); respaldo.rotation.x = -.1;
            g.add(asiento, respaldo);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(entre(v3(sx * .2, .44, sz * .19), v3(sx * .21, 0, sz * .2), .011, patas, 8)));
            [-1, 1].forEach(s => g.add(entre(v3(s * .2, .45, -.2), v3(s * .2, .66, -.225), .011, patas, 8)));
            return g;
        }
        function crearCartelito(TH, texto) {
            const tex = dibujar(256, 96, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.fillStyle = ORO; x.font = `800 32px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, w / 2, h / 2 + 2); x.fillRect(0, h - 8, w, 8); });
            const g = new TH.Group(), mat = new TH.MeshStandardMaterial({ map: tex, roughness: .5, side: TH.DoubleSide });
            [-1, 1].forEach(s => { const p = malla(new TH.PlaneGeometry(.24, .09), mat); p.position.set(0, .042, s * .015); p.rotation.x = s * .33; if (s < 0) p.rotation.y = Math.PI; g.add(p); });
            return g;
        }
        // cabeza móvil colgada (el foco apunta con +Z)
        function crearCabeza(TH, kit, carcasa, color) {
            const base = new TH.Group();
            base.add(redondeada(.36, .13, .3, .03, carcasa));
            const yugo = new TH.Group(); yugo.position.y = -.07; base.add(yugo);
            yugo.add(caja(.34, .03, .1, carcasa, 0, -.015, 0));
            [-1, 1].forEach(s => yugo.add(caja(.035, .28, .11, carcasa, s * .17, -.16, 0)));
            const cabeza = new TH.Group(); cabeza.position.y = -.24; yugo.add(cabeza);
            const cuerpo = torno([[0, -.17], [.1, -.17], [.13, -.12], [.13, .1], [.11, .16], [0, .16]], carcasa, 28);
            cuerpo.geometry.rotateX(Math.PI / 2); cabeza.add(cuerpo);
            const lente = new TH.Mesh(new TH.CircleGeometry(.095, 32), kit.emisivo(color, 6)); lente.position.z = .162; lente.userData.sinAO = true; cabeza.add(lente);
            const aro = new TH.Mesh(new TH.TorusGeometry(.1, .01, 8, 32), kit.cromo()); aro.position.z = .16; cabeza.add(aro);
            return { base, yugo, cabeza };
        }
        // bata de satén colgada de su percha
        function crearBata(TH, kit, mat) {
            const g = new TH.Group();
            const geo = new TH.CylinderGeometry(.2, .32, 1.15, 64, 24, true), p = geo.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
                const v = (y + .575) / 1.15, a = Math.atan2(x, z), r = Math.hypot(x, z);
                const pl = Math.sin(a * 9 + 1.3) * .014 * (1.2 - v) + Math.sin(a * 4) * .01 * (1 - v);
                const k = (r + pl) / r; x *= k; z *= k * .5;
                if (v > .9) y -= Math.pow(Math.abs(x) / .2, 2) * .07 * (v - .9) / .1;
                p.setXYZ(i, x, y, z);
            }
            geo.computeVertexNormals();
            const cuerpo = malla(geo, mat); cuerpo.position.y = -.62; g.add(cuerpo);
            [-1, 1].forEach(s => {
                const m = malla(new TH.CylinderGeometry(.07, .1, .62, 28, 1, true), mat);
                m.position.set(s * .25, -.36, 0); m.rotation.z = s * .22; g.add(m);
            });
            const cuello = new TH.Mesh(new TH.TorusGeometry(.12, .03, 10, 32), mat); cuello.rotation.x = Math.PI / 2; cuello.scale.set(1, .55, 1); cuello.position.y = -.04; g.add(cuello);
            const percha = tubo(new TH.CatmullRomCurve3([v3(-.21, -.07, 0), v3(-.1, -.01, 0), v3(0, .02, 0), v3(.1, -.01, 0), v3(.21, -.07, 0)]), .008, kit.cromo(), 24, 6); g.add(percha);
            const gancho = new TH.Mesh(new TH.TorusGeometry(.03, .004, 6, 16, Math.PI * 1.3), kit.cromo()); gancho.position.y = .06; g.add(gancho);
            return g;
        }

        // ============================================
        const CULTURISMO = {
            etiqueta: 'Culturismo',
            descripcion: 'Escenario de culturismo de ATR-GYM en 3D: teatro con telón de terciopelo, suelo negro brillante, cartel luminoso, cabezas móviles, mesa de jueces, trofeos y backstage con espejo de bombillas.',
            fondo: 0x050404,
            niebla: [0x0a0706, .022],
            exposicion: 1.0,
            bloom: .36,
            intensidadEntorno: .4,
            fondoEntorno: 0x070505,
            entorno: [
                [0, 4.4, -6.1, 9, 2.8, 0xffcf85, 3.2, 0, 0],
                [0, 7.0, 5.5, 8, .4, 0xffe2b8, 10],
                [0, 7.3, -.8, 8, .4, 0xffe8c8, 6],
                [11.5, 1.6, -6.0, 1.8, 1.1, 0xffe2b0, 6, 0, 0],
                [0, 1.0, 1.62, 16, .05, 0xffc46a, 6, 0, 0],
                [-5, 4, 7, 4, 3, 0xffd9a8, 2.2, 0, 0]
            ],
            planos: [
                { nombre: 'El escenario', titulo: 'El escenario', texto: 'Suelo negro brillante, telón de terciopelo y el cartel ATR CLASSIC al fondo. La línea numerada marca dónde se coloca cada atleta en la comparación.', cam: [2.2, 2.5, 13.2], mira: [0, 3.0, -2.5], fov: 42, deriva: [-1.8, .2, 0] },
                { nombre: 'Las luces', titulo: 'Luces de competición', texto: 'Luz frontal cálida para que se vea cada músculo, contras desde atrás para el contorno y cabezas móviles barriendo la tarima entre categorías.', cam: [2.4, 1.85, -4.7], mira: [-1.0, 5.4, 2.0], fov: 56, deriva: [-.8, .1, .2] },
                { nombre: 'Los jueces', titulo: 'La mesa de jueces', texto: 'Siete jueces con su hoja de puntuación, a pie de escenario. Comparan simetría, proporción, definición y presentación en las poses obligatorias.', cam: [-3.9, 1.65, 7.4], mira: [-.4, 1.15, 3.6], fov: 40, deriva: [.6, .05, -.2] },
                { nombre: 'Los trofeos', titulo: 'Los trofeos', texto: 'Copas doradas sobre mármol negro, medallas y el cinturón del absoluto. Lo que se lleva quien mejor sube al escenario.', cam: [2.55, 2.3, 2.2], mira: [4.3, 2.0, -.9], fov: 36, deriva: [.3, .05, .25] },
                { nombre: 'Backstage', titulo: 'El backstage', texto: 'Espejo de camerino, bronceador, bata, mancuernas para el bombeo y la carpa del moreno. Aquí se prepara todo lo que luego se ve sobre la tarima.', cam: [9.5, 1.7, .5], mira: [12.6, 1.25, -3.6], fov: 52, deriva: [.3, .05, .3] }
            ],

            async construir({ THREE: TH, escena, kit, calidad, carga, respirar }) {
                const T = calidad.tex, az = generador(23);
                const vivo = { cabezas: [] };
                const m4 = new TH.Matrix4();

                const negro = kit.pintura(0x0f0f10, { rug: .45 });
                const carcasa = kit.pintura(0x0c0c0d, { rug: .5 });
                const oro = kit.oro();
                const cromo = kit.cromo();
                const terciopelo = kit.tela(0x4a060c, { rug: .86, brillo: 1, escala: 30, fuerza: .4, sheen: 0xc8342c });
                terciopelo.side = TH.DoubleSide;
                const terciopeloNegro = kit.tela(0x090909, { rug: .9, brillo: .7, escala: 30, fuerza: .4, sheen: 0x2c2a30 });
                terciopeloNegro.side = TH.DoubleSide;
                const tapiz = kit.cuero(0x0f0d0c, { rug: .5, brillo: .4, escala: 3 });
                const patas = kit.metal(0xc9a45c, { rug: .3 });

                // ---------- la sala ----------
                carga('Abriendo el teatro…');
                const alfombra = new TH.MeshStandardMaterial({ map: repetida(texAlfombra(), 14, 12), roughness: .95, normalMap: repetida(kit.normales.rizo(), 30, 26), normalScale: new TH.Vector2(.5, .5) });
                const suelo = malla(new TH.PlaneGeometry(SALA.x * 2, SALA.z1 - BOCA.z), alfombra, { sombra: false });
                suelo.rotation.x = -Math.PI / 2; suelo.position.z = (SALA.z1 + BOCA.z) / 2; escena.add(suelo);
                const bloque = texBloque(T);
                const pared = (w, h, x, y, z, ry, color = 0x1a1314) => {
                    const m = malla(new TH.PlaneGeometry(w, h), new TH.MeshStandardMaterial({ color, roughness: .9, normalMap: repetida(bloque, w / 1.6, h / 1.6), normalScale: new TH.Vector2(.35, .35) }), { sombra: false });
                    m.position.set(x, y, z); m.rotation.y = ry; escena.add(m); return m;
                };
                const largoSala = SALA.z1 - BOCA.z;
                pared(largoSala, SALA.alto, -SALA.x, SALA.alto / 2, (SALA.z1 + BOCA.z) / 2, Math.PI / 2); pared(largoSala, SALA.alto, SALA.x, SALA.alto / 2, (SALA.z1 + BOCA.z) / 2, -Math.PI / 2);
                pared(SALA.x * 2, SALA.alto, 0, SALA.alto / 2, SALA.z1, Math.PI);
                const techo = malla(new TH.PlaneGeometry(SALA.x * 2, largoSala + 8), kit.mate(0x0a0808, .95), { sombra: false }); techo.rotation.x = Math.PI / 2; techo.position.set(0, SALA.alto, (SALA.z1 + BOCA.z) / 2 - 4); escena.add(techo);
                // apliques dorados en las paredes laterales
                const tulipa = kit.emisivo(0xffd29a, 2.2);
                [-1, 1].forEach(s => [5, 10, 15].forEach(z => {
                    const g = new TH.Group(); g.position.set(s * (SALA.x - .02), 3.4, z); g.rotation.y = -s * Math.PI / 2; escena.add(g);
                    g.add(caja(.22, .5, .03, oro, 0, 0, .015));
                    const t = torno([[0, -.14], [.07, -.12], [.1, 0], [.07, .12], [0, .14]], tulipa, 24, { sombra: false }); t.position.z = .14; t.userData.sinAO = true; g.add(t);
                }));
                // embocadura: el marco del escenario con moldura dorada
                const muroBoca = kit.pintura(0x140d0d, { rug: .7 });
                escena.add(caja(SALA.x - BOCA.x, SALA.alto, .5, muroBoca, -(SALA.x + BOCA.x) / 2, SALA.alto / 2, BOCA.z - .25), caja(SALA.x - BOCA.x, SALA.alto, .5, muroBoca, (SALA.x + BOCA.x) / 2, SALA.alto / 2, BOCA.z - .25));
                escena.add(caja(BOCA.x * 2, SALA.alto - BOCA.y, .5, muroBoca, 0, (SALA.alto + BOCA.y) / 2, BOCA.z - .25));
                [[-BOCA.x - .09, (BOCA.y + ESC.y) / 2, .18, BOCA.y - ESC.y + .18], [BOCA.x + .09, (BOCA.y + ESC.y) / 2, .18, BOCA.y - ESC.y + .18]].forEach(([x, y, w, h]) => {
                    escena.add(caja(w, h, .1, oro, x, y, BOCA.z + .03)); escena.add(caja(.05, h, .12, oro, x + Math.sign(x) * .16, y, BOCA.z + .03));
                });
                escena.add(caja(BOCA.x * 2 + .36, .18, .1, oro, 0, BOCA.y + .09, BOCA.z + .03), caja(BOCA.x * 2 + .5, .05, .12, oro, 0, BOCA.y + .28, BOCA.z + .03));
                const salida = dibujar(256, 96, (x, w, h) => { x.fillStyle = '#0a9a4a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `800 44px ${TEXTO}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SALIDA', w * .6, h / 2 + 2); x.fillRect(22, 26, 30, 44); });
                [[-SALA.x + .03, 2.8, 18, Math.PI / 2], [SALA.x - .03, 2.8, 18, -Math.PI / 2]].forEach(([x, y, z, ry]) => { const s = new TH.Mesh(new TH.PlaneGeometry(.5, .19), new TH.MeshBasicMaterial({ map: salida, color: new TH.Color(1.5, 1.5, 1.5) })); s.position.set(x, y, z); s.rotation.y = ry; s.userData.sinAO = true; escena.add(s); });
                await respirar();

                // ---------- el escenario ----------
                carga('Barnizando el escenario…');
                const anchoE = ESC.x1 - ESC.x0, fondoE = ESC.z1 - ESC.z0;
                const frente = new TH.MeshStandardMaterial({ color: 0x0a0909, roughness: .6, normalMap: repetida(kit.normales.tela(), 40, 3), normalScale: new TH.Vector2(.2, .2) });
                const brillante = new TH.MeshPhysicalMaterial({ color: 0x050505, roughness: .16, clearcoat: 1, clearcoatRoughness: .04, normalMap: repetida(kit.normales.fino(), 6, 3), normalScale: new TH.Vector2(.04, .04) });
                const tablas = malla(new TH.BoxGeometry(anchoE, ESC.y, fondoE), [frente, frente, brillante, frente, frente, frente]);
                tablas.position.set((ESC.x0 + ESC.x1) / 2, ESC.y / 2, (ESC.z0 + ESC.z1) / 2); escena.add(tablas);
                if (calidad.reflejos) {
                    const refl = new Reflector(new TH.PlaneGeometry(BOCA.x * 2 + 1, fondoE), { textureWidth: 1024, textureHeight: 512, color: 0x5c5650, clipBias: .003, multisample: calidad.muestras });
                    refl.material.transparent = true; refl.material.blending = TH.AdditiveBlending; refl.material.depthWrite = false;
                    refl.rotation.x = -Math.PI / 2; refl.position.set(0, ESC.y + .001, (ESC.z0 + ESC.z1) / 2); refl.userData.sinAO = true; refl.renderOrder = 2;
                    escena.add(refl);
                }
                // canto dorado, tira de luz y escalera central
                escena.add(caja(anchoE, .035, .035, oro, 0, ESC.y - .017, ESC.z1 + .017));
                const ledOro = kit.emisivo(0xffc46a, 1.6);
                const led = new TH.Mesh(new TH.BoxGeometry(anchoE, .016, .016), ledOro); led.position.set(0, ESC.y - .06, ESC.z1 + .01); led.userData.sinAO = true; escena.add(led);
                for (let i = 0; i < 5; i++) {
                    const h = ESC.y * (5 - i) / 5 - ESC.y / 5 / 2, z = ESC.z1 + .17 + i * .3;
                    const top = ESC.y * (4 - i) / 5;
                    if (top <= 0) break;
                    escena.add(caja(2.6, top, .3, frente, 0, top / 2, z));
                    escena.add(caja(2.6, .012, .3, brillante, 0, top + .006, z));
                    const l = new TH.Mesh(new TH.BoxGeometry(2.6, .01, .01), ledOro); l.position.set(0, top - .02, z + .152); l.userData.sinAO = true; escena.add(l);
                    void h;
                }
                [-1, 1].forEach(s => escena.add(entre(v3(s * 1.36, ESC.y + .9, ESC.z1 - .05), v3(s * 1.36, .95, ESC.z1 + 1.3), .022, oro, 12), entre(v3(s * 1.36, .95, ESC.z1 + 1.3), v3(s * 1.36, 0, ESC.z1 + 1.3), .022, oro, 12)));
                // línea de comparación numerada y la marca de pose
                const cinta = new TH.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 });
                const lineaZ = -2.9;
                const linea = new TH.Mesh(new TH.PlaneGeometry(10, .05), cinta); linea.rotation.x = -Math.PI / 2; linea.position.set(0, ESC.y + .004, lineaZ); escena.add(linea);
                for (let i = 0; i < 10; i++) {
                    const n = new TH.Mesh(new TH.PlaneGeometry(.26, .2), new TH.MeshStandardMaterial({ roughness: .7, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, map: dibujar(128, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#e9e4d8'; x.font = `900 72px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), w / 2, h / 2 + 4); }) }));
                    n.rotation.x = -Math.PI / 2; n.position.set(-4.5 + i, ESC.y + .004, lineaZ + .22); escena.add(n);
                }
                const marca = new TH.Mesh(new TH.RingGeometry(.52, .56, 64), new TH.MeshStandardMaterial({ color: 0xd6a64c, metalness: .6, roughness: .3, polygonOffset: true, polygonOffsetFactor: -2 }));
                marca.rotation.x = -Math.PI / 2; marca.position.set(0, ESC.y + .004, -.9); escena.add(marca);
                const marcaLogo = new TH.Mesh(new TH.PlaneGeometry(.7, .26), new TH.MeshStandardMaterial({ transparent: true, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2, map: dibujar(256, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(214,166,76,.9)'; x.font = `900 70px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, h / 2 + 4); }) }));
                marcaLogo.rotation.x = -Math.PI / 2; marcaLogo.position.set(0, ESC.y + .004, -.9); escena.add(marcaLogo);
                await respirar();

                // ---------- telón, bambalina y cortinas ----------
                carga('Colgando el telón…');
                const cortina = (ancho, alto, pliegues, mat, { atado = null, amp = .1 } = {}, semilla = 1) => {
                    const geo = new TH.PlaneGeometry(ancho, alto, Math.round(pliegues * 10), 40), p = geo.attributes.position, r = generador(semilla), f0 = r() * 6;
                    for (let i = 0; i < p.count; i++) {
                        let x = p.getX(i); const y = p.getY(i), v = y / alto + .5, f = (x / ancho + .5) * pliegues * Math.PI * 2;
                        let k = 1;
                        if (atado) {
                            // recogido con un alzapaño: se estrecha hacia el lado y vuelve a abrirse abajo
                            const d = v - atado.v; k = d > 0 ? lerpN(atado.k, 1, Math.pow(d / (1 - atado.v), .7)) : lerpN(atado.k, atado.abajo, Math.pow(-d / atado.v, .8));
                            x = atado.lado * ancho / 2 + (x - atado.lado * ancho / 2) * k;
                        }
                        p.setXYZ(i, x, y, (Math.sin(f + f0) * amp + Math.sin(f * 2.7 + f0) * amp * .22) * (atado ? .6 + .6 / k : 1));
                    }
                    geo.computeVertexNormals();
                    return malla(geo, mat, { sombra: false });
                };
                const lerpN = (a, b, t) => a + (b - a) * t;
                // fondo negro y cartel luminoso
                const fondo = cortina(anchoE + 2, 9, 34, terciopeloNegro, {}, 3); fondo.position.set(0, ESC.y + 4.5, ESC.z0 + .25); escena.add(fondo);
                const cart = texCartel();
                escena.add(caja(9.3, 3.0, .2, oro, 0, ESC.y + 3.4, ESC.z0 + .5));
                const panel = new TH.Mesh(new TH.PlaneGeometry(9, 2.8), new TH.MeshBasicMaterial({ map: cart.mapa, color: new TH.Color(1.15, 1.15, 1.15) }));
                panel.position.set(0, ESC.y + 3.4, ESC.z0 + .61); panel.userData.sinAO = true; escena.add(panel);
                const barrido = new TH.Mesh(new TH.PlaneGeometry(9, 2.8), new TH.ShaderMaterial({
                    uniforms: { uMask: { value: cart.mascara }, uTiempo: { value: 0 } },
                    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                    fragmentShader: 'uniform sampler2D uMask; uniform float uTiempo; varying vec2 vUv; void main(){ float m = texture2D(uMask, vUv).r; float x = fract(uTiempo * .07) * 1.8 - .4; float b = smoothstep(.09, 0.0, abs(vUv.x - x - (vUv.y - .5) * .2)); vec3 c = vec3(1.0, .82, .5) * m * b * 1.4; gl_FragColor = vec4(c, 1.0); }',
                    transparent: true, blending: TH.AdditiveBlending, depthWrite: false
                }));
                barrido.position.set(0, ESC.y + 3.4, ESC.z0 + .615); barrido.userData.sinAO = true; escena.add(barrido);
                const luzCartel = new TH.RectAreaLight(0xffc98a, 3, 9, 2.8); luzCartel.position.set(0, ESC.y + 3.4, ESC.z0 + .62); luzCartel.lookAt(0, ESC.y + 3.4, 5); escena.add(luzCartel);
                // columnas de luz a los lados del cartel
                [-1, 1].forEach(s => { const c = new TH.Mesh(new TH.BoxGeometry(.06, 4.6, .06), kit.emisivo(0xffc46a, 1.8)); c.position.set(s * 5.2, ESC.y + 2.3, ESC.z0 + .5); c.userData.sinAO = true; escena.add(c); });
                // patas negras de los laterales
                [-1, 1].forEach(s => [-4.8, -2.4].forEach((z, i) => { const p = cortina(2.0, 8.2, 5, terciopeloNegro, {}, 9 + i); p.position.set(s * 6.9, ESC.y + 4.1, z); p.rotation.y = s * Math.PI / 2 * .9; escena.add(p); }));
                // telón rojo recogido con alzapaños dorados
                [-1, 1].forEach((s, i) => {
                    const p = cortina(3.4, BOCA.y - ESC.y + .2, 9, terciopelo, { atado: { v: .26, k: .38, abajo: .62, lado: s }, amp: .09 }, 21 + i);
                    p.position.set(s * (BOCA.x - 1.7), ESC.y + (BOCA.y - ESC.y + .2) / 2 - .02, BOCA.z - .3); escena.add(p);
                    const ya = ESC.y + (BOCA.y - ESC.y) * .26;
                    const cuerda = tubo(new TH.CatmullRomCurve3([v3(s * (BOCA.x + .02), ya + .05, BOCA.z - .55), v3(s * (BOCA.x - .55), ya - .04, BOCA.z - .08), v3(s * (BOCA.x - 1.25), ya, BOCA.z - .25), v3(s * (BOCA.x - .9), ya + .02, BOCA.z - .55)]), .028, oro, 40, 10);
                    escena.add(cuerda);
                    const borla = torno([[0, 0], [.03, -.02], [.06, -.12], [.07, -.24], [0, -.25]], kit.metal(0xd6a64c, { rug: .5 }), 20); borla.position.set(s * (BOCA.x - .55), ya - .06, BOCA.z - .06); escena.add(borla);
                });
                // bambalina con fleco
                const bamb = cortina(BOCA.x * 2 + .6, 1.4, 30, terciopelo, { amp: .07 }, 31); bamb.position.set(0, BOCA.y - .7, BOCA.z - .18); escena.add(bamb);
                const fleco = new TH.Mesh(new TH.PlaneGeometry(BOCA.x * 2 + .6, .2), new TH.MeshStandardMaterial({ map: repetida(texFleco(), 40, 1), alphaTest: .5, metalness: .7, roughness: .35, side: TH.DoubleSide }));
                fleco.position.set(0, BOCA.y - 1.48, BOCA.z - .08); escena.add(fleco);
                escena.add(caja(BOCA.x * 2 + .6, .06, .06, oro, 0, BOCA.y - 1.38, BOCA.z - .08));
                await respirar();

                // ---------- truss y cabezas móviles ----------
                carga('Programando las luces…');
                const aluminio = kit.metal(0x2a2b2e, { rug: .4, escala: 4 });
                const barraUno = new TH.CylinderGeometry(1, 1, 1, 8, 1, true), tubos = [], L = .29;
                const tramoT = (a, b) => {
                    const d = b.clone().sub(a), largo = d.length(); d.normalize();
                    const u = v3(0, 1, 0), w = new TH.Vector3().crossVectors(d, u).normalize(); u.crossVectors(w, d).normalize();
                    const esq = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => u.clone().multiplyScalar(i * L / 2).addScaledVector(w, j * L / 2));
                    esq.forEach(o => tubos.push([a.clone().add(o), b.clone().add(o), .022]));
                    const n = Math.round(largo / L);
                    for (let c = 0; c < 4; c++) for (let k = 0; k < n; k++) {
                        const p0 = a.clone().addScaledVector(d, largo * k / n), p1 = a.clone().addScaledVector(d, largo * (k + 1) / n), o1 = esq[c], o2 = esq[(c + 1) % 4];
                        tubos.push(k % 2 ? [p0.clone().add(o2), p1.clone().add(o1), .008] : [p0.clone().add(o1), p1.clone().add(o2), .008]);
                    }
                };
                const yT = 7.4;
                [-.6, -4.6].forEach(z => tramoT(v3(-6.2, yT, z), v3(6.2, yT, z)));
                tramoT(v3(-7, 6.8, 5.6), v3(7, 6.8, 5.6));                      // puente de luces sobre la sala
                const dirT = new TH.Vector3(), q = new TH.Quaternion(), pos = new TH.Vector3(), ejeY = v3(0, 1, 0);
                const im = new TH.InstancedMesh(barraUno, aluminio, tubos.length);
                tubos.forEach(([a, b, r], i) => { dirT.subVectors(b, a); const largo = dirT.length(); q.setFromUnitVectors(ejeY, dirT.normalize()); m4.compose(pos.addVectors(a, b).multiplyScalar(.5), q, new TH.Vector3(r, largo, r)); im.setMatrixAt(i, m4); });
                im.castShadow = true; im.computeBoundingSphere(); escena.add(im);
                [[-5.5, -.6], [5.5, -.6], [-5.5, -4.6], [5.5, -4.6], [-6, 5.6], [6, 5.6]].forEach(([x, z]) => escena.add(entre(v3(x, z > 0 ? 6.95 : yT + .15, z), v3(x, SALA.alto, z), .006, cromo, 6)));
                // focos fijos: frontales cálidos, contras y laterales
                const foco = (p, mira, color, fuerza, ang, { sombra = false, fuerzaHaz = .06, visible = true } = {}) => {
                    const g = new TH.Group();
                    const cuerpo = torno([[0, -.2], [.085, -.2], [.1, -.16], [.11, .1], [.095, .16], [0, .16]], carcasa, 24); cuerpo.geometry.rotateX(Math.PI / 2); g.add(cuerpo);
                    const lente = new TH.Mesh(new TH.CircleGeometry(.08, 24), kit.emisivo(color, 6)); lente.position.z = .162; lente.userData.sinAO = true; g.add(lente);
                    [-1, 1].forEach(s => g.add(caja(.016, .24, .05, carcasa, s * .125, .06, 0)));
                    g.position.copy(p); g.lookAt(mira); escena.add(g);
                    if (!visible) return;
                    const l = new TH.SpotLight(color, fuerza, 0, ang, .6, 2); l.position.copy(p); l.target.position.copy(mira);
                    if (sombra && calidad.sombras) { l.castShadow = true; l.shadow.mapSize.set(calidad.sombraTam, calidad.sombraTam); l.shadow.bias = -.0002; l.shadow.normalBias = .02; l.shadow.radius = 5; l.shadow.camera.near = 2; l.shadow.camera.far = 20; }
                    escena.add(l, l.target);
                    if (fuerzaHaz) escena.add(haz(p.clone().add(mira.clone().sub(p).normalize().multiplyScalar(.18)), mira, .08, Math.tan(ang) * p.distanceTo(mira) * .8, color, fuerzaHaz));
                };
                const centro = v3(0, ESC.y + .2, -1.4);
                foco(v3(-2.4, 6.5, 5.6), centro, 0xffd9a8, 1700, .36, { sombra: true });
                foco(v3(2.4, 6.5, 5.6), centro, 0xffd9a8, 1700, .36, { sombra: calidad.sombras > 1 });
                foco(v3(0, 6.5, 5.6), v3(0, ESC.y + .5, -2.9), 0xffe6c4, calidad.movil ? 0 : 1100, .42, { visible: !calidad.movil });
                foco(v3(-3, yT - .45, -4.45), v3(.5, ESC.y, -.4), 0xbcd0ff, 600, .38, { fuerzaHaz: .07 });
                foco(v3(3, yT - .45, -4.45), v3(-.5, ESC.y, -.4), 0xbcd0ff, 600, .38, { fuerzaHaz: .07, visible: !calidad.movil });
                [-4.5, 4.5].forEach(x => foco(v3(x, 6.5, 5.6), v3(x * .4, ESC.y, -2), 0xffffff, 0, .3, { visible: false }));
                // cabezas móviles en el truss delantero del escenario
                const coloresMH = [0xffc46a, 0xfff1d8, 0xffc46a, 0xfff1d8];
                [-4.2, -1.4, 1.4, 4.2].forEach((x, i) => {
                    const c = crearCabeza(TH, kit, carcasa, coloresMH[i]);
                    c.base.position.set(x, yT - .22, -.6); escena.add(c.base);
                    const real = !calidad.movil || i === 1 || i === 2;
                    let luz = null, beam = null;
                    if (real) {
                        luz = new TH.SpotLight(coloresMH[i], 900, 0, .14, .45, 2); escena.add(luz, luz.target);
                        beam = haz(v3(0, 0, 0), v3(0, 0, 7.4), .06, .62, coloresMH[i], .42);
                        escena.add(beam);
                    }
                    vivo.cabezas.push({ ...c, luz, beam, fase: i * 1.7, x, objetivo: new TH.Vector3() });
                });
                // luz cálida que sube por el telón
                [-1, 1].forEach(s => {
                    const l = new TH.SpotLight(0xff5a36, 90, 0, .5, .8, 2); l.position.set(s * (BOCA.x - .5), ESC.y + .1, BOCA.z - .75); l.target.position.set(s * (BOCA.x - 1.2), ESC.y + 4.5, BOCA.z - .3); escena.add(l, l.target);
                    escena.add(caja(.24, .1, .2, carcasa, s * (BOCA.x - .5), ESC.y + .05, BOCA.z - .75));
                    // lavado cálido de la bambalina
                    if (!calidad.movil) { const b = new TH.SpotLight(0xffc89a, 260, 0, .6, .7, 2); b.position.set(s * 3.5, 6.5, 5.6); b.target.position.set(s * 3.5, 7.1, BOCA.z - .2); escena.add(b, b.target); }
                });
                await respirar();

                // ---------- mesa de jueces ----------
                carga('Preparando la mesa de jueces…');
                const ZJ = 4.6;
                const mantel = kit.tela(0x0b0b0b, { escala: 10, sheen: 0x2a2a2a });
                const tablero = kit.pintura(0x15110d, { rug: .35 });
                escena.add(caja(7.4, .035, .7, tablero, 0, .745, ZJ));
                escena.add(caja(7.42, .72, .012, mantel, 0, .37, ZJ - .356), caja(.012, .72, .7, mantel, 3.71, .37, ZJ), caja(.012, .72, .7, mantel, -3.71, .37, ZJ));
                const banda = new TH.Mesh(new TH.PlaneGeometry(7.42, .14), new TH.MeshStandardMaterial({ roughness: .5, metalness: .4, map: dibujar(2048, 40, (x, w, h) => { x.fillStyle = '#c9963f'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1208'; x.font = `800 26px ${FUENTE}`; x.textBaseline = 'middle'; for (let px = 20; px < w; px += 360) x.fillText('ATR CLASSIC · JUECES', px, h / 2 + 1); }) }));
                banda.position.set(0, .62, ZJ - .363); banda.rotation.y = Math.PI; escena.add(banda);
                const hojaTex = dibujar(210, 297, (x, w, h) => {
                    x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h); x.fillStyle = '#222'; x.font = `700 11px ${MONO}`; x.fillText('HOJA DE PUNTUACIÓN', 12, 18); x.fillText('CLASSIC PHYSIQUE · RONDA 1', 12, 32);
                    x.strokeStyle = '#999';
                    for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(12, 44 + i * 17); x.lineTo(w - 12, 44 + i * 17); x.stroke(); x.fillText(`${String(i + 1).padStart(2, '0')}  ·  ${(i * 3 + 7) % 10 + 1}`, 14, 40 + i * 17); }
                });
                const hojaMat = new TH.MeshStandardMaterial({ map: hojaTex, roughness: .9 });
                const tabla = kit.pintura(0x2a2016, { rug: .5 });
                for (let i = 0; i < 7; i++) {
                    const x = -3 + i;
                    const silla = crearSilla(TH, tapiz, patas); silla.position.set(x, 0, ZJ + .62); silla.rotation.y = Math.PI + (az() - .5) * .12; escena.add(silla);
                    const clip = caja(.23, .008, .32, tabla, x + .05, .767, ZJ + .05); clip.rotation.y = (az() - .5) * .3; escena.add(clip);
                    const hoja = new TH.Mesh(new TH.PlaneGeometry(.21, .297), hojaMat); hoja.rotation.x = -Math.PI / 2; hoja.rotation.z = Math.PI + clip.rotation.y; hoja.position.set(x + .05, .772, ZJ + .05); escena.add(hoja);
                    const pinza = caja(.08, .014, .03, cromo, x + .05, .778, ZJ - .1); pinza.rotation.y = clip.rotation.y; escena.add(pinza);
                    const boli = cilindro(.004, .004, .14, kit.plastico(0x111111, .3), 10); boli.rotation.z = Math.PI / 2; boli.rotation.y = .3 + az(); boli.position.set(x + .3, .768, ZJ + .1); escena.add(boli);
                    const cart = crearCartelito(TH, `JUEZ ${i + 1}`); cart.position.set(x, .762, ZJ - .24); escena.add(cart);
                    const botella = torno([[0, 0], [.032, 0], [.034, .01], [.034, .16], [.026, .19], [.014, .205], [0, .205]], kit.vidrio(0x9fd4ff, .5), 20); botella.position.set(x - .32, .763, ZJ - .05); escena.add(botella);
                }
                // flexos con su luz cálida
                [-2.5, 0, 2.5].forEach(x => {
                    const g = new TH.Group(); g.position.set(x + .45, .763, ZJ - .12); escena.add(g);
                    g.add(cilindro(.07, .08, .02, negro, 24));
                    const brazo = entre(v3(0, .02, 0), v3(0, .32, .1), .008, oro, 8); g.add(brazo);
                    const pantalla = torno([[.015, .02], [.04, .0], [.075, -.07], [.08, -.08], [.07, -.075], [.035, -.005], [.012, .012]], oro, 24); pantalla.position.set(0, .34, .16); pantalla.rotation.x = .6; g.add(pantalla);
                    const bombilla = new TH.Mesh(new TH.SphereGeometry(.022, 12, 8), kit.emisivo(0xffd6a0, 3)); bombilla.position.set(0, .31, .19); g.add(bombilla);
                });
                const luzMesa = new TH.RectAreaLight(0xffd2a0, 3.2, 7.2, .5); luzMesa.position.set(0, 1.25, ZJ + .1); luzMesa.lookAt(0, 0, ZJ + .1); escena.add(luzMesa);
                // micrófono del juez principal
                const mic = new TH.Group(); mic.position.set(.12, .763, ZJ - .02); escena.add(mic);
                mic.add(cilindro(.05, .06, .015, negro, 20));
                mic.add(tubo(new TH.CatmullRomCurve3([v3(0, .01, 0), v3(0, .12, 0), v3(0, .22, .04), v3(0, .26, .12)]), .005, negro, 24, 6));
                const capsula = cilindro(.012, .014, .05, negro, 12); capsula.position.set(0, .27, .14); capsula.rotation.x = 1.2; mic.add(capsula);
                await respirar();

                // ---------- butacas ----------
                carga('Colocando las butacas…');
                const butacaTela = kit.tela(0x5a0a12, { rug: .85, brillo: 1, escala: 3, sheen: 0xc8443a });
                const butacaMadera = kit.pintura(0x1a120c, { rug: .45 });
                const gTela = mergeGeometries([
                    new RoundedBoxGeometry(.5, .1, .46, 2, .035).translate(0, .45, -.02),
                    new RoundedBoxGeometry(.5, .64, .1, 2, .04).rotateX(.12).translate(0, .84, .22)
                ]);
                const gMadera = mergeGeometries([
                    new TH.BoxGeometry(.05, .24, .5).translate(.28, .62, .02), new TH.BoxGeometry(.05, .24, .5).translate(-.28, .62, .02),
                    new TH.BoxGeometry(.5, .5, .04).translate(0, .25, .3), new TH.BoxGeometry(.52, .03, .1).translate(0, 1.17, .28)
                ]);
                const filas = [];
                for (let f = 0; f < 9; f++) for (let k = 0; k < 32; k++) {
                    const lado = k < 16 ? -1 : 1, j = k % 16, x = lado * (1.1 + j * .58), z = 7.6 + f * 1.0;
                    filas.push([x, z]);
                }
                const tela = new TH.InstancedMesh(gTela, butacaTela, filas.length), madera = new TH.InstancedMesh(gMadera, butacaMadera, filas.length);
                filas.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); tela.setMatrixAt(i, m4); madera.setMatrixAt(i, m4); });
                [tela, madera].forEach(o => { o.castShadow = o.receiveShadow = true; o.computeBoundingSphere(); escena.add(o); });
                await respirar();

                // ---------- trofeos ----------
                carga('Puliendo los trofeos…');
                const mesaT = new TH.Group(); mesaT.position.set(4.4, ESC.y, -.9); mesaT.rotation.y = -.2; escena.add(mesaT);
                mesaT.add(caja(2.3, .04, .8, tablero, 0, .82, 0));
                mesaT.add(caja(2.32, .8, .012, mantel, 0, .41, .405), caja(.012, .8, .8, mantel, 1.155, .41, 0), caja(.012, .8, .8, mantel, -1.155, .41, 0));
                const faldonT = new TH.Mesh(new TH.PlaneGeometry(2.32, .16), new TH.MeshStandardMaterial({ roughness: .5, metalness: .4, map: dibujar(1024, 64, (x, w, h) => { x.fillStyle = '#c9963f'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1208'; x.font = `800 34px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR CLASSIC · CAMPEONES 2026', w / 2, h / 2 + 2); }) })); faldonT.position.set(0, .7, .413); mesaT.add(faldonT);
                const marmol = texMarmol(T / 4 | 0 || 128, 41);
                const plata = new TH.MeshStandardMaterial({ color: 0xe4e6e8, metalness: 1, roughness: .14 });
                const bronce = new TH.MeshPhysicalMaterial({ color: 0xc07a3a, metalness: 1, roughness: .22, clearcoat: .4 });
                const trofeos = [
                    { x: 0, z: -.12, alto: .95, metal: oro, placa: texPlaca('ABSOLUTO', 'ATR CLASSIC 2026') },
                    { x: -.55, z: -.1, alto: .72, metal: oro, placa: texPlaca('1.º', 'CLASSIC PHYSIQUE') },
                    { x: .55, z: -.1, alto: .72, metal: oro, placa: texPlaca('1.º', 'CULTURISMO') },
                    { x: -.95, z: .05, alto: .55, metal: plata, placa: texPlaca('2.º', 'CLASSIC PHYSIQUE') },
                    { x: .95, z: .05, alto: .55, metal: bronce, placa: texPlaca('3.º', 'CULTURISMO') },
                    { x: -.32, z: .22, alto: .42, metal: plata, placa: texPlaca('2.º', 'FITNESS') },
                    { x: .32, z: .22, alto: .42, metal: bronce, placa: texPlaca('3.º', 'FITNESS') }
                ];
                trofeos.forEach(t => { const g = crearTrofeo(TH, kit, { alto: t.alto, metal: t.metal, marmol, placa: t.placa }); g.position.set(t.x, .84, t.z); g.rotation.y = (az() - .5) * .3; mesaT.add(g); });
                // cinturón del absoluto
                const cinto = new TH.Group(); cinto.position.set(0, .845, .3); mesaT.add(cinto);
                cinto.add(redondeada(1.0, .012, .11, .005, kit.cuero(0x101010, { rug: .4, brillo: .6, escala: 6 })));
                const chapa = new TH.Mesh(new TH.CylinderGeometry(.11, .11, .012, 48), new TH.MeshStandardMaterial({ metalness: 1, roughness: .2, color: 0xffffff, map: dibujar(256, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, '#fbe6a6'); g.addColorStop(.7, '#d39f45'); g.addColorStop(1, '#8a6224'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = '#6b4a18'; x.lineWidth = 8; x.beginPath(); x.arc(w / 2, h / 2, w * .42, 0, 6.283); x.stroke(); x.fillStyle = '#4a330f'; x.font = `900 64px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, h / 2 - 14); x.font = `800 22px ${FUENTE}`; x.fillText('CAMPEÓN', w / 2, h / 2 + 40); }) }));
                chapa.scale.set(1.25, 1, .9); chapa.position.y = .012; cinto.add(chapa);
                [-1, 1].forEach(s => { const c = new TH.Mesh(new TH.CylinderGeometry(.045, .045, .01, 32), oro); c.position.set(s * .25, .012, 0); cinto.add(c); });
                // medallas en su soporte
                const soporte = new TH.Group(); soporte.position.set(4.4 - 1.65, ESC.y, -.75); soporte.rotation.y = -.35; escena.add(soporte);
                [-1, 1].forEach(s => soporte.add(caja(.04, 1.5, .04, oro, s * .45, .75, 0), caja(.25, .02, .3, negro, s * .45, .01, 0)));
                soporte.add(caja(.94, .03, .03, oro, 0, 1.48, 0));
                const cintas = [kit.tela(0xd6a64c, { escala: 2 }), kit.tela(0x111111, { escala: 2 })];
                [oro, oro, plata, plata, bronce, bronce].forEach((mt, i) => {
                    const x = -.35 + i * .14;
                    const lazo = caja(.03, .34, .004, cintas[i % 2], x, 1.3, 0); lazo.rotation.z = (az() - .5) * .08; soporte.add(lazo);
                    const med = new TH.Mesh(new TH.CylinderGeometry(.04, .04, .006, 32), mt); med.rotation.x = Math.PI / 2; med.position.set(x, 1.1, .004); med.castShadow = true; soporte.add(med);
                });
                // luz de vitrina sobre los trofeos
                const luzT = new TH.SpotLight(0xffe2b8, 300, 0, .38, .6, 2); luzT.position.set(3.0, ESC.y + 4.6, 1.2); luzT.target.position.set(4.4, ESC.y + 1.2, -.9); escena.add(luzT, luzT.target);
                await respirar();

                // ---------- backstage ----------
                carga('Abriendo el backstage…');
                const horm = texHormigon(T);
                const sueloB = malla(new TH.PlaneGeometry(BACK.x1 - BACK.x0 + .4, BACK.z1 - BACK.z0), new TH.MeshStandardMaterial({ map: repetida(horm.mapa, 2, 2), roughnessMap: repetida(horm.rug, 2, 2), roughness: 1 }), { sombra: false });
                sueloB.rotation.x = -Math.PI / 2; sueloB.position.set((BACK.x0 + BACK.x1) / 2, 0, (BACK.z0 + BACK.z1) / 2); escena.add(sueloB);
                const pB = (w, h, x, y, z, ry) => pared(w, h, x, y, z, ry, 0x2a2826);
                pB(BACK.z1 - BACK.z0, 4, BACK.x1, 2, (BACK.z0 + BACK.z1) / 2, -Math.PI / 2);
                pB(BACK.x1 - BACK.x0, 4, (BACK.x0 + BACK.x1) / 2, 2, BACK.z0, 0);
                // tabique con el paso al escenario
                escena.add(caja(.2, 4, 4.2, muroBoca, BACK.x0 - .1, 2, BACK.z0 + 2.1), caja(.2, 4, 2.2, muroBoca, BACK.x0 - .1, 2, BACK.z1 - 1.1), caja(.2, 1.6, 1.4, muroBoca, BACK.x0 - .1, 3.2, -1.6));
                const techoB = malla(new TH.PlaneGeometry(BACK.x1 - BACK.x0, BACK.z1 - BACK.z0), kit.mate(0x1a1918, .95), { sombra: false }); techoB.rotation.x = Math.PI / 2; techoB.position.set((BACK.x0 + BACK.x1) / 2, 4, (BACK.z0 + BACK.z1) / 2); escena.add(techoB);
                escena.add(caja(BACK.x1 - BACK.x0, .2, BACK.z1 - BACK.z0 + .2, muroBoca, (BACK.x0 + BACK.x1) / 2, 4.1, (BACK.z0 + BACK.z1) / 2));
                // tocador con espejo de bombillas
                const EX = 11.5, EZ = BACK.z0 + .02;
                escena.add(caja(2.3, 1.4, .05, kit.pintura(0x111111, { rug: .4 }), EX, 1.75, EZ + .025));
                if (calidad.reflejos) {
                    const esp = new Reflector(new TH.PlaneGeometry(1.9, 1.05), { textureWidth: 768, textureHeight: 432, color: 0xb9bcbd, clipBias: .003, multisample: calidad.muestras });
                    esp.position.set(EX, 1.75, EZ + .052); esp.userData.sinAO = true; escena.add(esp);
                } else {
                    const esp = new TH.Mesh(new TH.PlaneGeometry(1.9, 1.05), new TH.MeshStandardMaterial({ color: 0xc8cccd, metalness: 1, roughness: .05 })); esp.position.set(EX, 1.75, EZ + .052); escena.add(esp);
                }
                const bombillas = [];
                for (let i = 0; i < 7; i++) bombillas.push([EX - .99 + i * .33, 2.38]);
                for (let i = 0; i < 4; i++) { bombillas.push([EX - 1.08, 1.2 + i * .33]); bombillas.push([EX + 1.08, 1.2 + i * .33]); }
                const bomb = new TH.InstancedMesh(new TH.SphereGeometry(.045, 16, 10), kit.emisivo(0xffe2b0, 3), bombillas.length);
                const casq = new TH.InstancedMesh(new TH.CylinderGeometry(.022, .022, .03, 12).rotateX(Math.PI / 2), cromo, bombillas.length);
                bombillas.forEach(([x, y], i) => { m4.makeTranslation(x, y, EZ + .1); bomb.setMatrixAt(i, m4); m4.makeTranslation(x, y, EZ + .065); casq.setMatrixAt(i, m4); });
                bomb.userData.sinAO = true; [bomb, casq].forEach(o => { o.computeBoundingSphere(); escena.add(o); });
                const luzEspejo = new TH.RectAreaLight(0xffdcae, 7, 2.2, 1.4); luzEspejo.position.set(EX, 1.75, EZ + .12); luzEspejo.lookAt(EX, 1.6, 2); escena.add(luzEspejo);
                const mueble = kit.pintura(0x1d1a17, { rug: .45 });
                escena.add(caja(2.5, .05, .55, kit.pintura(0xe9e5dc, { rug: .3 }), EX, .8, EZ + .3));
                escena.add(caja(2.5, .76, .5, mueble, EX, .38, EZ + .27));
                [-.8, 0, .8].forEach(dx => escena.add(caja(.04, .2, .015, oro, EX + dx, .55, EZ + .525)));
                const taburete = new TH.Group(); taburete.position.set(EX - .3, 0, EZ + .95); escena.add(taburete);
                taburete.add(cilindro(.2, .2, .07, tapiz, 28)); taburete.children[0].position.y = .66;
                taburete.add(cilindro(.025, .025, .62, cromo, 12)); taburete.children[1].position.y = .32;
                taburete.add(cilindro(.22, .24, .03, kit.metal(0x3a3c3f, { rug: .45 }), 28)); taburete.children[2].position.y = .015;
                // bronceador, aceite, guante y cosméticos
                const etiqueta = (t1, col) => dibujar(256, 128, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1208'; x.font = `900 44px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, 44); x.font = `800 22px ${FUENTE}`; x.fillText(t1, w / 2, 90); });
                const producto = (perfil, mat, x, z, extra) => { const p = torno(perfil, mat, 28); p.position.set(x, .825, z); escena.add(p); if (extra) extra(p); return p; };
                const spray = (x, z, col, txt) => producto([[0, 0], [.035, 0], [.036, .01], [.036, .18], [.03, .2], [.012, .21], [0, .21]], new TH.MeshPhysicalMaterial({ map: etiqueta(txt, col), roughness: .3, clearcoat: .8 }), x, z, p => {
                    const cab = caja(.03, .03, .045, kit.plastico(0x111111), 0, .225, .01); p.add(cab);
                    const boq = cilindro(.004, .004, .03, kit.plastico(0x111111), 8); boq.rotation.x = Math.PI / 2; boq.position.set(0, .23, .04); p.add(boq);
                });
                spray(EX - .8, EZ + .3, '#e2b35a', 'TAN'); spray(EX - .68, EZ + .36, '#e2b35a', 'TAN'); spray(EX + .62, EZ + .3, '#f2ece0', 'GLAZE');
                producto([[0, 0], [.05, 0], [.05, .09], [.04, .1], [0, .1]], kit.vidrio(0xc58a2a, .7), EX - .45, EZ + .4);
                producto([[0, 0], [.028, 0], [.03, .1], [.02, .13], [.01, .16], [0, .16]], kit.vidrio(0xd49a3a, .65), EX + .35, EZ + .38);
                const guante = redondeada(.12, .03, .2, .015, kit.tela(0x2a1a10, { escala: 2 })); guante.position.set(EX + .05, .84, EZ + .45); guante.rotation.y = .5; escena.add(guante);
                const toallaD = redondeada(.32, .08, .22, .03, kit.rizo(0xf1eee7, 2)); toallaD.position.set(EX + .95, .865, EZ + .35); escena.add(toallaD);
                for (let i = 0; i < 4; i++) { const b = cilindro(.006, .004, .17, kit.plastico(0x1a1a1a, .4), 8); b.rotation.z = Math.PI / 2; b.rotation.y = .4 + i * .15; b.position.set(EX - .1 + i * .06, .832, EZ + .2); escena.add(b); }
                // orden de salida pegado en la pared
                const orden = new TH.Mesh(new TH.PlaneGeometry(.42, .6), new TH.MeshStandardMaterial({ roughness: .85, map: dibujar(210, 300, (x, w, h) => { x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.font = `800 15px ${FUENTE}`; x.fillText('ORDEN DE SALIDA', 14, 26); x.font = `600 11px ${MONO}`; ['CLASSIC PHYSIQUE', 'CULTURISMO −80', 'CULTURISMO +80', 'FITNESS', 'BIKINI', 'ABSOLUTO'].forEach((c, i) => { x.fillStyle = '#c9963f'; x.fillRect(14, 44 + i * 42, 4, 30); x.fillStyle = '#111'; x.fillText(c, 24, 56 + i * 42); x.fillStyle = '#555'; x.fillText(`DORSALES ${10 + i * 6}–${15 + i * 6}`, 24, 70 + i * 42); }); }) }));
                orden.position.set(EX - 1.75, 1.75, EZ + .01); orden.rotation.z = .03; escena.add(orden);
                [[-.19, .28], [.19, .28], [-.19, -.28], [.19, -.28]].forEach(([dx, dy]) => { const c = new TH.Mesh(new TH.PlaneGeometry(.06, .03), kit.mate(0xd8d2b0, .7)); c.position.set(EX - 1.75 + dx, 1.75 + dy, EZ + .012); c.rotation.z = .7; escena.add(c); });
                // burro con la bata de satén
                const bataMat = new TH.MeshPhysicalMaterial({ map: texBata(), roughness: .3, sheen: .8, sheenRoughness: .3, sheenColor: new TH.Color(0x8a7a60), clearcoat: .25, clearcoatRoughness: .4, side: TH.DoubleSide });
                const burro = new TH.Group(); burro.position.set(13.2, 0, -2.0); burro.rotation.y = -Math.PI / 2; escena.add(burro);
                [-.7, .7].forEach(x => { burro.add(entre(v3(x, 0, 0), v3(x, 1.75, 0), .014, cromo, 10), entre(v3(x, .05, -.25), v3(x, .05, .25), .012, cromo, 8)); [-.25, .25].forEach(z => { const r = cilindro(.025, .025, .02, kit.goma(0x111111), 12); r.rotation.x = Math.PI / 2; r.position.set(x, .025, z); burro.add(r); }); });
                burro.add(entre(v3(-.72, 1.75, 0), v3(.72, 1.75, 0), .013, cromo, 10));
                const bata = crearBata(TH, kit, bataMat); bata.position.set(-.15, 1.7, 0); bata.rotation.y = Math.PI; burro.add(bata);
                const bata2 = crearBata(TH, kit, kit.tela(0x6b0a12, { escala: 3, sheen: 0xd04a40 })); bata2.position.set(.35, 1.7, -.02); bata2.rotation.y = Math.PI + .2; bata2.scale.set(.95, .97, .95); burro.add(bata2);
                // mancuernas para el bombeo antes de salir
                const rack = new TH.Group(); rack.position.set(9.44, 0, -6.12); escena.add(rack);
                [-.75, .75].forEach(x => rack.add(caja(.05, .8, .5, negro, x, .4, 0)));
                rack.add(caja(1.55, .04, .2, negro, 0, .42, -.12), caja(1.55, .04, .2, negro, 0, .72, .1));
                const hexGeo = new TH.CylinderGeometry(1, 1, 1, 6); hexGeo.rotateZ(Math.PI / 2);
                const goma = kit.goma(0x111112, { escala: 1 });
                [[.42, -.12, .055, .05], [.72, .1, .045, .042]].forEach(([y, z, r, an], fila) => {
                    for (let i = 0; i < 5; i++) {
                        const x = -.6 + i * .3, rr = r + i * .006, ww = an + i * .006;
                        [-1, 1].forEach(s => { const h = malla(hexGeo, goma); h.scale.set(ww, rr, rr); h.position.set(x + s * (.065 + ww / 2), y + .02 + rr, z); rack.add(h); });
                        const asa = cilindro(.016, .016, .13, kit.metal(0xbfc2c4, { rug: .4 }), 12); asa.rotation.z = Math.PI / 2; asa.position.set(x, y + .02 + rr, z); rack.add(asa);
                        void fila;
                    }
                });
                // gomas elásticas colgadas y esterilla
                [[0xa8141c, 0], [0xD9B45A, .1], [0x111111, .2]].forEach(([c, dz]) => escena.add(tubo(new TH.CatmullRomCurve3([v3(BACK.x1 - .04, 1.6, -4.2 + dz), v3(BACK.x1 - .08, 1.0, -4.3 + dz), v3(BACK.x1 - .1, .62, -4.2 + dz), v3(BACK.x1 - .08, 1.0, -4.1 + dz), v3(BACK.x1 - .04, 1.6, -4.2 + dz)], true), .012, kit.goma(c), 48, 8)));
                const gancho = cilindro(.008, .008, .08, cromo, 8); gancho.rotation.z = Math.PI / 2; gancho.position.set(BACK.x1 - .04, 1.62, -4.1); escena.add(gancho);
                const esterilla = redondeada(.6, .012, 1.7, .006, kit.goma(0x1e2b3a, { escala: 2 })); esterilla.position.set(11.4, .006, -2.2); esterilla.rotation.y = .2; escena.add(esterilla);
                // carpa para el moreno de competición
                const carpa = new TH.Group(); carpa.position.set(12.8, 0, .2); carpa.rotation.y = -Math.PI / 2 - .35; escena.add(carpa);
                const lona = kit.tela(0x111111, { escala: 6, sheen: 0x333333 });
                const lonaLogo = new TH.MeshStandardMaterial({ roughness: .8, map: dibujar(256, 512, (x, w, h) => { x.fillStyle = '#121212'; x.fillRect(0, 0, w, h); x.fillStyle = ORO; x.font = `900 80px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ATR', w / 2, 170); x.font = `800 44px ${FUENTE}`; x.fillText('TAN', w / 2, 240); x.fillRect(40, 290, w - 80, 4); }) });
                carpa.add(caja(1.3, 2.1, .02, lona, 0, 1.05, -.65), caja(.02, 2.1, 1.3, lonaLogo, -.65, 1.05, 0), caja(.02, 2.1, 1.3, lona, .65, 1.05, 0), caja(1.32, .02, 1.32, lona, 0, 2.1, 0));
                [[-.65, -.65], [.65, -.65], [-.65, .65], [.65, .65]].forEach(([x, z]) => carpa.add(cilindro(.012, .012, 2.1, kit.metal(0x888888), 8)).children.at(-1).position.set(x, 1.05, z));
                const plato = cilindro(.35, .35, .01, kit.goma(0x1a1a1a), 32); plato.position.y = .005; carpa.add(plato);
                const pistola = new TH.Group(); pistola.position.set(.3, 1.0, .6); carpa.add(pistola);
                pistola.add(cilindro(.03, .03, .1, kit.plastico(0xe9e6de), 12)); pistola.add(caja(.025, .09, .03, kit.plastico(0x222222), 0, -.07, 0));
                escena.add(tubo(new TH.CatmullRomCurve3([v3(12.2, 1.0, .5), v3(12.0, .4, .9), v3(11.8, .02, 1.0), v3(11.2, .02, .9)]), .007, kit.plastico(0xe9e6de), 32, 6));
                // luz de techo del backstage
                if (!calidad.movil) lampara(kit, 11.2, 3.4, -2.6, { techo: 4, fuerza: 110, angulo: .95, color: 0xfff0dc, haces: false, calidad, objetivo: v3(11.2, 0, -2.6) }).forEach(o => escena.add(o));
                await respirar();

                // ---------- luz ambiente y polvo ----------
                escena.add(new TH.HemisphereLight(0xffe0c0, 0x0e0808, calidad.movil ? .26 : .2));
                escena.add(polvo([[0, ESC.y + 1, -2.2, 10, 6, 6]], Math.round(calidad.polvo * .55), 0xd9c7a8, .03));

                const tgt = new TH.Vector3();
                return {
                    actualizar(t) {
                        vivo.cabezas.forEach((c, i) => {
                            // barrido en ocho sobre la tarima, cada cabeza con su fase
                            tgt.set(c.x * .45 + Math.sin(t * .37 + c.fase) * 2.6, ESC.y, -1.9 + Math.sin(t * .53 + c.fase * 1.3) * 1.6);
                            c.base.updateMatrixWorld();
                            const p = c.base.position;
                            c.yugo.rotation.y = Math.atan2(tgt.x - p.x, tgt.z - p.z);
                            c.yugo.updateMatrixWorld();
                            c.cabeza.lookAt(tgt);
                            if (c.luz) {
                                c.cabeza.getWorldPosition(c.objetivo);
                                c.luz.position.copy(c.objetivo); c.luz.target.position.copy(tgt);
                                c.beam.position.copy(c.objetivo); c.beam.lookAt(tgt);
                            }
                            void i;
                        });
                        // una bombilla del espejo que parpadea, como en cualquier camerino
                        const f = Math.sin(t * 13) > .93 || Math.sin(t * 2.1) > .995 ? .25 : 1;
                        m4.makeTranslation(bombillas[5][0], bombillas[5][1], EZ + .1 + (f < 1 ? -.08 : 0));
                        bomb.setMatrixAt(5, m4); bomb.instanceMatrix.needsUpdate = true;
                    }
                };
            }
        };

        montarEscena('culturismo', CULTURISMO);
    }).catch(err => console.error(err));
})();
