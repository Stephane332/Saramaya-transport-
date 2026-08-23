# État de préparation

Ce document répond à une seule question : **l'application est-elle prête ?**

La réponse honnête est en trois parties, parce qu'elle dépend de trois personnes
différentes — le logiciel, vous, et la compagnie. Ce qui relève du logiciel est
terminé et vérifié. Ce qui relève de vous demande deux comptes et trois commandes.
Ce qui relève de Saramaya est branché et attend leur feu vert.

| Ce qu'on veut faire | Prêt ? | Il manque |
|---|---|---|
| Se servir de l'application pour ses propres voyages | **Oui** | Rien |
| La faire tester à des amis (lien web) | **Oui** | `eas deploy --prod` — compte Expo gratuit |
| La faire installer à des amis (Android) | **Oui** | `eas build -p android --profile preview` — gratuit |
| L'installer sur un iPhone en natif | Presque | Compte Apple Developer, 99 $/an |
| La publier sur les stores | Presque | Comptes stores + **autorisation écrite de Saramaya** |
| Réserver une place pour de vrai | Non | Le système de la compagnie |

## 1. Ce qui est fini et vérifié

**14 écrans, 23 modules de règles, 11 900 lignes, 222 contrôles automatiques**, plus
les parcours joués de bout en bout dans un vrai navigateur — voyageur et agent.

```bash
npm run verifier    # paquets, types, 200 exemples, 22 invariants
npm run fumee       # les deux paquets s'ouvrent dans Chromium : 33 contrôles
```

Les 22 invariants ne sont pas des tests d'exemples : ils explorent **toutes** les
suites de gestes possibles, confrontent le calcul à une référence indépendante, et
altèrent les données au hasard pour voir ce qui passe. C'est la leçon la plus chère
du projet — les trois défauts les plus graves étaient passés à travers 152 tests
verts, parce qu'un test d'exemple ne trouve que ce à quoi on a déjà pensé.

Les deux commandes sont complémentaires, et la seconde n'est pas un luxe : elle a
trouvé trois défauts que **rien d'autre ne pouvait voir**.

Le premier : un plantage franc à la seconde où l'on crée son compte. Une sortie
anticipée placée au-dessus de trois crochets React faisait tomber tout l'arbre au
second rendu — un nouveau venu voyait un écran d'erreur en guise de bienvenue. La
compilation était parfaitement valide, les 119 tests au vert.

Le second : la version web contactait `cdn.jsdelivr.net` **à chaque chargement de
page**, y compris sur la page de politique de confidentialité qui affirme le
contraire. `expo-camera` y crée, dès l'import, un worker qui va chercher un
décodeur de QR sur ce CDN. Cacher le bouton de la caméra ne suffisait pas ; le
module est désormais absent du bundle web.

Le troisième, et le plus grave : **le paquet public embarquait les écrans du
personnel**. Metro fige la valeur des variables `EXPO_PUBLIC_*` dans ses modules
transformés ; l'export voyageur construit après un export agent réutilisait le
cache de celui-ci. `/gare` et `/caisse` s'ouvraient donc dans l'application
distribuée aux voyageurs, manifeste des passagers compris. Le code était juste, la
garde `MODE_AGENT` en place, les tests au vert : c'est l'outil de construction qui
livrait autre chose que ce qu'on croyait. Tout export porte désormais `--clear`, et
chacune des trois routes du personnel a son propre marqueur de contrôle — l'ancien
en cherchait deux pour trois routes, si bien que `/controle` était réputé isolé quoi
qu'il arrive.

Le test rejoue le parcours complet et vérifie à l'écran ce qui compte :

```
ok  le compte est créé et l'accueil accueille par le prénom
ok  la réservation naît « à payer »
ok  l'écran annonce une RÉSERVATION, pas un ticket de voyage
ok  aucun code n'est présenté au contrôleur
ok  aucun QR n'est dessiné avant paiement
ok  une déclaration de paiement ne délivre toujours pas le billet
ok  le colis est « à remettre au guichet », pas déposé
ok  aucun code de retrait n'est montré avant le dépôt
ok  et rien ne prétend que le colis est payé
```

