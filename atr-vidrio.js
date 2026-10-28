// ============================================
// ATR-GYM — cristal líquido (Liquid Glass), como en iOS 26 y macOS Tahoe
// 1) Refracción: el borde de cada pieza flotante dobla lo que hay detrás
//    como una lente, con separación de colores (solo en Chrome, Edge y
//    Android, que permiten filtros SVG en backdrop-filter).
// 2) Una sola fuente de luz para toda la interfaz: el filo de cada cristal
//    brilla hacia el puntero; en el móvil, la luz gira despacio al desplazarse.
// 3) Reflejo que sigue al dedo o al ratón dentro de cada pieza.
// 4) Selector de cristal: una lente que marca la opción elegida en la barra
//    de pestañas, los controles segmentados y el menú. Muelle físico, se
//    estira al moverse, crece y amplía al pulsar, y se puede arrastrar.
// 5) Barra de pestañas del móvil.
// 6) Entradas escalonadas de las tarjetas.
// Iconos de Phosphor Icons (licencia MIT, ver LICENCIAS.txt).
// ============================================
(function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sinTransparencia = matchMedia('(prefers-reduced-transparency: reduce)').matches;
    const raiz = document.documentElement;
    const tactil = matchMedia('(hover: none)').matches;

    // ---------- 1) refracción ----------
    const conLente = !!navigator.userAgentData && CSS.supports('backdrop-filter', 'blur(1px)') && !sinTransparencia;
    const SVGNS = 'http://www.w3.org/2000/svg';
    let defs = null, nLente = 0;
    function prepararDefs() {
        if (defs) return;
        const s = document.createElementNS(SVGNS, 'svg');
        s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
        s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        defs = document.createElementNS(SVGNS, 'defs');
        s.appendChild(defs); document.body.appendChild(s);
    }
    // mapa de desplazamiento de un rectángulo redondeado: cero en el centro y
    // máximo en el borde, siempre en la dirección de la normal (rojo = x, verde = y)
    function mapa(w, h, radio, banda) {
        const k = Math.min(1, 360 / Math.max(w, h));            // a menos resolución en piezas grandes
        const W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
        const hw = w / 2, hh = h / 2, r = Math.min(radio, hw, hh);
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
            const px = (i + .5) / k - hw, py = (j + .5) / k - hh;
            const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
            const fuera = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
            const dist = -(fuera + Math.min(Math.max(qx, qy), 0) - r);   // distancia al borde, positiva dentro
            let nx = 0, ny = 0;
            if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = qx / l * Math.sign(px); ny = qy / l * Math.sign(py); }
            else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
            const f = dist > 0 ? Math.pow(Math.max(0, 1 - dist / banda), 2.2) : 0;
            const o = (j * W + i) * 4;
            d[o] = 128 + nx * f * 127; d[o + 1] = 128 + ny * f * 127; d[o + 2] = 128; d[o + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        return c.toDataURL();
    }
    function lente(el, escala, banda, W, H, variable = '--lente', dispersion = true) {
        let w = W, h = H;
        if (!w) { const r = el.getBoundingClientRect(); w = Math.round(r.width); h = Math.round(r.height); }
        if (!w || !h) return;
        if (el._lente && el._lente.w === w && el._lente.h === h) return;
        prepararDefs();
        const id = (el._lente && el._lente.id) || 'lente-' + (++nLente);
        const radio = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2, w / 2);
        let f = document.getElementById(id);
        if (!f) { f = document.createElementNS(SVGNS, 'filter'); f.id = id; defs.appendChild(f); }
        [['x', 0], ['y', 0], ['width', w], ['height', h], ['filterUnits', 'userSpaceOnUse'], ['primitiveUnits', 'userSpaceOnUse'], ['color-interpolation-filters', 'sRGB']]
            .forEach(([a, v]) => f.setAttribute(a, v));
        const canal = (s, m, res) => `<feDisplacementMap in="SourceGraphic" in2="mapa" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="d${res}"/>` +
            `<feColorMatrix in="d${res}" type="matrix" values="${m}" result="${res}"/>`;
        f.innerHTML = `<feImage href="${mapa(w, h, radio, banda)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="mapa"/>` +
            canal(escala, '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', 'r') +
            canal(escala * (dispersion ? .94 : 1), '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', 'g') +
            canal(escala * (dispersion ? .88 : 1), '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0', 'b') +
            '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>';
        el._lente = { id, w, h };
        el.style.setProperty(variable, `url(#${id})`);
    }
    const LENTES = [['.atr-nav', 34, 16], ['.barra-pestanas', 40, 18], ['.fab', 22, 12], ['.carrito-flotante', 22, 12], ['.chat-burbuja', 22, 12]];
    function lentes() { LENTES.forEach(([sel, esc, banda]) => document.querySelectorAll(sel).forEach(el => lente(el, esc, banda))); }
    if (conLente) {
        raiz.classList.add('con-lente');
        let espera;
        const rehacer = () => { clearTimeout(espera); espera = setTimeout(lentes, 120); };
        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(rehacer);
            addEventListener('load', () => LENTES.forEach(([sel]) => document.querySelectorAll(sel).forEach(el => ro.observe(el))));
        }
        addEventListener('resize', rehacer);
        addEventListener('load', lentes);
    }

    // ---------- 2) una sola luz ----------
    let anguloObjetivo = 215, angulo = 215, luzPend = false;
    function moverLuz() {
        luzPend = false;
        let delta = ((anguloObjetivo - angulo + 540) % 360) - 180;
        angulo += delta * .12;
        raiz.style.setProperty('--luz-angulo', angulo.toFixed(1) + 'deg');
        if (Math.abs(delta) > .3) { luzPend = true; requestAnimationFrame(moverLuz); }
    }
    const pedirLuz = () => { if (!luzPend && !reduce) { luzPend = true; requestAnimationFrame(moverLuz); } };
    if (!tactil) addEventListener('pointermove', e => {
        anguloObjetivo = Math.atan2(e.clientX - innerWidth / 2, -(e.clientY - innerHeight / 2)) * 180 / Math.PI;
        pedirLuz();
    }, { passive: true });
    else addEventListener('scroll', () => { anguloObjetivo = 200 + scrollY * .045; pedirLuz(); }, { passive: true });

    // ---------- 3) reflejo que sigue al puntero ----------
    const CRISTAL = '.atr-nav, .dd-panel, .barra-pestanas, .fab, .carrito-flotante, .chat-burbuja, .chat-ventana, .modal-contenido, .trofeos, .lector, ' +
        '.timer-panel, .sup-card, .producto-card, .tip-card, .dis-card, .mito-card, .cx, .test-card, .atr-form-card, .tab-contenido, .consejo, ' +
        '.timeline-card, .dia-card, .btn-iron, .sup-btn, .bx, .btn-anadir-carrito';
    let pieza = null, px = 0, py = 0, pendiente = false;
    function reflejar() {
        pendiente = false;
        if (!pieza) return;
        const r = pieza.getBoundingClientRect();
        if (!r.width || !r.height) return;
        pieza.style.setProperty('--mx', ((px - r.left) / r.width * 100).toFixed(1) + '%');
        pieza.style.setProperty('--my', ((py - r.top) / r.height * 100).toFixed(1) + '%');
    }
    if (!reduce) addEventListener('pointermove', e => {
        px = e.clientX; py = e.clientY;
        pieza = e.target && e.target.closest ? e.target.closest(CRISTAL) : null;
        if (!pendiente) { pendiente = true; requestAnimationFrame(reflejar); }
    }, { passive: true });

    // ---------- 4) selector de cristal ----------
    // Una lente de cristal marca la opción elegida en la barra de pestañas, en
    // los controles segmentados y, en el ordenador, en el menú superior. Se
    // mueve con un muelle físico (posición, ancho y alto a la vez), se estira
    // en la dirección del movimiento, crece al pulsar y, mientras el dedo está
    // encima, deja ver la opción ampliada bajo un cristal que refracta los
    // bordes. Se puede arrastrar de una opción a otra: al soltar se elige la
    // que queda debajo. El brillo sigue a la luz de toda la interfaz y se
    // retrasa un poco respecto al movimiento, como un reflejo de verdad.
    const MUELLE = { k: 640, c: 40 };                 // rigidez y amortiguación: llega rápido y rebota apenas
    const esActivo = el => el.classList.contains('activo') || el.classList.contains('activa') ||
        el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-current') === 'page';
    let bloquearClic = false;
    addEventListener('click', ev => { if (bloquearClic && ev.isTrusted) { ev.preventDefault(); ev.stopPropagation(); } }, true);

    const refractar = lente;                          // (dentro del selector, «lente» es el elemento)
    function selector(cont, { elementos, modo = 'activo', crece = 1.12, alElegir = null }) {
        if (cont._selector) return cont._selector;
        const hover = modo === 'hover';
        cont.classList.add('con-selector', hover ? 'selector-hover' : 'selector-activo');
        if (getComputedStyle(cont).position === 'static') cont.style.position = 'relative';
        const lente = document.createElement('span'), lupa = document.createElement('span');
        lente.className = 'sel-lente'; lupa.className = 'sel-lupa';
        lente.setAttribute('aria-hidden', 'true'); lupa.setAttribute('aria-hidden', 'true');
        cont.prepend(lente); cont.append(lupa);
        // arrastrar en horizontal elige; en vertical la página sigue desplazándose (salvo si el control se desplaza solo)
        if (!hover && cont.scrollWidth <= cont.clientWidth + 1) cont.style.touchAction = 'pan-y';

        const e = { x: 0, y: 0, w: 0, h: 0, s: 1, a: 0, vx: 0, vy: 0, vw: 0, vh: 0, vs: 0, tx: 0, ty: 0, tw: 0, th: 0, ts: 1, ta: 0, t: 0, vivo: false };
        let pulsado = null, bajo = null, dedo = null, x0 = 0, y0 = 0, arrastra = false, radio = '';
        const lista = () => elementos(cont).filter(el => el.offsetWidth);
        // caja de una opción en las coordenadas del contenedor (sin transformaciones: no la mueve el propio efecto)
        function caja(el) {
            let x = 0, y = 0, n = el;
            while (n && n !== cont) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
            if (n !== cont) { const rc = cont.getBoundingClientRect(), r = el.getBoundingClientRect(); x = r.left - rc.left - cont.clientLeft + cont.scrollLeft; y = r.top - rc.top - cont.clientTop + cont.scrollTop; }
            return { x, y, w: el.offsetWidth, h: el.offsetHeight };
        }
        const local = ev => { const rc = cont.getBoundingClientRect(); return [ev.clientX - rc.left - cont.clientLeft + cont.scrollLeft, ev.clientY - rc.top - cont.clientTop + cont.scrollTop]; };
        function forma(el) {
            const r = getComputedStyle(el).borderTopLeftRadius;
            if (r !== radio) { radio = r; lente.style.borderRadius = lupa.style.borderRadius = r; }
        }
        function pintar() {
            const v = Math.hypot(e.vx, e.vy), est = Math.min(.24, v / 2600);       // se estira con la velocidad
            const horiz = Math.abs(e.vx) >= Math.abs(e.vy);
            const sx = e.s * (horiz ? 1 + est : 1 / Math.sqrt(1 + est)), sy = e.s * (horiz ? 1 / Math.sqrt(1 + est) : 1 + est);
            const t = `translate(${e.x.toFixed(2)}px, ${e.y.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
            const w = Math.max(0, e.w).toFixed(2) + 'px', h = Math.max(0, e.h).toFixed(2) + 'px';
            lente.style.width = lupa.style.width = w; lente.style.height = lupa.style.height = h;
            lente.style.transform = lupa.style.transform = t;
            lente.style.opacity = Math.max(0, Math.min(1, e.a)).toFixed(3);
            // el reflejo se queda atrás al moverse
            lente.style.setProperty('--lx', Math.max(8, Math.min(92, 50 - e.vx / 34)).toFixed(1) + '%');
            lente.style.setProperty('--ly', Math.max(-20, Math.min(40, -8 - e.vy / 40)).toFixed(1) + '%');
        }
        function saltar() { Object.assign(e, { x: e.tx, y: e.ty, w: e.tw, h: e.th, s: e.ts, a: e.ta, vx: 0, vy: 0, vw: 0, vh: 0, vs: 0 }); pintar(); }
        function paso(t) {
            const dt = Math.min(.03, (t - e.t) / 1000 || .016); e.t = t;
            const { k, c } = MUELLE;
            e.vx += (k * (e.tx - e.x) - c * e.vx) * dt; e.x += e.vx * dt;
            e.vy += (k * (e.ty - e.y) - c * e.vy) * dt; e.y += e.vy * dt;
            e.vw += (k * (e.tw - e.w) - c * e.vw) * dt; e.w += e.vw * dt;
            e.vh += (k * (e.th - e.h) - c * e.vh) * dt; e.h += e.vh * dt;
            e.vs += (980 * (e.ts - e.s) - 30 * e.vs) * dt; e.s += e.vs * dt;   // al pulsar, un rebote más vivo
            e.a += (e.ta - e.a) * Math.min(1, dt * 16);
            pintar();
            const quieto = Math.abs(e.tx - e.x) + Math.abs(e.ty - e.y) + Math.abs(e.tw - e.w) + Math.abs(e.th - e.h) < .3 &&
                Math.abs(e.vx) + Math.abs(e.vy) + Math.abs(e.vw) + Math.abs(e.vh) < .8 && Math.abs(e.ts - e.s) < .002 && Math.abs(e.vs) < .03 && Math.abs(e.ta - e.a) < .01;
            if (quieto && !pulsado) { e.vivo = false; saltar(); return; }
            requestAnimationFrame(paso);
        }
        function animar() {
            if (reduce) { saltar(); return; }
            if (!e.vivo) { e.vivo = true; e.t = performance.now(); requestAnimationFrame(paso); }
        }
        // lleva la lente a una opción (o la esconde si no hay ninguna)
        function ir(el, inmediato) {
            if (!el) { e.ta = 0; if (inmediato) saltar(); else animar(); return; }
            const b = caja(el); if (!b.w) return;
            forma(el);
            const aparece = e.a < .04;
            Object.assign(e, { tx: b.x, ty: b.y, tw: b.w, th: b.h, ta: 1 });
            if (inmediato) { saltar(); return; }
            if (aparece) { Object.assign(e, { x: b.x, y: b.y, w: b.w, h: b.h, vx: 0, vy: 0, vw: 0, vh: 0, s: hover ? .9 : .82 }); }
            animar();
        }
        function marcarBajo(el) { lista().forEach(o => o.classList.toggle('bajo-lente', o === el)); }
        function sincronizar(inmediato) {
            if (pulsado || hover) return;
            ir(lista().find(esActivo) || null, inmediato);
        }
        // la opción más cercana a un punto (la fila pesa más que la columna)
        function cercana(px, py) {
            let mejor = null, d = Infinity;
            for (const el of lista()) {
                const b = caja(el);
                const dx = Math.max(b.x - px, 0, px - b.x - b.w), dy = Math.max(b.y - py, 0, py - b.y - b.h), dd = dx * dx + 4 * dy * dy;
                if (dd < d) { d = dd; mejor = el; }
            }
            return mejor;
        }
        const unaFila = () => { const l = lista(); return l.length > 1 && l.every(el => Math.abs(caja(el).y - caja(l[0]).y) < 4); };

        function mover(ev) {
            if (!pulsado) return;
            dedo = local(ev);
            const r = lupa.getBoundingClientRect();
            if (r.width) { lupa.style.setProperty('--fx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%'); lupa.style.setProperty('--fy', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%'); }
            if (hover || (!arrastra && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 7)) return;
            arrastra = true;
            const el = cercana(dedo[0], dedo[1]); if (!el) return;
            if (el !== bajo) { bajo = el; marcarBajo(el); forma(el); }
            const b = caja(el), l = lista();
            if (unaFila()) {
                // en una fila, la lente va pegada al dedo y toma el ancho de la opción de debajo
                const ini = caja(l[0]), fin = caja(l[l.length - 1]);
                e.tx = Math.max(ini.x - 6, Math.min(fin.x + fin.w - b.w + 6, dedo[0] - b.w / 2));
                e.ty = b.y; e.tw = b.w; e.th = b.h;
            } else {
                // en varias filas, salta a la opción y tira un poco hacia el dedo
                e.tx = b.x + (dedo[0] - b.x - b.w / 2) * .16; e.ty = b.y + (dedo[1] - b.y - b.h / 2) * .16; e.tw = b.w; e.th = b.h;
            }
            animar();
        }
        function terminar(ev, cancelado) {
            removeEventListener('pointermove', mover); removeEventListener('pointerup', soltar); removeEventListener('pointercancel', cancelar);
            const el = bajo, eligeOtra = !cancelado && arrastra && el;
            pulsado = null; dedo = null; arrastra = false;
            cont.classList.remove('sel-pulsado'); marcarBajo(null);
            e.ts = 1;
            if (hover) { animar(); return; }
            if (eligeOtra) {
                // al arrastrar, el navegador no siempre lanza el clic: se lanza aquí una sola vez
                bloquearClic = true;
                setTimeout(() => { bloquearClic = false; el.click(); alElegir && alElegir(el); setTimeout(() => sincronizar(), 30); }, 0);
                ir(el);
            } else {
                if (!cancelado && el) alElegir && alElegir(el);
                setTimeout(() => sincronizar(), 40);      // si la página no cambia la opción, vuelve a la que estaba
                if (cancelado) sincronizar(); else animar();
            }
        }
        const soltar = ev => terminar(ev, false), cancelar = ev => terminar(ev, true);
        cont.addEventListener('pointerdown', ev => {
            if (ev.button > 0) return;
            const el = lista().find(o => o.contains(ev.target)); if (!el) return;
            pulsado = el; bajo = el; x0 = ev.clientX; y0 = ev.clientY; arrastra = false; dedo = local(ev);
            cont.classList.add('sel-pulsado'); marcarBajo(el);
            e.ts = crece; ir(el);
            mover(ev);
            addEventListener('pointermove', mover, { passive: true }); addEventListener('pointerup', soltar); addEventListener('pointercancel', cancelar);
        });
        if (hover) {
            cont.addEventListener('pointerover', ev => {
                if (ev.pointerType === 'touch') return;
                const el = lista().find(o => o.contains(ev.target));
                if (el) { bajo = el; ir(el); }
            });
            cont.addEventListener('pointerleave', () => { if (!pulsado) { e.ta = 0; animar(); } });
        } else {
            new MutationObserver(() => sincronizar()).observe(cont, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'aria-pressed', 'aria-current'] });
            requestAnimationFrame(() => sincronizar(true));
        }
        if ('ResizeObserver' in window) new ResizeObserver(() => { if (hover) { if (e.ta && bajo) ir(bajo, true); } else sincronizar(true); }).observe(cont);
        // refracción de la lupa en Chrome, Edge y Android (el mismo filtro que el resto del cristal)
        if (conLente) {
            let tam = '';
            cont.addEventListener('pointerdown', () => requestAnimationFrame(() => {
                const w = Math.round(e.tw), h = Math.round(e.th), k = w + 'x' + h + radio;
                if (!w || k === tam) return; tam = k;
                if (lupa._lente) lupa._lente.w = -1;
                refractar(lupa, Math.min(24, h * .5), Math.min(14, h * .3), w, h, '--lupa', false);
            }));
        }
        return (cont._selector = { ir, sincronizar });
    }

    // controles segmentados (también los que crean más tarde las escenas 3D)
    const SEGMENTADOS = [
        ['.tabs-calculadoras', c => c.querySelectorAll(':scope > .tab-btn')],
        ['.ruta-tabs', c => c.querySelectorAll(':scope > .ruta-tab')],
        ['.pestanas', c => c.querySelectorAll(':scope > .pestana')],
        ['.segmentos', c => c.querySelectorAll(':scope > button')],
        ['.escena3d-planos', c => c.querySelectorAll(':scope > button')],
        ['.gym3d-zonas', c => c.querySelectorAll(':scope > button')],
        ['.pg-indice ol', c => c.querySelectorAll(':scope > li > a')]
    ];
    function montarSegmentados() {
        SEGMENTADOS.forEach(([sel, f]) => document.querySelectorAll(sel).forEach(c => {
            if (!c._selector && f(c).length > 1) selector(c, { elementos: x => [...f(x)], crece: sel === '.pg-indice ol' ? 1.06 : 1.1 });
        }));
    }
    montarSegmentados();
    let esperaSeg;
    new MutationObserver(() => { clearTimeout(esperaSeg); esperaSeg = setTimeout(montarSegmentados, 250); }).observe(document.body, { childList: true, subtree: true });

    // menú superior del ordenador: la lente acompaña al ratón entre las opciones
    if (matchMedia('(hover: hover) and (min-width: 921px)').matches) {
        const menu = document.querySelector('.atr-links');
        if (menu) selector(menu, { modo: 'hover', crece: 1.06, elementos: c => [...c.querySelectorAll(':scope > li > a, :scope > li > .dd-btn')] });
        document.querySelectorAll('.dd-panel').forEach(p => selector(p, { modo: 'hover', crece: 1.03, elementos: c => [...c.querySelectorAll(':scope > a')] }));
    }

    // ---------- 5) barra de pestañas del móvil ----------
    const enPortada = !!document.getElementById('disciplinas');
    const base = enPortada ? '' : 'index.html';
    const PESTANAS = [
        ['top', 'Inicio', 'house'],
        ['disciplinas', 'Disciplinas', 'barbell'],
        ['rutinas', 'Rutinas', 'clipboard-text'],
        ['calculadoras', 'Calcular', 'calculator'],
        ['contacto', 'Contacto', 'chat-circle-text']
    ];
    const ICONOS = {"house": "<svg class=\"linea\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z\"/></svg><svg class=\"lleno\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z\"/></svg>", "barbell": "<svg class=\"linea\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z\"/></svg><svg class=\"lleno\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M200,64V192a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V136H104v56a16,16,0,0,1-16,16H72a16,16,0,0,1-16-16V64A16,16,0,0,1,72,48H88a16,16,0,0,1,16,16v56h48V64a16,16,0,0,1,16-16h16A16,16,0,0,1,200,64ZM36,72H32A16,16,0,0,0,16,88v32H8.27A8.18,8.18,0,0,0,0,127.47,8,8,0,0,0,8,136h8v32a16,16,0,0,0,16,16h4a4,4,0,0,0,4-4V76A4,4,0,0,0,36,72Zm220,55.47a8.18,8.18,0,0,0-8.25-7.47H240V88a16,16,0,0,0-16-16h-4a4,4,0,0,0-4,4V180a4,4,0,0,0,4,4h4a16,16,0,0,0,16-16V136h8A8,8,0,0,0,256,127.47Z\"/></svg>", "clipboard-text": "<svg class=\"linea\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z\"/></svg><svg class=\"lleno\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M200,32H163.74a47.92,47.92,0,0,0-71.48,0H56A16,16,0,0,0,40,48V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm-72,0a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm32,128H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z\"/></svg>", "calculator": "<svg class=\"linea\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M80,120h96a8,8,0,0,0,8-8V64a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v48A8,8,0,0,0,80,120Zm8-48h80v32H88ZM200,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V40A16,16,0,0,0,200,24Zm0,192H56V40H200ZM100,148a12,12,0,1,1-12-12A12,12,0,0,1,100,148Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,140,148Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,180,148Zm-80,40a12,12,0,1,1-12-12A12,12,0,0,1,100,188Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,140,188Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,180,188Z\"/></svg><svg class=\"lleno\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M200,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V40A16,16,0,0,0,200,24ZM88,200a12,12,0,1,1,12-12A12,12,0,0,1,88,200Zm0-40a12,12,0,1,1,12-12A12,12,0,0,1,88,160Zm40,40a12,12,0,1,1,12-12A12,12,0,0,1,128,200Zm0-40a12,12,0,1,1,12-12A12,12,0,0,1,128,160Zm40,40a12,12,0,1,1,12-12A12,12,0,0,1,168,200Zm0-40a12,12,0,1,1,12-12A12,12,0,0,1,168,160Zm16-56a8,8,0,0,1-8,8H80a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8h96a8,8,0,0,1,8,8Z\"/></svg>", "chat-circle-text": "<svg class=\"linea\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M168,112a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,112Zm-8,24H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm72-8A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z\"/></svg><svg class=\"lleno\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm32,128H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z\"/></svg>"};
    const barra = document.createElement('nav');
    barra.className = 'barra-pestanas';
    barra.setAttribute('aria-label', 'Accesos rápidos');
    barra.innerHTML = PESTANAS.map(([id, txt, ico]) =>
        `<a href="${id === 'top' && !enPortada ? 'index.html' : base + '#' + id}" data-id="${id}">${ICONOS[ico]}<span>${txt}</span></a>`).join('');
    document.body.appendChild(barra);
    const enlaces = [...barra.querySelectorAll('a')];
    selector(barra, { elementos: c => [...c.querySelectorAll(':scope > a')], crece: 1.16 });
    const marcar = id => enlaces.forEach(a => {
        const si = a.dataset.id === id;
        a.classList.toggle('activa', si);
        if (si && a.getAttribute('aria-current') !== 'page') a.setAttribute('aria-current', 'page');
        else if (!si && a.hasAttribute('aria-current')) a.removeAttribute('aria-current');
    });
    // la pestaña elegida queda marcada mientras la página se desplaza hasta su apartado
    let fijada = 0;
    barra.addEventListener('click', ev => { const a = ev.target.closest('a'); if (!a) return; fijada = performance.now() + 1200; marcar(a.dataset.id); });
    if (!enPortada) marcar('disciplinas');

    // pestaña activa según el apartado visible; al bajar se encoge, al subir se abre
    const secciones = enPortada ? PESTANAS.map(([id]) => document.getElementById(id)).filter(Boolean) : [];
    let ultimoY = scrollY, pend = false;
    function alDesplazar() {
        pend = false;
        const y = scrollY;
        if (secciones.length && performance.now() > fijada) {
            let actual = 'top';
            for (const s of secciones) if (s.getBoundingClientRect().top < innerHeight * .4) actual = s.id;
            marcar(actual);
        }
        if (!reduce) {
            if (y > ultimoY + 6 && y > 240) barra.classList.add('mini');
            else if (y < ultimoY - 6 || y < 240) barra.classList.remove('mini');
        }
        // arriba del todo la pantalla queda limpia: los botones flotantes aparecen al bajar
        document.body.classList.toggle('en-portada', y < 420);
        ultimoY = y;
    }
    addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(alDesplazar); } }, { passive: true });
    alDesplazar();

    // ---------- 6) entradas escalonadas: cada tarjeta un poco después que la anterior ----------
    addEventListener('load', () => {
        const grupos = new Map();
        document.querySelectorAll('.reveal, .animar-scroll').forEach(el => {
            if (el.tagName === 'SECTION' || el.closest('.atr-hero')) return;
            const p = el.parentElement; if (!grupos.has(p)) grupos.set(p, []);
            grupos.get(p).push(el);
        });
        grupos.forEach(lista => lista.forEach((el, i) => el.style.setProperty('--n', Math.min(i, 6))));
    });
})();
