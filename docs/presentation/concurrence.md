# Ce que fait la concurrence — et ce que nous faisons en plus

> Plan de présentation : commencez par **tout ce que TSR fait déjà**. Laissez-les
> mesurer le retard. Puis seulement : « en plus de tout ça, voici ce que nous
> ajoutons. » L'effet est bien plus fort que d'attaquer directement par vos idées.

---

## TSR — Transport Sana Rasmané

Le concurrent le plus avancé du pays sur le numérique.

**Ce qu'ils sont**
Compagnie burkinabè de voyageurs **et de colis**, avec un réseau qui dépasse les
frontières : Ouagadougou, Bobo-Dioulasso, Kaya et les grandes villes du pays, plus la
CEDEAO — Côte d'Ivoire, Bénin. Ils ont une agence au Bénin. Bureau à Ouagadougou, avenue
Kadiogo, +226 25 34 25 24.

**Leur site : `tsr-transports.com`**

| Ce qu'ils ont | Détail |
|---|---|
| **Réservation en ligne** | Directement sur le site, sans téléphoner |
| **Paiement Mobile Money** | Orange Money, Moov, MTN MoMo |
| **Billet électronique** | Reçu par e-mail, ou téléchargeable depuis son compte |
| **Compte utilisateur** | Le client retrouve ses billets |
| **Choix du siège** | À la réservation, en ligne |
| **Colis** | Envoi de marchandises, en plus des voyageurs |
| **International** | Réservation vers la Côte d'Ivoire et le Bénin |

**Leurs tarifs connus** : 5 000 F Ouaga–Bobo en climatisé, 1 750 F Ouaga–Kaya.
À comparer aux 6 500 F de Saramaya sur Ouaga–Bobo — TSR est moins cher sur cette ligne.

---

## Les autres, et le vrai danger

Le problème n'est pas seulement TSR. C'est que **des plateformes tierces vendent déjà des
billets de bus burkinabè**, et que Saramaya n'est sur aucune :

- **SnapPlus** — vend les tickets TSR en ligne.
- **eafribus** — plateforme de réservation qui référence TSR.
- **Faso Car** — comparateur d'horaires et de tarifs de TSR, STAF et Rakieta, avec
  réservation annoncée comme « bientôt disponible ».
- **STM Voyageurs** — réservation et tarifs en ligne sur son propre site.
- **Baobab Express** — application iOS de réservation de bus en Afrique de l'Ouest.

**Le danger à nommer devant eux :** quand un comparateur devient le point d'entrée, le
voyageur ne choisit plus une compagnie, il choisit une ligne dans une liste. Celui qui
n'y figure pas devient invisible ; celui qui y figure paie une commission et perd la
relation directe avec son client.

Avoir sa propre application, c'est garder cette relation.

---

## Ce que Saramaya a déjà — et pourquoi ça ne marche pas

**C'est le point le plus important du dossier, et il faut le manier avec tact.**

Saramaya possède déjà une réservation en ligne, sur son instance Digiparc :
`saramaya-transport.digiparc.com/espace-client.html`. Le parcours existe — gare de départ,
gare d'arrivée, date, horaire, nombre de passagers, résultats, informations passagers,
confirmation.

Mais le paiement, lui, n'est pas connecté. Pour régler, le voyageur doit **appeler un
numéro** et composer lui-même un code Orange Money propre à chaque agence :

| Agence | Numéros | Code de paiement |
|---|---|---|
| Bobo | 05484000 / 05484001 | 144107580857 · 144101249338 |
| Ouaga Gounghin | 05484002 / 05484003 | 144101375257 · 144102254980 |
| Ouaga Wemtenga | 05484004 / 05484005 | 144108988511 · 144103586558 |

Puis une fenêtre lui demande : **« Avez-vous pu effectuer le paiement dans le délai de
10 minutes ? Oui / Non »**.

Lisez cette phrase deux fois. **Le système demande au client de déclarer lui-même s'il a
payé.** Rien ne le vérifie.

**Voilà pourquoi vos agents passent leurs journées au téléphone.** Ce n'est pas un défaut
d'organisation, c'est la conséquence directe d'un paiement non réconcilié : puisque le
système ne sait pas qui a payé, il faut appeler pour le demander. Tant que ce trou n'est pas
bouché, aucune quantité d'efforts en gare ne le comblera.

Et la page d'accueil de ce même site affiche encore du **Lorem Ipsum** — le texte de
remplissage laissé par l'intégrateur. L'outil a été installé, puis abandonné en route.

### Comment le dire sans les vexer

Ne dites jamais « votre site ne marche pas ». Dites :

> « Vous avez déjà fait le plus dur : vous avez un espace client et un système de
> réservation. Ce qui manque, c'est le dernier maillon — la confirmation automatique du
> paiement. C'est lui qui vous oblige à appeler tout le monde. »

Vous ne leur vendez plus une application : vous leur proposez de **terminer** ce qu'ils ont
commencé. Personne ne se sent attaqué, et l'investissement déjà fait dans Digiparc devient
un argument pour vous, pas contre vous.

---

## Le tableau à montrer

Dessinez-le sur une feuille devant eux, ou imprimez-le.

