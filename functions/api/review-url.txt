export async function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "https://search.google.com/local/writereview?placeid=0x5b318dbbb6838243"
    }
  });
}
