import { supabase } from '@/src/lib/supabase';
import { GrowthError, growthPayload } from '@/src/lib/growthErrors';
import { INVITATION_CODE } from '@/src/lib/publicLinks';

import { installationId } from './installation';
import { parseInvitation, parseReferrals } from './model';

async function request(name: string, args: Record<string, unknown> = {}, ownerId?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const query = supabase.rpc(name, args).abortSignal(controller.signal);
    if (ownerId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== ownerId) throw new GrowthError('authentication_required');
      // Pin the intended account even if another account signs in while in flight.
      query.setHeader('Authorization', `Bearer ${session.access_token}`);
    }
    const { data, error } = await query;
    if (error) throw new GrowthError(error.message === 'authentication_required' ? error.message : error.code ?? 'network');
    return data;
  } catch (error) { throw error instanceof GrowthError ? error : new GrowthError('network'); }
  finally { clearTimeout(timeout); }
}

export async function loadInvitations(ownerId: string) { return parseReferrals(await request('clutch_mes_invitations_v1', {}, ownerId)); }

export async function createInvitation(ownerId: string) {
  const data = growthPayload(await request('clutch_creer_invitation_v1', { p_installation: await installationId() }, ownerId));
  if (typeof data.code !== 'string' || !INVITATION_CODE.test(data.code)) throw new GrowthError('invalid_response');
  return data.code;
}

export async function loadInvitation(code: string) {
  if (!INVITATION_CODE.test(code)) return null;
  return parseInvitation(await request('clutch_invitation_publique_v1', { p_code: code }));
}

export async function acceptInvitation(code: string, ownerId: string) {
  if (!INVITATION_CODE.test(code)) throw new GrowthError('invite_invalid');
  const data = growthPayload(await request('clutch_accepter_invitation_v1', { p_code: code, p_installation: await installationId() }, ownerId));
  if (data.acceptee !== true || typeof data.nouvelle !== 'boolean') throw new GrowthError('invalid_response');
  return { newReferral: data.nouvelle };
}

export async function recordInvitationShare(operation: string, ownerId: string) {
  return (await request('clutch_partager_invitation_v1', { p_operation: operation }, ownerId)) === true;
}
