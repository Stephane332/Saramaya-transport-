# Feuille de route — toutes les idées, aucune perdue

Registre de **tout** ce qui a été demandé ou évoqué depuis le début du projet. Rien
n'est écarté sans une raison écrite. Trois états :

- **Fait** — présent dans l'application, vérifiable.
- **Prêt à brancher** — construit, en attente d'un élément extérieur (accord, build, compte).
- **À faire** — décidé, pas encore construit.

---

## 1. Le parcours du voyageur

| # | Idée | État | Où / pourquoi |
|---|---|---|---|
| 1 | Application très moderne, animations, illustrations | **Fait** | Reanimated, transitions, cascades, retour haptique |
| 2 | 3D façon « mode spatial » Apple | **Fait** | `Bus3D` (react-three-fiber) + `CarteSpatiale` (gyroscope) sur les moments forts |
| 3 | Connexion par nom + téléphone | **Fait** | `app/bienvenue.tsx` — compte réel créé sur l'appareil |
| 4 | Historique des voyages, nombre de trajets | **Fait** | Alimenté par les tickets scannés et les réservations réelles |
| 5 | Nouvelles réservations depuis l'app | **Fait** | `app/(tabs)/reserver.tsx` |
| 6 | Classement par type (VIP, ordinaire) | **Fait** | Trois classes réelles : Ordinaire, VIP 1re, VIP Directe — portées par le départ |
| 7 | Ticket en ligne, dématérialisé | **Fait** | `app/billet/[id].tsx`, consultable **hors ligne** |
| 8 | Billet virtuel = miroir du ticket papier | **Fait** | Souche magenta, code-barres Code39, mêmes champs |
| 9 | Rappels d'expiration (validité 30 jours) | **Fait** | Notifications locales réelles à J-7 et J-2 |
| 10 | Alarme insistante jusqu'à valider/annuler | **Fait** | Canal Android `alarme` (priorité MAX), escalade de rappels |
| 11 | Délai très long puis annulation automatique | **Fait** | Moteur `confirmation.ts` — mais **jamais** d'annulation d'office d'une place payée |
| 12 | Ne pas faire perdre sa place par erreur | **Fait** | Une réservation payée est « protégée » : aucun minuteur ne peut la détruire |
| 13 | Paiement avant le ticket | **Fait** | Coordonnées Orange Money réelles affichées ; déclaration par le voyageur |
| 14 | Envoi de colis + code par WhatsApp | **Fait** | `app/(tabs)/colis.tsx`, partage du code, tarif à 10 % de la valeur déclarée |
| 15 | Temps réel : à 9 h, ne plus voir le départ de 8 h | **Fait** | `departsAVenir` — testé |
| 16 | Départs ajoutés en période d'affluence | **Fait** | `departsDuJour` : fusion + badge **AJOUTÉ** + appel direct à la gare |
| 17 | Suspension à distance par la compagnie, puis réouverture | **Fait** | `statutService.ts` — coupe-circuit, message affiché, repli ouvert |

## 2. Identité et CNIB

| # | Idée | État | Détail |
|---|---|---|---|
| 18 | Scanner la CNIB (photo/fichier) pour remplir l'identité | **À faire** | Écran de capture + relecture ; extraction MRZ au dos, plus fiable que le recto |
| 19 | Ne jamais affirmer : l'utilisateur confirme | **Principe retenu** | L'extraction pré-remplit, elle ne valide pas |
| 20 | Extraction locale, rien n'est envoyé | **Principe retenu** | ML Kit / Vision sur l'appareil. Exige un build EAS (pas Expo Go) |
| 21 | Transmettre l'identité aux agents si nécessaire | **Prêt à brancher** | Aujourd'hui : affichée au guichet. Demain : part avec la réservation |
| 22 | Garder la date d'expiration de la CNIB et prévenir | **À faire** | Notification locale, comme les billets. **Annoncé au client, pas caché** (voir §6) |

## 3. Le billet et le contrôle

