// Wird vom Uptime-Dienst aufgerufen: ohne Anmeldung, macht eine triviale
// Abfrage und antwortet mit 200. Hält zugleich das Gratis-Projekt wach, das
// nach sieben Tagen ohne Anfragen pausiert.
//
// Bewusst ohne fremde Bibliothek: Ein JSR-Import ließ die Funktion nicht
// starten (BOOT_ERROR), und ein REST-Aufruf genügt hier vollständig.
//
// Der Anon-Key reicht: Er darf nur lesen, was die Regeln freigeben, und die
// leere Liste genügt als Lebenszeichen. Der Service-Role-Key wäre hier mehr
// Berechtigung als nötig.

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) {
    return new Response('not configured', { status: 500 });
  }

  const res = await fetch(`${url}/rest/v1/entitlement?select=user_id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });

  return new Response(res.ok ? 'ok' : 'db error', { status: res.ok ? 200 : 500 });
});
