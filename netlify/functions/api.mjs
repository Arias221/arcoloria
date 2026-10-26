// API de Arcoloria: datos públicos, panel de administración, imágenes y estado de los servidores.
import { openStores } from "../lib/store.mjs";

export const config = { path: "/api/*" };

const MAX_IMG = 4 * 1024 * 1024; // 4 MB
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SERVER_IDS = ["nubelia", "solune"];

const DEFAULT_DATA = {
  servers: {
    nubelia: {
      name: "NUBELIA", tagline: "Reino de las nubes", ip: "172.93.110.62", port: "2092", version: "",
      addons: [
        { name: "Crops & Farms", desc: "Cultivos, cocina y animales", img: "img/addons/crops-farms.jpg", link: "guias/guia-crops-farms.html" },
        { name: "Actions & Stuff", desc: "Texturas con nombre", img: "img/addons/actions-stuff.jpg", link: "guias/guia-actions-and-stuff.html" }
      ],
      systems: [], kits: []
    },
    solune: {
      name: "SOLUNE", tagline: "Reino entre el sol y la luna", ip: "172.93.110.62", port: "2054", version: "",
      addons: [
        { name: "Crops & Farms", desc: "Cultivos, cocina y animales", img: "img/addons/crops-farms.jpg", link: "guias/guia-crops-farms.html" },
        { name: "Actions & Stuff", desc: "Texturas con nombre", img: "img/addons/actions-stuff.jpg", link: "guias/guia-actions-and-stuff.html" }
      ],
      systems: [], kits: []
    }
  },
  events: [],
  news: [],
  team: []
};

