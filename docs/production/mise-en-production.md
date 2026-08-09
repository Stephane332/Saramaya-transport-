# Mise en production

Ce document décrit, étape par étape, comment passer de l'application testable à des
applications installables (Android et iOS), puis publiées. Rien ici n'est simulé :
ce sont les commandes réelles et les comptes réels qu'il faut, avec une mention
claire de ce qui dépend de la compagnie.

## Ce qui est déjà prêt dans le dépôt

- **`eas.json`** — trois profils de build : `development` (client de dev),
  `preview` (APK/IPA à installer directement pour tester en interne) et
  `production` (Android App Bundle pour le Play Store, build signé iOS pour
  l'App Store). Le numéro de build est géré à distance par EAS
  (`appVersionSource: "remote"`, `autoIncrement` en production) : plus de conflit
  de `versionCode`.
- **`app.json`** — identité de l'app : nom, `bundleIdentifier` iOS
  (`com.siraba.app`), `package` Android, icône (le kangourou et son petit sur
  fond rouge), écran de démarrage, permissions Android (caméra, vibration,
  notifications, alarme exacte, démarrage), et les plugins natifs
  (`expo-router`, `expo-camera`, `expo-notifications`).
- **`app.config.js`** — ajoute le sous-chemin GitHub Pages au build web sans
  gêner les builds natifs.

## Ce qu'il faut fournir une seule fois

| Élément | D'où il vient | Nécessaire pour |
|---|---|---|
| Compte **Expo** (EAS) | expo.dev, gratuit | Lancer les builds cloud |
| **`projectId`** EAS | créé par `eas init` | Relier le dépôt au projet EAS |
| Compte **Google Play Console** (25 $ une fois) | play.google.com/console | Publier sur Android |
| Compte **Apple Developer** (99 $/an) | developer.apple.com | Publier sur iOS |
| **Autorisation écrite** de Saramaya | la compagnie | Publier sous leur nom et leur marque |

> Les comptes stores et l'autorisation écrite relèvent de la compagnie : une
> publication publique au nom de Saramaya exige leur accord. Les builds internes
> (`preview`) et la démonstration par QR ne l'exigent pas — c'est par là qu'on
> commence.

## Étapes

### 1. Installer l'outil et se connecter

```bash
npm install -g eas-cli
eas login
```

### 2. Relier le projet à EAS

```bash
eas init
```

`eas init` crée le projet côté Expo et inscrit son `projectId` dans `app.json`
(sous `expo.extra.eas.projectId`). C'est la seule valeur qui manque au dépôt
aujourd'hui, parce qu'elle est propre au compte qui publiera l'application.

### 3. Build interne pour tester sur de vrais téléphones

```bash
# Android : produit un .apk qu'on installe directement
eas build --profile preview --platform android

# iOS : nécessite le compte Apple Developer ; produit un build à installer via TestFlight
eas build --profile preview --platform ios
```

Le profil `preview` est fait pour ça : distribuer l'app à quelques testeurs
(agents de la gare, direction) sans passer par les stores. C'est l'étape idéale
pour une **démonstration à la compagnie** avec l'application réellement installée.

### 4. Build de production

```bash
eas build --profile production --platform all
```

Produit un **Android App Bundle** (attendu par le Play Store) et un build iOS
signé pour l'App Store.

### 5. Soumettre aux stores

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

À faire une fois l'autorisation de la compagnie obtenue, avec leurs comptes
développeur.

## Mises à jour sans repasser par les stores (recommandé ensuite)

**EAS Update** permet d'envoyer les corrections de la partie JavaScript
(quasiment tout l'écran et la logique) sans nouveau passage en revue par les
stores — précieux pour corriger vite un horaire ou un libellé. Mise en place :

```bash
npx expo install expo-updates
eas update:configure
```

Les canaux (`channel`) sont déjà nommés dans `eas.json` (`production`,
`preview`), ce qui fait qu'un `eas update --channel production` atteindra les
builds de production dès que `expo-updates` sera installé. On l'ajoute après le
premier build, pour ne pas mélanger les étapes.

## Web (déjà en place)

La version web se construit et se publie sur GitHub Pages via le workflow
existant :

```bash
npx expo export --platform web
```

C'est ce qui alimente le lien de démonstration en ligne, sans installation.

## Vérifications avant chaque build de production

1. `npx tsc --noEmit` — aucune erreur de type.
2. `npx expo export --platform web` — l'export réussit (bon indicateur que le
   bundle est sain).
3. Version affichée : incrémenter `expo.version` dans `app.json` (le
   `versionCode`/`buildNumber`, lui, s'incrémente tout seul).
4. Tester le parcours réel sur un build `preview` : ouverture de compte, scan
   d'un ticket, réservation, billet hors ligne, configuration de la caisse.