### Le parcours complet, dans le bon ordre

Un nouveau client ouvre l'application vide, photographie sa CNIB, et son compte est
créé. Il réserve, paie, retire son billet, le présente à la porte du bus. Chaque
étape n'ouvre que ce qu'elle doit ouvrir :

- **Aucun billet avant paiement.** Ni QR, ni code-barres, ni le mot « ticket ». Une
  place retenue s'affiche comme une place retenue.
- **Une déclaration de paiement n'est pas un paiement.** Elle est enregistrée,
  transmise à la gare, et ne fabrique aucun titre de transport — l'application ne
  peut pas la vérifier, et ne fait pas semblant.
- **Un colis préparé n'est ni déposé ni payé.** Il attend le guichet, où il est pesé,
  réglé, enregistré. Le code de retrait n'apparaît qu'après, et si le guichet en
  remet un autre, c'est celui-là qui est conservé.
- **Un voyage effectué ne se reporte plus, une annulation se rattrape.**

Ces règles ne sont pas dispersées dans les écrans : elles vivent dans `parcours.ts`
et `colis.ts`, et les tests les tiennent.

### Rien de simulé

C'était la consigne, et elle a coûté quelques suppressions : un faux écran
« Paiement en cours… » de 1,2 seconde, un colis annoncé « payé » et « déposé » à la
seconde du clic, quatre interrupteurs de réglages qui ne commandaient rien, une
promesse d'alerte automatique à un destinataire qui n'a pas l'application. Tout est
parti. Ce qui reste marche vraiment, et ce qui attend la compagnie le dit.

### L'inscription tient en une image

Photographier sa CNIB, ou choisir une image déjà dans le téléphone, et tout se
remplit. Une face ou les deux.

Le **dos** porte la bande à lecture machine, la meilleure source qui soit : chaque
champ y est suivi d'une clé de contrôle, si bien qu'une lecture fautive se détecte
au lieu de s'enregistrer. Le **recto** porte ce que la bande n'a pas — lieu de
naissance, profession, date de délivrance, numéro d'identification à dix-sept
chiffres. Et quand les deux se contredisent, l'écran le dit et pointe le champ :
aucun système ne peut deviner laquelle des deux lectures est fausse, mais il peut,
et doit, le signaler.

Chaque champ indique d'où il vient, et **une correction manuelle n'est jamais
écrasée** par une relecture ultérieure.

> **Où la lecture automatique fonctionne.** Elle utilise le moteur du système —
> Vision chez Apple, ML Kit chez Google — via `expo-text-extractor`. Ce module est
> **natif** : il est compilé dans l'application, et n'existe donc ni dans Expo Go ni
> dans un navigateur. Pour la voir à l'œuvre, il faut une application construite —
> `construire.bat` (ou `npm run apk`), Android, gratuit. Partout ailleurs, l'écran le
> dit clairement et **ouvre de lui-même** la saisie de la bande — mêmes champs, même
> décodage, mêmes clés de contrôle.

### Rien ne se perd

Le point le plus surveillé, parce qu'aucune donnée n'existe ailleurs :

- Le compte n'est jamais recréé par-dessus un compte existant — ni au démarrage, ni
  après une lecture ratée, où l'application s'arrête et prévient au lieu de proposer
  une inscription.
- Les données enregistrées sont converties d'une version à l'autre, jamais jetées.
  La conversion est testée, y compris son idempotence.
- La suppression du compte demande une confirmation qui énumère ce qui va disparaître.
- Un plantage affiche un écran qui dit que les voyages sont intacts et propose de
  recharger.

### Rien ne passe deux fois, rien n'échoue en silence

Les 20 actions du parcours passent par un verrou : un second appui pendant qu'une
action est en cours est **ignoré**, pas mis en file. Et tout échec remonte en message
lisible à l'endroit où le geste a été fait. Le verrou lui-même est testé — neuf
contrôles, dont celui qui compte le plus : une erreur le libère, sinon un seul
réseau coupé condamnerait le bouton pour toute la session.