| | Saramaya aujourd'hui | TSR | **Notre application** |
|---|---|---|---|
| Réservation en ligne | ~ (existe, inachevée) | ✓ | ✓ |
| Paiement Mobile Money | ✗ (code à composer soi-même) | ✓ | ✓ |
| **Paiement vérifié automatiquement** | **✗ (déclaratif)** | ✓ | **✓** |
| Billet électronique | ✗ | ✓ (e-mail/PDF) | ✓ (QR + code-barres) |
| Compte client, historique | ✗ | ✓ | ✓ |
| Choix du siège | ✗ (à la main) | ✓ | ✓ |
| **Billet hors ligne** | — | ✗ | **✓** |
| **Import du ticket papier** | — | ✗ | **✓** |
| **Alarme de confirmation** | ✗ (appels manuels) | ✗ | **✓** |
| **Écran de surveillance en gare** | ✗ | ✗ | **✓** |
| **Report au lieu du remboursement** | ✗ | ✗ | **✓** |
| **Liste d'attente automatique** | ✗ (à la main) | ✗ | **✓** |
| Colis | ✓ | ✓ | à venir |
| International | ✗ | ✓ | — |

Les cinq lignes en gras sont **ce que personne ne fait**. C'est votre proposition.

---

## Ce que nous ajoutons — les cinq différences

### 1. Le billet marche sans réseau

TSR envoie un PDF par e-mail. À la gare, sans réseau et avec 3 % de batterie, ouvrir sa
boîte mail est un pari. Notre billet est stocké dans le téléphone : QR et code-barres
s'affichent en mode avion. **Testez-le devant eux**, c'est spectaculaire.

### 2. L'application avale le ticket papier

Personne ne fait ça. Le client achète au guichet comme toujours, scanne son ticket, et le
voyage entre dans son historique avec son expiration à 30 jours. **Aucune intégration
n'est nécessaire** : ça marche dès aujourd'hui, avec le papier qu'ils impriment déjà.

C'est aussi ce qui rend le déploiement progressif : ceux qui ont l'application en
profitent, les autres continuent exactement comme avant.

### 3. La fin des appels de confirmation

**C'est le cœur.** TSR ne le fait pas, parce que TSR n'a pas ce problème de la même façon :
chez eux, on paie en ligne avant. Chez Saramaya, la réservation par téléphone impose
d'appeler chacun pour vérifier.

Notre escalade — rappel la veille, puis à 3 h, puis alarme plein écran à 1 h — obtient la
réponse sans qu'un agent décroche. Sur 40 places : **2 appels au lieu de 40.**

Et la règle qui rassure : un billet payé n'est **jamais** annulé par la machine. Sans
réponse, la place est signalée à l'agent, qui décide — comme aujourd'hui, à 5 minutes du
départ.

### 4. Le report plutôt que le remboursement

Leur ticket est valable 30 jours et non remboursable. Quand quelqu'un ne peut pas venir,
l'application propose **d'abord de reporter** : aucun franc ne sort de la caisse, le
client ne perd rien, la place repart à la vente immédiatement. Le remboursement devient
l'exception, dans une liste « à traiter » avec le montant déjà calculé.

### 5. L'écran de la gare

TSR a une billetterie en ligne, mais rien n'a été pensé pour **l'agent**. Notre écran lui
donne le manifeste du départ, les statuts en direct — vert, orange, rouge — les
remboursements à préparer et la liste d'attente. Il surveille au lieu de téléphoner.

---

## La phrase qui articule les deux parties

Après avoir montré tout ce que fait TSR :

> « Voilà où en est votre concurrent. Rattraper ça, c'est le minimum — et l'application
> le fait. Mais rattraper ne suffit pas : je vous propose cinq choses que TSR ne fait
> pas, et qui répondent à des problèmes que vous avez et qu'ils n'ont pas. »

Puis vous enchaînez sur les appels de confirmation.

---

## Une précision honnête

Sur un point, **TSR reste devant** et il faut le dire vous-même avant qu'on vous le
demande : ils vendent à **l'international**, vers la Côte d'Ivoire et le Bénin. Notre
application ne le fait pas.

Le dire renforce tout le reste. Un vendeur qui reconnaît une faiblesse devient crédible
sur ses forces.

À l'inverse, Saramaya assure déjà le **courrier et les colis** — c'est écrit sur son propre
site. L'application ne les couvre pas encore : c'est une extension naturelle à mentionner
comme suite, pas comme manque.

---

## À vérifier avant le rendez-vous

Ces informations viennent de sources publiques et peuvent avoir changé. Passez trente
minutes à les confirmer, et notez ce que vous trouvez :

- Ouvrez `tsr-transports.com` et **faites une réservation jusqu'au paiement** : combien
  d'étapes, quels moyens de paiement, à quoi ressemble le billet reçu ?
- Cherchez si TSR a une **application mobile** sur le Play Store — je n'en ai pas trouvé,
  mais vérifiez.
- Regardez si **Faso Car** a ouvert sa réservation, et quelles compagnies y figurent.
- Comparez les **tarifs du jour** sur Ouaga–Bobo : TSR contre Saramaya.
