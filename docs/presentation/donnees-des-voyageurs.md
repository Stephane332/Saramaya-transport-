# Les données des voyageurs — ce qu'on peut faire, ce qu'on ne peut pas

Ce document tranche une question posée pendant la conception : peut-on constituer un
tableau de bord central rassemblant l'identité, la photo de CNIB et les déplacements
de tous les utilisateurs, sans le leur dire ?

**Non. Et c'est précisément ce refus qui rend le projet vendable.** Voici pourquoi,
et ce qu'on fait à la place — qui donne presque tout ce qui était recherché.

## Le cadre, en une ligne

Le Burkina Faso protège les données personnelles par la **loi n° 010-2004/AN**, sous
le contrôle de la **Commission de l'Informatique et des Libertés (CIL)**. Un fichier
de personnes identifiées doit être **déclaré**, les personnes doivent être
**informées**, et les données ne servent qu'à la **finalité annoncée**. La CNIB et la
photo d'un document d'identité relèvent des données les plus sensibles qui soient.

Concrètement, trois choses sont hors de question :

| Idée | Pourquoi c'est non |
|---|---|
| Une copie centrale des CNIB et photos de tous les utilisateurs | Collecte non déclarée de données d'identité — l'infraction la plus grave du lot |
| « Une fonction cachée qui aide le client sans qu'on le vante » | Une collecte que la personne ignore est, par définition, sans consentement |
| Reconnaître les clients par leur visage | Données biométriques : régime le plus strict, et sans nécessité ici |

Et il y a le risque pratique, celui qui compte le plus pour ce projet : **une base
d'identités est une cible**. Le jour où elle fuit, ce n'est plus un problème
technique, c'est la fin du projet et un préjudice réel pour des centaines de
personnes. Se présenter devant Saramaya en portant ce risque, c'est leur demander de
l'endosser avec nous.

## Le retournement : c'est un argument de vente

Digiparc centralise déjà tout chez eux. Notre différence peut être exactement
l'inverse, et elle se dit en une phrase devant un directeur :

> « Les pièces d'identité de vos clients ne quittent jamais leur téléphone.
> Nous ne les détenons pas — donc nous ne pouvons pas les perdre. »

C'est une position **plus forte** commercialement qu'un entrepôt de données, et elle
ne coûte presque aucune fonctionnalité. Voici comment.

## Ce qu'on fait à la place, et qui marche

### 1. Le rappel d'expiration de la CNIB — gardé, mais local

L'idée était bonne : prévenir quelqu'un que sa CNIB expire avant qu'il se fasse
arrêter à un contrôle. On la garde **entièrement**. Simplement, la date d'expiration
reste sur le téléphone et le rappel est une **notification locale**, exactement comme
les rappels de départ. Aucun serveur n'a besoin de la connaître.

Et on le **dit** au voyageur — c'est un service qui se vante très bien : « votre CNIB
expire dans trois semaines » est le genre d'attention qui fidélise.

### 2. Les statistiques d'usage — sans identifier personne

Tout ce qui était recherché côté suivi s'obtient **par comptage anonyme** :

- utilisateurs actifs par jour,
- réservations par ligne et par départ,
- taux de remplissage, heures de pointe,
- combien de billets scannés, combien de colis envoyés.

Aucun de ces chiffres n'a besoin d'un nom. On envoie un compteur, pas une personne.
C'est même **plus utile** pour convaincre la direction : un directeur veut le taux de
remplissage du 18:30, pas la liste des passagers.

### 3. La reconnaissance du client — par son compte, pas par sa photo

Reconnaître un habitué se fait avec son **numéro de téléphone et sa CNIB saisie**,
qu'il a lui-même renseignés et qu'il peut effacer. C'est ce que fait déjà
l'application. La photo n'apporte rien que le numéro n'apporte déjà.

### 4. La fidélisation — sur le comportement, pas sur l'identité

« 12 voyages cette année », « votre ligne habituelle », « votre siège préféré » : tout
cela se calcule **sur le téléphone**, à partir de l'historique local. La
personnalisation ne demande pas de base centrale, elle demande de la mémoire locale.

## La règle qu'on se donne

> Toute donnée personnelle reste sur le téléphone de son propriétaire, sauf si elle
> est **nécessaire** à une opération qu'il a demandée, et dans ce cas il en est
> **informé**.

Quand le pont avec la gare s'ouvrira, ce qui partira vers la compagnie sera le
minimum d'une réservation — nom, contact, trajet, place — c'est-à-dire exactement ce
qu'on dicte déjà au téléphone aujourd'hui. Rien de plus. La photo de la CNIB, elle,
ne part jamais : elle sert à remplir le formulaire, sur place, et reste là.

## Ce que ça change pour la présentation

Ajouter au dossier une page « protection des données » qui dit ces trois choses :

1. Les pièces d'identité ne quittent pas le téléphone.
2. Les statistiques transmises sont anonymes et agrégées.
3. Le voyageur peut supprimer son compte et ses données d'un geste (déjà en place).

C'est le genre de page qui fait passer un projet d'« application d'un client » à
« partenaire sérieux » — surtout face à un système dont on a constaté qu'il ne
brillait pas par sa rigueur.
