type SpinResult =
  | { ok: true; result: "win"; prize: "1 café" | "1 crêpe beurre sucre" }
  | { ok: true; result: "lose"; message: string }
  | { ok: false; error: string };

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function json(data: SpinResult, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  // 1) Forcer le passage par l'avis Google (cookie posé par /api/review-url)
  const reviewOk = getCookie(request, "review_ok");
  if (reviewOk !== "1") {
    return json({ ok: false, error: "Avis Google requis avant de tourner." }, 403);
  }

  // 2) Identifier le client (IP Cloudflare)
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";

  // 3) Cooldown (heures -> ms)
  const cooldownHours = Number(env.COOLDOWN_HOURS || 24);
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  // Table D1 attendue : spins(ip TEXT PRIMARY KEY, last_ts INTEGER NOT NULL)
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
      return json(
        { ok: false, error: `Cooldown actif. Reviens dans ${remainingHours}h.` },
        429
      );
    }
  }

  // 4) Tirage 5% win / 95% lose
  const isWin = Math.random() < 0.05;

  // 5) Enregistrer le spin + retirer le cookie (repassage par avis pour rejouer)
  await env.DB
    .prepare(
      "INSERT INTO spins (ip, last_ts) VALUES (?, ?) ON CONFLICT(ip) DO UPDATE SET last_ts=excluded.last_ts"
    )
    .bind(ip, now)
    .run();

  const headers = new Headers();
  headers.set("Set-Cookie", "review_ok=; Max-Age=0; Path=/; Secure; SameSite=Lax");

  if (isWin) {
    const prize = Math.random() < 0.5 ? "1 café" : "1 crêpe beurre sucre";
    return json({ ok: true, result: "win", prize }, 200, headers);
  }

  const loseMsg = (env.NO_PRIZE_LABEL as string) || "Merci ❤️ Pas de gain cette fois.";
  return json({ ok: true, result: "lose", message: loseMsg }, 200, headers);
};
