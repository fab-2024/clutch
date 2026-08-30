import { rendreLigueV3 } from './views/ligue-v3.js';

function disponible() {
  return location.hostname.includes('agent-phase10-leagues-social-first') || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

const mock = {
  ligue: { id:'sim-league', nom:'Les Déglingos', code:'CL7K42', nb_membres:12 },
  moi: { id:'me', pseudo:'FabTheTap', rang:4, rang_7j:8, mouvement:4, frags:1284, net_7j:146 },
  cible: { id:'lucas', pseudo:'Lucas', rang:3, rang_7j:3, mouvement:0, frags:1302, net_7j:44, ecart:18 },
  poursuivant: { id:'theo', pseudo:'Theo', rang:5, rang_7j:4, mouvement:-1, frags:1251, net_7j:-9, ecart:33 },
  classement: [
    {id:'emma',pseudo:'Emma',rang:1,rang_7j:3,mouvement:2,frags:1588,net_7j:174,pronostics_regles:18,pronostics_gagnes:13},
    {id:'jules',pseudo:'Jules',rang:2,rang_7j:1,mouvement:-1,frags:1507,net_7j:28,pronostics_regles:21,pronostics_gagnes:14},
    {id:'lucas',pseudo:'Lucas',rang:3,rang_7j:3,mouvement:0,frags:1302,net_7j:44,pronostics_regles:17,pronostics_gagnes:11},
    {id:'me',pseudo:'FabTheTap',rang:4,rang_7j:8,mouvement:4,frags:1284,net_7j:146,pronostics_regles:16,pronostics_gagnes:12,moi:true},
    {id:'theo',pseudo:'Theo',rang:5,rang_7j:4,mouvement:-1,frags:1251,net_7j:-9,pronostics_regles:19,pronostics_gagnes:11},
    {id:'max',pseudo:'Max',rang:6,rang_7j:6,mouvement:0,frags:1198,net_7j:31,pronostics_regles:14,pronostics_gagnes:8},
    {id:'nina',pseudo:'Nina',rang:7,rang_7j:5,mouvement:-2,frags:1164,net_7j:-41,pronostics_regles:20,pronostics_gagnes:10},
  ],
  matchs: [
    {id:'sim1',jeu:'rocket_league',evenement:'RLCS Major',format:5,debut:new Date(Date.now()+2*3600000).toISOString(),equipe_a:'Team Vitality',equipe_b:'Karmine Corp',tag_a:'VIT',tag_b:'KC',participants:8,mon_choix:'a',choix_a:5,choix_b:3,cible_choix:'b'},
    {id:'sim2',jeu:'lol',evenement:'LEC Summer',format:3,debut:new Date(Date.now()+5*3600000).toISOString(),equipe_a:'Karmine Corp',equipe_b:'G2 Esports',tag_a:'KC',tag_b:'G2',participants:6,mon_choix:null,choix_a:null,choix_b:null,cible_choix:null},
  ],
  rivalites: [
    {joueur_a_id:'me',joueur_a:'FabTheTap',score_a:3,joueur_b_id:'theo',joueur_b:'Theo',score_b:2,duels:5,moi:true},
    {joueur_a_id:'lucas',joueur_a:'Lucas',score_a:5,joueur_b_id:'emma',joueur_b:'Emma',score_b:1,duels:6,moi:false},
  ],
  feed: [
    {event_key:'sim:1',type:'prediction',moment:new Date(Date.now()-8*60000).toISOString(),acteur_pseudo:'Emma',payload:{statut:'gagne',delta_frags:74,tag_a:'VIT',tag_b:'G2'},reactions:{fire:4,eyes:1},ma_reaction:'fire'},
    {event_key:'sim:2',type:'duel',moment:new Date(Date.now()-31*60000).toISOString(),acteur_pseudo:'Theo',payload:{gagnant:'Theo',perdant:'Jules',tag_a:'KC',tag_b:'FNC'},reactions:{skull:3,w:2}},
    {event_key:'sim:3',type:'join',moment:new Date(Date.now()-90*60000).toISOString(),acteur_pseudo:'Max',payload:{},reactions:{fire:2}},
    {event_key:'sim:4',type:'prediction',moment:new Date(Date.now()-3*3600000).toISOString(),acteur_pseudo:'Lucas',payload:{statut:'perdu',delta_frags:-61,tag_a:'TH',tag_b:'G2'},reactions:{skull:5,l:2}},
  ],
};

function render() {
  const root=document.getElementById('contenu'); if(!root)return;
  rendreLigueV3(root,mock,{simulation:true});
}

if (disponible()) {
  const control=document.createElement('aside');
  control.className='phase10-sim-control';
  control.innerHTML='<button type="button" data-phase10-sim>🏆 Simuler une ligue</button>';
  document.body.append(control);
  control.addEventListener('click',()=>{ location.hash='#/league-simulation'; setTimeout(render,0); });
  window.addEventListener('hashchange',()=>{ if(location.hash==='#/league-simulation')setTimeout(render,0); });
  new MutationObserver(()=>{ if(location.hash==='#/league-simulation'&&!document.querySelector('.phase10-league--simulation'))render(); }).observe(document.body,{childList:true,subtree:true});
  if(location.hash==='#/league-simulation')setTimeout(render,0);
}
