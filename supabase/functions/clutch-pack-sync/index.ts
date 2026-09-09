import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { isUuid } from '../_shared/founder-pack.ts';
import { reconcilePacks } from '../_shared/cosmetic-packs.ts';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const secret = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !anon || !secret) return Response.json({ error: 'configuration_required' }, { status: 503 });
  if (!authorization) return Response.json({ error: 'authentication_required' }, { status: 401 });
  const auth = createClient(url,anon,{ global: { headers: { Authorization: authorization } },auth: { persistSession:false,autoRefreshToken:false } });
  const { data,error } = await auth.auth.getUser();
  if (error || !isUuid(data.user?.id)) return Response.json({ error:'invalid_session' }, { status:401 });
  let action: unknown;
  try { action = (await request.json()).action; }
  catch { return Response.json({error:'invalid_request'},{status:400}); }
  const configured = Boolean(Deno.env.get('REVENUECAT_SECRET_API_KEY')?.trim()
    && Deno.env.get('REVENUECAT_WEBHOOK_AUTH')?.trim());
  if (action === 'availability') return Response.json({ok:true,ready:configured});
  if (!configured) return Response.json({error:'configuration_required'},{status:503});
  try {
    // The request body cannot supply a user ID, transaction, price or entitlement.
    await reconcilePacks(createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}), data.user.id);
    return Response.json({ok:true});
  } catch (error) {
    console.error('clutch-pack-sync',error);
    return Response.json({error:'purchase_verification_pending'},{status:502});
  }
});
