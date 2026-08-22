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

console.log('Simulation Volts v1 — revenus récurrents, hors onboarding et récompenses exceptionnelles');
console.table(simulation);
console.log(`Catalogue de référence : ${catalogue.paidItems} objets, ${catalogue.entryPrice} à ${catalogue.maximumPrice} Volts, médiane ${catalogue.medianPrice}.`);

if (failures.length) {
  console.error('Échec des garde-fous économie :', failures.map((profile) => profile.profil).join(', '));
  process.exitCode = 1;
} else {
  console.log('Garde-fous OK : premier objet en 21 jours maximum et pression monétaire <= 0,80.');
}

function round(value) {
  return Math.round(value * 100) / 100;
}
