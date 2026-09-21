// Löscht das angemeldete Konto samt Daten. Wird vom Gerät mit dem
// Sitzungs-Token aufgerufen; die Zeilen in sync_state und entitlement
// verschwinden über "on delete cascade".
//
// Bewusst ohne fremde Bibliothek: Ein JSR-Import ließ die Funktion nicht
// starten (BOOT_ERROR). Die beiden Aufrufe an die Auth-Schnittstelle genügen.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: cors });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !serviceKey || !publicKey) {
    return new Response('not configured', { status: 500, headers: cors });
  }

  // Zuerst prüfen, wer anruft: Löschen darf nur, wer angemeldet ist, und dann
  // auch nur das eigene Konto.
  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publicKey,
      Authorization: req.headers.get('Authorization') ?? ''
    }
  });
  if (!userRes.ok) {
    return new Response('unauthorized', { status: 401, headers: cors });
  }
  const user = (await userRes.json()) as { id?: string };
  if (!user?.id) {
    return new Response('unauthorized', { status: 401, headers: cors });
  }

  const deleteRes = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!deleteRes.ok) {
    return new Response('delete failed', { status: 500, headers: cors });
  }

  return new Response('ok', { status: 200, headers: cors });
});
