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

| Quand | Ce qui part réellement | Message |
|---|---|---|
| J-1 | Notification | « Votre voyage part demain à 16:00. Confirmez-vous ? » |
| T-3 h | Notification | Rappel de l'heure de convocation |
| T-90 min | Notification insistante | « Confirmez, sinon votre place sera proposée » |
| **T-60 min** | **Notification sur un canal d'alarme dédié** | Son et priorité maximale, en tête de la pile |
| T-45 min | Notification, priorité maximale | Dernier appel, avec l'heure limite affichée |
| T-30 min (convocation) | — | **Signalement à la gare, jamais annulation automatique** |

> **Ce tableau a été corrigé après vérification du code.** Il annonçait un SMS aux
> deux avant-derniers échelons et une « alarme plein écran qui sonne comme un réveil
> jusqu'à ce qu'on réponde ». Ni l'un ni l'autre n'existe, et l'un des deux ne peut
> pas exister : **l'application n'envoie jamais de SMS toute seule** — c'est la règle
> qu'elle publie dans sa politique de confidentialité, où seuls partent les messages
> que l'utilisateur envoie lui-même. Ce qui est programmé, ce sont cinq notifications
> locales d'intensité croissante, dont une sur un canal Android dédié qui sonne et
> passe devant les autres. C'est réel, c'est utile, et c'est moins que ce qui était
> écrit. Le montrer à la compagnie en promettant un réveil qui ne sonne pas serait la
> pire façon d'ouvrir la discussion.

À l'échéance, une réservation **non payée** sans réponse bascule en « sans réponse » sur
l'écran de la gare : c'est un agent qui décide, pas un minuteur. Un billet **payé** n'est
jamais touché — seul un agent peut libérer la place, 5 minutes avant le départ, comme le
prévoient déjà les conditions de transport.

Cinq garde-fous protègent la place du voyageur :

1. Annuler demande une **seconde confirmation** — un geste malheureux ne suffit pas.
2. **Rétractation** possible pendant 15 minutes, tant que la place n'a pas été réattribuée.
3. Le silence n'annule **jamais** un billet payé.
4. Une **confirmation tardive** reste recevable jusqu'à 5 minutes du départ.
5. À l'échéance, une réservation restée sans réponse apparaît **« sans réponse »** sur
   l'écran de la gare, qui appelle alors ces personnes-là — deux ou trois par bus, au
   lieu de quarante.

