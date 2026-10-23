// Serverless API for the party poll.
// GET  /api/responses        -> { responses: [...] }
// POST /api/responses {name, dates, none} -> saves (or overwrites) that person's picks
//
// Storage: Upstash Redis over its REST API. Works with either set of env vars
// Vercel may inject (KV_REST_API_* or UPSTASH_REDIS_REST_*). With neither set
// (local testing), it falls back to in-memory storage.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "party-poll:responses";

const memory = globalThis.__pollMemory || (globalThis.__pollMemory = new Map());

async function redis(command) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function getAll() {
  if (!URL_) return [...memory.values()];
  const flat = (await redis(["HGETALL", KEY])) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) {
    try { out.push(JSON.parse(flat[i])); } catch {}
  }
  return out;
}

async function save(entry) {
  const field = entry.name.trim().toLowerCase();
  if (!URL_) { memory.set(field, entry); return; }
  await redis(["HSET", KEY, field, JSON.stringify(entry)]);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const responses = await getAll();
      responses.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
      return res.status(200).json({ responses });
    }
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body || "{}");
      const name = String(body?.name || "").trim().slice(0, 40);
      if (!name) return res.status(400).json({ error: "Name is required" });
      const dates = Array.isArray(body.dates) ? body.dates.map(String).slice(0, 20) : [];
      const none = Boolean(body.none) && dates.length === 0;
      if (!none && dates.length === 0) {
        return res.status(400).json({ error: "Pick at least one date, or tap 'None of these work'" });
      }
      const entry = { name, dates, none, updatedAt: Date.now() };
      await save(entry);
      return res.status(200).json({ ok: true, entry });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Storage error. Is the Redis database connected?" });
  }
}
