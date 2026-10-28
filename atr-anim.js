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
        let dpr = 1, ancho = 0, alto = 0, motas = [], heroVisible = true, raf = 0, ultimo = 0;
        const crear = () => {
            const r = hero.getBoundingClientRect();
            dpr = Math.min(devicePixelRatio || 1, 2); ancho = r.width; alto = r.height;
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
            for (const m of motas) {
                if (dt) {
                    m.f += dt * .6;
                    m.x += (m.vx + Math.sin(m.f) * 4) * dt;
                    m.y += (m.vy + Math.cos(m.f * .7) * 2) * dt;
                    if (m.y < -10) { m.y = alto + 10; m.x = Math.random() * ancho; }
                    if (m.x > ancho + 10) m.x = -10; else if (m.x < -10) m.x = ancho + 10;
                }
                ctx.fillStyle = `rgba(246, 236, 214, ${(luz(m.x, m.y) * m.a).toFixed(3)})`;
                ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
            }
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
            new IntersectionObserver(en => { heroVisible = en[0].isIntersecting; arrancar(); }).observe(hero);
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

    // ---------- 6) Consejos y prompts: tarjetas que se apilan ----------
    const pilas = $$('#consejos, #ia');
    pilas.forEach(sec => { sec.classList.add('apilar'); $$('.tip-card', sec).forEach((c, n) => c.style.setProperty('--n', n)); });
    const apilarActivo = () => matchMedia('(min-width: 900px) and (min-height: 700px)').matches && !reduce;
    function actualizarPilas() {
        if (!apilarActivo()) return;
        pilas.forEach(sec => {
            const cartas = $$('.tip-card', sec);
            cartas.forEach((c, i) => {
                const sig = cartas[i + 1];
                if (!sig) { c.style.transform = ''; c.style.filter = ''; return; }
                const r = c.getBoundingClientRect(), rs = sig.getBoundingClientRect();
                const tapado = clamp((r.bottom - rs.top) / r.height, 0, 1);
                c.style.transform = `scale(${1 - tapado * .05})`;
                c.style.filter = `brightness(${1 - tapado * .4})`;
            });
        });
    }

    // ---------- 7) Historia: la línea avanza con la lectura ----------
    const linea = $('#historia .timeline-container');
    const hitos = $$('#historia .timeline-item');
    function actualizarHistoria() {
        if (!linea) return;
        const r = linea.getBoundingClientRect();
        const p = clamp((vh * .62 - r.top) / r.height, 0, 1);
        linea.style.setProperty('--prog', reduce ? 1 : p);
        hitos.forEach(h => h.classList.toggle('encendido', reduce || h.getBoundingClientRect().top < vh * .62));
    }

    // ---------- 8) Pie: ATR—GYM grande que sube despacio ----------
    const mega = $$('.foot-mega span');
    function actualizarPie() {
        if (!mega.length) return;
        const r = mega[0].parentElement.getBoundingClientRect();
        const p = clamp((vh - r.top) / (r.height + vh * .35), 0, 1);
        mega.forEach((s, i) => {
            const q = reduce ? 1 : clamp(p * 1.6 - i * .06, 0, 1);
            s.style.setProperty('--sube', ((1 - ease(q)) * 100) + '%');
        });
    }

    // ---------- 9) Indicador lateral de "serie" ----------
    const secciones = $$('body > section[id], main > section[id]');
    let indicador = null;
    if (secciones.length) {
        indicador = document.createElement('div');
        indicador.className = 'indicador';
        indicador.setAttribute('aria-hidden', 'true');
        indicador.innerHTML = '<b id="indTxt">SERIE 01/' + String(secciones.length).padStart(2, '0') + '</b><div class="ind-barra"><i></i></div>';
        document.body.appendChild(indicador);
    }
    function actualizarIndicador() {
        if (!indicador) return;
        let idx = 0;
        secciones.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * .5) idx = i; });
        const total = document.documentElement.scrollHeight - vh;
        indicador.querySelector('.ind-barra i').style.transform = `scaleY(${total > 0 ? scrollY / total : 0})`;
        $('#indTxt').textContent = 'SERIE ' + String(idx + 1).padStart(2, '0') + '/' + String(secciones.length).padStart(2, '0');
    }

    // ---------- 10) Menú: se esconde al bajar, vuelve al subir ----------
    const nav = $('#atrNav'), menu = $('#atrMenu');
    let ultimoY = scrollY;
    function actualizarNav() {
        const y = scrollY, abierto = menu && (menu.classList.contains('open') || $('.dd.open'));
        if (nav) nav.classList.toggle('oculta', !abierto && y > ultimoY && y > 400);
        ultimoY = y;
    }

    // ---------- 11) Cinta: avanza despacio y siempre igual ----------
    const cinta = $('.cinta-track');
    let cintaX = 0;
    function moverCinta(dt) {
        if (!cinta || reduce) return;
        const mitad = cinta.scrollWidth / 2;
        cintaX -= .04 * dt;
        if (cintaX <= -mitad) cintaX += mitad;
        cinta.style.transform = `translateX(${cintaX.toFixed(1)}px)`;
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

    // ---------- Bucle principal ----------
    let hayScroll = true, tPrev = performance.now();
    addEventListener('scroll', () => { hayScroll = true; }, { passive: true });
    addEventListener('resize', () => { hayScroll = true; }, { passive: true });
    function frame(now) {
        const dt = Math.min(64, now - tPrev); tPrev = now;
        moverCinta(dt);
        if (hayScroll) {
            hayScroll = false;
            actualizarPilas();
            actualizarHistoria();
            actualizarPie();
            actualizarIndicador();
            actualizarNav();
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // ---------- 14) Móvil: los botones flotantes se apartan mientras lees ----------
    (function botonesQueSeApartan() {
        const movil = matchMedia('(max-width: 820px)');
        const raiz = document.documentElement;
        const chat = $('#chatVentana');
        let ultimoY = scrollY, parado = 0;
        const mostrar = () => raiz.classList.remove('fabs-fuera');
        addEventListener('scroll', () => {
            const y = scrollY, bajando = y > ultimoY + 4, subiendo = y < ultimoY - 4;
            if (bajando || subiendo) ultimoY = y;
            clearTimeout(parado);
            if (!movil.matches || (chat && chat.classList.contains('activo'))) { mostrar(); return; }
            if (bajando && y > 400) raiz.classList.add('fabs-fuera');
            else if (subiendo) mostrar();
            parado = setTimeout(mostrar, 1100);
        }, { passive: true });
        document.addEventListener('click', e => { if (e.target.closest('.btn-anadir-carrito')) mostrar(); });
    })();
})();
