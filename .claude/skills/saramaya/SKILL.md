---
name: saramaya
description: Règles et invariants de l'application Saramaya/Siraba. À charger avant toute modification du code de ce dépôt — écrans, règles métier, tests, données. Contient les invariants qui ne doivent jamais être cassés (billet après paiement, rien de simulé, aucune donnée perdue), les conventions de nommage et de commentaire, et la façon de vérifier son travail.
---

# Saramaya / Siraba — les règles du projet

Application compagnon pour les voyageurs de **Saramaya Transport** (Burkina Faso),
écrite par un client de la compagnie, pas par la compagnie. Elle doit être utile
**dès le premier jour, sans que personne n'ait à dire oui** — c'est ce qui la rend
réalisable, et c'est aussi ce qui rendra la présentation à la société convaincante.

Ce document existe parce que les défauts les plus graves de ce projet n'ont pas été
des erreurs de syntaxe : ce sont des règles connues, contournées par une porte de
côté. Les voici, avec la façon de vérifier qu'elles tiennent.

---

## 1. Les cinq invariants

Ils priment sur toute demande de fonctionnalité. Si une demande les contredit,
**dire pourquoi et proposer autre chose** plutôt que de les plier.

### I. Aucun titre de transport avant que le paiement soit constaté

Pas de QR, pas de code-barres, pas le mot « ticket ». Une place retenue s'affiche
comme une place retenue.

Une seule fonction en décide : `paiementEtabli()` dans `src/lib/parcours.ts`. Elle
ne regarde que le statut posé par la compagnie (`PAYEE`, `EMBARQUE`) et la date
d'encaissement (`payeLe`).

> **Le piège, déjà tombé une fois.** Le statut `CONFIRMEE` a compté pour un
> paiement. Résultat : appuyer sur « Oui, je viens » sur une réservation impayée
> fabriquait un billet valide, QR signé compris, accepté par le contrôleur — et
> ouvrait un remboursement en caisse pour un billet jamais réglé. « Je viens » n'est
> pas « j'ai payé ». Ne jamais réintroduire un statut qui vaut preuve de paiement.

