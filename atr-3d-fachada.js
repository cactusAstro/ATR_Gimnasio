// ============================================
// ATR-GYM — imagen previa y perfil ligero de las escenas 3D en móviles y tablets
// En un iPhone SE la escena de la portada tardaba más de 6 s en montarse y la de Boxeo más de 10 s sin terminar,
// con la página frenada todo ese tiempo, aunque nadie hubiera tocado el 3D. En pantallas táctiles se ve una
// imagen de la escena al instante y el 3D (Three.js, texturas, shaders) no se pide hasta que se toca.
// En ordenador no cambia nada: el 3D se monta solo, como antes. Con ?3d=auto en la dirección se salta la
// imagen también en el móvil (útil para medir).
// ============================================
(function () {
    'use strict';
    const grueso = matchMedia('(pointer: coarse)').matches;
    const tactil = grueso && !/[?&]3d=auto\b/.test(location.search);
    window.ATR3D_tactil = tactil;

    // Perfil ligero (pantallas táctiles): los materiales físicos (barniz, tela) pasan a estándar. En un iPhone lo que más
    // tarda al montar una escena es compilar sus shaders, y así hay un 20 % menos de código que compilar; medido en la
    // portada, la escena se ve casi igual (un 5 % menos de luz media). Devuelve el mismo Three.js con ese cambio.
    window.ATR3D_lite = grueso;
    window.ATR3D_ligero = function (T) {
        if (!grueso) return T;
        const fisicas = ['clearcoat', 'clearcoatRoughness', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheen', 'sheenRoughness',
            'sheenColor', 'sheenColorMap', 'sheenRoughnessMap', 'transmission', 'transmissionMap', 'thickness', 'thicknessMap', 'ior', 'iridescence',
            'iridescenceIOR', 'iridescenceMap', 'attenuationColor', 'attenuationDistance', 'anisotropy', 'specularIntensity', 'specularColor',
            'specularIntensityMap', 'specularColorMap', 'dispersion'];
        class Estandar extends T.MeshStandardMaterial { constructor(p = {}) { const q = Object.assign({}, p); fisicas.forEach(k => delete q[k]); super(q); } }
        return Object.assign({}, T, { MeshPhysicalMaterial: Estandar });
    };

    // Pone la imagen y el botón dentro de la caja del 3D y devuelve una promesa que se cumple al tocarla.
    // `poster` es la ruta sin final: hay una imagen vertical (móvil) y otra horizontal (tablet), hechas con el mismo
    // perfil ligero que se monta después, para que al aparecer el 3D no cambie nada de golpe.
    // `cargando` es el texto que ya usa la escena mientras se monta («Montando el gimnasio…»).
    window.ATR3D_fachada = function (caja, poster, etiqueta, cargando) {
        return new Promise(resolver => {
            caja.classList.add('fachada');
            const img = new Image();
            img.className = 'fachada-poster';
            img.alt = '';
            img.decoding = 'async';
            img.loading = 'lazy';
            img.src = poster + (caja.clientWidth / Math.max(1, caja.clientHeight) >= 1.15 ? '-horizontal' : '-vertical') + '.webp';
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'fachada-boton';
            boton.textContent = etiqueta;
            caja.append(img, boton);
            const empezar = () => {
                if (caja.dataset.iniciar) return;
                caja.dataset.iniciar = '1';
                boton.disabled = true;
                boton.textContent = cargando;
                boton.setAttribute('aria-busy', 'true');
                resolver();
            };
            caja.addEventListener('click', empezar);
        });
    };

    // Cuando la escena está lista, la imagen se funde y se quita del documento.
    window.ATR3D_quitarFachada = function (caja) {
        if (!caja.classList.contains('fachada')) return;
        setTimeout(() => {
            caja.querySelectorAll('.fachada-poster, .fachada-boton').forEach(e => e.remove());
            caja.classList.remove('fachada');
        }, 700);
    };
})();
