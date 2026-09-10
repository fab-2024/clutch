import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync(new URL('../mobile/src/features/economy/balancePolicy.json', import.meta.url), 'utf8'));
const daysToSave = (price, monthlyIncome) => Math.ceil(price * 30 / monthlyIncome);
const rows = policy.profiles.map((profile) => {
  const income = profile.activeDays * policy.dailyBonus + profile.missions * policy.referenceMissionReward;
  return {
    profil: profile.id,
    jours_actifs: profile.activeDays,
    missions_reussies: profile.missions,
    revenu_recurrent: income,
    jours_petite_piece: daysToSave(policy.individualPrices.rare, income),
    jours_piece_epique: daysToSave(policy.individualPrices.epique, income),
    jours_piece_legendaire: daysToSave(policy.individualPrices.legendaire, income),
    jours_epique_apres_protecteur: daysToSave(policy.individualPrices.epique, income - 90),
  };
});
console.log('GRIFF — hypothèses sur 30 jours, missions réellement terminées à 25 Volts minimum.');
console.table(rows);
console.log('Délais pour UN achat en épargnant tout le revenu, arrondis au jour supérieur. Les objectifs ne se cumulent pas.');
console.log('Un achat de 100 par semaine consomme presque tout le budget régulier : épargner pour 200–300 nécessite de sauter des petits achats.');
console.log(`Hors revenu récurrent : accueil ${policy.onboarding}, paliers de série ${policy.streakMilestones.map((p) => p.volts).join(' + ')} (une fois par compte).`);
console.log('Parrainage et événements exclus du revenu garanti ; publicités et cartes cadeaux inactives.');
console.log('Scénario social haut : 30 bonus + 16 missions à 40 = 940 Volts/mois. Ce scénario demande un suivi après lancement.');
const regular = rows.find((row) => row.profil === 'regulier');
assert(regular.jours_petite_piece >= 6 && regular.jours_petite_piece <= 8, 'Petite personnalisation en environ une semaine');
assert(regular.jours_piece_epique >= 14 && regular.jours_piece_epique <= 21, 'Belle pièce en deux à trois semaines');
assert(rows.every((row) => row.revenu_recurrent > 90), 'Le scénario protecteur doit conserver une capacité d’épargne positive');
console.log('Cadence cible vérifiée. Ces hypothèses ne sont pas des mesures de rétention ni des plafonds serveur.');
