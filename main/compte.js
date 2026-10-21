/* =====================================================================
   compte.js — Comptes (Firebase Auth) + historique des parties (Firestore)
   Utilisé par starter.html (enregistrement en fin de partie) et profil.html.
   Les données sont rangées dans :  users/{uid}/parties/{idPartie}
   ===================================================================== */
(function () {
  'use strict';

  const cfg = window.FIREBASE_CONFIG || {};
  const configOk = !!cfg.apiKey && !/^REMPLACER/i.test(cfg.apiKey);

  let auth = null;
  let db = null;
  if (configOk && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
    } catch (erreur) {
      console.error('Initialisation Firebase impossible', erreur);
      auth = null;
      db = null;
    }
  }
  const actif = !!(auth && db);

  // ---------- Utilitaires ----------

  function echapper(texte) {
    return String(texte === undefined || texte === null ? '' : texte)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // On ne garde que le strict nécessaire (et rien d'"undefined", refusé par Firestore).
  // Les données de l'adversaire viennent du réseau : on les borne et on les vérifie.
  function nettoyerPokemon(p) {
    p = p || {};
    const sprite = (typeof p.spriteUrl === 'string' && /^https:\/\//.test(p.spriteUrl) && p.spriteUrl.length < 300)
      ? p.spriteUrl : null;
    return {
      id: Number(p.id) || 0,
      nom: String(p.nom || '?').slice(0, 60),
      idAffiche: p.idAffiche ? String(p.idAffiche).slice(0, 10) : null,
      spriteUrl: sprite
    };
  }

  function infosAffichage(p) {
    return {
      idFormate: p.idAffiche || String(p.id).padStart(3, '0'),
      spriteUrl: p.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`
    };
  }

  // Même conversion que le bouton « Générer le format Pokémon Showdown » de starter.html
  async function genererTexteShowdown(equipe) {
    const noms = await Promise.all((equipe || []).map(async (p) => {
      try {
        const dataPokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`).then(r => r.json());
        const espece = await fetch(dataPokemon.species.url).then(r => r.json());
        const nomEn = espece.names.find(n => n.language.name === 'en');
        return nomEn ? nomEn.name : p.nom;
      } catch (e) {
        return p.nom;
      }
    }));
    return noms.join('\n\n');
  }

  function pseudoActuel() {
    const u = auth && auth.currentUser;
    if (!u) return '';
    return (u.displayName || (u.email ? u.email.split('@')[0] : 'Joueur')).slice(0, 30);
  }

  function messageErreurAuth(erreur) {
    const messages = {
      'auth/invalid-email': "L'adresse e-mail n'est pas valide.",
      'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
      'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
      'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
      'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
      'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
      'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
      'auth/network-request-failed': 'Problème de connexion internet.',
      'auth/popup-closed-by-user': 'Fenêtre de connexion fermée.',
      'auth/popup-blocked': 'La fenêtre de connexion a été bloquée par le navigateur.',
      'auth/operation-not-allowed': "Ce mode de connexion n'est pas activé dans Firebase.",
      'auth/unauthorized-domain': "Ce site n'est pas dans les domaines autorisés de Firebase."
    };
    return messages[erreur && erreur.code] || 'Une erreur est survenue. Réessaie.';
  }

  // ---------- Authentification ----------

  let authPret = false;
  const ecouteursAuth = [];

  if (actif) {
    auth.onAuthStateChanged((user) => {
      authPret = true;
      ecouteursAuth.forEach((f) => { try { f(user); } catch (e) { console.error(e); } });
      tenterEnregistrement();
    });
  }

  function onAuth(callback) {
    ecouteursAuth.push(callback);
    if (authPret) callback(auth.currentUser);
  }

  async function inscrire(email, motDePasse, pseudo) {
    const res = await auth.createUserWithEmailAndPassword(email, motDePasse);
    await res.user.updateProfile({ displayName: pseudo });
    return res.user;
  }

  function connecter(email, motDePasse) {
    return auth.signInWithEmailAndPassword(email, motDePasse);
  }

  function connecterGoogle() {
    return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  function deconnecter() {
    return auth.signOut();
  }

  // ---------- Parties (Firestore) ----------

  function collectionParties(uid) {
    return db.collection('users').doc(uid).collection('parties');
  }

  async function listerParties(limite, curseur) {
    const user = auth.currentUser;
    if (!user) return { docs: [], dernier: null };
    let requete = collectionParties(user.uid).orderBy('dateMs', 'desc').limit(limite || 20);
    if (curseur) requete = requete.startAfter(curseur);
    const snap = await requete.get();
    return { docs: snap.docs, dernier: snap.docs.length ? snap.docs[snap.docs.length - 1] : null };
  }

  function supprimerPartie(id) {
    return collectionParties(auth.currentUser.uid).doc(id).delete();
  }

  // ---------- Enregistrement automatique d'une partie TERMINÉE ----------
  // Appelé uniquement quand les deux équipes sont complètes (6 + 6).
  // Une partie abandonnée n'arrive jamais jusqu'ici, donc n'est jamais enregistrée.
  // L'identifiant de la partie sert d'identifiant de document : recharger la page
  // ou rappeler la fonction ne crée jamais de doublon.

  let session = null;       // { idPartie, opts, etat, enregistre, enCours, ref }
  let pseudoAdversaire = '';

  function afficherStatut() {
    if (!session) return;
    const zone = document.getElementById(session.opts.zoneId);
    if (!zone) return;

    const boite = (couleurFond, couleurBord, contenu) =>
      `<div style="max-width:560px;margin:18px auto;padding:12px 16px;border-radius:10px;` +
      `background:${couleurFond};border:2px solid ${couleurBord};color:#222;font-size:14px;">${contenu}</div>`;

    const lien = '<a href="./profil.html" target="_blank" rel="noopener" style="color:#1a6fb5;font-weight:bold;">';
    switch (session.etat) {
      case 'verif':
        zone.innerHTML = boite('#fff8e1', '#e0b100', '⏳ Vérification de ta connexion…');
        break;
      case 'deconnecte':
        zone.innerHTML = boite('#fff8e1', '#e0b100',
          '💾 Cette partie n\'est pas encore enregistrée. ' + lien + 'Connecte-toi ou crée un compte</a> ' +
          '(nouvel onglet) : elle sera sauvegardée automatiquement dans ton profil, sans quitter cette page.');
        break;
      case 'encours':
        zone.innerHTML = boite('#fff8e1', '#e0b100', '⏳ Enregistrement de la partie dans ton profil…');
        break;
      case 'ok':
        zone.innerHTML = boite('#e8f7e4', '#3c9c2c', '✅ Partie enregistrée dans ton profil. ' + lien + 'Voir mes parties</a>');
        break;
      case 'erreur':
        zone.innerHTML = boite('#fdeaea', '#c0392b',
          '⚠️ L\'enregistrement a échoué. <button type="button" onclick="CompteParties.reessayer()" ' +
          'style="margin-left:6px;cursor:pointer;">Réessayer</button>');
        break;
      default:
        zone.innerHTML = '';
    }
  }

  function changerEtat(etat) {
    if (!session) return;
    session.etat = etat;
    afficherStatut();
  }

  async function tenterEnregistrement() {
    if (!session || session.enregistre || session.enCours) return;

    if (!authPret) { changerEtat('verif'); return; }
    const user = auth.currentUser;
    if (!user) { changerEtat('deconnecte'); return; }

    session.enCours = true;
    changerEtat('encours');

    // On dit son pseudo à l'adversaire (il l'affichera dans son historique)
    try { if (typeof session.opts.envoyerPseudo === 'function') session.opts.envoyerPseudo(pseudoActuel()); } catch (e) { /* ignoré */ }

    try {
      const ref = collectionParties(user.uid).doc(session.idPartie);
      const existant = await ref.get();

      if (!existant.exists) {
        const monEquipe = session.opts.monEquipe.map(nettoyerPokemon);
        const equipeAdverse = session.opts.equipeAdverse.map(nettoyerPokemon);
        const [monShowdown, advShowdown] = await Promise.all([
          genererTexteShowdown(monEquipe),
          genererTexteShowdown(equipeAdverse)
        ]);

        await ref.set({
          dateMs: Date.now(),
          role: session.opts.role === 'hote' ? 'hote' : 'joueur',
          adversaire: pseudoAdversaire || null,
          monEquipe,
          equipeAdverse,
          monShowdown,
          advShowdown
        });
      } else if (pseudoAdversaire && existant.data().adversaire !== pseudoAdversaire) {
        await ref.update({ adversaire: pseudoAdversaire });
      }

      session.ref = ref;
      session.enregistre = true;
      changerEtat('ok');
    } catch (erreur) {
      console.error('Enregistrement de la partie impossible', erreur);
      changerEtat('erreur');
    } finally {
      session.enCours = false;
    }
  }

  // opts : { idPartie, monEquipe, equipeAdverse, role, zoneId, envoyerPseudo }
  function suivreEtEnregistrer(opts) {
    if (!actif) return; // Firebase non configuré : le jeu fonctionne comme avant
    if (!opts || !opts.monEquipe || !opts.equipeAdverse) return;
    if (opts.monEquipe.length < 6 || opts.equipeAdverse.length < 6) return; // partie non terminée

    const id = String(opts.idPartie || '').replace(/[^A-Za-z0-9_-]/g, '') || ('p' + Date.now().toString(36));

    if (session && session.idPartie === id) {
      session.opts = opts;          // même partie (page rafraîchie / état resynchronisé)
    } else {
      session = { idPartie: id, opts, etat: 'verif', enregistre: false, enCours: false, ref: null };
    }

    afficherStatut();
    if (authPret && auth.currentUser && typeof opts.envoyerPseudo === 'function') {
      try { opts.envoyerPseudo(pseudoActuel()); } catch (e) { /* ignoré */ }
    }
    tenterEnregistrement();
  }

  function definirAdversaire(pseudo) {
    pseudoAdversaire = String(pseudo || '').slice(0, 30);
    if (session && session.enregistre && session.ref && pseudoAdversaire) {
      session.ref.update({ adversaire: pseudoAdversaire }).catch(() => { /* ignoré */ });
    }
  }

  function reessayer() {
    if (session) session.enCours = false;
    tenterEnregistrement();
  }

  window.CompteParties = {
    actif,
    configOk,
    echapper,
    infosAffichage,
    genererTexteShowdown,
    pseudoActuel,
    messageErreurAuth,
    onAuth,
    inscrire,
    connecter,
    connecterGoogle,
    deconnecter,
    listerParties,
    supprimerPartie,
    suivreEtEnregistrer,
    definirAdversaire,
    reessayer
  };
})();
