import { supabase } from '@/src/lib/supabase';

export type AccountDeletionResult = {
  deleted: true;
  providerCleanup: 'deleted' | 'already_deleted';
};

export async function deleteCurrentAccount(): Promise<AccountDeletionResult> {
  const { data, error } = await supabase.functions.invoke('clutch-account-delete', {
    body: { confirmation: 'DELETE' },
  });
  if (error) throw await accountFunctionError(error);

  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  if (payload.deleted !== true) throw new Error('account_deletion_incomplete');

  // The server has removed the Auth user and all refresh tokens. Clear the
  // cached client session without relying on another successful network call.
  await supabase.auth.signOut({ scope: 'local' });
  return {
    deleted: true,
    providerCleanup: payload.provider_cleanup === 'already_deleted' ? 'already_deleted' : 'deleted',
  };
}

async function accountFunctionError(error: unknown) {
  const context = error && typeof error === 'object'
    ? (error as { context?: unknown }).context
    : null;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error) return new Error(body.error);
    } catch {
      // Preserve the original Supabase Functions error when the body is not JSON.
    }
  }
  return error instanceof Error ? error : new Error('account_deletion_failed');
}