| # | Idée | État | Détail |
|---|---|---|---|
| 23 | QR vérifiable scanné par le contrôleur à la porte | **À faire** | QR signé, lisible **hors ligne** : siège, trajet, état du paiement |
| 24 | Le scan sort le siège et la place réservée | **À faire** | Contenu dans le QR lui-même, pas besoin de réseau |
| 25 | Le scan confirme le paiement | **Prêt à brancher** | Le QR portera l'état réel une fois le paiement vérifiable côté compagnie |
| 26 | Ticket en double : numérique **et** physique | **Fait** | `supports: ['NUMERIQUE','PAPIER']`, une seule référence |
| 27 | Scan du code-barres papier | **Fait** | Vraie caméra ; le code-barres ne portant que le numéro, le trajet est confirmé par le voyageur |

## 4. Le bus 3D pendant le trajet

| # | Idée | État | Détail |
|---|---|---|---|
| 28 | Le bus 3D avance et suit le parcours réel | **À faire** | GPS + tracé de la ligne ; le bus progresse sur le trajet |
| 29 | Comment l'app sait qu'on a embarqué ? | **Réponse** | Trois signaux : l'heure du départ atteinte, la position à la gare, le scan du contrôleur. Le plus sûr est le scan ; à défaut, on propose « Vous êtes à bord ? » |
| 30 | Ça marche sans connexion ? | **Réponse** | Oui : le GPS ne demande pas de réseau, et le tracé de la ligne est embarqué. Seule la carte de fond aurait besoin d'internet — on s'en passe |
| 31 | Départ raté = rien de tout ça | **Réponse** | Exact, et c'est voulu : le suivi ne démarre pas sans embarquement constaté |
| 32 | Trajet visible téléphone verrouillé, écran always-on | **À faire** | Live Activity (iOS) / notification permanente (Android), au choix de l'utilisateur |

## 5. Côté compagnie et agents

| # | Idée | État | Détail |
|---|---|---|---|
| 33 | Chaque caissière entre son numéro Orange Money | **Fait** | `app/caisse.tsx` |
| 34 | Les écrans agents **hors** de l'app des voyageurs | **Fait** | `EXPO_PUBLIC_MODE_AGENT` — application agent distincte, même code |
| 35 | Supprimer les appels de confirmation | **Argument central** | C'est la valeur numéro un du projet |
| 36 | Se brancher à leur plateforme, tout automatiser | **Prêt à brancher** | Couche `sync` : Local → Bridge → Digiparc, sans réécriture |
| 37 | Complémentaire à Digiparc, jamais concurrent | **Principe retenu** | Répété dans tout le dossier de présentation |
| 38 | Retrouver l'historique d'un ancien client | **Prêt à brancher** | Par CNIB + téléphone, le jour de l'accès. Voir `docs/integration/synchronisation.md` |
| 39 | Phase de test d'intégration avant accord | **À faire** | À écrire dans le dossier : pilote sur **une seule ligne**, en lecture seule d'abord |
| 40 | Approcher les dirigeants (LinkedIn) | **À faire** | Méthode dans le dossier de présentation ; le chef de gare ouvre la porte, la direction décide |

## 6. Données, éthique, sécurité

| # | Idée | État | Détail |
|---|---|---|---|
| 41 | Rien de simulé nulle part | **Principe retenu** | Vérifié à chaque écran |
| 42 | Tableau de bord de suivi (utilisateurs/jour, trafic, remplissage) | **À faire** | En **comptage anonyme** — donne tout ce qui était cherché |
| 43 | Base centrale des CNIB et photos de tous les utilisateurs | **Écarté** | Illégal (loi 010-2004/AN, CIL) et c'est le risque qui tuerait le projet. Voir `docs/presentation/donnees-des-voyageurs.md` |
| 44 | Fonction cachée non annoncée | **Écarté** | Une collecte ignorée est une collecte sans consentement. Le rappel CNIB est gardé, mais **annoncé** |
| 45 | Reconnaître les clients par leur photo | **Écarté** | Biométrie ; le numéro de téléphone suffit |
| 46 | Fidélisation, personnalisation | **À faire** | Sur l'historique local : « 12 voyages », ligne habituelle, siège préféré |
| 47 | Utiliser leurs failles pour vendre | **Cadré** | Observer et signaler : oui. Tester ou exploiter : non. `docs/presentation/securite-et-ethique.md` |
| 48 | Aucun bug, aucune perte de données, aucune faille | **Fait, et continu** | Audit du 09/08 : 3 modules manquants, 7 versions, perte de compte au démarrage, collisions d'identifiants, 19 erreurs de typage. `npm run verifier` |

