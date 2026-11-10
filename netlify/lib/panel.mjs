// Control de los servidores a través de la API del panel (Pterodactyl).
// La clave vive solo en las variables de entorno de Netlify:
//   PTERO_KEY          clave de cliente del panel (empieza por ptlc_)   — obligatoria
//   PTERO_URL          dirección del panel (por defecto https://panel.aslanhost.com)
//   PTERO_SERVIDORES   códigos de 8 caracteres permitidos, separados por comas (opcional;
//                      si está vacío se muestran todos los servidores de la cuenta)

const SENALES = ["start", "stop", "restart", "kill"];
const ID_OK = /^[a-z0-9]{8}$/;

export class PanelError extends Error {
  constructor(msg, status = 502) { super(msg); this.status = status; }
}

function conf() {
  const key = (process.env.PTERO_KEY || "").trim();
  if (!key) throw new PanelError("Falta configurar PTERO_KEY en Netlify.", 503);
  const url = (process.env.PTERO_URL || "https://panel.aslanhost.com").trim().replace(/\/+$/, "");
  const lista = (process.env.PTERO_SERVIDORES || "").split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return { key, url, lista };
}

async function llamar(c, ruta, opciones = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opciones.timeout || 7000);
  try {
    const r = await fetch(c.url + "/api/client" + ruta, {
      method: opciones.method || "GET",
      signal: ctrl.signal,
      headers: {
        authorization: "Bearer " + c.key,
        accept: "application/json",
        "content-type": "application/json"
      },
      body: opciones.body ? JSON.stringify(opciones.body) : undefined
    });
    if (r.status === 401 || r.status === 403) throw new PanelError("El panel rechazó la clave (PTERO_KEY). Revisa que sea correcta y no esté borrada.", 502);
    if (r.status === 404) throw new PanelError("Ese servidor no existe en el panel o la clave no tiene acceso.", 404);
    if (r.status === 409 || r.status === 502) throw new PanelError("El servidor no está encendido.", 409);
    if (r.status === 429) throw new PanelError("Demasiadas peticiones al panel. Espera un momento.", 429);
    if (!r.ok) throw new PanelError("El panel respondió con un error (" + r.status + ").", 502);
    return r.status === 204 ? null : await r.json().catch(() => null);
  } catch (e) {
    if (e instanceof PanelError) throw e;
    throw new PanelError("No se pudo conectar con el panel.", 502);
  } finally { clearTimeout(t); }
}

function permitido(c, id) {
  if (!ID_OK.test(id)) throw new PanelError("Código de servidor no válido.", 400);
  if (c.lista.length && !c.lista.includes(id)) throw new PanelError("Ese servidor no está permitido en PTERO_SERVIDORES.", 403);
}

const IP_PRIVADA = /^(0\.0\.0\.0|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

// Jugadores conectados desde el /estado del script del servidor (addons_danedd.py).
async function jugadores(host, puerto) {
  if (!host || IP_PRIVADA.test(host) || !puerto) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(`http://${host}:${puerto}/estado`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j.players !== "number") return null;
    return {
      online: j.players,
      max: typeof j.maxPlayers === "number" ? j.maxPlayers : null,
      nombres: Array.isArray(j.names) ? j.names.slice(0, 60).map((n) => String(n).slice(0, 40)) : []
    };
  } catch {
    return null;
  } finally { clearTimeout(t); }
}

export async function listarServidores() {
  const c = conf();
  const lista = await llamar(c, "?per_page=100");
  const servidores = ((lista && lista.data) || [])
    .map((s) => s.attributes || {})
    .filter((s) => s.identifier && (!c.lista.length || c.lista.includes(s.identifier)));

  return Promise.all(servidores.map(async (s) => {
    const allocs = ((s.relationships && s.relationships.allocations && s.relationships.allocations.data) || []).map((a) => a.attributes || {});
    const prin = allocs.find((a) => a.is_default) || allocs[0] || {};
    const host = prin.ip_alias || prin.ip || "";
    const [res, jug] = await Promise.all([
      llamar(c, `/servers/${s.identifier}/resources`, { timeout: 5000 }).catch(() => null),
      jugadores(host, prin.port)
    ]);
    const a = (res && res.attributes) || {};
    const r = a.resources || {};
    const estado = s.is_suspended ? "suspendido" : s.is_installing ? "instalando" : a.current_state || "desconocido";
    return {
      id: s.identifier,
      nombre: String(s.name || s.identifier).slice(0, 60),
      descripcion: String(s.description || "").slice(0, 120),
      direccion: host && prin.port ? `${host}:${prin.port}` : "",
      estado,
      ram: { usada: r.memory_bytes ?? null, limite: s.limits && s.limits.memory ? s.limits.memory * 1024 * 1024 : null },
      cpu: typeof r.cpu_absolute === "number" ? Math.round(r.cpu_absolute) : null,
      encendidoDesde: typeof r.uptime === "number" ? r.uptime : null,
      jugadores: estado === "running" ? jug : null
    };
  }));
}

export async function cambiarEstado(id, senal) {
  const c = conf();
  permitido(c, id);
  if (!SENALES.includes(senal)) throw new PanelError("Acción no válida.", 400);
  await llamar(c, `/servers/${id}/power`, { method: "POST", body: { signal: senal } });
  return { ok: true };
}

// Aviso dentro del juego antes de reiniciar o apagar. El texto lo arma el servidor, no la página.
export async function avisar(id, tipo, segundos) {
  const c = conf();
  permitido(c, id);
  let texto;
  if (tipo === "cancelado") {
    texto = "§a✔ Aviso cancelado: el servidor sigue encendido.";
  } else {
    const s = Math.round(Number(segundos));
    if (!Number.isFinite(s) || s < 1 || s > 900) throw new PanelError("Tiempo de aviso no válido.", 400);
    const accion = tipo === "apagado" ? "se apagará" : "se reiniciará";
    const cuando = s >= 60 && s % 60 === 0 ? `${s / 60} ${s === 60 ? "minuto" : "minutos"}` : `${s} segundos`;
    texto = `§e⚠ El servidor ${accion} en ${cuando}.`;
  }
  await llamar(c, `/servers/${id}/command`, { method: "POST", body: { command: "say " + texto } });
  return { ok: true };
}
