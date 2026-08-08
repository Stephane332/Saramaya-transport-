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
npx tsc --noEmit                        # types
npx expo export --platform web          # build web
```

## Tester sur un téléphone

**Avec un ordinateur** — `npx expo start` affiche un QR code à scanner avec Expo Go
(gratuit sur l'App Store et le Play Store). L'application s'ouvre sur le téléphone, en
natif, avec les animations et la 3D.

**Sans ordinateur** — la version web est publiée automatiquement sur GitHub Pages à
chaque push :

```
https://stephane332.github.io/Saramaya-transport-/
```

Ouverte dans Safari puis ajoutée à l'écran d'accueil (Partager → *Sur l'écran d'accueil*),
elle s'ouvre en plein écran, avec son icône et sans barre de navigateur.

**À activer une seule fois** dans le dépôt : `Settings` → `Pages` → `Source` :
**GitHub Actions**. Sans ce réglage, le workflow construit le site mais ne le publie pas.

Pour reproduire ce build en local :

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

| Écran | Route | Rôle |
|---|---|---|
| Accueil | `/` | Prochain voyage, compte à rebours, statistiques, bus 3D |
| Réserver | `/reserver` | Trajet → date → départ → siège → résumé |
| Scanner | `/reserver?scan=1` | Import d'un ticket papier |
| Mes voyages | `/voyages` | Historique complet, « refaire ce trajet » |
| Profil | `/profil` | Identité présentable au guichet, réglages des rappels |
| Billet | `/billet/[id]` | Billet avec QR hors ligne, paiement, report, annulation |
| Confirmation | `/confirmation/[id]` | L'alarme — « je viens » ou « j'annule » |
| Gare | `/gare` | Aperçu côté agent : manifeste, statuts, remboursements |

## Organisation du code

```
app/                    écrans (expo-router)
src/
  components/           base.tsx (thème appliqué), PlanSieges, Bus3D (+ .web)
  data/                 reseau.ts (lignes, gares, tarifs réels), seed.ts, passagers.ts
  lib/                  confirmation.ts, annulation.ts, disponibilite.ts, format.ts
  store/                useApp.ts (zustand + AsyncStorage)
  sync/                 types.ts (SyncProvider), localProvider.ts
  theme/                couleurs, typographie, espacements
docs/presentation/      argumentaire, chiffres à collecter, déroulé de démonstration
docs/integration/       comment se brancher sur la billetterie Digiparc de la compagnie
```

**Fichiers à lire en premier** : `src/lib/confirmation.ts` porte toute la logique de
confirmation, `src/sync/types.ts` définit la frontière avec le système de la compagnie.

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

- **Paiement Orange Money réel** : exige un compte marchand au nom de la compagnie. Le
  parcours est complet, seuls les identifiants manquent.
- **Envoi de SMS** : le repli SMS suppose un fournisseur d'envoi.
- **Transport de colis**, aller-retour en une réservation, achat pour un tiers, programme de
  fidélité, mooré et dioula, suivi GPS.

## Marque

Le nom et le logo Saramaya Transport appartiennent à la compagnie. Ce dépôt est un projet de
démonstration, réalisé par un client. **Toute publication publique de l'application sous ce
nom exige leur autorisation écrite.**
