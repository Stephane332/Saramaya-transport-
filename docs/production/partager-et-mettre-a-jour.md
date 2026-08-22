# Faire tester par des amis, et tout synchroniser à chaque modification

Deux besoins, une seule mise en place : que d'autres puissent **installer**
l'application, et qu'une correction faite ici arrive **partout, toute seule**.

## Le principe

Une application Expo a deux couches :

| Couche | Contenu | Comment elle se met à jour |
|---|---|---|
| **Le socle natif** | modules caméra, notifications, icône, permissions | nouvelle installation |
| **Le code** | écrans, logique, textes, animations, tarifs | **automatiquement, à distance** |

La quasi-totalité du projet est dans la seconde. Corriger un horaire, un libellé ou
un calcul se diffuse donc sans que personne ne réinstalle quoi que ce soit.

## Mise en place — une seule fois

```bash
npx eas-cli@latest login     # compte Expo, gratuit, à créer sur expo.dev
npx eas-cli@latest init      # inscrit le projectId dans app.json
npx eas-cli@latest update:configure
```

Puis, pour que la publication soit automatique à chaque envoi sur GitHub :

1. Créer un jeton sur <https://expo.dev/settings/access-tokens>
2. Dépôt → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret** → nom : `EXPO_TOKEN`, valeur : le jeton

À partir de là, chaque `git push` déclenche `.github/workflows/mise-a-jour.yml` :
il vérifie le projet, puis publie. Les téléphones appliquent au lancement suivant.

Tant que le secret n'existe pas, le workflow s'arrête proprement en l'expliquant —
il ne fait jamais échouer la branche.

## Les trois façons de faire tester

### Le lien web — la plus rapide, pour tout le monde

```bash
npm run web:publier
```

Une adresse à envoyer par WhatsApp. L'ami l'ouvre, fait **Partager → Sur l'écran
d'accueil**, et l'application s'installe avec l'icône du kangourou, en plein écran.
Aucun compte, aucun store, et **le dépôt reste privé**.

*Ce qui manque sur le web :* le scan par caméra et les notifications programmées.

### L'APK Android — application complète, gratuite

```bash
npm run apk
```

Un fichier à envoyer directement. Application native entière : caméra, scan,
notifications, hors ligne. C'est la meilleure démonstration, et elle ne coûte rien.

### L'iPhone hors Expo Go

```bash
npm run ios:build
```

Exige un compte **Apple Developer (99 $/an)** : Apple n'autorise aucune installation
hors App Store sans signature payante. Sans ce compte, un ami sous iPhone passe par
Expo Go ou par le lien web.

## Publier une modification

```bash
npm run maj
```

Vérifie, puis publie. Si le jeton GitHub est en place, un simple `git push` suffit.

## Les garde-fous

- **Rien n'est publié sans contrôle.** `npm run maj` et le workflow lancent d'abord
  `npm run verifier` : cohérence des versions, types, règles de calcul. Une mise à
  jour part vers de vrais téléphones — elle ne se publie pas à l'aveugle.
- **Aucune mise à jour incompatible.** `runtimeVersion` suit l'empreinte des modules
  natifs : une mise à jour n'est servie qu'aux applications dont le socle la
  supporte. Impossible d'envoyer un correctif qui ferait planter une version plus
  ancienne.
- **Personne n'attend.** `fallbackToCacheTimeout: 0` : au lancement, l'application
  démarre immédiatement avec ce qu'elle a et récupère la mise à jour en arrière-plan.
  Un voyageur à la gare, réseau faible, ne reste jamais bloqué sur un écran.
