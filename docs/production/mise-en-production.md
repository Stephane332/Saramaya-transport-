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
  (`com.saramaya.transport`), `package` Android, icône (le kangourou et son petit sur
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

### La politique de confidentialité : écrite, mais pas encore en ligne

Les deux boutiques refusent une application sans **adresse publique** menant à une
politique de confidentialité — a fortiori une application qui touche à une pièce
d'identité.

Elle est dans le dépôt, et elle n'est pas un document à part : c'est l'écran
`app/confidentialite.tsx`, alimenté par `src/data/mentionsLegales.ts`. Le voyageur la
lit depuis son profil, **hors ligne**.

Ce qui manque est l'**adresse publique** : aucun déploiement n'a encore eu lieu, donc
ce lien n'existe pas encore. Il naîtra du premier `eas deploy --prod`, et prendra la
forme :

```
https://<le-domaine-du-déploiement>/confidentialite
```

où `<le-domaine-du-déploiement>` est l'adresse renvoyée par `eas deploy --prod`.

> **Règle à tenir.** Ce texte décrit ce que le logiciel fait *aujourd'hui*. Toute
> modification qui change ce qui sort du téléphone — un serveur, une mesure d'audience,
> l'intégration Digiparc — doit modifier `mentionsLegales.ts` **dans le même commit**.
> Une politique qui décrit une version antérieure du logiciel est pire que pas de
> politique du tout.

**Une adresse de contact reste à publier.** La politique indique au lecteur que
l'adresse du concepteur figure « à l'endroit d'où vous avez obtenu l'application ».
C'est la seule promesse du texte qui dépende d'une action hors du code : renseigner
le champ « contact du développeur » dans les deux consoles, et le rappeler sur la
page de téléchargement web. Sans cela, la phrase renvoie dans le vide — et une
politique qui explique vos droits sans dire à qui les adresser ne vaut rien.

Elle n'est volontairement pas écrite en dur dans l'application : une adresse gravée
dans un paquet installé ne se change plus, alors qu'une fiche de boutique se corrige
en une minute.

Ce qu'il faudra déclarer dans les formulaires des stores, et qui correspond au texte :

| Question du store | Réponse |
|---|---|
| Données collectées | Aucune. Rien n'est transmis à un serveur du projet ; il n'y en a pas. |
| Données stockées sur l'appareil | Identité, CNIB et photo, réservations, colis. |
| Traceurs / publicité | Aucun. |
| Chiffrement non exempté (iOS) | Non — déclaré par `ITSAppUsesNonExemptEncryption: false`. La signature des billets (HMAC-SHA-256) relève de l'authentification, qui est exemptée. |
| Suppression du compte (exigée par Apple) | Dans l'application : Profil → Supprimer mon compte, avec confirmation. |

> Les comptes stores et l'autorisation écrite relèvent de la compagnie : une
> publication publique au nom de Saramaya exige leur accord. Les builds internes
> (`preview`) et la démonstration par QR ne l'exigent pas — c'est par là qu'on
> commence.

## Le chemin le plus court vers l'iPhone

Trois commandes, une fois le compte Expo créé sur expo.dev. Elles se lancent depuis
le dossier du projet.

```bash
npm install -g eas-cli
eas login          # le compte Expo, à créer sur expo.dev — gratuit
eas init           # inscrit le projectId dans app.json : c'est la seule valeur qui manque
```

Ensuite, selon ce qu'on veut :

```bash
# a) Lien web public, sans rendre le dépôt public — gratuit
eas deploy --prod

# b) Application installée sur l'iPhone — exige le compte Apple Developer (99 $/an)
eas build --profile preview --platform ios
```

**Sans compte Apple Developer, la seule façon d'avoir l'application en natif sur un
iPhone reste Expo Go** : c'est une limite d'Apple, pas du projet. Android n'a pas
cette contrainte — `eas build --profile preview --platform android` produit un APK
qui s'installe directement, sans compte payant.

## Étapes détaillées

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

## Web — deux voies, toutes deux ouvertes

### GitHub Pages

Longtemps impossible : le workflow a tourné 51 fois et échoué 51 fois sur

```
Failed to create deployment (status: 404)
Ensure GitHub Pages has been enabled
```

parce que Pages sur dépôt privé exige un abonnement payant. **Le dépôt est désormais
public**, et le déclenchement automatique est revenu. Adresse :

```
https://stephane332.github.io/Saramaya-transport-/
```

Un réglage à faire une fois : `Settings → Pages → Source : « GitHub Actions »`. Sans
lui, la construction réussit et la publication échoue — exactement le 404 ci-dessus.

> **Ce que la publicité du dépôt expose.** `docs/presentation/` se lit désormais sans
> compte : argumentaire de vente, analyse de la concurrence, chiffres à collecter au
> guichet, note sur la sécurité. Écrits pour préparer un rendez-vous, pas pour être
> lus par la compagnie. Les retirer suppose de les effacer **du dépôt et de son
> historique** : supprimer le fichier laisse l'ancienne version lisible dans les
> commits.

**La voie qui marche**, en un double-clic sous Windows : `publier.bat`.

Il enchaîne tout — récupération du code, dépendances, connexion au compte Expo si
elle manque, `eas init` à la première fois, vérification complète, construction,
publication — et s'arrête net avec un message clair si un contrôle échoue. La
vérification passe **avant** la publication, exprès : une adresse publique qui sert
une version cassée est pire que pas d'adresse.

Il ne demande jamais d'identifiants : la connexion est réclamée par l'outil d'Expo,
dans sa propre invite.

À la main, l'équivalent :

```bash
npm run web:publier      # vérification complète, export, puis eas deploy --prod
```

Elle publie chez Expo depuis un code qui reste privé, et rend une adresse à envoyer
par WhatsApp. C'est aussi elle qui fournit le lien de politique de confidentialité à
déclarer aux boutiques.

## Vérifications avant chaque build de production

1. `npm run verifier` — versions des paquets alignées, `tsc --noEmit` propre, tests
   au vert. C'est la commande qui remplace les trois vérifications séparées.
2. `npm run fumee` — exporte le site **et l'ouvre dans un vrai navigateur**. Un
   bundle qui se produit n'est pas un bundle qui s'exécute : une erreur au premier
   rendu ou un import circulaire passent la compilation et donnent un écran blanc au
   lancement, que `npm test` ne voit pas. Ce contrôle relève aussi toute requête
   réseau qui échoue — c'est ainsi qu'a été découvert le contact vers un CDN
   extérieur qu'`expo-camera` déclenchait sur le web à chaque chargement de page.

   Playwright n'est pas une dépendance du projet ; s'il est absent le test le dit et
   s'arrête sans échouer. Pour l'activer une fois :
   `npm i -D playwright && npx playwright install chromium`.
3. Version affichée : incrémenter `expo.version` dans `app.json` (le
   `versionCode`/`buildNumber`, lui, s'incrémente tout seul).
4. `src/data/mentionsLegales.ts` décrit-il toujours ce que le logiciel fait ? Si
   quelque chose de nouveau sort du téléphone, mettre à jour le texte **et**
   `REVISION_MENTIONS`.
5. Tester le parcours réel sur un build `preview` : ouverture de compte, scan
   d'un ticket, réservation, billet hors ligne, configuration de la caisse.

### Le parcours à refaire à la main, dans cet ordre

Ces enchaînements sont ceux où une erreur coûte une place ou de l'argent. Ils sont
couverts par `npm test` côté règles, mais le geste doit être vérifié sur l'appareil.

| Ce qu'on fait | Ce qui doit se passer |
|---|---|
| Ouvrir un compte, puis fermer et rouvrir l'application | Le compte est toujours là. Jamais de retour à l'écran de bienvenue. |
| Créer une réservation, taper deux fois sur le bouton | **Une seule** réservation créée. |
| Regarder le billet avant de payer | Aucun QR, aucun code-barres : « Place retenue — à payer ». |
| Déclarer le paiement | Toujours pas de QR : « Paiement déclaré ». Le bouton de déclaration disparaît. |
| Préparer un colis | Statut « À déposer ». Aucun paiement annoncé. Le code de retrait n'est pas encore montré. |
| Confirmer le dépôt avec un code du guichet | C'est ce code-là qui s'affiche et qui part au destinataire. |
| Mode avion, rouvrir un billet émis | Le QR s'affiche. C'est le test de la gare sans réseau. |
| Profil → Supprimer mon compte | Une confirmation, qui énumère ce qui va disparaître. |
