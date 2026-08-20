import { supabase } from '@/src/lib/supabase';

export async function loadActiveSeasonId() {
  const { data, error } = await supabase
    .from('v_saisons')
    .select('id')
    .eq('statut', 'en_cours')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}
