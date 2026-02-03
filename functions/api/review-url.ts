export async function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "https://search.google.com/local/writereview?cid=6568096842773154371"
    }
  });
}
