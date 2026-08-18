import { rendreFriendQuests } from './views/friend-quests.js';

const CONTROL_ID='phase13-sim-control';
const ROUTE='#/friend-quests-simulation';

function disponible(){const h=location.hostname;return h.includes('agent-phase13-friend-quests')||h==='localhost'||h==='127.0.0.1';}

function mock(){
  const soon=new Date(Date.now()+8*3600e3).toISOString();
  const later=new Date(Date.now()+31*3600e3).toISOString();
  return {
    actives:[
      {id:'sim-duo',type:'duo_calls',objectif:3,progression:2,recompense_xp:100,recompense_volts:25,statut:'active',expire_le:soon,partenaire:{id:'theo',pseudo:'Theo',profil_public:true},moi_fait:false,partenaire_fait:true},
      {id:'sim-oppo',type:'opposition',objectif:2,progression:1,recompense_xp:120,recompense_volts:30,statut:'active',expire_le:soon,partenaire:{id:'lucas',pseudo:'Lucas',profil_public:true},moi_fait:false,partenaire_fait:true,match:{id:'m-17',jeu:'cs2',evenement:'ESL Pro League',tag_a:'VIT',tag_b:'G2',equipe_a:'Team Vitality',equipe_b:'G2 Esports'}},
      {id:'sim-league',type:'league_push',objectif:60,progression:34,recompense_xp:140,recompense_volts:40,statut:'active',expire_le:soon,partenaire:{id:'emma',pseudo:'Emma',profil_public:true},moi_fait:true,partenaire_fait:true,ligue:{id:'sim-ligue',nom:'Les Déglingos',code:'SIM123'}},
    ],
    historique:[
      {id:'h1',type:'duel',objectif:1,progression:1,recompense_xp:110,recompense_volts:25,statut:'terminee',terminee_le:new Date(Date.now()-864e5).toISOString(),partenaire:{pseudo:'Theo'}},
      {id:'h2',type:'same_side',objectif:2,progression:2,recompense_xp:120,recompense_volts:30,statut:'terminee',terminee_le:new Date(Date.now()-2*864e5).toISOString(),partenaire:{pseudo:'Emma'}},
      {id:'h3',type:'opposition',objectif:2,progression:2,recompense_xp:120,recompense_volts:30,statut:'ratee',terminee_le:new Date(Date.now()-3*864e5).toISOString(),partenaire:{pseudo:'Lucas'}},
    ],
    duos:[
      {user_id:'theo',pseudo:'Theo',missions_terminees:7,serie_semaines:4,semaine_derniere:new Date().toISOString()},
      {user_id:'emma',pseudo:'Emma',missions_terminees:4,serie_semaines:2,semaine_derniere:new Date().toISOString()},
    ],
    a_reveler:{id:'sim-complete',type:'duo_calls',objectif:3,progression:3,recompense_xp:100,recompense_volts:25,terminee_le:new Date().toISOString(),partenaire:{id:'theo',pseudo:'Theo',profil_public:true},missions_terminees:8,serie_semaines:5,expire_le:later},
  };
}

function render(){
  if(!disponible()||location.hash!==ROUTE)return;
  const root=document.getElementById('contenu'); if(!root)return;
  document.body.dataset.screen='social';
  rendreFriendQuests(root,mock(),{simulation:true});
}

function control(){
  if(!disponible()||document.getElementById(CONTROL_ID))return;
  const a=document.createElement('aside'); a.id=CONTROL_ID;a.className='phase13-sim-control';
  a.innerHTML='<button type="button" data-phase13-sim>⚡ Simuler les missions</button>';document.body.append(a);
}

if(disponible()){
  control();
  document.addEventListener('click',(e)=>{if(e.target.closest?.('[data-phase13-sim]')){location.hash=ROUTE;setTimeout(render,0);}});
  window.addEventListener('hashchange',()=>setTimeout(render,0));
  new MutationObserver(()=>{control();if(location.hash===ROUTE&&!document.querySelector('.phase13-quests--simulation'))render();}).observe(document.body,{childList:true,subtree:true});
  setTimeout(render,0);
}
