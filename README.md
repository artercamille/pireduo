# Le Pire Duo va en Prison

Jeu d'interrogatoire entre potes, inspiré du concept de Squeezie. 2 duos, 3 manches. À chaque manche, chaque duo passe à tour de rôle : il reçoit le contexte de l'affaire et la liste des points que l'inspecteur va creuser, invente son alibi, puis répond séparément à 10 questions pendant que l'autre duo observe. Le duo dont les versions collent le moins part en cellule.

## Jouer
1. Un joueur ouvre le site, choisit un nom et une tête, clique **Créer une salle**.
2. Il clique **Copier le lien** et le colle sur Discord.
3. Les 3 autres ouvrent le lien, choisissent leur nom et rejoignent.
4. Chacun s'assoit dans un duo, l'hôte clique **Ouvrir l'enquête**.

Pendant la préparation (3 min), le duo qui passe file dans un salon vocal Discord privé pour inventer son alibi point par point. Pendant l'interrogatoire, il revient et répond en silence ; l'autre duo regarde « derrière le miroir ».

## Fonctionnement technique
- 100 % statique (HTML/CSS/JS), hébergeable sur GitHub Pages.
- Multijoueur en pair-à-pair (PeerJS) : le navigateur de l'hôte fait office de serveur. Si l'hôte ferme son onglet, la partie s'arrête.
- Bouton **+ Bot de test** dans le salon pour tester seul.
- `?local=1` utilise un serveur PeerJS local sur le port 9000 (tests).

## Fichiers
- `scenarios.js` : les 30 affaires et les gages (facile à enrichir)
- `logic.js` : règles du jeu et comparaison des réponses
- `art.js`, `scenes.js` : personnages et décors en SVG
- `sfx.js` : sons et voix de l'inspecteur
- `game.js` : réseau et écrans
