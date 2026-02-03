type SpinResult =
  | { ok: true; result: "win"; prize: "1 café" | "1 crêpe beurre sucre" }
  | { ok: true; result: "lose"; message: string }
  | { ok: false; error: string };

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return 
decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function json(data: SpinResult, status = 200, extraHeaders?: HeadersInit) 
{
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  // 1) “Forcer l’avis” : on exige le cookie posé par /api/review-url
  const reviewOk = getCookie(request, "review_ok");
  if (reviewOk !== "1") {
    return json({ ok: false, error: "Avis Google requis avant de tourner." 
}, 403);
  }

  // 2) Identifier “client” : on utilise une empreinte simple
  // - cf-connecting-ip est fourni par Cloudflare
  // - pour une version plus “privacy”, on peut basculer vers un id en 
// localStorage (mais là tu as D1 déjà)
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";

// 3) Cooldown (24h)
const cooldownHours = Number(env.COOLDOWN_HOURS || 24);
const cooldownMs = cooldownHours * 60 * 60 * 1000;

// Identifier le client via IP (option B)
const ip =
  request.headers.get("cf-connecting-ip") ||
  request.headers.get("x-forwarded-for") ||
  "unknown";

// Table D1 attendue : spins(ip TEXT PRIMARY KEY, last_ts INTEGER NOT 
NULL)
// La table est créée via migration (étape 3)

const row = await env.DB
  .prepare("SELECT last_ts FROM spins WHERE ip = ?")
  .bind(ip)
  .first<{ last_ts: number }>();

const now = Date.now();

if (row?.last_ts) {
  const elapsed = now - row.last_ts;

  if (elapsed < cooldownMs) {
    const remainingMs = cooldownMs - elapsed;
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

    return json({
      ok: false,
      error: `Cooldown actif. Reviens dans ${remainingHours}h.`,
    });
  }
}

