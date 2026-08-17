/** Phase 3 — portail Room. La scène 3D complète reste un chantier séparé. */
export async function vueRoom(racine) {
  racine.innerHTML = `
    <section class="room-entry">
      <header class="room-entry__hero">
        <div class="room-entry__signal" aria-hidden="true">
          <span></span><span></span><span></span>
          <i></i>
        </div>
        <div class="room-entry__copy">
          <span class="sur-titre">CLUTCH ROOM</span>
          <h1>Tout ce que tu gagnes<br>doit finir quelque part.</h1>
          <p>Ta Room devient le point d’entrée de ta collection : objets, trophées et accès à The Vault.</p>
          <div class="room-entry__status"><b></b><span>Scène 3D en cours d’intégration</span></div>
        </div>
      </header>

      <nav class="room-entry__doors" aria-label="Espaces de la Room">
        <article class="room-entry__door room-entry__door--room" aria-current="page">
          <span>01</span>
          <div><small>ESPACE PRINCIPAL</small><strong>Room 3D</strong><p>Ton setup, tes trophées et tes objets équipés dans une vraie pièce.</p></div>
          <em>Bientôt</em>
        </article>
        <a class="room-entry__door" href="#/cartes">
          <span>02</span>
          <div><small>TON INVENTAIRE</small><strong>Collection</strong><p>Retrouve les objets et collectibles déjà liés à ton profil.</p></div>
          <b>→</b>
        </a>
        <a class="room-entry__door room-entry__door--vault" href="#/boutique">
          <span>03</span>
          <div><small>DÉBLOQUER</small><strong>The Vault</strong><p>Utilise tes Volts pour enrichir ta Room et ton identité.</p></div>
          <b>→</b>
        </a>
      </nav>
    </section>`;
}
