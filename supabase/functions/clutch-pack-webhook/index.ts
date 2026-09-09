import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { secretsMatch } from '../_shared/founder-pack.ts';
import { PACK_IDS, packWebhookUsers, productId, reconcilePacks } from '../_shared/cosmetic-packs.ts';

Deno.serve(async (request: Request) => {
  if (request.method!=='POST') return Response.json({error:'method_not_allowed'},{status:405});
  const url=Deno.env.get('SUPABASE_URL');
  const secret=Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const expected=Deno.env.get('REVENUECAT_WEBHOOK_AUTH')?.trim();
  if (!url || !secret || !expected) return Response.json({error:'configuration_required'},{status:503});
  if (!await secretsMatch(request.headers.get('Authorization'),expected)) return Response.json({error:'unauthorized'},{status:401});
  let event: Record<string,unknown>;
  try { event=(await request.json()).event; if (!event || typeof event!=='object') throw new Error(); }
  catch { return Response.json({error:'invalid_event'},{status:400}); }
  if (event.type==='TEST') return Response.json({ok:true});
  if (event.type!=='TRANSFER' && !PACK_IDS.some(id=>productId(id)===event.product_id)) return Response.json({ok:true,ignored:true});
  const users=packWebhookUsers(event);
  if (!users.length || users.length>20) return Response.json({error:'invalid_customer'},{status:400});
  try {
    const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    // Transfer sources are reconciled before destinations. Aliases never duplicate a grant.
    for (const user of users) await reconcilePacks(client,user);
    return Response.json({ok:true});
  } catch (error) {
    console.error('clutch-pack-webhook',error);
    return Response.json({error:'reconciliation_pending'},{status:502});
  }
});
