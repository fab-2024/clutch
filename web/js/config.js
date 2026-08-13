/**
 * Configuration de Clutch.
 *
 * Tant que SUPABASE_URL est vide, l'application tourne en MODE DÉMO :
 * tout est stocké dans le navigateur, aucune inscription réelle, aucun serveur.
 * C'est parfait pour montrer le produit ou le tester.
 *
 * Pour passer en production, colle ici les deux valeurs fournies par Supabase
 * (Project Settings -> API). La clé "anon" est PUBLIQUE par nature : elle est
 * conçue pour être exposée dans le navigateur, la sécurité repose sur les
 * politiques RLS définies dans supabase/03_policies.sql.
 * Ne colle JAMAIS la clé "service_role" ici.
 */

export const SUPABASE_URL = 'https://ipmswubihditoulfgivw.supabase.co/rest/v1/';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwbXN3dWJpaGRpdG91bGZnaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDczNjUsImV4cCI6MjEwMjEyMzM2NX0.S0SWbOZmL542wZFKSs58D7cRulHNicVMak00siSgxq0';

/** Nom affiché du produit. Change-le ici, il se propage partout. */
export const NOM_APP = 'Clutch';

/** Nom de la monnaie virtuelle. */
export const MONNAIE = 'Frags';

/** Adresses e-mail autorisées à accéder à la page d'administration. */
export const ADMINS = ['pierrelouis.blutel2@gmail.com'];

export const MODE_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