> **Ce point disait autre chose** : « si la notification n'est pas délivrée, la gare
> le voit ». Elle ne peut pas. Une notification **locale** n'a pas d'accusé de
> réception : le téléphone la programme lui-même, et rien ne remonte. Le code
> contenait une fonction bâtie sur cette information inexistante — elle a été
> supprimée. Ce que la gare voit réellement, c'est l'absence de réponse, ce qui
> suffit largement à savoir qui appeler.

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
npm run verifier                        # paquets, types, 200 exemples, 22 invariants
npm run fumee                           # les deux paquets, dans un vrai navigateur
```

`npm run verifier` enchaîne le contrôle d'alignement des paquets (une version
d'`babel-preset-expo` désalignée a déjà coûté une soirée), la régénération des types
de routes, `tsc --noEmit`, puis les tests.

Elle ne suffit pas seule : elle ne dit pas si l'application **s'exécute**. Une sortie
anticipée mal placée ou un import circulaire passent la compilation et donnent un
écran blanc au lancement — c'est déjà arrivé, à la seconde de la création du compte.
`npm run fumee` ouvre les deux paquets dans Chromium et joue les parcours pour de
vrai. **Les deux avant tout partage ou toute mise en production.**

## Tester sur un téléphone

**Trois fichiers à double-cliquer, sous Windows :**

| Fichier | Ce qu'il fait |
|---|---|
| `lancer.bat` | Récupère le code, vérifie tout, affiche le QR code à scanner avec Expo Go |
| `publier.bat` | Récupère le code, vérifie tout, publie la version web et rend **une adresse** |
| `construire.bat` | Récupère le code, vérifie tout, construit l'**APK Android** installable |

`lancer.bat` demande que le PC reste allumé et que le téléphone soit sur le même
réseau — le partage de connexion du téléphone convient. `publier.bat` rend une
adresse qui vit sans le PC. `construire.bat` produit un APK qui s'installe et
fonctionne ensuite tout seul, **avec la lecture de la CNIB par photo et les
rappels** — les deux choses qu'Expo Go ne peut pas fournir.

Aucun des trois ne demande d'identifiants : quand une connexion Expo est
nécessaire, c'est l'outil officiel qui la réclame, dans sa propre invite. Et tous
les trois passent `npm run verifier` **avant** d'agir : un APK installé chez
quelqu'un ne se corrige plus d'un clic.

**À la main**, si l'on préfère :

```bash
npx expo start           # QR code, Expo Go
npm run web:publier      # verifier + export + eas deploy --prod
```

La publication demande un compte Expo (gratuit) et un `eas init` fait une fois —
`publier.bat` enchaîne les deux tout seul. L'adresse rendue, ouverte dans Safari puis
ajoutée à l'écran d'accueil (Partager → *Sur l'écran d'accueil*), s'ouvre en plein
écran avec son icône et sans barre de navigateur. C'est aussi l'adresse à déclarer
aux boutiques pour la politique de confidentialité (`…/confidentialite`).

> **Deux limites communes à Expo Go et à la version web** : la lecture automatique
> de la CNIB et les rappels de départ n'y fonctionnent pas — ils demandent des
> modules natifs. Recopier la bande du dos donne exactement le même résultat pour
> l'identité ; pour le reste, il faut l'APK (`construire.bat`, gratuit).

### GitHub Pages

Le dépôt étant public, Pages est redevenu possible et le workflow
(`.github/workflows/pages.yml`) publie à chaque envoi :

```
https://stephane332.github.io/Saramaya-transport-/
```

Un réglage, à faire **une fois** : `Settings → Pages → Source : « GitHub Actions »`.
Sans lui la construction réussit et la publication échoue sur un 404 — c'est ce qui
s'est produit 51 fois avant que le dépôt ne devienne public.

> **Ce que la publicité du dépôt expose.** Tout se lit désormais sans compte,
> `docs/presentation/` compris : l'argumentaire de vente, l'analyse de la
> concurrence, les chiffres à collecter au guichet, et la note sur la sécurité. Ces
> notes ont été écrites pour préparer un rendez-vous, pas pour être lues par la
> compagnie. Ce qui ne doit pas rester visible se retire **du dépôt et de son
> historique** — supprimer le fichier ne suffit pas, l'ancienne version reste
> accessible dans les commits.

Les deux voies coexistent : Pages ne coûte rien et suit la branche, `eas deploy`
donne une adresse indépendante de GitHub. La politique de confidentialité se déclare
aux boutiques depuis l'une ou l'autre, suivie de `/confidentialite`.

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
  data/                 reseau.ts (lignes, gares, tarifs réels), colis.ts, mentionsLegales.ts, application.ts
  lib/                  parcours.ts, action.ts, verrou.ts, billetQr.ts, cnib.ts, colis.ts…
  store/                useApp.ts (zustand + AsyncStorage), migration.ts
  sync/                 types.ts (SyncProvider), localProvider.ts
  theme/                couleurs, typographie, espacements
tests/                  verification.ts (200 exemples), invariants.ts (22 propriétés), fumee.mjs (navigateur)
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

## Conception et marque

L'application est conçue et publiée par **Ange Stéphane Sawadogo**, voyageur et client de
Saramaya Transport. Elle n'est ni éditée, ni exploitée, ni approuvée par la compagnie.

Le pied de l'écran Profil porte le nom de la compagnie, la signature du concepteur et le
numéro de version. Trois lignes courtes : un pied de page n'est pas l'endroit d'un paragraphe.

Le rappel complet — application indépendante, ni éditée ni exploitée par la compagnie — est
dans les **conditions d'utilisation** et la **politique de confidentialité**, à un bouton du
profil. C'est là qu'il a sa place, et c'est là que les boutiques le cherchent.

### L'application porte le nom de la compagnie

Elle s'est d'abord appelée « Siraba ». Elle porte désormais le nom de Saramaya Transport
partout : icône du téléphone, écrans, identifiant d'installation (`com.saramaya.transport`).
C'est un choix du concepteur, pris en connaissance de ce qu'il coûte — `docs/presentation/
nom-et-marque.md` conserve l'argumentaire inverse, qui reste valable si la question se
rouvre.

Deux conséquences à ne pas perdre de vue :

1. **Les textes légaux ne peuvent plus employer le nom comme sujet.** « Saramaya Transport
   n'a pas de serveur » serait faux : la compagnie en a un, c'est celui auquel l'application
   veut se brancher. Ils disent donc « cette application », qui désigne le logiciel sans
   parler au nom de l'entreprise.
2. **L'autorisation écrite devient nécessaire plus tôt.** Une application qui porte leur nom
   et leur logo ne se publie pas sans leur accord — les builds internes et la démonstration,
   eux, ne l'exigent pas.

Le nom et le logo Saramaya Transport appartiennent à la compagnie. **Toute publication
publique exige leur autorisation écrite.**
