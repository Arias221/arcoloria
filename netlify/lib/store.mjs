import { getStore } from "@netlify/blobs";

// Acceso al almacenamiento. En Netlify usa Netlify Blobs; para pruebas locales (ARCO_LOCAL_STORE) usa una carpeta.
export async function openStores() {
  const dir = process.env.ARCO_LOCAL_STORE;
  if (dir) return { data: await localStore(dir + "/data"), img: await localStore(dir + "/img") };
  return {
    data: getStore({ name: "arcoloria-data", consistency: "strong" }),
    img: getStore({ name: "arcoloria-img" })
  };
}

async function localStore(dir) {
  const fs = await import("node:fs/promises");
  await fs.mkdir(dir, { recursive: true });
  const p = (k) => dir + "/" + encodeURIComponent(k);
  return {
    async get(k, o = {}) {
      try { const t = await fs.readFile(p(k), "utf8"); return o.type === "json" ? JSON.parse(t) : t; } catch { return null; }
    },
    async setJSON(k, v) { await fs.writeFile(p(k), JSON.stringify(v)); },
    async set(k, buf, o = {}) {
      await fs.writeFile(p(k), Buffer.from(buf));
      await fs.writeFile(p(k) + ".meta", JSON.stringify(o.metadata || {}));
    },
    async getWithMetadata(k) {
      try {
        const data = await fs.readFile(p(k));
        const metadata = JSON.parse(await fs.readFile(p(k) + ".meta", "utf8"));
        return { data, metadata };
      } catch { return null; }
    }
  };
}
