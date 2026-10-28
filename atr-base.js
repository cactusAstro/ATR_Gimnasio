// ============================================
// ATR-GYM v6 — base de las páginas de disciplina
// Menú, revelado al hacer scroll, índice de la página, pestañas y utilidades.
// (La portada tiene su propio núcleo; esto solo se carga en las páginas nuevas.)
// ============================================
(function () {
    'use strict';
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    // ---- Menú: hamburguesa y desplegables
    const nav = $('#atrNav'), menu = $('#atrMenu'), burger = $('#atrBurger');
    if (burger) burger.addEventListener('click', () => {
        const abierto = menu.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(abierto));
    });
    const dds = $$('.dd', menu || document);
    const escritorio = matchMedia('(min-width: 921px) and (hover: hover)');
    function cerrarDD(salvo) {
        dds.forEach(d => { if (d !== salvo) { d.classList.remove('open'); d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); } });
    }
    dds.forEach(dd => {
        const btn = dd.querySelector('.dd-btn');
        let t;
        btn.addEventListener('click', () => {
            const abrir = !dd.classList.contains('open');
            cerrarDD(dd);
            dd.classList.toggle('open', abrir);
            btn.setAttribute('aria-expanded', String(abrir));
        });
        dd.addEventListener('mouseenter', () => { if (!escritorio.matches) return; clearTimeout(t); cerrarDD(dd); dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); });
        dd.addEventListener('mouseleave', () => { if (!escritorio.matches) return; t = setTimeout(() => { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }, 160); });
    });
    document.addEventListener('click', e => { if (!e.target.closest('.dd')) cerrarDD(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarDD(); });
    if (menu) menu.addEventListener('click', e => {
        if (!e.target.closest('a')) return;
        cerrarDD(); menu.classList.remove('open'); burger && burger.setAttribute('aria-expanded', 'false');
    });

    // ---- Menú con sombra y barra de progreso de lectura: una sola pasada por fotograma.
    // La barra se mueve con transform y la altura de la página se guarda (leerla en cada
    // evento de scroll obligaba a recalcular la página).
    const barra = $('#scrollProgress');
    let total = 0, pend = false;
    const medirTotal = () => { total = document.documentElement.scrollHeight - innerHeight; };
    function alDesplazar() {
        pend = false;
        const y = scrollY;
        if (nav) nav.classList.toggle('scrolled', y > 8);
        if (barra) barra.style.transform = 'scaleX(' + (total > 0 ? Math.min(1, y / total).toFixed(4) : 0) + ')';
    }
    const pedir = () => { if (!pend) { pend = true; requestAnimationFrame(alDesplazar); } };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', () => { medirTotal(); pedir(); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(() => { medirTotal(); pedir(); }).observe(document.body);
    medirTotal(); pedir();

    // ---- Revelado al hacer scroll (también barras de porcentaje)
    const obs = new IntersectionObserver(en => en.forEach(x => {
        if (x.isIntersecting) { x.target.classList.add('in'); obs.unobserve(x.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal, .barras').forEach(el => obs.observe(el));

    // ---- Índice de la página: marca la sección en la que estás
    const enlaces = $$('.pg-indice a');
    const nombreNav = $('#navHere');
    if (enlaces.length) {
        const mapa = new Map(enlaces.map(a => [a.getAttribute('href').slice(1), a]));
        const obsSec = new IntersectionObserver(en => en.forEach(x => {
            if (!x.isIntersecting) return;
            const a = mapa.get(x.target.id);
            if (!a) return;
            enlaces.forEach(e => e.classList.toggle('activo', e === a));
            a.scrollIntoView({ block: 'nearest', inline: 'center' });
            if (nombreNav) nombreNav.textContent = a.textContent.replace(/^\d+\s*/, '');
        }), { rootMargin: '-40% 0px -55% 0px' });
        mapa.forEach((a, id) => { const s = document.getElementById(id); if (s) obsSec.observe(s); });
    }

    // ---- Pestañas genéricas: <div class="pestanas"> con botones aria-controls
    $$('.pestanas').forEach(grupo => {
        const botones = $$('.pestana', grupo);
        botones.forEach(b => b.addEventListener('click', () => {
            botones.forEach(o => {
                const sel = o === b;
                o.setAttribute('aria-selected', String(sel));
                const panel = document.getElementById(o.getAttribute('aria-controls'));
                if (panel) panel.hidden = !sel;
            });
        }));
    });

    // ---- Año del pie
    const anio = $('#anioActual');
    if (anio) anio.textContent = new Date().getFullYear();

    // ---- Utilidades para las herramientas de cada página
    window.ATR = {
        num: v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; },
        kg: n => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 2 }),
        // redondeo a discos: en competición los intentos van de 2,5 en 2,5 kg
        disco: (n, paso = 2.5) => Math.round(n / paso) * paso,
        pitido(f, d, t) {
            try {
                const a = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)());
                if (a.state === 'suspended') a.resume();
                const o = a.createOscillator(), g = a.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                o.connect(g); g.connect(a.destination);
                const s = a.currentTime + (t || 0);
                g.gain.setValueAtTime(.12, s);
                g.gain.exponentialRampToValueAtTime(.0001, s + d);
                o.start(s); o.stop(s + d + .05);
            } catch (e) { }
        }
    };
})();