La déclaration du voyageur (« j'ai payé par Orange Money ») **ne compte pas** :
l'application ne peut pas la vérifier. Elle est enregistrée, transmise à la gare, et
n'émet rien.

### II. Rien de simulé, jamais

Pas de fausse attente, pas de statut qui avance tout seul, pas de fonction qui
fait semblant. Ce qui n'est pas disponible se **dit** :
`EnAttenteDeLaCompagnie` + `etatFonction()` dans `src/lib/disponibilite.ts`.

Déjà retirés pour cette raison : un « Paiement en cours… » de 1,2 seconde qui
n'était qu'un `setTimeout`, un colis annoncé « payé » et « déposé » à la seconde du
clic, quatre interrupteurs de réglages qui ne commandaient rien, une promesse
d'alerte automatique à un destinataire qui n'a pas l'application.

Corollaire : **une promesse affichée doit être tenable**. Si le texte dit que
quelque chose arrivera, le code doit le faire — sinon changer le texte.

### III. Rien ne se perd

Aucune donnée n'existe ailleurs : il n'y a pas de serveur.

- Un compte n'est **jamais** recréé par-dessus un compte existant. Ni au démarrage,
  ni après une lecture ratée (`erreurChargement` → écran qui bloque et prévient).
- Toute modification de la forme des données enregistrées passe par
  `src/store/migration.ts`, avec incrément de `SCHEMA_VERSION` **et** un test qui
  vérifie qu'aucun élément n'est perdu et que rejouer la migration ne change rien.
- Un `undefined` explicite dans `mettreAJourProfil` **écrase** la valeur enregistrée.
  Toujours utiliser l'étalement conditionnel : `...(valeur ? { champ: valeur } : {})`.
- Un geste destructeur demande une confirmation qui **énumère** ce qui disparaîtra.

### IV. Aucune action ne part deux fois, aucun échec ne disparaît

Toute action asynchrone déclenchée par l'utilisateur passe par `useAction()`
(`src/lib/action.ts`), qui pose un verrou (`src/lib/verrou.ts`) et remonte l'échec
via `<MessageErreur>`.

Interdits : une promesse flottante dans un `onPress`, un `.catch(() => {})` qui
avale l'erreur, un bouton sans état d'attente.

Exception justifiée : un accessoire (rappel de notification) dont l'échec ne doit
pas faire échouer l'action principale — `.catch(() => undefined)` **avec un
commentaire disant pourquoi**.

### V. Rien ne sort du téléphone sans raison, et la liste est exhaustive

Trois choses seulement quittent l'appareil, et elles sont **nommées** dans
`src/data/mentionsLegales.ts` : les messages que l'utilisateur envoie lui-même, la
lecture du fichier d'état de service, le téléchargement des mises à jour.

> **Le piège, déjà tombé une fois.** `expo-camera` crée, **à l'import**, un worker
> qui va chercher un décodeur sur `cdn.jsdelivr.net` — donc à chaque chargement de
> la version web, y compris sur la page de confidentialité qui affirme le contraire.
> Cacher le bouton ne suffisait pas ; il a fallu retirer le module du bundle web
> (`AppareilPhoto.web.tsx`).

**Toute modification qui change ce qui sort du téléphone met à jour
`mentionsLegales.ts` et `REVISION_MENTIONS` dans le même commit.**

Refusé définitivement, et documenté dans
`docs/presentation/donnees-des-voyageurs.md` : une base centrale des CNIB et photos.
Loi n° 010-2004/AN, contrôle de la CIL — et une base d'identités est une cible dont
la fuite finirait le projet.

---

## 2. Les écrans agent n'existent pas dans l'application publique

`/gare`, `/controle`, `/caisse` sont derrière `MODE_AGENT`
(`EXPO_PUBLIC_MODE_AGENT=1`). Hors de ce mode, chacun renvoie à l'accueil **et aucun
bouton n'y mène**. Un bouton qui rebondit est un bouton de trop.

La garde vient **après** tous les crochets (voir §4).

---

## 3. Conventions d'écriture

- **Tout est en français** : noms de fonctions, de variables, de types, commentaires,
  messages d'interface, messages de commit. Sans exception.
- Les commentaires expliquent **pourquoi**, jamais quoi. Un commentaire qui
  paraphrase la ligne suivante est du bruit ; un commentaire qui rappelle une
  contrainte invisible est ce qui empêche le prochain de casser la règle.
- Les en-têtes de module expliquent le rôle du fichier et la décision qui a présidé à
  son existence.
- Les messages d'erreur destinés à l'utilisateur disent **quoi faire**, pas seulement
  ce qui a raté.
- Un exemple affiché en filigrane (`placeholder`) est **toujours fictif**. Un exemple
  tiré d'une vraie carte se prend pour une donnée déjà lue.
- Aucune donnée personnelle réelle dans le dépôt — ni dans les tests, ni dans les
  exemples. Carte fictive de référence : `B98765432`, OUEDRAOGO FATIMATA ADIZA.

---

## 4. Pièges techniques déjà rencontrés

| Piège | Règle |
|---|---|
| Sortie anticipée au-dessus d'un crochet React | **Tous** les crochets avant le premier `return`. Une sortie placée plus haut rend moins de crochets au rendu suivant : React fait tomber tout l'arbre (erreur #300). Déjà arrivé sur `bienvenue.tsx`, au moment exact de la création du compte. |
| `useApp()` sans sélecteur | Un sélecteur par valeur, sinon l'écran se redessine à chaque modification du magasin. |
| `new Date('2026-08-15')` | Lit minuit **UTC** : affiche la veille à l'ouest de Greenwich. Utiliser `parseISO`. |
| `import()` avec un nom non littéral | Metro refuse un paramètre de fonction ; passer par une constante de module. |
| Navigation impérative depuis la disposition racine | Échoue avant le montage du navigateur. Aiguillage **déclaratif** (`<Redirect>`) dans les écrans. |
| Versions de paquets Expo | `node scripts/verifier-versions.mjs` — un `babel-preset-expo` désaligné a coûté une soirée. |
| Modules à dépendance native dans les tests | Le runner Node ne charge ni `react-native` ni `.tsx`. Le calcul pur va dans `src/lib/*.ts`, la plateforme dans un module à part (`partage.ts`, `code39.ts`, `AppareilPhoto.tsx`). |
| Routes typées et `tsc` | `.expo/types/router.d.ts` est généré et hors dépôt : absent, tout passe ; périmé, une route nouvelle est refusée. `npm run verifier` le régénère d'abord — sans quoi la vérification ne dit pas la même chose sur deux machines. |
| `EXPO_PUBLIC_*` et le cache Metro | Leur valeur est figée dans les modules transformés. Changer `EXPO_PUBLIC_MODE_AGENT` sans `--clear` produit un paquet **identique au bit près** au précédent. |

---

## 5. Comment vérifier son travail

Dans cet ordre, et **les trois** avant de livrer :

```bash
npm run verifier   # paquets, types de routes régénérés, tsc, exemples, invariants
npm run fumee      # les deux paquets s'ouvrent dans un vrai navigateur
```

> **Un paquet agent ne se construit pas sans vider le cache.** Metro fige la valeur
> des variables `EXPO_PUBLIC_*` dans ses modules transformés : sans `--clear`,
> `EXPO_PUBLIC_MODE_AGENT=1` n'a **aucun effet** et l'export produit un paquet
> voyageur identique au bit près. Vérifié. C'est un risque de livraison réel — on
> croirait expédier l'application des guichets.

`npm run verifier` seul ne suffit pas : il ne dit pas si l'application **s'exécute**.
Une sortie anticipée mal placée ou un import circulaire passent la compilation et
donnent un écran blanc au lancement.

### Écrire des tests qui trouvent ce qu'on n'a pas prévu

C'est la leçon la plus chère de ce projet : **les tests d'exemples ne trouvent que
les cas auxquels on a pensé.** Les trois défauts les plus graves sont passés à
travers 152 tests verts. Préférer, dans cet ordre :

1. **Exploration exhaustive de la machine à états** (`tests/invariants.ts`) — toutes
   les suites d'actions possibles, et les invariants vérifiés à chaque état
   atteignable. C'est ce qui attrape « ce statut-là aussi donne un billet ».
2. **Test différentiel** — confronter à une référence indépendante (SHA-256 contre
   `node:crypto`) sur **toutes** les tailles, pas trois.
3. **Invariant de structure** — Code 39 : exactement trois éléments larges sur neuf.
   Vérifiable sans connaître la bonne réponse.
4. **Test métamorphique** — permuter l'ordre des lignes rendues par la
   reconnaissance de caractères ne doit pas changer le résultat.
5. **Aller-retour** — encoder puis décoder rend l'original ; altérer un caractère
   déclenche un avertissement.

Un exemple ne devient un test unitaire que pour **fixer une régression précise**.

### Se mettre à la place de chaque type d'utilisateur

Les parcours à tenir, tous couverts par `npm run fumee` :

- nouveau voyageur, sans compte ;
- voyageur avec réservation impayée, puis paiement déclaré ;
- voyageur avec billet payé (importé d'un ticket papier) ;
- voyageur qui annule, qui reporte, qui se rétracte ;
- expéditeur de colis, avant et après dépôt ;
- **agent** en `MODE_AGENT` : manifeste, caisse, contrôle d'un QR à la porte du bus.

---

## 6. Où sont les choses

```
src/lib/parcours.ts        l'ordre des étapes — la règle du billet
src/lib/action.ts, verrou.ts   le filet des actions utilisateur
src/lib/billetQr.ts        QR signé, vérifiable hors ligne
src/lib/cnib.ts, cnibRecto.ts, carteIdentite.ts   lecture des deux faces et fusion
src/lib/disponibilite.ts   ce qui attend la compagnie, et comment on le dit
src/store/useApp.ts, migration.ts   état persistant et conversions
src/sync/types.ts          la frontière avec le système de la compagnie
src/data/mentionsLegales.ts  ce qui sort du téléphone — texte publié
docs/production/etat-de-preparation.md   où en est le projet
```

## 7. Ce qui ne se fait pas sans autorisation écrite

Publier l'application sous le nom et le logo Saramaya. Les builds internes et la
démonstration ne l'exigent pas — c'est par là qu'on commence.

Ne pas rendre le dépôt public : l'historique contient
`docs/presentation/securite-et-ethique.md` et `argumentaire.md`, destinés à la
présentation et non au public.
