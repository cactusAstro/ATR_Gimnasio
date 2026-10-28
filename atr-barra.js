// ============================================
// ATR-GYM — barra de powerlifting fotorrealista
// Las piezas son fotos de producto renderizadas a partir de los modelos 3D de
// la web, con medidas reales: barra de 20 kg (2,2 m, eje de 29 mm, manga de
// 50 mm), discos calibrados de 450, 400, 325, 228, 190 y 160 mm y cierres de
// competición de 2,5 kg. Aquí se montan en un <canvas> de la pieza más lejana
// a la más cercana, como saldrían en una foto, y los discos entran por la
// manga de uno en uno hasta tocar el anterior.
// ============================================
(function () {
    'use strict';
    const RUTA = 'img/barra/';
    const K = 1000;                                   // píxeles por metro de las imágenes
    const PSI = .41887902047863906;                   // giro de la cámara (24°)
    const C = Math.cos(PSI), S = Math.sin(PSI);
    // [ancho px, alto px, borde izquierdo y borde superior en metros (vista de la cámara)]
    const PIEZAS = { "disco-25": [226, 462, -0.11258, 0.23097], "disco-20": [222, 462, -0.11057, 0.23097], "disco-15": [200, 412, -0.09999, 0.20597], "disco-10": [169, 337, -0.08442, 0.16848], "disco-5": [130, 240, -0.06469, 0.11998], "disco-2-5": [110, 202, -0.05468, 0.10099], "disco-1-25": [94, 172, -0.04676, 0.08599], "cierre": [107, 174, -0.05567, 0.11436], "brida": [65, 74, -0.03231, 0.037], "eje": [1221, 41, -0.61027, 0.0205], "manga-der": [414, 63, 0.60778, 0.031], "manga-izq": [414, 63, -1.02107, 0.031] };
    const GROSOR = { 25: .027, 20: .0226, 15: .0217, 10: .021, 5: .021, 2.5: .016, 1.25: .012 };
    const JUEGO = [25, 20, 15, 10, 5, 2.5, 1.25];
    const R_MANGA = .025, SUELO = -.225, BARRA = 20, CIERRE = 2.5;
    const VISTAS = {
        completa: { x0: -1.05, x1: 1.05, arriba: .245, abajo: SUELO - .1 },
        mitad: { x0: .34, x1: 1.05, arriba: .245, abajo: SUELO - .1 }
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nombreDisco = kg => 'disco-' + String(kg).replace('.', '-');

    let promesa = null;
    function cargarImagenes() {
        if (!promesa) promesa = Promise.all(Object.keys(PIEZAS).map(n => new Promise((ok, ko) => {
            const i = new Image();
            i.onload = () => ok([n, i]); i.onerror = () => ko(new Error('No se pudo cargar ' + n));
            i.src = RUTA + n + '.webp';
        }))).then(Object.fromEntries);
        return promesa;
    }

    // discos por lado con el juego completo, de mayor a menor
    function repartir(porLado, juego = JUEGO) {
        const res = [];
        let resto = Math.round(porLado * 100) / 100;
        for (const p of juego) while (resto >= p - 1e-6) { res.push(p); resto = Math.round((resto - p) * 100) / 100; }
        return res;
    }

    // centro (X) de cada pieza de un lado, de dentro a fuera, separadas como en la manga real
    function colocar(discos, cierres) {
        const lista = [];
        let x = .687;
        discos.forEach((kg, i) => { const g = GROSOR[kg]; lista.push({ img: nombreDisco(kg), kg, x: x + g / 2, g, orden: i }); x += g + .0012; });
        if (cierres) lista.push({ img: 'cierre', kg: CIERRE, x: x + .023, g: .044, orden: discos.length });
        return lista;
    }

    const salida = t => 1 - Math.pow(1 - t, 4);
    const VIAJE_INICIAL = .62;                      // fuera de la manga, antes de cargar

    function montar(el, { discos = [], cierres = true, vista = 'completa', alCambiar = null, recorte = false } = {}) {
        const v = VISTAS[vista];
        const lienzo = document.createElement('canvas');
        lienzo.className = 'barra-lienzo';
        lienzo.setAttribute('aria-hidden', 'true');
        el.appendChild(lienzo);
        el.style.setProperty('--proporcion', ((v.x1 - v.x0) / (v.arriba - v.abajo)).toFixed(4));
        const ctx = lienzo.getContext('2d');
        const capa = document.createElement('canvas'), cctx = capa.getContext('2d');
        const reflejo = document.createElement('canvas'), rctx = reflejo.getContext('2d');

        const lado = colocar(discos, cierres);
        // cada pieza tiene su desplazamiento hacia fuera (0 = colocada) y su opacidad
        const piezas = [];
        [1, -1].forEach(s => lado.forEach(p => piezas.push({ ...p, s, fuera: 0, alfa: 1 })));
        const total = BARRA + 2 * lado.reduce((a, p) => a + p.kg, 0);
        let imgs = null, escala = 1, ancho = 0, alto = 0, animando = false, hecho = false;

        const px = sx => (sx - v.x0) * escala;
        const py = sy => (v.arriba - sy) * escala;

        function medir() {
            const r = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.round(r.width * dpr));
            const h = Math.max(1, Math.round(w / ((v.x1 - v.x0) / (v.arriba - v.abajo))));
            if (w === ancho && h === alto) return false;
            ancho = w; alto = h; escala = w / (v.x1 - v.x0);
            [lienzo, capa, reflejo].forEach(c => { c.width = w; c.height = h; });
            return true;
        }

        function imagen(c, nombre, desplX, alfa = 1) {
            const [w, h, izq, arriba] = PIEZAS[nombre], i = imgs[nombre];
            c.globalAlpha = alfa;
            c.drawImage(i, px(izq + desplX), py(arriba), w / K * escala, h / K * escala);
            c.globalAlpha = 1;
        }
        // trozo de manga desde la cara de una pieza hacia la cámara (recortado por su elipse)
        function manga(c, nombre, caraX) {
            const cx = px(caraX * C), cy = py(0), ex = R_MANGA * S * escala, ey = R_MANGA * escala;
            c.save(); c.beginPath();
            c.ellipse(cx, cy, ex, ey, 0, 0, Math.PI * 2);
            c.rect(cx, cy - ey - 2, ancho, ey * 2 + 4);
            c.clip(); imagen(c, nombre, 0); c.restore();
        }

        function pintar() {
            if (!imgs || !ancho) return;
            const c = cctx;
            c.clearRect(0, 0, ancho, alto);
            // de lejos a cerca: las X más pequeñas quedan detrás
            const lista = piezas.map(p => {
                const X = p.s * (p.x + p.fuera);
                return { ...p, X, cara: X + p.g / 2 };
            });
            lista.push({ img: 'brida', X: -.67, cara: -.655, alfa: 1, brida: true }, { img: 'brida', X: .67, cara: .685, alfa: 1, brida: true });
            lista.sort((a, b) => a.X - b.X);
            imagen(c, 'manga-izq', 0);
            for (const p of lista) {
                if (p.alfa > 0) imagen(c, p.img, p.X * C, p.alfa);
                if (p.brida && p.X < 0) imagen(c, 'eje', 0);
                else if (p.X < 0) manga(c, 'manga-izq', p.cara);
                else manga(c, 'manga-der', p.cara);
            }
            // suelo negro brillante: reflejo que se apaga hacia abajo
            const suelo = py(SUELO);
            rctx.clearRect(0, 0, ancho, alto);
            rctx.save(); rctx.translate(0, suelo * 2); rctx.scale(1, -1); rctx.drawImage(capa, 0, 0); rctx.restore();
            rctx.save(); rctx.globalCompositeOperation = 'destination-in';
            const g = rctx.createLinearGradient(0, suelo, 0, suelo + .1 * escala);
            g.addColorStop(0, 'rgba(0,0,0,.26)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            rctx.fillStyle = g; rctx.fillRect(0, suelo, ancho, alto - suelo); rctx.restore();
            ctx.clearRect(0, 0, ancho, alto);
            const linea = ctx.createLinearGradient(0, 0, ancho, 0);
            linea.addColorStop(0, 'rgba(255,255,255,0)'); linea.addColorStop(.5, 'rgba(255,255,255,.16)'); linea.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = linea; ctx.fillRect(0, suelo, ancho, Math.max(1, escala * .0015));
            ctx.drawImage(reflejo, 0, 0);
            ctx.drawImage(capa, 0, 0);
            if (recorte) {                             // la barra sale de la oscuridad por la izquierda
                ctx.save(); ctx.globalCompositeOperation = 'destination-in';
                const f = ctx.createLinearGradient(0, 0, ancho * .32, 0);
                f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(0,0,0,1)');
                ctx.fillStyle = f; ctx.fillRect(0, 0, ancho, alto); ctx.restore();
            }
        }

        let kgActual = BARRA;
        const avisar = kg => { kgActual = kg; alCambiar && alCambiar(kg, total); };

        function cargar() {
            if (animando || hecho) return;
            if (reduce || !imgs) { piezas.forEach(p => { p.fuera = 0; p.alfa = 1; }); hecho = true; avisar(total); pintar(); return; }
            animando = true;
            const PASO = 380, DUR = 640, VIAJE = .42;
            const n = lado.length, t0 = performance.now();
            const contactos = new Set();
            (function cuadro(ahora) {
                let fin = true;
                piezas.forEach(p => {
                    const t = (ahora - t0 - p.orden * PASO) / DUR;
                    if (t <= 0) { p.fuera = VIAJE_INICIAL; p.alfa = 0; fin = false; return; }
                    if (t >= 1) { p.fuera = 0; p.alfa = 1; if (!contactos.has(p.orden)) { contactos.add(p.orden); avisar(BARRA + 2 * lado.filter(q => q.orden <= p.orden).reduce((a, q) => a + q.kg, 0)); } return; }
                    fin = false;
                    // se desliza por la manga, frena y da un toque mínimo al chocar con el anterior
                    const e = salida(Math.min(1, t / .86));
                    const toque = t > .86 ? Math.sin((t - .86) / .14 * Math.PI) * .0022 : 0;
                    p.fuera = VIAJE * (1 - e) + toque;
                    p.alfa = Math.min(1, t / .22);
                });
                pintar();
                if (!fin) requestAnimationFrame(cuadro);
                else { animando = false; hecho = true; avisar(total); pintar(); }
            })(t0);
            if (!n) { animando = false; hecho = true; avisar(total); }
        }

        medir();                                     // reserva el alto desde el principio (sin saltos al cargar)
        // antes de cargar se ve la barra vacía
        piezas.forEach(p => { p.fuera = VIAJE_INICIAL; p.alfa = 0; });
        avisar(BARRA);
        const listo = cargarImagenes().then(r => { imgs = r; medir(); pintar(); }).catch(err => { console.warn(err); el.classList.add('barra-sin-fotos'); });
        if ('ResizeObserver' in window) new ResizeObserver(() => { if (medir()) pintar(); }).observe(el);
        else addEventListener('resize', () => { if (medir()) pintar(); });

        return {
            total,
            cargar: () => listo.then(cargar),
            ponerYa: () => listo.then(() => { piezas.forEach(p => { p.fuera = 0; p.alfa = 1; }); hecho = true; avisar(total); pintar(); }),
            get kg() { return kgActual; }
        };
    }
    // ¿cabe la carga en una manga de 415 mm? (discos con su holgura)
    const cabe = discos => discos.reduce((a, kg) => a + GROSOR[kg] + .0012, 0) <= .405;

    window.ATRBarra = { montar, repartir, cabe, cargarImagenes, BARRA, CIERRE };
})();
