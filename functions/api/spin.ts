export type SpinResult =
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

export const onRequest: PagesFunction = async ({ request, env }) => {
  try {
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const reviewOk = getCookie(request, "review_ok");
    if (reviewOk !== "1") {
      return json(
        { ok: false, error: "Avis requis. Clique d’abord sur « Laisser un avis Google »." },
        403
      );
    }

    if (!env.DB) {
      return json(
        { ok: false, error: "DB D1 non configurée (binding manquant)." },
        500
      );
    }

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";

    const cooldownHours = Number(env.COOLDOWN_HOURS || 24);
    const cooldownMs = cooldownHours * 60 * 60 * 1000;

    const row = await env.DB
      .prepare("SELECT last_ts FROM spins WHERE ip = ?")
      .bind(ip)
      .first<{ last_ts: number }>();

    const now = Date.now();

    if (row?.last_ts) {
      const elapsed = now - row.last_ts;
      if (elapsed < cooldownMs) {
        const remainingHours = Math.ceil((cooldownMs - elapsed) / 
3_600_000);
        return json(
          { ok: false, error: `Cooldown actif. Reviens dans 
${remainingHours}h.` },
          429
        );
      }
    }

    const isWin = Math.random() < 0.05;

    await env.DB
      .prepare(
        "INSERT INTO spins (ip, last_ts) VALUES (?, ?) ON CONFLICT(ip) DO 
UPDATE SET last_ts=excluded.last_ts"
      )
      .bind(ip, now)
      .run();

    const headers = new Headers();
    headers.set(
      "Set-Cookie",
      "review_ok=; Max-Age=0; Path=/; Secure; SameSite=Lax"
    );

    if (isWin) {
      const prize = Math.random() < 0.5 ? "1 café" : "1 crêpe beurre 
sucre";
      return json({ ok: true, result: "win", prize }, 200, headers);
    }

    return json(
      { ok: true, result: "lose", message: "Perdu 😅 Retente plus tard !" 
},
      200,
      headers
    );
  } catch (e: any) {
    return json({ ok: false, error: `Exception: ${e.message}` }, 500);
  }
};

