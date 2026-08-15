# Saramaya — application compagnon

Application mobile pour les voyageurs de **Saramaya Transport** (Burkina Faso) et pour les
agents de ses gares.

Elle est née d'un ticket papier : Ouahigouya → Ouagadougou, 3 500 F, siège écrit à la main,
n° 66456. Au dos de ce ticket, la compagnie écrit elle-même deux choses qui résument le
problème :

> « Veuillez vérifier l'heure et la date de vos départs dès réception du ticket,
> **car nos agents peuvent se tromper**. »

> « Au cas où vous n'allez pas pouvoir voyager, veuillez nous informer à temps, pour qu'on
> puisse annuler, sinon, **vos places iront vides, et cela générera des pertes pour la
> société**. »

---

## Le problème

Aujourd'hui, pour voyager avec Saramaya :

1. Le client **appelle la gare** pour réserver, puis paie par Orange Money — ou vient payer
   sur place.
2. La gare **rappelle chaque passager** avant la convocation pour vérifier qui a payé et qui
   viendra. Sur un bus de 40 places, cela fait 40 appels, tous les jours, à chaque départ.
3. Le client passe retirer son **ticket papier** 30 minutes avant le départ.
4. Au guichet, **on lui redemande son identité à chaque fois**.

Deux publics, deux douleurs. Le voyageur redonne toujours les mêmes informations, n'a aucun
historique et oublie que son ticket expire au bout de 30 jours. L'agent, lui, passe ses
journées au téléphone, attribue les sièges à la main et corrige les erreurs de saisie.

## Le principe

**L'application est utile dès le premier jour, sans que personne n'ait à donner son accord.**

Le ticket papier porte un code-barres et toutes les informations du voyage : l'application le
scanne, et le trajet rejoint l'historique avec son rappel d'expiration. Aucune API, aucune
autorisation. L'intégration au système de la compagnie devient une amélioration, pas une
condition de départ.

### Les trois horizons

| Horizon | Ce qu'il faut | Ce que ça apporte |
|---|---|---|
| **1 — Compagnon** | Rien | Identité mémorisée, tickets papier scannés, historique, rappels, billet hors ligne, demande de réservation pré-remplie |
| **2 — Pont avec la gare** | Accord de la compagnie | Les demandes arrivent sur un écran, statuts de paiement en direct — **fin des appels de confirmation** |
| **3 — Digiparc** | Accord de leur éditeur | Synchronisation complète des départs, sièges et réservations |

Toute communication avec l'extérieur passe par une seule interface, `SyncProvider`
(`src/sync/types.ts`). Passer d'un horizon au suivant, c'est changer d'implémentation —
aucun écran n'est réécrit.

## La règle qui gouverne les confirmations

> **Le silence ne détruit jamais quelque chose de payé.**

L'application remplace l'appel de la gare par une escalade de rappels, qui va du plus doux au
plus insistant :

| Quand | Canal | Message |
|---|---|---|
| J-1 | Notification | « Votre voyage part demain à 16:00. Confirmez-vous ? » |
| T-3 h | Notification | Rappel de l'heure de convocation |
| T-90 min | Notification + SMS | Insistant |
| **T-60 min** | **Alarme plein écran** | Sonne comme un réveil jusqu'à ce qu'on réponde |
| T-45 min | Notification + SMS | Dernier appel, avec l'heure limite affichée |
| T-30 min (convocation) | — | **Signalement à la gare, jamais annulation automatique** |

À l'échéance, une réservation **non payée** sans réponse bascule en « sans réponse » sur
l'écran de la gare : c'est un agent qui décide, pas un minuteur. Un billet **payé** n'est
jamais touché — seul un agent peut libérer la place, 5 minutes avant le départ, comme le
prévoient déjà les conditions de transport.

Cinq garde-fous protègent la place du voyageur :

1. Annuler demande une **seconde confirmation** — un geste malheureux ne suffit pas.
2. **Rétractation** possible pendant 15 minutes, tant que la place n'a pas été réattribuée.
3. Le silence n'annule **jamais** un billet payé.
4. Une **confirmation tardive** reste recevable jusqu'à 5 minutes du départ.
5. Si la notification n'est pas délivrée, la gare le voit et **appelle cette personne-là** —
   deux ou trois par bus, au lieu de quarante.

## Reporter plutôt qu'annuler

Le ticket est valable 30 jours et porte la mention « non remboursable ». La bonne réponse à
un empêchement n'est donc presque jamais le remboursement, mais le **report** sur un autre
départ dans cette fenêtre : aucun argent ne sort de la caisse, le voyageur ne perd rien, et
aucun agent n'a de dossier à traiter. L'application propose donc le report en premier, et le
remboursement en second (`src/lib/annulation.ts`).

## Le billet, sur deux supports