/* ---------- utilidades ---------- */
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const err = (msg, status = 400) => json({ error: msg }, status);

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
function adminCheck(req) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return err("Falta configurar ADMIN_PASSWORD en Netlify.", 503);
  const h = req.headers.get("authorization") || "";
  const given = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!given || !safeEqual(given, pass)) return err("Contraseña incorrecta.", 401);
  return null;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const str = (v, max = 400) => (typeof v === "string" ? v : v == null ? "" : String(v)).trim().slice(0, max);
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v);
const okImg = (v) => {
  const s = str(v, 300);
  return /^(\/api\/img\/[a-z0-9]+|img\/[\w./-]+|https:\/\/[\w.-]+\/[^\s"'<>]*)$/i.test(s) ? s : "";
};
const okLink = (v) => {
  const s = str(v, 300);
  return /^(guias\/[\w.-]+\.html|https:\/\/[^\s"'<>]+)$/i.test(s) ? s : "";
};
const okServer = (v) => (SERVER_IDS.includes(v) ? v : "ambos");

/* ---------- limpieza de cada colección ---------- */
function cleanServer(s = {}, base = {}) {
  return {
    name: str(s.name ?? base.name, 40),
    tagline: str(s.tagline ?? base.tagline, 80),
    ip: str(s.ip ?? base.ip, 80),
    port: str(s.port ?? base.port, 8).replace(/[^\d]/g, ""),
    version: str(s.version, 30),
    addons: (Array.isArray(s.addons) ? s.addons : []).slice(0, 40).map((a) => ({
      name: str(a.name, 60), desc: str(a.desc, 140), img: okImg(a.img), link: okLink(a.link)
    })).filter((a) => a.name),
    systems: (Array.isArray(s.systems) ? s.systems : []).slice(0, 40).map((a) => ({
      name: str(a.name, 60), desc: str(a.desc, 200), icon: str(a.icon, 20)
    })).filter((a) => a.name),
    kits: (Array.isArray(s.kits) ? s.kits : []).slice(0, 20).map((a) => ({
      name: str(a.name, 50), items: str(a.items, 240), code: str(a.code, 60), note: str(a.note, 80)
    })).filter((a) => a.name || a.code)
  };
}
const CLEAN = {
  servers(v) {
    const out = {};
    for (const id of SERVER_IDS) out[id] = cleanServer((v || {})[id], DEFAULT_DATA.servers[id]);
    return out;
  },
  events(v) {
    return (Array.isArray(v) ? v : []).slice(0, 60).map((e) => ({
      id: str(e.id, 20) || uid(), title: str(e.title, 90), desc: str(e.desc, 1200), img: okImg(e.img),
      server: okServer(e.server), start: isDate(e.start) ? e.start : "", end: isDate(e.end) ? e.end : ""
    })).filter((e) => e.title);
  },
  news(v) {
    return (Array.isArray(v) ? v : []).slice(0, 80).map((n) => ({
      id: str(n.id, 20) || uid(), title: str(n.title, 90), text: str(n.text, 2000), img: okImg(n.img),
      server: okServer(n.server), date: isDate(n.date) ? n.date : new Date().toISOString().slice(0, 10)
    })).filter((n) => n.title);
  },
  team(v) {
    return (Array.isArray(v) ? v : []).slice(0, 40).map((t) => ({
      id: str(t.id, 20) || uid(), gamertag: str(t.gamertag, 40), role: str(t.role, 30),
      discord: str(t.discord, 40), whatsapp: str(t.whatsapp, 40), server: okServer(t.server)
    })).filter((t) => t.gamertag);
  }
};

async function readData(store) {
  const d = (await store.get("data", { type: "json" })) || {};
  return {
    servers: CLEAN.servers(d.servers || DEFAULT_DATA.servers),
    events: CLEAN.events(d.events), news: CLEAN.news(d.news), team: CLEAN.team(d.team)
  };
}

/* ---------- estado del servidor (mcstatus.io) ---------- */
async function serverStatus(server) {
  const url = `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(server.ip)}:${encodeURIComponent(server.port)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) return { ok: false };
    const s = await r.json();
    return {
      ok: true, online: !!s.online,
      players: s.players ? { online: s.players.online ?? null, max: s.players.max ?? null } : null,
      version: s.version ? s.version.name || null : null
    };
  } catch {
    return { ok: false };
  } finally { clearTimeout(t); }
}

/* ---------- router ---------- */
export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [a, b] = parts;
  const { data: store, img: imgStore } = await openStores();

  try {
    // Público
    if (req.method === "GET" && a === "data" && !b) {
      const d = await readData(store);
      const today = new Date().toISOString().slice(0, 10);
      d.events = d.events.filter((e) => !e.end || e.end.slice(0, 10) >= today)
        .sort((x, y) => (x.start || "").localeCompare(y.start || ""));
      d.news = d.news.sort((x, y) => y.date.localeCompare(x.date));
      return json(d, 200, { "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=15, stale-while-revalidate=60" });
    }
    if (req.method === "GET" && a === "img" && b) {
      if (!/^[a-z0-9]+$/.test(b)) return err("No encontrado", 404);
      const got = await imgStore.getWithMetadata(b, { type: "arrayBuffer" });
      if (!got) return err("No encontrado", 404);
      return new Response(got.data, { headers: { "content-type": got.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (req.method === "GET" && a === "status" && SERVER_IDS.includes(b)) {
      const d = await readData(store);
      const st = await serverStatus(d.servers[b]);
      return json(st, 200, { "cache-control": "public, max-age=30", "netlify-cdn-cache-control": "public, s-maxage=60" });
    }

    // Administración
    if (a === "admin") {
      const denied = adminCheck(req);
      if (denied) return denied;
      if (req.method === "GET" && b === "data") {
        const d = await readData(store);
        return json(d);
      }
      if (req.method === "PUT" && b === "save") {
        // Guarda varias colecciones en una sola escritura para no pisar cambios.
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") return err("Datos no válidos.");
        const d = await readData(store);
        const out = {};
        for (const k of Object.keys(CLEAN)) if (k in body) { d[k] = CLEAN[k](body[k]); out[k] = d[k]; }
        if (!Object.keys(out).length) return err("No hay nada para guardar.");
        await store.setJSON("data", d);
        return json({ ok: true, ...out });
      }
      if (req.method === "PUT" && b && CLEAN[b]) {
        const body = await req.json().catch(() => null);
        if (body == null) return err("Datos no válidos.");
        const d = await readData(store);
        d[b] = CLEAN[b](body);
        await store.setJSON("data", d);
        return json({ ok: true, [b]: d[b] });
      }
      if (req.method === "POST" && b === "upload") {
        const type = (req.headers.get("content-type") || "").split(";")[0].trim();
        if (!IMG_TYPES.includes(type)) return err("Solo se aceptan imágenes JPG, PNG, WEBP o GIF.");
        const buf = await req.arrayBuffer();
        if (!buf.byteLength) return err("La imagen está vacía.");
        if (buf.byteLength > MAX_IMG) return err("La imagen pesa demasiado (máximo 4 MB).");
        const key = uid();
        await imgStore.set(key, buf, { metadata: { type } });
        return json({ ok: true, url: "/api/img/" + key });
      }
      if (req.method === "POST" && b === "check") return json({ ok: true });
      return err("Acción no válida.", 404);
    }
    return err("No encontrado", 404);
  } catch (e) {
    console.error(e);
    return err("Error del servidor. Intenta de nuevo.", 500);
  }
};
