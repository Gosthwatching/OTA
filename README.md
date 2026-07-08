# OTA Map

Carte web pour explorer des points OTA par departement en France, avec affichage Leaflet et donnees GeoJSON/OSM.

## Fonctionnalites

- selection d'un departement
- filtrage par type de point: phare, plage, bunker
- filtrage par activation
- affichage cartographique Leaflet avec regroupement des marqueurs
- API optionnelle pour analyser un PDF et extraire les bunkers actives

## Structure du projet

- `index.html` : point d'entree de l'application
- `main.js` et `js/` : logique frontend
- `assets/` : styles, images et ressources statiques
- `json/` : jeux de donnees utilises par la carte
- `server.cjs` : API Express locale
- `api/check-new-activations.js` : version serverless compatible Vercel
- `scripts/` : scripts de collecte, extraction et fusion de donnees

## Lancer le projet en local

### Frontend statique

Le frontend est un site statique. Le plus simple est de servir le dossier du projet avec un petit serveur HTTP.

Avec Python :

```bash
python -m http.server 8080
```

Puis ouvrir `http://127.0.0.1:8080`.

### API locale

Installer les dependances puis lancer l'API Express :

```bash
npm install
npm run api
```

L'endpoint local sera disponible sur `http://127.0.0.1:3000/api/check-new-activations`.

Exemple de requete :

```bash
curl -X POST http://127.0.0.1:3000/api/check-new-activations \
  -H "Content-Type: application/json" \
  -d '{"pdf_url":"https://exemple.tld/fichier.pdf"}'
```

## Deploiement sur Vercel

### Ce qui fonctionne bien sur Vercel

Le frontend actuel est adapte a Vercel car il est statique : HTML, CSS, JS, JSON et images.

### Ce qu'il faut savoir pour le backend

Le fichier `server.cjs` n'est pas ideal pour Vercel en l'etat car il :

- demarre un serveur Express avec `app.listen(...)`
- ecrit un fichier JSON sur disque

Sur Vercel, les fonctions backend sont serverless :

- on n'utilise pas `app.listen(...)`
- l'ecriture disque n'est pas un stockage persistant

Pour cela, le projet inclut une alternative compatible Vercel :

- `api/check-new-activations.js`

Cette fonction :

- recoit un `pdf_url`
- telecharge le PDF
- extrait les identifiants `B/F-1234`
- retourne le resultat en JSON

Elle ne sauvegarde pas le resultat dans le depot. Si vous avez besoin d'un historique ou d'une mise a jour durable des JSON, il faut un stockage externe ou un traitement hors ligne.

### Etapes de deploiement

1. poussez le depot sur GitHub
2. importez le depot dans Vercel
3. laissez Vercel detecter un projet statique Node
4. deployeez

Une fois deployee :

- le frontend sera accessible sur votre URL Vercel
- l'API sera accessible sur `/api/check-new-activations`

Exemple :

```text
https://votre-projet.vercel.app/api/check-new-activations
```

## Recommandation backend

Si votre objectif est seulement de rendre la carte accessible sur internet, deployeez uniquement le frontend sur Vercel.

Si vous voulez aussi traiter des PDF ponctuellement :

- utilisez la fonction serverless Vercel fournie

Si vous voulez mettre a jour durablement les fichiers JSON du projet :

- gardez les scripts Python et Node en local ou dans GitHub Actions
- ou deployeez un vrai backend avec stockage persistant sur Railway, Render, une VM ou une base de donnees

## Dependances

- `express`
- `node-fetch`
- `pdf-parse`

## Suite possible

Les scripts dans `scripts/` servent a enrichir et maintenir les donnees bunker/plages hors du frontend. Ils sont utiles pour un workflow de mise a jour, mais ne sont pas necessaires pour afficher la carte sur Vercel.