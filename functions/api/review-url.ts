export const onRequestGet: PagesFunction = async ({ env }) => {
  const url = env.GOOGLE_REVIEW_URL;

  if (!url) {
    return new Response("GOOGLE_REVIEW_URL missing", { status: 500 
});
  }

  return Response.redirect(url, 302);
};
