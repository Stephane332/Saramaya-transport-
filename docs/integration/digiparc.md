# Se connecter à la plateforme Saramaya (Digiparc)

> **En une phrase :** l'API existe déjà, l'espace client de Saramaya s'en sert sous vos
> yeux, et il ne vous manque qu'**une autorisation et une clé** de la part de Digiparc —
> pas de développement côté eux.

Ce document décrit ce qui a été observé publiquement sur le site de la compagnie, ce qu'il
faut demander, et comment l'application est déjà prête à s'y brancher.

---

## Ce qui a été découvert

L'espace client `saramaya-transport.digiparc.com/espace-client.html` n'est pas une page
statique : il appelle une **API REST Digiparc**. Le code de la page est public (c'est du
JavaScript, lisible par n'importe quel navigateur), et il révèle exactement comment la
réservation fonctionne.

### La plateforme

Digiparc est une plateforme **multi-produits** : le même moteur d'API sert des boutiques en
ligne, des concessionnaires… et la billetterie de transport. On le voit à la liste de ses
points d'accès, qui parlent aussi bien de « produits » et de « marques » que de billetterie.
La partie qui nous intéresse est le module **billetterie** (`billeterie-*`).

### Le point d'entrée

Tout passe par un point d'accès unique et générique :

```
https://cloud.digiparc.com/api/generic              (POST — créer)
https://cloud.digiparc.com/api/generic/getListByParams   (GET — lister)
```

Ce n'est pas une URL par ressource : c'est **une seule porte**, et l'on précise ce qu'on
veut dans les en-têtes HTTP. Trois en-têtes commandent tout :

| En-tête | Rôle | Valeur observée |
|---|---|---|
| `Authorization` | Jeton d'accès | `Bearer <jeton>` |
| `societecode` | Quelle compagnie | `saramaya-transport` |
| `entity` | Quelle ressource | voir ci-dessous |

### Les ressources (entités)

Deux entités de billetterie sont utilisées par l'espace client :

- **`billeterie-reservation-siteweb`** — les réservations : on liste les départs et places
  disponibles, on crée une réservation.
- **`billeterie-billet-vsm-siteweb`** — l'émission du billet.

Le nom de la société est `saramaya-transport`. Le même moteur sert d'autres enseignes sous
d'autres `societecode` — c'est pour cela que l'intégration est générique et documentée.

### Exemple réel, tiré de leur page

Rechercher les départs d'une date (GET) :

```
GET /api/generic/getListByParams?listParams={"dateDepart":"2026-08-20T00:00:00.000Z",
                                             "billeterieAgenceId":"null"}
En-têtes :
  entity: billeterie-reservation-siteweb
  societecode: saramaya-transport
  Authorization: Bearer <jeton>
```

Créer une réservation (POST) :

```
POST /api/generic
En-têtes :
  entity: billeterie-billet-vsm-siteweb
  societecode: saramaya-transport
  Authorization: Bearer <jeton>
Corps (JSON) : { gareDepartId, gareArriveeId, dateDepart, nombrePlaces,
                 nombrePlacesVip, passagers[], telephone, montantTtc, … }
```

Les champs du corps correspondent, un pour un, à ceux que l'application manipule déjà :
gare de départ, gare d'arrivée, date, nombre de places (avec une variante VIP), liste des
passagers, téléphone, montant.

---

## Ce qui manque — et c'est tout

L'appel porte un `Authorization: Bearer <jeton>`. **Ce jeton est la seule chose qui vous
manque.** Il s'obtient auprès de Digiparc, avec l'accord de Saramaya. Concrètement, il faut :

1. **L'accord écrit de Saramaya** pour que son prestataire vous ouvre l'accès. C'est leur
   donnée ; Digiparc ne l'ouvrira qu'à leur demande.
2. **Une clé / un identifiant d'API** émis par Digiparc pour le `societecode`
   `saramaya-transport`, avec un compte de service dédié à l'application.
3. **La portée** : lecture seule pour commencer (afficher départs, places, historique), puis
   écriture (créer une réservation, enregistrer un paiement) quand la confiance est établie.
4. **La documentation officielle** des entités billetterie — l'observation publique donne la
   forme générale, mais seule leur doc garantit la liste exacte des champs et des statuts.

Il n'y a **aucun développement à faire de leur côté** : l'API tourne déjà, leur propre site
l'utilise. Vous demandez une porte d'entrée sur une maison déjà construite.

---

## Comment l'application est prête

Toute la communication avec l'extérieur passe déjà par une seule interface, `SyncProvider`
(`src/sync/types.ts`). Se brancher sur Digiparc, c'est **écrire une implémentation de plus**
derrière cette interface, sans toucher à un seul écran :

```
src/sync/
  types.ts           l'interface (getDeparts, creerReservation, …)   ✔ existe
  localProvider.ts   Horizon 1 — tout sur le téléphone               ✔ existe
  digiparcProvider.ts  Horizon 3 — à écrire quand la clé arrive      ← ici
```

Le squelette du `DigiparcProvider` est fourni dans ce dossier (`digiparcProvider.exemple.ts`)
pour montrer que la correspondance est directe :

| Interface de l'app | Appel Digiparc |
|---|---|
| `chercherDeparts({ ligneId, date })` | `GET /getListByParams` · entity `billeterie-reservation-siteweb` |
| `creerReservation(demande)` | `POST /generic` · entity `billeterie-billet-vsm-siteweb` |
| `historique(voyageurId)` | `GET /getListByParams` filtré sur le téléphone |
| `confirmerPaiement(id)` | `POST /generic` mise à jour du statut |

Le jour où le jeton arrive, on renseigne trois valeurs (URL de base, `societecode`, jeton) et
on bascule le fournisseur. Les écrans, eux, ne changent pas.

---

## Ce que l'automatisation complète débloque

Avec l'accès en écriture, la boucle se ferme et **le paiement devient vérifié** — c'est le
maillon manquant identifié dans `../presentation/concurrence.md` :

1. Le voyageur réserve dans l'application → la place est posée **directement dans Digiparc**,
   visible au guichet à la seconde.
2. Il paie par Orange Money → le paiement est **rapproché automatiquement**, sans que
   personne n'ait à demander « avez-vous payé ? ».
3. La gare voit l'état réel de chaque place, en direct, sur son propre système **et** sur
   l'écran de l'application.
4. Les appels de confirmation **disparaissent**, parce que le système sait enfin qui a payé.

C'est la différence entre « une belle application à côté » et « la façade qui pilote
réellement leur billetterie ».

---

## Prudence

- **Ne testez jamais l'API en écriture sans autorisation.** Lire le code public d'une page
  est licite ; créer de vraies réservations sur leur système ne l'est pas sans accord. Tant
  que vous n'avez pas de clé officielle, l'application reste sur l'Horizon 1 (téléphone seul),
  qui ne touche à rien chez eux.
- **Les détails techniques ci-dessus peuvent changer.** Ils décrivent l'état observé du site
  à une date donnée ; la documentation officielle de Digiparc fait foi.
- **N'écrivez aucune clé dans le code.** Quand le jeton arrivera, il vivra dans une variable
  d'environnement, jamais dans un fichier versionné.

---

## À demander à Saramaya, en une phrase

> « Pour brancher l'application sur votre billetterie, il me faut simplement que Digiparc
> m'ouvre un accès API en lecture pour votre compte `saramaya-transport`. C'est le même accès
> que celui qu'utilise déjà votre espace client — je ne demande rien de nouveau à construire. »
