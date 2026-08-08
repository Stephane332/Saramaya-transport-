# Le nom et la marque

## Pourquoi l'application ne doit pas s'appeler « Saramaya »

Trois raisons, et la troisième est la plus importante.

**Juridique.** Le nom et le logo appartiennent à la compagnie. Publier une application à leur
nom sans autorisation écrite, c'est s'exposer à un retrait des stores — et surtout, arriver en
position de demandeur.

**Négociation.** Si vous arrivez avec « j'ai fait votre application », vous leur offrez quelque
chose qui est déjà à eux. Si vous arrivez avec « voici Siraba, et je vous propose de l'ouvrir à
vos voyageurs », vous arrivez avec un actif. Ce n'est pas la même conversation.

**Avenir.** Si Saramaya dit non, ou met six mois à répondre, une application appelée « Saramaya »
ne vaut plus rien. Une application qui porte son propre nom peut être proposée à Rakieta, STAF
ou STM la semaine suivante. Vous ne misez pas tout sur un seul interlocuteur.

**La bonne architecture de marque :** votre application porte son nom, et Saramaya y est la
compagnie transportrice. Le billet affiche « SARAMAYA TRANSPORT », parce que c'est un vrai
billet Saramaya. L'application, elle, s'appelle autrement. Les deux coexistent sans se marcher
dessus — c'est exactement ce que fait n'importe quelle application de voyage.

---

## Les noms proposés

> **À vérifier auprès de locuteurs natifs avant de trancher.** Vous êtes sur place, moi non :
> confirmez le sens exact, la prononciation, et surtout qu'aucun n'a de connotation malheureuse
> dans une des langues du pays. Un nom qui fait sourire pour de mauvaises raisons est mort.

### 1. SIRABA — *la grande route* (dioula/bambara)

**C'est ma recommandation.** `sira` = la route, le chemin ; `ba` = grand.

Il dit exactement ce que fait le produit, il est enraciné dans une langue parlée dans tout
l'ouest du pays, il se prononce sans effort en français comme en dioula, et il sonne comme une
marque : trois syllabes, ouvertes, faciles à retenir et à crier dans une gare.

Il porte aussi une promesse : la grande route, c'est celle qu'on prend pour aller loin.

*C'est le nom retenu dans le code et sur le logo — un seul mot à changer dans `app.json` si
vous préférez un autre.*

### 2. SIRA — *la route* (dioula/bambara)

La version courte. Plus sobre, plus facile à taper, et proche d'un prénom, donc chaleureux.
Inconvénient : très court, donc probablement déjà pris comme nom de domaine et sur les stores.

### 3. TAAMA — *le voyage, voyager* (dioula/bambara)

Plus poétique que Siraba. Met en avant l'expérience plutôt que l'infrastructure. Joli, mais
un cran moins évident : « la route » se comprend immédiatement, « le voyage » est plus abstrait.

### 4. SORÉ — *la route* (mooré)

L'équivalent en mooré, la langue la plus parlée du pays et celle de Ouahigouya, votre gare de
départ. C'est un argument régional fort — mais moins compris dans l'ouest, à Bobo.

Curiosité : « SORE » est aussi un patronyme courant au Burkina. À vous de voir si c'est un
atout ou une confusion.

### 5. NOOMA — *c'est bien, c'est bon* (mooré)

Le plus chaleureux, le moins descriptif. Ce serait un pari sur le ton plutôt que sur le sens.
À garder si vous voulez une marque affective plutôt qu'utilitaire.

---

## Mon classement

| Nom | Sens | Force | Risque |
|---|---|---|---|
| **Siraba** | La grande route | Clair, sonore, disponible probablement | — |
| Taama | Le voyage | Élégant | Moins explicite |
| Soré | La route (mooré) | Ancrage local fort | Moins compris à l'ouest |
| Sira | La route | Simple | Trop court, sûrement pris |
| Nooma | C'est bien | Chaleureux | Ne dit pas le métier |

---

## Le logo

Fichiers dans `assets/logo/` : `logo.svg` (pastille carrée) et `logo-horizontal.svg`
(avec le nom). Les icônes de l'application en sont générées.

**Ce qu'il représente :** une route qui serpente, et qui dessine en même temps la lettre S.
Le point orange en bas est le départ, le point sombre en haut l'arrivée, et la ligne
discontinue au milieu est le marquage au sol. Lu de loin, c'est une lettre ; lu de près, c'est
un trajet.

**Les couleurs viennent du ticket Saramaya** — le magenta de l'en-tête, le rouge-orangé du
logo. C'est volontaire : l'application est visuellement parente de la compagnie sans usurper
son nom. Si demain vous l'ouvrez à d'autres transporteurs, la palette se change en une ligne
dans `src/theme/index.ts`.

**Il fonctionne en petit.** Testez-le à 40 pixels : la forme reste lisible, ce qui est la
seule vraie exigence d'une icône d'application.

---

## Avant de déposer quoi que ce soit

- Vérifiez la **disponibilité du nom** : domaine `.com` et `.bf`, Play Store, App Store,
  Facebook, Instagram.
- Vérifiez qu'il n'est pas déjà **déposé à l'OAPI** (Organisation Africaine de la Propriété
  Intellectuelle, qui couvre le Burkina).
- Faites-le **prononcer à dix personnes** — en mooré, en dioula et en français. Si personne ne
  bute dessus, c'est le bon.
