/** Economy V2 RPC client — Supabase remains authoritative. */
import * as api from './api.js';
import { MODE_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';
const BASE=SUPABASE_URL.trim().replace(/\/+$/,'').replace(/\/rest\/v1$/,'');
const CLE_SESSION='clutch.session';
function sessionCourante(){try{return JSON.parse(localStorage.getItem(CLE_SESSION)||'null')}catch{return null}}
async function rpc(nom,args={}){if(MODE_DEMO)throw new Error('Economy V2 nécessite Supabase dans cette première étape de migration.');await api.utilisateurCourant().catch(()=>null);const jeton=sessionCourante()?.access_token||SUPABASE_ANON_KEY;const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);let r;try{r=await fetch(`${BASE}/rest/v1/rpc/${nom}`,{method:'POST',signal:c.signal,headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${jeton}`,'Content-Type':'application/json'},body:JSON.stringify(args)})}catch(e){if(e.name==='AbortError')throw new Error('Le moteur de classement ne répond pas.');throw new Error('Impossible de joindre le moteur de classement.')}finally{clearTimeout(t)}const texte=await r.text();let d=null;try{d=texte?JSON.parse(texte):null}catch{d={message:texte}}if(!r.ok)throw new Error(d?.message||d?.hint||`Erreur ${r.status}`);return d}
async function saison(id){return id?{id}:await api.saisonCourante()}
export async function etatFrags(id=null){const s=await saison(id);return s?.id?rpc('clutch_etat_frags',{p_saison_id:s.id}):null}
export async function projectionMatchFrags(matchId){return rpc('clutch_projection_match_frags',{p_match_id:matchId})}
export async function placerPronosticClasse({matchId,choix}){return rpc('placer_pronostic_classe',{p_match_id:matchId,p_choix:choix})}
export async function mesPronosticsClasses(id=null){const s=await saison(id);return s?.id?(await rpc('clutch_mes_pronostics_classes',{p_saison_id:s.id}))??[]:[]}
export async function classementFrags(id=null){const s=await saison(id);return s?.id?(await rpc('clutch_classement_frags',{p_saison_id:s.id}))??[]:[]}
export async function classementLigueFrags(ligueId,id=null){const s=await saison(id);return s?.id?(await rpc('clutch_classement_ligue_frags',{p_ligue_id:ligueId,p_saison_id:s.id}))??[]:[]}
export async function rivaliteFrags({saisonId=null,ligueId=null}={}){const s=await saison(saisonId);return s?.id?rpc('clutch_rivalite_frags',{p_saison_id:s.id,p_ligue_id:ligueId}):null}
