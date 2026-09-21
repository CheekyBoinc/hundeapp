// Wird vom Uptime-Dienst aufgerufen: ohne Anmeldung, macht eine triviale
// Abfrage und antwortet mit 200. Hält zugleich das Gratis-Projekt wach, das
// nach sieben Tagen ohne Anfragen pausiert.
//
// Bewusst ohne fremde Bibliothek: Ein JSR-Import ließ die Funktion nicht
// starten (BOOT_ERROR), und ein REST-Aufruf genügt hier vollständig.

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return new Response('not configured', { status: 500 });
  }

  const res = await fetch(`${url}/rest/v1/entitlement?select=user_id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });

  return new Response(res.ok ? 'ok' : 'db error', { status: res.ok ? 200 : 500 });
});
