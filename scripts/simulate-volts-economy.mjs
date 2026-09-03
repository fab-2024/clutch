const catalogue = {
  paidItems: 15,
  entryPrice: 250,
  medianPrice: 900,
  prestigePrice: 1500,
  maximumPrice: 2200,
};

const profiles = [
  { id: 'occasionnel', monthlyIncome: 450, targetMonthlySpend: 750 },
  { id: 'engage', monthlyIncome: 900, targetMonthlySpend: 1200 },
  { id: 'core', monthlyIncome: 1600, targetMonthlySpend: 2200 },
];

const simulation = profiles.map((profile) => ({
  profil: profile.id,
  revenu_mensuel: profile.monthlyIncome,
  jours_premier_objet: Math.ceil(catalogue.entryPrice * 30 / profile.monthlyIncome),
  mois_objet_median: round(catalogue.medianPrice / profile.monthlyIncome),
  mois_objet_prestige: round(catalogue.prestigePrice / profile.monthlyIncome),
  ratio_revenu_sur_depense_cible: round(profile.monthlyIncome / profile.targetMonthlySpend),
}));

const failures = simulation.filter((profile) => (
  profile.jours_premier_objet > 21
  || profile.ratio_revenu_sur_depense_cible > 0.8
));

console.log('Simulation historique Volts v1 — hors bonus quotidien, onboarding et récompenses exceptionnelles');
console.table(simulation);
console.log(`Catalogue de référence : ${catalogue.paidItems} objets, ${catalogue.entryPrice} à ${catalogue.maximumPrice} Volts, médiane ${catalogue.medianPrice}.`);

if (failures.length) {
  console.error('Échec des garde-fous économie :', failures.map((profile) => profile.profil).join(', '));
  process.exitCode = 1;
} else {
  console.log('Garde-fous historiques OK : premier objet en 21 jours maximum et pression monétaire <= 0,80 (hors bonus quotidien).');
}

// Sensitivity analysis only: do not silently change catalogue prices, income
// caps or spending targets to make the new daily source fit the old gate.
const activeDays = [8, 20, 30];
const dailyScenario = profiles.map((profile, index) => {
  const days = activeDays[index];
  const income = profile.monthlyIncome + days * 10;
  return {
    profil: profile.id,
    jours_actifs_hypothese: days,
    bonus_quotidien_mensuel: days * 10,
    revenu_avec_bonus: income,
    ratio_revenu_sur_depense_cible: round(income / profile.targetMonthlySpend),
    revue_economique_requise: income / profile.targetMonthlySpend > 0.8,
  };
});
console.log('Scénario additionnel — bonus fixe de 10 Volts, prix et budgets inchangés');
console.table(dailyScenario);
if (dailyScenario.some((profile) => profile.revue_economique_requise)) {
  console.warn('Avant activation générale : le bonus dépasse le ratio historique pour certains profils. Revue produit requise, voir docs/daily-volt-bonus-v1.md.');
}

function round(value) {
  return Math.round(value * 100) / 100;
}
