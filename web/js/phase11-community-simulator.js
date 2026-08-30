import { vueCommunauteV4 } from './views/communaute-v4.js';

function disponible(){
  const h=location.hostname;
  return h.includes('agent-phase11-community-mobile')||h==='localhost'||h==='127.0.0.1';
}

const maintenant=Date.now();
const mock={
  factions:[
    {equipe_id:'kc',nom:'Karmine Corp',tag:'KC',jeu:'lol',membres:472,niveau_atteint:4,croissance_24h:18,croissance_7j:64,moi:true,dernier_evenement_id:null},
    {equipe_id:'vit',nom:'Team Vitality',tag:'VIT',jeu:'rocket_league',membres:441,niveau_atteint:4,croissance_24h:13,croissance_7j:51,moi:false},
    {equipe_id:'g2',nom:'G2 Esports',tag:'G2',jeu:'lol',membres:398,niveau_atteint:4,croissance_24h:7,croissance_7j:38,moi:false},
    {equipe_id:'m8',nom:'Gentle Mates',tag:'M8',jeu:'val',membres:188,niveau_atteint:4,croissance_24h:4,croissance_7j:12,moi:false},
  ],
  moi:{
    user_id:'me',pseudo:'FabTheTap',equipe_id:'kc',membre_depuis:new Date(maintenant-93*86400000).toISOString(),
    pronos_depuis:87,mutations_vecues:3,pronos_7j:11,gagnes_7j:8,delta_frags_7j:146,rang_activite:3,total_activite:17,
    top_activite:[
      {user_id:'a',pseudo:'Emma',pronos_7j:16,gagnes_7j:12,rang:1},
      {user_id:'b',pseudo:'Lucas',pronos_7j:14,gagnes_7j:9,rang:2},
      {user_id:'me',pseudo:'FabTheTap',pronos_7j:11,gagnes_7j:8,rang:3},
      {user_id:'c',pseudo:'Theo',pronos_7j:10,gagnes_7j:5,rang:4},
      {user_id:'d',pseudo:'Nina',pronos_7j:8,gagnes_7j:6,rang:5},
    ],
    archives:[
      {id:1,niveau:2,nom:'Flacon',seuil:10,recompense_volts:200,membres:10,cree_le:new Date(maintenant-72*86400000).toISOString()},
      {id:2,niveau:3,nom:'Bombonne',seuil:50,recompense_volts:300,membres:50,cree_le:new Date(maintenant-45*86400000).toISOString()},
      {id:3,niveau:4,nom:'Calice',seuil:100,recompense_volts:500,membres:101,cree_le:new Date(maintenant-18*86400000).toISOString()},
    ],
  },
};

function render(){const r=document.getElementById('contenu');if(r)void vueCommunauteV4(r,{donnees:mock,simulation:true});}

if(disponible()){
  const c=document.createElement('aside');c.className='phase11-sim-control';c.innerHTML='<button type="button">✦ Simuler la faction</button>';document.body.append(c);
  c.addEventListener('click',()=>{location.hash='#/faction-simulation';setTimeout(render,0);});
  window.addEventListener('hashchange',()=>{if(location.hash==='#/faction-simulation')setTimeout(render,0);});
  new MutationObserver(()=>{if(location.hash==='#/faction-simulation'&&!document.querySelector('.phase11-community--simulation'))render();}).observe(document.body,{childList:true,subtree:true});
  if(location.hash==='#/faction-simulation')setTimeout(render,0);
}
