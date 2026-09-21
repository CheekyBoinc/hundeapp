// Wird vom Uptime-Dienst aufgerufen: ohne Anmeldung, macht eine triviale
// Abfrage und antwortet mit 200. Hält zugleich das Gratis-Projekt wach, das
// nach sieben Tagen ohne Anfragen pausiert.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return new Response('not configured', { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from('entitlement').select('user_id').limit(1);

  return new Response(error ? 'db error' : 'ok', { status: error ? 500 : 200 });
});
