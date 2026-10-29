// Conexión con Supabase desde el servidor (BDS).
// Usa la clave secreta guardada en config/default/secrets.json: nunca está en el código.

import { http, HttpRequest, HttpHeader, HttpRequestMethod } from "@minecraft/server-net";
import { secrets, variables } from "@minecraft/server-admin";
import { MAX_PETICIONES, TIEMPO_PETICION } from "./config.js";

let urlBase = null;
let clave = null;
let activas = 0;
const cola = [];

export function iniciarApi() {
  urlBase = variables.get("supabase_url");
  clave = secrets.get("supabase_secret");
  if (!urlBase) console.error("[Misiones] Falta 'supabase_url' en config/default/variables.json");
  if (!clave) console.error("[Misiones] Falta 'supabase_secret' en config/default/secrets.json");
  return !!(urlBase && clave);
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
  if (!urlBase || !clave) throw new Error("Conexión no configurada");
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

/** Lee una tabla. ruta: "misiones?select=*" */
export function leer(ruta) {
  return encolar(() => peticion(HttpRequestMethod.Get, "/rest/v1/" + ruta));
}

/** Llama una función de la base. */
export function rpc(nombre, parametros) {
  return encolar(() => peticion(HttpRequestMethod.Post, "/rest/v1/rpc/" + nombre, parametros || {}));
}