## 7. Marque et diffusion

| # | Idée | État | Détail |
|---|---|---|---|
| 49 | Icône = le kangourou et son petit | **Fait** | Extrait du logo officiel, recentré. `scripts/generer-icones.py` |
| 50 | Améliorer leur logo sans le changer | **À faire** | Version vectorielle propre du kangourou pour l'app ; l'emblème reste le leur |
| 51 | Couleurs fidèles aux autocars | **Fait** | Rouge #D81F26 et blanc ; le magenta n'habille que le billet |
| 52 | Tester sur iPhone | **Voir ci-dessous** | Deux voies, §8 |
| 53 | Mise en production | **Fait** | `eas.json` + `docs/production/mise-en-production.md` |
| 54 | Effet de démonstration à la caisse | **Principe retenu** | L'app doit être compréhensible en 10 secondes par un voyageur qui regarde par-dessus l'épaule |

## 8. Ce qui bloque le test sur iPhone, et pourquoi

### Voie immédiate — Safari sur le même réseau, tout de suite

Rien à installer, rien à activer, rien à attendre. Quand `npx expo start` tourne
sur l'ordinateur, il sert **aussi** la version web, et il l'expose sur le réseau
local — la même adresse que celle affichée pour Expo Go, mais sur le port web.

Le terminal affiche par exemple :

```
› Metro: exp://172.20.10.2:8081
```

Sur l'iPhone, connecté au **même réseau** (le partage de connexion compte), ouvrir
dans Safari :

```
http://172.20.10.2:8081
```

en remplaçant l'adresse par celle qu'affiche votre terminal. L'application se
charge. **Partager → Sur l'écran d'accueil** l'installe avec l'icône du kangourou.

C'est la voie à utiliser ce soir. Les trois autres ci-dessous servent à la
démonstration devant la compagnie.

---

Trois voies, chacune bloquée par **un réglage extérieur au code** :

### Voie A — la version web publiée

Le build web **réussit** à chaque fois. C'est la publication qui échoue, avec ce
message dans les journaux GitHub :

> `Failed to create deployment (status: 404) … Ensure GitHub Pages has been enabled`

**Action, une seule fois :** dépôt → **Settings** → **Pages** → *Source* : **GitHub
Actions** → enregistrer, puis relancer le workflow (onglet Actions → « Publier la
version web » → *Run workflow*).

Adresse une fois activé : `https://stephane332.github.io/Saramaya-transport-/`
Ouvrir dans Safari, puis **Partager → Sur l'écran d'accueil** : l'app s'installe
comme une vraie application, avec l'icône du kangourou.

*Limite honnête :* le web n'a ni caméra de scan fiable, ni notifications
programmées. Tout le reste se voit.

### Voie B — Expo Go

Le projet est sur **SDK 57**, qui est la version **stable actuelle** (`latest` sur
npm). Expo Go ne gère qu'un seul SDK à la fois : celui de sa dernière version.

**Action :** App Store → Expo Go → **Mettre à jour**. Si aucune mise à jour n'est
proposée, c'est que la version iOS de l'iPhone ne permet pas d'installer l'Expo Go
courant — dans ce cas, seule la voie C fonctionne.

### Voie C — le vrai build (celle de la démonstration)

`eas build --profile preview --platform ios` produit une application installée pour
de bon, sans Expo Go. Elle exige un compte Apple Developer. **C'est celle-là qu'il
faut avoir en main devant la caissière** : une application installée, pas un QR code
de développeur. Détail dans `docs/production/mise-en-production.md`.
