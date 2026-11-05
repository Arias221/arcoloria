/* Sello de Arcoloria: loto casi invisible fijo en la esquina inferior derecha.
   Abre un menú para elegir el panel de administración. Se usa en todas las páginas. */
(function () {
  if (window.__arcSello) return;
  window.__arcSello = true;

  var LOTO = '<path d="M20 3C25 9 25.5 17 20 24C14.5 17 15 9 20 3Z"/><path d="M20 24C12 23 6.5 17 5.5 9C13 10 18.5 15 20 24Z" opacity=".85"/><path d="M20 24C28 23 33.5 17 34.5 9C27 10 21.5 15 20 24Z" opacity=".85"/><path d="M7 27C13 24.5 27 24.5 33 27C27 29.5 13 29.5 7 27Z" opacity=".7"/>';
  var I_SERVER = '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6"/>';
  var I_MISION = '<path d="M7 4.5h10.5a2.5 2.5 0 0 1 0 5H17v8a2.5 2.5 0 0 1-2.5 2.5H6"/><path d="M7 4.5A2.5 2.5 0 0 0 4.5 7v1.5H7M7 4.5v13a2.5 2.5 0 0 1-2.5 2.5"/><path d="M11.5 10.5l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z"/>';
  var I_IR = '<path d="M9.5 6l6 6-6 6"/>';
  var ic = function (p) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };

  var css = '' +
    '.arc-sello{position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:calc(var(--arc-sello-b,10px) + env(safe-area-inset-bottom,0px));z-index:2147482000;' +
      'width:40px;height:40px;padding:6px;margin:0;border:0;border-radius:50%;background:none;cursor:pointer;opacity:.16;' +
      'transition:opacity .3s ease,transform .3s ease;-webkit-tap-highlight-color:transparent}' +
    '.arc-sello svg{display:block;width:100%;height:100%;fill:#F4B6CC;filter:drop-shadow(0 0 6px rgba(244,182,204,.45))}' +
    '.arc-sello:hover,.arc-sello:focus-visible{opacity:.55;transform:scale(1.08);outline:none}' +
    '.arc-sello-fondo{position:fixed;inset:0;z-index:2147482500;display:grid;place-items:center;padding:16px;background:rgba(16,8,14,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);' +
      'font:15px/1.4 Nunito,Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#FBE6CF}' +
    '.arc-sello-fondo[hidden]{display:none}' +
    '.arc-sello-caja{box-sizing:border-box;width:100%;max-width:400px;padding:22px 18px 16px;border-radius:26px;text-align:center;' +
      'background:linear-gradient(180deg,rgba(70,40,58,.95),rgba(44,26,38,.96));border:1px solid rgba(244,182,204,.4);box-shadow:0 20px 50px rgba(0,0,0,.45);animation:arcSelloIn .28s cubic-bezier(.2,.7,.2,1)}' +
    '@keyframes arcSelloIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}' +
    '.arc-sello-caja>svg{width:48px;height:38px;fill:#F4B6CC;filter:drop-shadow(0 0 10px rgba(244,182,204,.6))}' +
    '.arc-sello-caja h2{margin:6px 0 2px;font:600 1.5rem/1.2 Fraunces,Georgia,serif;color:#FFF1E0}' +
    '.arc-sello-caja p{margin:0 0 14px;color:rgba(251,230,207,.7)}' +
    '.arc-sello-op{box-sizing:border-box;display:grid;grid-template-columns:42px minmax(0,1fr) 18px;gap:12px;align-items:center;margin-top:10px;padding:11px;border-radius:18px;text-align:left;text-decoration:none;color:#FBE6CF;' +
      'background:rgba(255,236,220,.07);border:1px solid rgba(255,222,200,.26);transition:background .2s,border-color .2s}' +
    '.arc-sello-op:hover{background:rgba(255,236,220,.13);border-color:rgba(244,182,204,.55)}' +
    '.arc-sello-ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:rgba(244,182,204,.16);color:#F6C3D6}' +
    '.arc-sello-ic svg{width:22px;height:22px}.arc-sello-op>svg{width:18px;height:18px;color:#F6C3D6}' +
    '.arc-sello-op b{display:block;font-size:1rem}.arc-sello-op small{display:block;font-size:.8rem;color:rgba(251,230,207,.65);line-height:1.35}' +
    '.arc-sello-cerrar{margin-top:14px;min-height:40px;padding:0 20px;border-radius:999px;border:1px solid rgba(255,222,200,.3);background:transparent;color:#FBE6CF;font:inherit;font-weight:800;cursor:pointer}';

  function montar() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arc-sello';
    btn.setAttribute('aria-label', 'Administración');
    btn.innerHTML = '<svg viewBox="0 0 40 32" aria-hidden="true">' + LOTO + '</svg>';

    var menu = document.createElement('div');
    menu.className = 'arc-sello-fondo';
    menu.hidden = true;
    menu.innerHTML = '<div class="arc-sello-caja" role="dialog" aria-modal="true" aria-label="Administración">' +
      '<svg viewBox="0 0 40 32" aria-hidden="true">' + LOTO + '</svg><h2>Administración</h2><p>¿A qué panel quieres entrar?</p>' +
      '<a class="arc-sello-op" href="/panel/"><span class="arc-sello-ic">' + ic(I_SERVER) + '</span><span><b>Panel de Arcoloria</b><small>Servidores, eventos, novedades, equipo, redes y comandos</small></span>' + ic(I_IR) + '</a>' +
      '<a class="arc-sello-op" href="/misiones/admin.html"><span class="arc-sello-ic">' + ic(I_MISION) + '</span><span><b>Panel de misiones</b><small>Misiones, capítulos, NPCs y crónicas</small></span>' + ic(I_IR) + '</a>' +
      '<button type="button" class="arc-sello-cerrar">Cerrar</button></div>';

    document.body.appendChild(btn);
    document.body.appendChild(menu);

    var prevOverflow = '';
    function abrir() { prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; menu.hidden = false; }
    function cerrar() { menu.hidden = true; document.documentElement.style.overflow = prevOverflow; }
    btn.addEventListener('click', abrir);
    menu.querySelector('.arc-sello-cerrar').addEventListener('click', cerrar);
    menu.addEventListener('click', function (e) { if (e.target === menu) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) cerrar(); });

    // Si la página tiene una barra fija abajo (como el menú del Libro de Misiones en celular), se coloca encima.
    function ajustar() {
      var alto = 0;
      var barras = document.querySelectorAll('.nav-movil');
      for (var i = 0; i < barras.length; i++) {
        var r = barras[i].getBoundingClientRect();
        if (r.height && getComputedStyle(barras[i]).display !== 'none') alto = Math.max(alto, Math.round(window.innerHeight - r.top) + 8);
      }
      btn.style.bottom = alto ? alto + 'px' : '';
    }
    ajustar();
    window.addEventListener('resize', ajustar);
    setTimeout(ajustar, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
