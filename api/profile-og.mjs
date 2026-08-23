import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';
import { loadPublicProfile, profilePresentation } from '../server/public-profile-data.mjs';

export async function GET(request) {
  const url = new URL(request.url || '/', 'https://clutch.invalid');
  const pseudo = url.searchParams.get('pseudo') || '';
  let card = null;
  try {
    const data = await loadPublicProfile(pseudo);
    card = data ? profilePresentation(data) : null;
  } catch (error) {
    console.error('[public-profile] og data error', error?.message || error);
  }
  if (!card) card = genericCard();
  return new ImageResponse(render(card), {
    width: 1200,
    height: 630,
    headers: { 'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300' },
  });
}

function render(card) {
  const rank = card.rang ? `#${card.rang}` : 'PLACEMENT';
  const serie = card.serie ? `🔥 SÉRIE ${card.serie}` : 'PLAYER IDENTITY';
  return h('div',{style:styles.root},
    h('div',{style:styles.glowA}),h('div',{style:styles.glowB}),
    h('div',{style:styles.frame},
      h('div',{style:styles.top},
        h('div',{style:styles.brand},'GRIFF',h('span',{style:styles.dot},'.')),
        h('div',{style:styles.public},'PUBLIC PROFILE')
      ),
      h('div',{style:styles.content},
        h('div',{style:styles.signature},h('span',{style:styles.signatureIcon},card.styleSymbol || '◌'),String(card.style || 'PLAYER').toUpperCase()),
        h('div',{style:styles.pseudo},String(card.pseudo || 'GRIFF PLAYER').toUpperCase()),
        h('div',{style:styles.short},String(card.short || card.style || 'PLAYER IDENTITY').toUpperCase()),
        h('div',{style:styles.stats},
          stat('FRAGS',Number(card.frags || 1000).toLocaleString('fr-FR')),
          stat('RANG',rank),
          stat('PRÉCISION',`${Number(card.precision || 0)} %`),
          stat('FORME',serie)
        )
      ),
      h('div',{style:styles.bottom},
        h('div',{style:styles.faction},card.faction ? `FACTION // ${String(card.faction).toUpperCase()}` : 'GRIFF // PLAYER IDENTITY'),
        h('div',{style:styles.cta},'MONTRE TON PROFIL GRIFF.')
      )
    )
  );
}

function stat(label,value){return h('div',{style:styles.stat},h('div',{style:styles.statLabel},label),h('div',{style:styles.statValue},String(value)));}
function genericCard(){return {pseudo:'GRIFF PLAYER',style:'PLAYER IDENTITY',styleSymbol:'◌',short:'TON STYLE. TON RANG. TON ARSENAL.',frags:1000,rang:null,precision:0,serie:0,faction:null};}
const styles={
root:{width:'100%',height:'100%',display:'flex',position:'relative',overflow:'hidden',background:'#06080b',color:'#f6f7f3',padding:'34px'},
glowA:{position:'absolute',width:'620px',height:'620px',left:'-260px',top:'-300px',borderRadius:'999px',background:'radial-gradient(circle,rgba(232,255,61,.19),rgba(232,255,61,0) 68%)'},
glowB:{position:'absolute',width:'580px',height:'580px',right:'-260px',bottom:'-310px',borderRadius:'999px',background:'radial-gradient(circle,rgba(153,117,255,.16),rgba(153,117,255,0) 68%)'},
frame:{position:'relative',width:'100%',height:'100%',display:'flex',flexDirection:'column',padding:'34px 42px',border:'1px solid rgba(232,255,61,.22)',borderRadius:'34px',background:'linear-gradient(145deg,rgba(255,255,255,.052),rgba(255,255,255,.012))'},
top:{display:'flex',alignItems:'center',justifyContent:'space-between'},brand:{display:'flex',fontSize:'31px',fontWeight:900,letterSpacing:'-1.8px'},dot:{color:'#e8ff3d'},public:{display:'flex',padding:'8px 13px',border:'1px solid rgba(232,255,61,.2)',borderRadius:'999px',color:'#e8ff3d',fontSize:'12px',fontWeight:800,letterSpacing:'1.8px'},
content:{flex:1,display:'flex',flexDirection:'column',justifyContent:'center'},signature:{display:'flex',alignItems:'center',gap:'10px',width:'fit-content',padding:'8px 13px',border:'1px solid rgba(232,255,61,.2)',borderRadius:'999px',color:'#e8ff3d',background:'rgba(232,255,61,.04)',fontSize:'14px',fontWeight:900,letterSpacing:'1.6px'},signatureIcon:{fontSize:'19px'},pseudo:{marginTop:'16px',fontSize:'87px',lineHeight:.82,fontWeight:900,letterSpacing:'-4.8px',maxWidth:'1050px'},short:{marginTop:'13px',color:'#a4ada0',fontSize:'15px',fontWeight:800,letterSpacing:'1.2px'},stats:{display:'flex',gap:'10px',marginTop:'28px'},stat:{minWidth:'155px',padding:'13px 16px',display:'flex',flexDirection:'column',border:'1px solid rgba(255,255,255,.075)',borderRadius:'15px',background:'rgba(0,0,0,.14)'},statLabel:{color:'#737c70',fontSize:'10px',fontWeight:900,letterSpacing:'1.3px'},statValue:{marginTop:'3px',fontSize:'25px',fontWeight:900},bottom:{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,.08)'},faction:{color:'#a0a89c',fontSize:'14px',fontWeight:800,letterSpacing:'1.1px'},cta:{color:'#e8ff3d',fontSize:'14px',fontWeight:900,letterSpacing:'1.4px'}
};
