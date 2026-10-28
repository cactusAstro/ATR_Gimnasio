// ============================================
// ATR-GYM — movimiento de la web
// Solo animaciones que podrían pasar en un gimnasio de verdad: discos que
// entran por la manga y chocan con el cierre, magnesio flotando en la luz,
// tarjetas que se apilan, una línea que avanza. Nada salta ni persigue al
// ratón. Si algo falla, la web sigue funcionando igual.
// ============================================
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = t => 1 - Math.pow(1 - t, 3);
    const kgTexto = n => (Math.round(n * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 });

    let vh = innerHeight;
    addEventListener('resize', () => { vh = innerHeight; }, { passive: true });

    // ---------- 1) Pantalla de carga: la barra se carga hasta 165 kg ----------
    function listo() {
        if (document.body.classList.contains('listo')) return;
        document.body.classList.add('listo');
        dispatchEvent(new Event('atr:listo'));
    }
    (function preloader() {
        const pre = $('#preloader');
        if (!pre) { listo(); return; }
        let visto = false;
        try { visto = sessionStorage.getItem('atr-intro') === '1'; sessionStorage.setItem('atr-intro', '1'); } catch (e) { }
        const quitar = () => {
            pre.classList.add('fuera');
            setTimeout(listo, 200);
            setTimeout(() => pre.remove(), 900);
        };
        if (reduce || visto) { pre.classList.add('fuera'); pre.style.transitionDuration = '0s'; listo(); setTimeout(() => pre.remove(), 50); return; }
        const kg = $('#preKg'), dur = 1100, t0 = performance.now();
        (function tick(now) {
            const p = clamp((now - t0) / dur, 0, 1);
            if (kg) kg.textContent = Math.round(165 * ease(p));
            pre.style.setProperty('--p', ease(p));
            if (p < 1) requestAnimationFrame(tick); else setTimeout(quitar, 160);
        })(t0);
    })();

    // ---------- 2) Barras con discos calibrados en cada apartado ----------
    // Las fotos de la barra, los discos y los cierres las monta atr-barra.js.
    // Cada apartado es una serie más de la rampa de calentamiento: 30, 40, 50 kg…
    // (barra de 20 kg + dos cierres de competición de 2,5 kg + discos).
    const B = window.ATRBarra;
    const totalSerie = serie => 30 + 10 * (serie - 1);
    const porLado = total => (total - B.BARRA - 2 * B.CIERRE) / 2;
    function montarCarga(el, discos, rotulo, opciones = {}) {
        const barra = B.montar(el, { discos, cierres: true, ...opciones, alCambiar: kg => { if (rotulo) rotulo.textContent = kgTexto(kg); } });
        if (reduce) barra.ponerYa();
        return barra.cargar;
    }
    const etiquetas = B ? $$('.atr-eyebrow:not(.hero-eyebrow)') : [];
    const obsCarga = 'IntersectionObserver' in window ? new IntersectionObserver(en => en.forEach(x => {
        if (x.isIntersecting) { obsCarga.unobserve(x.target); x.target._cargar && x.target._cargar(); }
    }), { threshold: .6 }) : null;
    etiquetas.forEach((eti, i) => {
        const serie = i + 1, total = totalSerie(serie);
        const caja = document.createElement('div');
        caja.className = 'carga';
        caja.setAttribute('aria-hidden', 'true');
        caja.innerHTML = '<div class="carga-foto"></div><p class="carga-kg"><b>20</b><span>kg</span><small>' + kgTexto(porLado(total)) + ' kg por lado</small></p>';
        eti.parentNode.insertBefore(caja, eti);
        eti.dataset.serie = String(serie).padStart(2, '0');
        caja._cargar = montarCarga(caja.querySelector('.carga-foto'), B.repartir(porLado(total)), caja.querySelector('.carga-kg b'), { vista: 'mitad', recorte: true });
        if (obsCarga) obsCarga.observe(caja); else caja._cargar();
    });

    // barra grande de la portada: 165 kg = 20 + 2 × 2,5 (cierres) + 2 × (25 + 25 + 15 + 5)
    const heroCarga = $('#barraHero');
    if (heroCarga && B) {
        const cargar = montarCarga(heroCarga, [25, 25, 15, 5], $('#kgContador'), { vista: 'completa' });
        const lanzar = () => setTimeout(cargar, 350);
        if (document.body.classList.contains('listo')) lanzar(); else addEventListener('atr:listo', lanzar, { once: true });
        setTimeout(lanzar, 4000);
    }

    // ---------- 3) Magnesio flotando en la luz de la portada ----------
    const lienzo = $('#polvoHero');
    const hero = $('#top');
    if (lienzo && hero) {
        const ctx = lienzo.getContext('2d');
        let dpr = 1, ancho = 0, alto = 0, arribaHero = 0, motas = [], heroVisible = true, raf = 0, ultimo = 0;
        const crear = () => {
            const r = hero.getBoundingClientRect();
            // motas de polvo: no necesitan toda la resolución de la pantalla (menos píxeles que borrar cada fotograma)
            dpr = Math.min(devicePixelRatio || 1, 1.5); ancho = r.width; alto = r.height; arribaHero = r.top + scrollY;
            lienzo.width = ancho * dpr; lienzo.height = alto * dpr;
            const n = Math.round(clamp(ancho * alto / 16000, 30, 110));
            motas = Array.from({ length: n }, () => ({
                x: Math.random() * ancho, y: Math.random() * alto,
                r: .5 + Math.random() * Math.random() * 2.1,
                vx: (Math.random() - .3) * 6, vy: -(2 + Math.random() * 7),
                f: Math.random() * 6.283, a: .25 + Math.random() * .55
            }));
        };
        // el foco cae desde arriba a la derecha, como una luz de techo sobre la tarima
        const luz = (x, y) => {
            const fx = ancho * .78 - y * .32, d = Math.abs(x - fx) / (ancho * .2 + y * .3);
            return clamp(1.15 - d, .12, 1);
        };
        const pintar = dt => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, ancho, alto);
            ctx.fillStyle = 'rgb(246, 236, 214)';
            // solo se dibujan las motas que caen dentro de la pantalla
            const desde = scrollY - arribaHero - 8, hasta = desde + vh + 16;
            for (const m of motas) {
                if (dt) {
                    m.f += dt * .6;
                    m.x += (m.vx + Math.sin(m.f) * 4) * dt;
                    m.y += (m.vy + Math.cos(m.f * .7) * 2) * dt;
                    if (m.y < -10) { m.y = alto + 10; m.x = Math.random() * ancho; }
                    if (m.x > ancho + 10) m.x = -10; else if (m.x < -10) m.x = ancho + 10;
                }
                if (m.y < desde || m.y > hasta) continue;
                ctx.globalAlpha = luz(m.x, m.y) * m.a;
                ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
            }
            ctx.globalAlpha = 1;
        };
        const bucle = now => {
            raf = 0;
            const dt = Math.min(.05, (now - ultimo) / 1000 || .016); ultimo = now;
            pintar(dt);
            if (heroVisible && !document.hidden) raf = requestAnimationFrame(bucle);
        };
        const arrancar = () => { if (!raf && heroVisible && !document.hidden) { ultimo = performance.now(); raf = requestAnimationFrame(bucle); } };
        crear();
        addEventListener('resize', () => { crear(); if (reduce) pintar(0); }, { passive: true });
        if (reduce) pintar(0);
        else {
            new IntersectionObserver(en => {
                heroVisible = en[0].isIntersecting;
                hero.classList.toggle('hero-fuera', !heroVisible);     // y sus animaciones en bucle se paran
                arrancar();
            }).observe(hero);
            document.addEventListener('visibilitychange', arrancar);
        }
    }

    // ---------- 4) Titulares: entran con calma al llegar ----------
    const obsTitulos = new IntersectionObserver(en => en.forEach(x => {
        if (x.isIntersecting) { x.target.classList.add('in'); obsTitulos.unobserve(x.target); }
    }), { threshold: .2 });
    $$('.atr-h2').forEach(h => { h.classList.remove('reveal'); if (reduce) return; h.classList.add('titulo-entra'); obsTitulos.observe(h); });

    // ---------- FAQ: cada respuesta en un solo bloque para poder desplegarla suave ----------
    $$('.faq-respuesta').forEach(r => {
        const dentro = document.createElement('div');
        while (r.firstChild) dentro.appendChild(r.firstChild);
        r.appendChild(dentro);
    });

    // ---------- 5) Cartas de mitos que se giran ----------
    const mitos = $$('.mito-card');
    if (mitos.length) {
        const grid = document.createElement('div');
        grid.className = 'mitos-grid';
        mitos[0].parentNode.insertBefore(grid, mitos[0]);
        mitos.forEach(card => {
            const cab = card.querySelector('.mito-header'), men = card.querySelector('.mito-mentira'), ver = card.querySelector('.mito-verdad');
            const inner = document.createElement('div'); inner.className = 'mito-inner';
            const frente = document.createElement('div'); frente.className = 'mito-cara frente';
            const dorso = document.createElement('div'); dorso.className = 'mito-cara dorso';
            const pista = document.createElement('span'); pista.className = 'mito-pista'; pista.textContent = 'Toca para ver la verdad →';
            frente.append(cab, men, pista);
            dorso.append(ver);
            inner.append(frente, dorso);
            card.appendChild(inner);
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Mito: ' + men.textContent + '. Pulsa para ver la verdad.');
            const girar = () => card.classList.toggle('girada');
            card.addEventListener('click', girar);
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); girar(); } });
            grid.appendChild(card);
        });
    }

    // Todo lo que se mueve con el scroll va en una sola pasada por fotograma, y solo
    // cuando hay scroll: primero se mide todo y después se escribe (medir después de
    // escribir obliga al navegador a recalcular la página entera). Lo que no está a la
    // vista no se calcula.
    const cerca = new Set();
    const obsCerca = 'IntersectionObserver' in window ? new IntersectionObserver(en => {
        en.forEach(x => x.isIntersecting ? cerca.add(x.target) : cerca.delete(x.target));
        pedir();
    }, { rootMargin: '25% 0px' }) : null;
    const vigilar = el => { if (!el) return; if (obsCerca) obsCerca.observe(el); else cerca.add(el); };
    const pinta = (el, prop, v) => { if (el['_' + prop] !== v) { el['_' + prop] = v; el.style.setProperty(prop, v); } };

    // ---------- 6) Consejos y prompts: tarjetas que se apilan ----------
    const pilas = $$('#consejos, #ia');
    pilas.forEach(sec => { sec.classList.add('apilar'); sec._cartas = $$('.tip-card', sec); sec._cartas.forEach((c, n) => c.style.setProperty('--n', n)); vigilar(sec); });
    const mqPilas = matchMedia('(min-width: 900px) and (min-height: 700px)');
    // al salir del tamaño en que se apilan, las tarjetas vuelven a su estado normal
    const soltarPilas = () => pilas.forEach(sec => sec._cartas.forEach(c => { pinta(c, 'transform', ''); pinta(c, 'filter', ''); }));
    (mqPilas.addEventListener ? mqPilas.addEventListener('change', () => { if (!mqPilas.matches) soltarPilas(); pedir(); }) : 0);
    function medirPilas(out) {
        if (reduce || !mqPilas.matches) return;
        pilas.forEach(sec => {
            if (!cerca.has(sec)) return;
            const cartas = sec._cartas;
            for (let i = 0; i < cartas.length - 1; i++) {
                const r = cartas[i].getBoundingClientRect(), rs = cartas[i + 1].getBoundingClientRect();
                out.push([cartas[i], clamp((r.bottom - rs.top) / r.height, 0, 1)]);
            }
        });
    }

    // ---------- 7) Historia: la línea avanza con la lectura ----------
    const historia = $('#historia');
    const linea = $('#historia .timeline-container');
    const hitos = $$('#historia .timeline-item');
    vigilar(historia);
    function medirHistoria() {
        if (!linea || !cerca.has(historia)) return null;
        const r = linea.getBoundingClientRect();
        return { p: reduce ? 1 : clamp((vh * .62 - r.top) / r.height, 0, 1), luces: hitos.map(h => reduce || h.getBoundingClientRect().top < vh * .62) };
    }

    // ---------- 8) Pie: ATR—GYM grande que sube despacio ----------
    const mega = $$('.foot-mega span');
    if (mega.length) vigilar(mega[0].parentElement);
    function medirPie() {
        if (!mega.length || !cerca.has(mega[0].parentElement)) return null;
        const r = mega[0].parentElement.getBoundingClientRect();
        return clamp((vh - r.top) / (r.height + vh * .35), 0, 1);
    }

    // ---------- 9) Indicador lateral de "serie" ----------
    // (si la hoja de estilos lo oculta, ni se crea; la sección actual sale de posiciones guardadas)
    const secciones = $$('body > section[id], main > section[id]');
    let indicador = null, barraInd = null, txtInd = null, tops = [], totalScroll = 0;
    if (secciones.length) {
        indicador = document.createElement('div');
        indicador.className = 'indicador';
        indicador.setAttribute('aria-hidden', 'true');
        indicador.innerHTML = '<b id="indTxt">SERIE 01/' + String(secciones.length).padStart(2, '0') + '</b><div class="ind-barra"><i></i></div>';
        document.body.appendChild(indicador);
        if (getComputedStyle(indicador).display === 'none') { indicador.remove(); indicador = null; }
        else { barraInd = indicador.querySelector('.ind-barra i'); txtInd = indicador.querySelector('#indTxt'); }
    }
    function medirPosiciones() {
        if (!indicador) return;
        tops = secciones.map(s => s.getBoundingClientRect().top + scrollY);
        totalScroll = document.documentElement.scrollHeight - vh;
    }
    function indiceSeccion(y) {
        let idx = 0;
        for (let i = 0; i < tops.length; i++) if (tops[i] - y < vh * .5) idx = i;
        return idx;
    }

    // (10: el menú que se esconde al bajar va con la barra de pestañas y los botones, en atr-vidrio.js)

    // ---------- 11) Cinta: avanza despacio y siempre igual (animación CSS, fuera del hilo principal) ----------
    const cinta = $('.cinta-track');
    if (cinta && !reduce && getComputedStyle(cinta.parentElement).display !== 'none') {
        const medirCinta = () => {
            const mitad = cinta.scrollWidth / 2;
            cinta.style.setProperty('--cinta-dist', -mitad + 'px');
            cinta.style.setProperty('--cinta-dur', (mitad / 40).toFixed(2) + 's');      // 40 px por segundo
        };
        medirCinta();
        addEventListener('resize', medirCinta, { passive: true });
        cinta.classList.add('cinta-viva');
        if ('IntersectionObserver' in window) new IntersectionObserver(en => cinta.classList.toggle('cinta-quieta', !en[0].isIntersecting)).observe(cinta.parentElement);
    }

    // ---------- 12) Números de la portada que cuentan al aparecer ----------
    const obsNum = new IntersectionObserver(en => en.forEach(x => {
        if (!x.isIntersecting) return;
        obsNum.unobserve(x.target);
        const el = x.target.querySelector('#diasBarra') || x.target;
        const m = el.textContent.match(/^([\d.]+)(.*)$/s);
        if (!m || reduce) return;
        const fin = parseInt(m[1].replace(/\./g, ''), 10), resto = m[2], t0 = performance.now();
        (function paso(now) {
            const p = clamp((now - t0) / 1400, 0, 1);
            el.textContent = Math.round(fin * ease(p)).toLocaleString('es-ES') + resto;
            if (p < 1) requestAnimationFrame(paso);
        })(t0);
    }), { threshold: .6 });
    $$('.hero-stats b').forEach(b => obsNum.observe(b));

    // ---------- 13) Tienda: el contador del carrito da un pequeño golpe ----------
    if (typeof window.anadirAlCarrito === 'function') {
        const original = window.anadirAlCarrito;
        window.anadirAlCarrito = function () {
            original.apply(this, arguments);
            const badge = $('#carritoBadge');
            if (badge && !reduce) { badge.classList.remove('salta'); void badge.offsetWidth; badge.classList.add('salta'); }
        };
    }

    // ---------- Pasada del scroll: solo cuando hay movimiento ----------
    let pendiente = false;
    function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(alDesplazar); } }
    function alDesplazar() {
        pendiente = false;
        const y = scrollY;
        // 1) lecturas
        const cartas = [];
        medirPilas(cartas);
        const hist = medirHistoria();
        const pie = medirPie();
        // 2) escrituras
        cartas.forEach(([c, t]) => { pinta(c, 'transform', `scale(${(1 - t * .05).toFixed(4)})`); pinta(c, 'filter', `brightness(${(1 - t * .4).toFixed(3)})`); });
        if (hist) {
            pinta(linea, '--prog', hist.p.toFixed(4));
            hitos.forEach((h, i) => h.classList.toggle('encendido', hist.luces[i]));
        }
        if (pie !== null) mega.forEach((s, i) => {
            const q = reduce ? 1 : clamp(pie * 1.6 - i * .06, 0, 1);
            pinta(s, '--sube', ((1 - ease(q)) * 100).toFixed(2) + '%');
        });
        if (indicador) {
            pinta(barraInd, 'transform', `scaleY(${totalScroll > 0 ? (y / totalScroll).toFixed(4) : 0})`);
            const txt = 'SERIE ' + String(indiceSeccion(y) + 1).padStart(2, '0') + '/' + String(secciones.length).padStart(2, '0');
            if (txtInd.textContent !== txt) txtInd.textContent = txt;
        }
    }
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', () => { medirPosiciones(); pedir(); }, { passive: true });
    // las posiciones de las secciones se guardan y se vuelven a medir solo si cambia la altura de la página
    if (indicador && 'ResizeObserver' in window) {
        let esperaMedir = 0;
        new ResizeObserver(() => { cancelAnimationFrame(esperaMedir); esperaMedir = requestAnimationFrame(() => { medirPosiciones(); pedir(); }); }).observe(document.body);
    }
    medirPosiciones();
    pedir();

    // ---------- 15) Lo que queda lejos no se maqueta ni se pinta ----------
    // Con la página ya cargada se mide cada sección y se le pone content-visibility:auto con
    // su alto real: el navegador se salta las que no se ven (la portada mide unos 38.000 px)
    // y la barra de desplazamiento no da saltos. Si cambia el ancho, se vuelve a medir.
    // (La primera sección siempre se ve al llegar y las del 3D vigilan su propia escena.)
    (function aparcarSecciones() {
        if (!CSS.supports('content-visibility', 'auto')) return;
        const lista = $$('body > section, main > section, body > footer').filter((s, i) => i > 0 && !s.matches('.gym3d-seccion'));
        if (!lista.length) return;
        const medir = () => {
            lista.forEach(s => { s.style.contentVisibility = ''; });
            const altos = lista.map(s => s.getBoundingClientRect().height);
            lista.forEach((s, i) => { s.style.containIntrinsicSize = 'auto ' + Math.round(altos[i]) + 'px'; s.style.contentVisibility = 'auto'; });
        };
        const cuandoLibre = () => (window.requestIdleCallback ? requestIdleCallback(medir, { timeout: 2000 }) : setTimeout(medir, 300));
        if (document.readyState === 'complete') cuandoLibre(); else addEventListener('load', cuandoLibre, { once: true });
        let ancho = innerWidth, espera = 0;
        addEventListener('resize', () => {
            if (innerWidth === ancho) return;       // en el móvil, la barra del navegador solo cambia el alto
            ancho = innerWidth; clearTimeout(espera); espera = setTimeout(cuandoLibre, 400);
        }, { passive: true });
    })();

    // (14: los botones flotantes se apartan junto con el resto de la interfaz, en atr-vidrio.js)
})();
