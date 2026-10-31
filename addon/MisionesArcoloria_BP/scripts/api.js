// Conexión con Supabase desde el servidor (BDS).
// Usa la clave secreta guardada en config/default/secrets.json: nunca está en el código.

import { http, HttpRequest, HttpHeader, HttpRequestMethod } from "@minecraft/server-net";
import { secrets, variables } from "@minecraft/server-admin";
import { MAX_PETICIONES, TIEMPO_PETICION } from "./config.js";

let urlBase = null;
let clave = null;
let servidor = null;
let activas = 0;
const cola = [];

export function iniciarApi() {
  urlBase = variables.get("supabase_url");
  clave = secrets.get("supabase_secret");
  const s = String(variables.get("servidor") || "").trim().toLowerCase();
  servidor = /^[a-z0-9_]+$/.test(s) ? s : null;
  if (!urlBase) console.error("[Misiones] Falta 'supabase_url' en config/default/variables.json");
  if (!clave) console.error("[Misiones] Falta 'supabase_secret' en config/default/secrets.json");
  if (!servidor) console.error("[Misiones] Falta 'servidor' en config/default/variables.json (por ejemplo \"nubelia\" o \"solune\"). Las misiones quedan desactivadas para no mezclar datos.");
  return !!(urlBase && clave && servidor);
}

/** Servidor de este mundo (nubelia, solune...). */
export function servidorActual() {
  return servidor;
}

function siguiente() {
  while (activas < MAX_PETICIONES && cola.length) {
    const tarea = cola.shift();
    activas++;
    tarea().finally(() => { activas--; siguiente(); });
  }
}

function encolar(fn) {
  return new Promise((ok, mal) => {
    cola.push(() => fn().then(ok, mal));
    siguiente();
  });
}

async function peticion(metodo, ruta, cuerpo) {
  if (!urlBase || !clave || !servidor) throw new Error("Conexión no configurada");
  const req = new HttpRequest(urlBase + ruta);
  req.method = metodo;
  req.timeout = TIEMPO_PETICION;
  req.headers = [
    new HttpHeader("apikey", clave),
    new HttpHeader("Content-Type", "application/json"),
    new HttpHeader("Accept", "application/json"),
  ];
  if (cuerpo !== undefined) req.body = JSON.stringify(cuerpo);

  const res = await http.request(req);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status} en ${ruta}: ${String(res.body).slice(0, 200)}`);
  }
  return res.body ? JSON.parse(res.body) : null;
}

/** Lee una tabla, solo los datos de este servidor. ruta: "misiones?select=*" */
export function leer(ruta) {
  const filtro = (ruta.includes("?") ? "&" : "?") + "servidor=eq." + encodeURIComponent(servidor);
  return encolar(() => peticion(HttpRequestMethod.Get, "/rest/v1/" + ruta + filtro));
}

/** Llama una función de la base, siempre indicando el servidor. */
export function rpc(nombre, parametros) {
  return encolar(() => peticion(HttpRequestMethod.Post, "/rest/v1/rpc/" + nombre, { p_servidor: servidor, ...(parametros || {}) }));
}
