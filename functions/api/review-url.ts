export const onRequestGet: PagesFunction = async ({ env }) => {
  const url = env.GOOGLE_REVIEW_URL;

  if (!url) {
    return new Response("GOOGLE_REVIEW_URL missing", { status: 500 });
  }

  // Cookie qui “débloque” 1 tentative de roulette
  // (durée courte volontaire)
  const headers = new Headers();
  headers.set("Set-Cookie", "review_ok=1; Max-Age=3600; Path=/; Secure; 
SameSite=Lax");

  // Redirection vers la page d’avis Google
  headers.set("Location", url);

  return new Response(null, { status: 302, headers });
};