### Les obligations des boutiques

- **Politique de confidentialité et conditions** dans l'application, lisibles hors
  ligne, et publiées à `/confidentialite` sur la version web — c'est le lien à
  déclarer. Elles décrivent le logiciel tel qu'il est, pas tel qu'il sera.
- **Suppression du compte depuis l'application**, exigée par Apple.
- **Descriptions d'usage** de la caméra conformes à ce qu'elle fait réellement
  (codes-barres *et* photo de CNIB — l'écart est un motif de refus courant).
- **`ITSAppUsesNonExemptEncryption: false`**, qui évite une question à chaque
  soumission.

## 2. Ce qui dépend de vous — trois commandes

Elles se lancent sur votre ordinateur, avec **vos** comptes. Personne d'autre ne
doit les faire à votre place, et personne ne doit vous demander vos identifiants.

```bash
npm install -g eas-cli
eas login          # compte Expo, gratuit, à créer sur expo.dev
eas init           # inscrit le projectId dans app.json — la seule valeur qui manque
```

Ensuite, au choix :

```bash
eas deploy --prod                              # lien web public, gratuit
eas build -p android --profile preview         # APK à installer, gratuit
eas update:configure && npm run maj            # mises à jour automatiques partout
```

`eas update:configure` est ce qui réalise la synchronisation demandée : une fois en
place, `npm run maj` envoie une correction à tous les téléphones déjà installés,
sans repasser par les stores.

Pour l'iPhone en natif, il n'y a pas de contournement : Apple exige le compte
développeur. Sans lui, Expo Go et le lien web restent les deux façons de montrer
l'application.

## 3. Ce qui dépend de Saramaya

Ces fonctions sont **écrites et branchées**. Elles ne sont pas absentes : elles
s'affichent dans l'application, marquées comme indisponibles, avec la raison. Le
jour où la compagnie ouvre son système, elles s'allument sans réécriture.

| Fonction | Ce qui manque |
|---|---|
| Places réellement occupées | L'état des sièges d'un départ |
| Confirmation du paiement | Le constat d'encaissement |
| Manifeste complet d'un départ | La liste des passagers |
| Historique d'ancien client | Les voyages faits avant l'application |
| Suivi réel d'un colis | Les étapes côté compagnie |

Le branchement passe par une couche isolée (`lib/sync/`) et quatre variables
d'environnement listées dans `disponibilite.ts`. Aucun écran ne change.

**Et une chose ne dépend que d'un accord, pas d'une technique** : publier sous le nom
et le logo Saramaya exige leur autorisation écrite. Les builds internes et la
démonstration ne l'exigent pas — c'est par là qu'on commence.

## 4. Ce qui a été écarté, et pourquoi

Pour que ce ne soit pas un oubli :

- **Une base centrale des CNIB et des photos** — écartée. Loi n° 010-2004/AN,
  contrôle de la CIL, et surtout : une base d'identités est une cible, et sa fuite
  finirait le projet. Le raisonnement complet est dans
  `docs/presentation/donnees-des-voyageurs.md`, avec ce qu'on fait à la place — qui
  donne presque tout ce qui était recherché.
- **Rien** n'a été écarté du côté de la CNIB : l'inscription par image est complète
  (voir plus bas).
- **Le car 3D suivant le trajet, l'écran verrouillé, les Live Activities** — tous
  demandent un build natif. À reprendre après le premier `eas build`.

## 5. Avant chaque mise en production

Le détail est dans `mise-en-production.md`. En deux lignes :

```bash
npm run verifier      # versions, types, 200 exemples, 22 invariants
npm run fumee         # l'application s'ouvre et se laisse utiliser pour de vrai
```

Puis le parcours à la main sur un vrai téléphone — la liste des enchaînements à
vérifier est dans le même document, à commencer par celui-ci : **créer une
réservation en tapant deux fois sur le bouton, et compter les réservations.**
Il doit y en avoir une.
