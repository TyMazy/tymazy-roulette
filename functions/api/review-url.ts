export const onRequestGet: PagesFunction = async ({ env }) => {
  const url = env.GOOGLE_REVIEW_URL;

  if (!url) {
    return new Response("GOOGLE_REVIEW_URL missing", { status: 500 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Location": url,
      "Set-Cookie": "review_ok=1; Max-Age=3600; Path=/; Secure; 
SameSite=Lax"
    }
  });
};