Une réservation, **une seule référence**, deux supports. Celui qui a l'application montre son
QR code — qui fonctionne sans réseau, ce qui compte à la gare où le réseau manque. Celui qui
n'en a pas garde son ticket papier. L'agent scanne l'un ou l'autre. L'application importe un
ticket papier par scan ; le guichet peut imprimer une réservation faite dans l'application.
Personne n'est exclu, ni les clients sans smartphone, ni les paiements en espèces.

---

## Démarrer

```bash
npm install
npx expo start          # puis scanner le QR code avec Expo Go
npm run web             # ou dans le navigateur
```

Vérifications :

```bash
npm run verifier                        # versions des paquets, types, 119 tests
npx expo export --platform web          # le bundle se produit sans erreur
```

`npm run verifier` est la commande à lancer avant tout partage ou toute mise en
production : elle enchaîne le contrôle d'alignement des paquets (une version
d'`babel-preset-expo` désalignée a déjà coûté une soirée), `tsc --noEmit`, et les
tests.

## Tester sur un téléphone

**Avec un ordinateur** — `npx expo start` affiche un QR code à scanner avec Expo Go
(gratuit sur l'App Store et le Play Store). L'application s'ouvre sur le téléphone, en
natif, avec les animations et la 3D.

**Sans ordinateur, et pour faire tester à des amis** — publier la version web :

```bash
npm run web:publier      # verifier + export + eas deploy --prod
```

Cela demande un compte Expo (gratuit) et un `eas init` fait une fois. La commande
renvoie une adresse publique. Ouverte dans Safari puis ajoutée à l'écran d'accueil
(Partager → *Sur l'écran d'accueil*), la page s'ouvre en plein écran, avec son icône
et sans barre de navigateur — et c'est aussi l'adresse à déclarer aux boutiques pour
la politique de confidentialité (`…/confidentialite`).

> **Pourquoi pas GitHub Pages ?** Le workflow existe (`.github/workflows/pages.yml`)
> et fonctionne, mais **ce dépôt est privé**, et GitHub Pages sur dépôt privé exige un
> plan payant. Le rendre public n'est pas une solution : l'historique contient
> `docs/presentation/securite-et-ethique.md` et `argumentaire.md`, qu'il vaut mieux ne
> pas exposer avant d'avoir parlé à la compagnie. `eas deploy` est gratuit et ne pose
> aucun de ces deux problèmes.

Pour reproduire le build Pages en local, si le dépôt devient public un jour :

```bash
EXPO_BASE_URL=/Saramaya-transport- npx expo export --platform web --output-dir dist
node scripts/preparer-pages.mjs dist /Saramaya-transport-
```

Le préfixe est indispensable : GitHub Pages sert le site depuis un sous-dossier, et sans
lui tous les chemins vers `_expo/` pointeraient à la racine du domaine — page blanche.

## Si l'installation échoue

**`npm error code ECONNRESET`** — la connexion a lâché au milieu du téléchargement, et
`node_modules` est resté incomplet. Toutes les erreurs qui suivent en découlent, à commencer
par `Failed to resolve plugin for module`. Le dépôt contient un `.npmrc` qui fait réessayer
npm longuement ; en cas d'échec malgré tout, relancez simplement `npm install` — il reprend
là où il s'est arrêté.

**`EPERM: operation not permitted, rmdir` sous Windows** — un antivirus, OneDrive ou un
processus resté ouvert verrouille les fichiers pendant que npm les remplace. Trois choses
aident, dans cet ordre :

1. **Placez le projet hors du dossier utilisateur**, par exemple `C:\dev\` — `C:\Users\<nom>`
   est analysé en permanence par Windows Defender et souvent synchronisé par OneDrive.
2. **Fermez tout ce qui touche au dossier** : éditeur, terminaux, serveur Expo en cours.
3. En dernier recours, supprimez `node_modules` et relancez `npm install`.

**`Failed to resolve plugin for module` alors que l'installation semble complète** — regardez
le chemin dans la trace. S'il pointe vers un `node_modules` *au-dessus* du projet (par exemple
`C:\Users\<nom>\node_modules`), ce dossier parasite masque celui du projet : supprimez-le.
Il vient généralement d'un `npm install` lancé par erreur dans le dossier personnel.

## Écrans

### Côté voyageur

| Écran | Route | Rôle |
|---|---|---|
| Bienvenue | `/bienvenue` | Ouverture de compte à partir d'une photo de la CNIB |
| Accueil | `/` | Prochain voyage, compte à rebours, statistiques, bus 3D |
| Réserver | `/reserver` | Trajet → date → départ → siège → résumé |
| Scanner | `/reserver?scan=1` | Import d'un ticket papier |
| Colis | `/colis` | Préparer un envoi ; suivi et code de retrait sur `/colis/[id]` |
| Mes voyages | `/voyages` | Historique complet, « refaire ce trajet » |
| Profil | `/profil` | Identité présentable au guichet, état réel des rappels |
| Ma CNIB | `/cnib` | Pièce d'identité, décodage de la bande, rappel d'expiration |
| Billet | `/billet/[id]` | QR hors ligne **une fois payé**, paiement, report, annulation |
| Confirmation | `/confirmation/[id]` | L'alarme — « je viens » ou « j'annule » |
| Confidentialité | `/confidentialite` | Politique et conditions, lisibles hors ligne |

### Côté agent — **absents de l'application publique**

Ils ne sont compilés que dans la version agent (`EXPO_PUBLIC_MODE_AGENT=1`) ; ailleurs,
chacun renvoie à l'accueil et aucun bouton n'y mène. Voir `src/lib/modeAgent.ts`.

| Écran | Route | Rôle |
|---|---|---|
| Gare | `/gare` | Manifeste d'un départ, statuts, appels à passer |
| Contrôle | `/controle` | Scan du QR à la porte du bus, verdict hors ligne |
| Caisse | `/caisse` | Numéro Orange Money du guichet — chaque caisse a le sien |

## Organisation du code

```
app/                    écrans (expo-router)
src/
  components/           base.tsx (thème appliqué), PlanSieges, Bus3D (+ .web), ScannerCamera
  data/                 reseau.ts (lignes, gares, tarifs réels), colis.ts, mentionsLegales.ts
  lib/                  parcours.ts, action.ts, verrou.ts, billetQr.ts, cnib.ts, colis.ts…
  store/                useApp.ts (zustand + AsyncStorage), migration.ts
  sync/                 types.ts (SyncProvider), localProvider.ts
  theme/                couleurs, typographie, espacements
tests/                  verification.ts — 119 contrôles sur le vrai code source
docs/presentation/      argumentaire, chiffres à collecter, déroulé de démonstration
docs/production/        état de préparation, mise en production, partage et mises à jour
docs/integration/       comment se brancher sur la billetterie Digiparc de la compagnie
```

**Fichiers à lire en premier** :

- `src/lib/parcours.ts` — l'ordre des choses, et ce qui n'a pas le droit d'arriver.
  C'est lui qui interdit un billet avant paiement.
- `src/lib/action.ts` et `src/lib/verrou.ts` — pourquoi deux appuis ne font jamais
  deux réservations, et pourquoi aucun échec ne disparaît en silence.
- `src/sync/types.ts` — la frontière avec le système de la compagnie.
- `src/lib/disponibilite.ts` — ce qui attend leur feu vert, et comment on le dit.

## Données

`src/data/reseau.ts` contient les **vraies** lignes, horaires et tarifs de Saramaya :

| Ligne | Ordinaire | VIP | Départs |
|---|---|---|---|
| Ouahigouya ↔ Ouagadougou | 3 500 F | 5 000 F | 06:00, 10:00, 14:00, 16:00 |
| Ouagadougou ↔ Bobo-Dioulasso | 6 500 F | 8 000 F | 08:30, 09:30, 12:30, 14:30, 18:30, 22:30, 23:45 |

Les lignes vers **Koudougou et Boromo** figurent avec des horaires **estimés** : la compagnie
dessert bien ces villes, mais leurs horaires n'ont pas été trouvés publiquement. À corriger
sur place.

## Ce qui n'est pas encore fait

L'état complet — ce qui est prêt, ce qui dépend de vous, ce qui dépend de la
compagnie — est dans **`docs/production/etat-de-preparation.md`**. En résumé :

- **Paiement Orange Money réel** : exige un compte marchand au nom de la compagnie. Le
  parcours est complet, seuls les identifiants manquent. En attendant, l'application
  n'encaisse rien et ne prétend pas le contraire.
- **Lecture automatique d'une image de CNIB** : entièrement écrite et testée — image
  choisie ou photographiée, recto et dos, fusion des deux faces, désaccords
  signalés. La reconnaissance de caractères elle-même passe par le moteur du
  système (`expo-text-extractor` : Vision chez Apple, ML Kit chez Google), qui
  **n'existe ni dans Expo Go ni dans un navigateur**. Elle fonctionne dans
  l'application construite (`npm run apk`, ou un build iOS). Partout ailleurs,
  recopier la bande du dos donne exactement le même résultat, par le même chemin.
- **Places réellement occupées, confirmation de paiement, manifeste complet, suivi de
  colis** : branchés et annoncés comme indisponibles tant que la compagnie n'a pas
  ouvert son système.
- **Suivi GPS, écran verrouillé, aller-retour en une réservation, achat pour un tiers,
  mooré et dioula** : à reprendre après le premier build natif.

Ce qui **existe** et fonctionne aujourd'hui, sans permission de personne : compte à
partir de la CNIB, réservation, billet hors ligne signé, import d'un ticket papier,
colis avec code de retrait, rappels locaux, fidélité calculée sur l'appareil.

## Marque

Le nom et le logo Saramaya Transport appartiennent à la compagnie. Ce dépôt est un projet de
démonstration, réalisé par un client. **Toute publication publique de l'application sous ce
nom exige leur autorisation écrite.**
