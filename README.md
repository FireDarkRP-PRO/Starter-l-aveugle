# 🎮 Starter à l'aveugle — By FireDarkRP

Site web interactif autour du concept de **« starter à l'aveugle »** (concept de Sneze) : on construit une équipe Pokémon sans la choisir directement, puis on la teste en combat sur Pokémon Showdown.

🔗 **Jouer en ligne : https://firedarkrp-pro.github.io/Starter-l-aveugle/main/**

---

## 📌 Principe du jeu

- Jeu à **deux joueurs**, chacun construit une équipe de **6 Pokémon**.
- À chaque manche, un joueur tire **3 Pokémon aléatoires** et donne un **indice** pour chacun (génération, types, catégorie, poids, etc.).
- L'autre joueur choisit **à l'aveugle** : 1, 2 ou 3, uniquement en fonction des indices. Le Pokémon choisi rejoint son équipe.
- Les rôles s'inversent, jusqu'à ce que les deux équipes soient complètes (6 manches).
- Les joueurs vont ensuite sur [Pokémon Showdown](https://pokemonshowdown.com/) pour se battre et désigner le gagnant.

Les règles détaillées sont disponibles sur la page `starterRules.html` du site.

---

## ✨ Fonctionnalités

### Modes de jeu
- **Mode solo** : simple tirage aléatoire de Pokémon.
- **Mode multijoueur** : parties à deux en ligne, tour par tour, via un salon (création / rejoindre avec un code).

### Tirage
- Filtre par **génération** (cases à cocher, plages définies dans `BDD/genPokemon.txt`).
- Choix d'inclure ou non les **Pokémon normaux**, **légendaires** et **fabuleux**.
- Choix d'inclure ou non les **formes régionales** (Alola, Galar, Hisui, Paldea) : si un Pokémon possède des formes régionales, une forme est tirée au hasard parmi la forme normale et ses formes régionales, sans changer les chances de l'espèce.
- Affichage du **nombre de Pokémon** présents dans la liste de tirage.
- Barre de recherche de Pokémon (désactivée pour le joueur qui doit choisir en multijoueur, afin d'éviter la triche).

### Indices (multijoueur)
- Règles prédéfinies : Génération, Numéro de Pokédex, Types, Catégorie, Taille, Poids, Couleur, Taux de capture, Description Pokédex, Talents, Groupes d'Œuf, Cri, Silhouette…
- Choisir une règle **pré-remplit** les indices, mais le joueur peut toujours les modifier avant d'envoyer.
- Le choix du devineur est **irréversible** et ne peut pas être « spoilé » (équipes mises à jour uniquement à la fin du tour).

### Comptes et historique des parties
- **Compte** (e-mail + mot de passe, ou Google) via Firebase Authentication, depuis la page `profil.html`.
- À la fin d'une partie multijoueur (les **deux équipes complètes**), la partie est enregistrée automatiquement dans le profil de **chaque joueur connecté**, avec la **date**, le **pseudo de l'adversaire**, les deux équipes et le texte Showdown des deux équipes.
- Une partie **non terminée n'est jamais enregistrée** (vérifié côté site et par les règles Firestore : 6 + 6 Pokémon obligatoires).
- Si le joueur n'est pas connecté à la fin de la partie, il peut se connecter dans un autre onglet : la partie s'enregistre alors toute seule.
- Dans le profil, on peut revoir toutes ses parties, **copier le format Showdown** de son équipe ou de l'équipe adverse, ou supprimer une partie.

### Fin de partie
- Vue « équipes complètes » une fois 6 Pokémon par joueur.
- Export de l'équipe au **format Pokémon Showdown** (noms en anglais via PokeAPI, avec talent et attaques quand disponibles), à copier-coller dans le TeamBuilder.

---

## 🗂️ Arborescence du projet

```
Starter-l-aveugle-main
├── BDD/                              # Bases de données (fichiers texte)
│   ├── formesRegionales.txt          # Formes régionales (id;slug PokeAPI;nom affiché)
│   ├── genPokemon.txt                # Plages de numéros par génération
│   ├── legendaires.txt               # Liste des Pokémon légendaires
│   ├── Pokémon_Fabuleux.txt          # Liste des Pokémon fabuleux
│   └── pokemon.txt                   # Liste complète (numéro + nom FR)
├── Image/
│   ├── bgIndex.webp                  # Fond de la page d'accueil
│   └── Fire.jpg
├── main/                             # Pages du site
│   ├── index.html                    # Menu principal
│   ├── liensPokemon.html             # Liens externes utiles
│   ├── profil.html                   # Connexion / inscription + historique des parties
│   ├── compte.js                     # Comptes Firebase + enregistrement des parties
│   ├── firebase-config.js            # Configuration Firebase du projet (à remplir)
│   ├── salon.html                    # Création / connexion à un salon multijoueur
│   ├── starter.html                  # Page de jeu (solo + multijoueur)
│   └── starterRules.html             # Règles du jeu
├── firestore.rules                   # Règles de sécurité Firestore (à coller dans la console)
├── Générer Pokémons.py               # Script : génère la liste des Pokémon
└── Générer_Pokémons_Lég_Fab.py       # Script : génère légendaires & fabuleux
```

---

## 🛠️ Technologies

- **HTML / CSS / JavaScript** — site 100 % statique, sans backend.
- **[PeerJS](https://peerjs.com/)** — connexion directe entre les deux joueurs (pas de compte ni de serveur à gérer, compatible GitHub Pages).
- **[Firebase](https://firebase.google.com/)** (Authentication + Cloud Firestore) — comptes et historique des parties.
- **[PokéAPI](https://pokeapi.co/)** — images, cris, données et noms anglais pour l'export Showdown.
- **Python** (`requests`, `beautifulsoup4`, `lxml`) — scripts de génération des fichiers de `BDD/`.
- **GitHub Pages** — hébergement.

---

## 🚀 Lancer le projet en local

Le projet étant statique, aucune installation n'est nécessaire pour jouer.

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/FireDarkRP-pro/Starter-l-aveugle.git
   cd Starter-l-aveugle
   ```
2. Lancer un petit serveur local (nécessaire pour charger les fichiers de `BDD/`) :
   ```bash
   python -m http.server 8000
   ```
3. Ouvrir <http://localhost:8000/main/> dans le navigateur.

> ⚠️ Ouvrir directement `index.html` en double-cliquant peut bloquer le chargement des fichiers `.txt` à cause des restrictions du navigateur : utilise un serveur local.

### Déploiement GitHub Pages
Dans **Settings → Pages**, choisir la branche principale et le dossier racine `/`. Le site est alors accessible à l'adresse `…github.io/Starter-l-aveugle/main/`.

---

## 🐍 Scripts Python

Installation des dépendances :

```bash
pip install requests beautifulsoup4 lxml
```

| Script | Rôle | Source | Sortie |
|---|---|---|---|
| `Générer Pokémons.py` | Récupère la liste des Pokémon | [Wikimini](https://fr.wikimini.org/wiki/Liste_des_Pok%C3%A9mon) | `pokedex.txt` |
| `Générer_Pokémons_Lég_Fab.py` | Récupère les légendaires et fabuleux, en croisant avec `pokemon.txt` pour retrouver les numéros | [Poképédia](https://www.pokepedia.fr/) | `legendaires.txt`, `Pokémon_Fabuleux.txt` |

Après génération, déplacer / renommer les fichiers dans le dossier `BDD/` (ex. `pokedex.txt` → `pokemon.txt`). Le script des légendaires lit `pokemon.txt` depuis le dossier où il est lancé.

---

## 📄 Format des fichiers `BDD/`

- **`pokemon.txt`, `legendaires.txt`, `Pokémon_Fabuleux.txt`** : une ligne par Pokémon, `NNNN Nom` (ex. `0025 Pikachu`).
- **`genPokemon.txt`** : une ligne par génération, `GenX:début-fin` (ex. `Gen1:1-151`).
- **`formesRegionales.txt`** : `idNational;slugPokeAPI;nomAffiché` (ex. `52;meowth-galar;Miaouss de Galar`). Un Pokémon peut avoir plusieurs lignes ; la liste n'est pas exhaustive et peut être complétée.

---

## 🔗 Liens utiles

- [Pokémon Showdown](https://pokemonshowdown.com/) — combats
- [Poképédia](https://www.pokepedia.fr/) — informations sur les Pokémon
- [Pokédle](https://pokedle.com/) — deviner des Pokémon
- La page `liensPokemon.html` du site regroupe ces liens.

---

## 👤 Auteur

Créé par **FireDarkRP**, d'après le concept de « starter à l'aveugle » de Sneze.
