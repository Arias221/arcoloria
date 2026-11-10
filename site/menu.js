/* Menú de Arcoloria (botón ☰ y panel lateral) para páginas fuera del inicio, como el Libro de Misiones.
   Uso: <script src="/menu.js" data-into=".barra-in" data-hide=".volver-arco" defer></script>
   - data-into: dónde se agrega el botón (al final).
   - data-hide: lo que se oculta en celular, porque el menú ya lleva al inicio. */
(function () {
  if (window.__arcMenu) return;
  window.__arcMenu = true;
  var me = document.currentScript;
  var INTO = (me && me.dataset.into) || 'header';
  var HIDE = (me && me.dataset.hide) || '';

  var P = {
    home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    shield: '<path d="M12 2.8l7.5 3v5.5c0 4.6-3.1 8.3-7.5 10-4.4-1.7-7.5-5.4-7.5-10V5.8l7.5-3z"/><path d="M8.8 12.1l2.2 2.2 4.3-4.4"/>',
    cube: '<path d="M12 2.8l8 4.5v9.4l-8 4.5-8-4.5V7.3l8-4.5z"/><path d="M4 7.3l8 4.5 8-4.5"/><path d="M12 11.8v9.4"/>',
    quest: '<path d="M7 4.5h10.5a2.5 2.5 0 0 1 0 5H17v8a2.5 2.5 0 0 1-2.5 2.5H6"/><path d="M7 4.5A2.5 2.5 0 0 0 4.5 7v1.5H7M7 4.5v13a2.5 2.5 0 0 1-2.5 2.5"/><path d="M11.5 10.5l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  var DISCORD = '<path fill="currentColor" d="M19.3 5.4A16.6 16.6 0 0 0 15.2 4l-.5 1a15.4 15.4 0 0 0-5.4 0L8.8 4a16.5 16.5 0 0 0-4.1 1.4C2.1 9.2 1.4 13 1.7 16.7a16.7 16.7 0 0 0 5 2.6l1.1-1.7a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 11 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.6 16.6 0 0 0 5-2.6c.4-4.3-.7-8.1-3-11.3zM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z"/>';
  var WSP = '<path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.6-.4z"/>';
  var LOTO = '<path d="M20 3C25 9 25.5 17 20 24C14.5 17 15 9 20 3Z"/><path d="M20 24C12 23 6.5 17 5.5 9C13 10 18.5 15 20 24Z" opacity=".85"/><path d="M20 24C28 23 33.5 17 34.5 9C27 10 21.5 15 20 24Z" opacity=".85"/><path d="M7 27C13 24.5 27 24.5 33 27C27 29.5 13 29.5 7 27Z" opacity=".7"/>';
  var ic = function (p) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  var REDES = { discord: 'https://discord.gg/3YX8y5gcd9', wsp_nubelia: 'https://chat.whatsapp.com/L1Ubo5MOadRB4hAnHtanlP', wsp_solune: 'https://chat.whatsapp.com/BWZQAxKBx2PGxt9kHK41ai' };

  var css = '' +
    '.arcm-burger{display:none;flex:none;width:44px;height:44px;margin:0;padding:0;border:0;border-radius:16px;background:transparent;cursor:pointer;flex-direction:column;align-items:center;justify-content:center;gap:6px;-webkit-tap-highlight-color:transparent;transition:background .18s cubic-bezier(.34,1.56,.64,1),transform .18s cubic-bezier(.34,1.56,.64,1)}' +
    '.arcm-burger span{display:block;width:24px;height:2.5px;border-radius:2px;background:#FBE6CF;transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .2s}' +
    '.arcm-burger:hover{background:rgba(255,236,220,.14)}.arcm-burger:active{transform:scale(.94)}' +
    '.arcm-burger[aria-expanded="true"] span:nth-child(1){transform:translateY(8.5px) rotate(45deg)}.arcm-burger[aria-expanded="true"] span:nth-child(2){opacity:0}.arcm-burger[aria-expanded="true"] span:nth-child(3){transform:translateY(-8.5px) rotate(-45deg)}' +
    '@media (max-width:899px){.arcm-burger{display:inline-flex}' + (HIDE ? HIDE + '{display:none!important}' : '') + '}' +
    '.arcm-ov{position:fixed;inset:0;z-index:2147481000;background:rgba(14,8,12,.38);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:opacity .3s ease,visibility .3s}' +
    '.arcm-ov.open{opacity:1;visibility:visible}' +
    '.arcm{position:fixed;top:0;right:0;bottom:0;z-index:2147481001;box-sizing:border-box;width:min(310px,84vw);display:flex;flex-direction:column;' +
      'padding:calc(env(safe-area-inset-top,0px) + 18px) max(16px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 20px) 16px;' +
      'background:linear-gradient(180deg,rgba(62,32,52,.62),rgba(36,22,26,.66));-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);' +
      'border-left:1px solid rgba(255,222,200,.26);border-radius:28px 0 0 28px;box-shadow:-14px 0 40px rgba(0,0,0,.4),inset 2px 2px 6px -2px rgba(255,255,255,.22);' +
      'transform:translateX(105%);visibility:hidden;transition:transform .42s cubic-bezier(.2,.9,.25,1.05),visibility .42s;overflow-y:auto;overscroll-behavior:contain;' +
      'font-family:Nunito,Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#FBE6CF}' +
    '.arcm.open{transform:none;visibility:visible}' +
    '.arcm-head{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
    '.arcm-brand{display:inline-flex;align-items:center;gap:10px;color:#FBE6CF;text-decoration:none}' +
    '.arcm-brand svg{width:36px;height:29px;fill:#F4C9A2;filter:drop-shadow(0 0 8px rgba(244,201,162,.45))}' +
    '.arcm-brand b{font-family:Fraunces,Georgia,"Times New Roman",serif;font-variation-settings:"SOFT" 100;font-size:1.6rem;font-weight:600;line-height:1}' +
    '.arcm-close{width:42px;height:42px;padding:0;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,222,200,.26);background:rgba(255,236,220,.08);color:#FBE6CF;cursor:pointer}' +
    '.arcm-close svg{width:20px;height:20px}' +
    '.arcm-links{display:grid;gap:8px;margin-top:22px}' +
    '.arcm-links a{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:999rem;border:1px solid transparent;color:rgba(255,238,222,.92);text-decoration:none;font-size:1.05rem;font-weight:700;-webkit-tap-highlight-color:transparent;transition:background .18s,color .18s,transform .18s cubic-bezier(.34,1.56,.64,1)}' +
    '.arcm-links a svg{width:1.4rem;height:1.4rem;flex:none}' +
    '.arcm-links a:hover{background-color:rgba(255,236,220,.16);transform:rotate(-1.2deg);color:#FFD7AE}' +
    '.arcm-links a.active{background:linear-gradient(180deg,rgba(244,186,128,.42),rgba(160,96,60,.36));border-color:rgba(250,205,160,.5);box-shadow:0 0 18px rgba(240,180,120,.3),inset 2px 2px 5px -2px rgba(255,255,255,.45);color:#FFE9CF}' +
    '.arcm.open .arcm-links a{animation:arcmIn .45s cubic-bezier(.34,1.56,.64,1) both}' +
    '.arcm.open .arcm-links a:nth-child(2){animation-delay:.05s}.arcm.open .arcm-links a:nth-child(3){animation-delay:.1s}.arcm.open .arcm-links a:nth-child(4){animation-delay:.15s}' +
    '@keyframes arcmIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}' +
    '.arcm-soc{display:grid;gap:8px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,222,200,.26)}' +
    '.arcm-soc a{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:999px;text-decoration:none;color:#fff;font-weight:700}' +
    '.arcm-soc svg{width:22px;height:22px;flex:none}' +
    '.arcm-soc .dc{background:rgba(88,101,242,.38);border:1px solid rgba(160,170,255,.45)}.arcm-soc .ws{background:rgba(37,160,90,.34);border:1px solid rgba(140,230,170,.42)}' +
    '.arcm-foot{margin-top:auto;padding-top:24px;text-align:center;font-size:.72rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(251,230,207,.6)}';

  function montar() {
    var host = document.querySelector(INTO);
    if (!host) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var path = location.pathname;
    var enMisiones = /\/misiones\//.test(path);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'arcm-burger';
    btn.setAttribute('aria-label', 'Abrir menú'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'arcm');
    btn.innerHTML = '<span></span><span></span><span></span>';
    host.appendChild(btn);

    var ov = document.createElement('div'); ov.className = 'arcm-ov';
    var dr = document.createElement('aside'); dr.className = 'arcm'; dr.id = 'arcm'; dr.setAttribute('aria-label', 'Menú'); dr.inert = true;
    dr.innerHTML =
      '<div class="arcm-head"><a class="arcm-brand" href="/"><svg viewBox="0 0 40 32" aria-hidden="true">' + LOTO + '</svg><b>Arcoloria</b></a>' +
      '<button type="button" class="arcm-close" aria-label="Cerrar menú">' + ic(P.close) + '</button></div>' +
      '<nav class="arcm-links" aria-label="Secciones">' +
        '<a href="/">' + ic(P.home) + '<span>Inicio</span></a>' +
        '<a href="/#resumen">' + ic(P.shield) + '<span>Reglas</span></a>' +
        '<a href="/#addons">' + ic(P.cube) + '<span>Addons</span></a>' +
        '<a href="/misiones/"' + (enMisiones ? ' class="active" aria-current="page"' : '') + '>' + ic(P.quest) + '<span>Misiones</span></a>' +
      '</nav>' +
      '<div class="arcm-soc">' +
        '<a class="dc" data-soc="discord" href="' + REDES.discord + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">' + DISCORD + '</svg>Discord</a>' +
        '<a class="ws" data-soc="wsp_nubelia" href="' + REDES.wsp_nubelia + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">' + WSP + '</svg>Nubelia</a>' +
        '<a class="ws" data-soc="wsp_solune" href="' + REDES.wsp_solune + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">' + WSP + '</svg>Solune</a>' +
      '</div>' +
      '<div class="arcm-foot">Comunidad de Minecraft</div>';
    document.body.appendChild(ov); document.body.appendChild(dr);

    function abrir() { dr.inert = false; dr.classList.add('open'); ov.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; }
    function cerrar() { dr.inert = true; dr.classList.remove('open'); ov.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; }
    btn.addEventListener('click', function () { dr.classList.contains('open') ? cerrar() : abrir(); });
    ov.addEventListener('click', cerrar);
    dr.querySelector('.arcm-close').addEventListener('click', cerrar);
    dr.addEventListener('click', function (e) { if (e.target.closest('.arcm-links a')) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dr.classList.contains('open')) cerrar(); });

    // Enlaces de Discord y WhatsApp actualizados desde el panel
    if (location.protocol !== 'file:' && window.fetch) {
      fetch('/api/data').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var s = d && d.social; if (!s) return;
        dr.querySelectorAll('[data-soc]').forEach(function (a) { if (s[a.dataset.soc]) a.href = s[a.dataset.soc]; });
      }).catch(function () {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
