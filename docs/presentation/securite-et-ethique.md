# La sécurité comme argument — la bonne façon, et le piège à éviter

> Tu as demandé si l'on peut se servir des **failles de leur système** pour mieux vendre le
> nôtre. La réponse honnête est : **oui, mais d'une seule manière** — et il y a une façon de
> le faire qui te renforce, et une autre qui peut te détruire. Ce document trace la ligne.

---

## La ligne, en une phrase

**Observer et signaler** une faiblesse, c'est le travail d'un bon partenaire.
**Chercher, exploiter, ou menacer** avec une faiblesse, c'est ce qui envoie des gens en
prison — même avec de bonnes intentions au départ.

Tu es un **client** de Saramaya, pas leur prestataire de sécurité mandaté. Tant que ce n'est
pas le cas, la seule chose que tu as le droit de faire, c'est lire ce que ton navigateur
affiche déjà. Rien de plus.

---

## Ce qui est permis, ce qui ne l'est pas

| Action | Permis ? | Pourquoi |
|---|---|---|
| Lire le code public d'une page (le JavaScript que ton navigateur télécharge) | ✅ | C'est public, ton navigateur le fait pour t'afficher la page |
| Constater qu'une logique est faible (ex. « le paiement est déclaratif ») | ✅ | C'est une observation, pas une intrusion |
| **Tester leur API** avec de vrais appels pour voir ce qui passe | ❌ | Accès non autorisé à un système informatique — c'est un délit |
| **Créer, modifier, lire** des données réelles sans compte autorisé | ❌ | Intrusion, même si « la porte était ouverte » |
| Chercher activement des failles (scanner, forcer, contourner) | ❌ | Test d'intrusion sans mandat = infraction |
| **Menacer** de divulguer une faille pour forcer un contrat | ❌ | C'est de l'extorsion, un crime — et ça se retourne toujours |
| Divulguer publiquement une faille pour les embarrasser | ❌ | Illégal, et ça tue toute confiance à jamais |

Au Burkina Faso comme presque partout, l'accès frauduleux à un système informatique est puni
par la loi (la CEDEAO a un cadre commun sur la cybercriminalité, et le pays a sa propre loi
sur la protection des données personnelles, supervisée par la CIL). « La porte n'était pas
fermée » n'a jamais été une défense.

---

## Pourquoi la menace se retourne TOUJOURS

Imagine que tu arrives en disant : « Votre système a des trous, payez-moi pour le mien. »
Voilà ce que le directeur entend, dans l'ordre :

1. **« Cette personne a fouillé dans mon système sans permission. »** Tu n'es plus un allié,
   tu es une menace. Le premier réflexe n'est pas de t'embaucher, c'est d'appeler son
   avocat — ou Digiparc, pour qu'ils portent plainte.
2. **« Si elle me fait ça à moi, elle le fera à mes clients. »** Tu deviens quelqu'un à qui on
   ne confie surtout pas des données de voyageurs.
3. **« Je vais fermer l'accès, pas ouvrir ma porte. »** Tu perds l'intégration que tu voulais.

Une faiblesse utilisée comme levier de pression ne se vend pas : elle fait fuir. C'est
l'inverse exact de ce que tu recherches.

---

## Ce que tu as réellement en main — et c'est mieux

Tu n'as pas trouvé une « faille de sécurité ». Tu as compris un **défaut de conception
métier**, en lisant leur page publique : **le paiement est déclaratif**. Le système demande
au client « avez-vous payé ? Oui / Non » et le croit sur parole. Rien n'est piraté là-dedans —
c'est visible par n'importe qui, et c'est un problème de logique, pas de sécurité.

C'est bien plus vendeur qu'une faille, pour trois raisons :

- **Ça les concerne directement** : ce trou leur coûte les appels de confirmation chaque jour.
- **Personne n'est accusé** : ce n'est pas « votre système est mal protégé », c'est « il
  manque le dernier maillon ».
- **Ta solution le comble** : le paiement rapproché automatiquement, c'est exactement ce que
  débloque l'intégration décrite dans `../integration/digiparc.md`.

Tu ne leur vends pas la peur. Tu leur vends la fin d'une corvée. C'est plus fort.

---

## S'il y a une VRAIE faille de sécurité — la divulgation responsable

Si un jour tu remarques, **sans avoir rien testé**, quelque chose de sérieux (des données de
voyageurs exposées, par exemple), la bonne voie existe et elle s'appelle la **divulgation
responsable** :

1. **Tu n'exploites rien, tu ne télécharges rien, tu ne testes rien.** Tu notes ce que tu as
   vu, sobrement.
2. **Tu préviens en privé**, calmement, sans rien demander en échange : « En regardant votre
   site, j'ai remarqué ceci, qui pourrait exposer vos clients. Je vous le signale parce que
   ça me semble important. »
3. **Tu ne le rends jamais public.**
4. **Tu ne le lies pas à ta vente.** C'est un geste gratuit.

Le paradoxe : **signaler gratuitement vend mieux que menacer.** Le directeur se dit « cette
personne aurait pu me nuire, et au lieu de ça elle m'a protégé ». Voilà quelqu'un à qui on
confie une intégration. La confiance que tu bâtis là vaut plus que n'importe quel argument de
vente — et elle est impossible à obtenir par la pression.

---

## Notre propre faille, et pourquoi elle est écrite ici

Il serait malvenu d'analyser les faiblesses d'autrui sans nommer la nôtre.

**La clé qui signe les billets voyage en clair dans l'application livrée.** Expo
place toute variable `EXPO_PUBLIC_*` dans le paquet distribué ; celle-ci se lit dans
le bundle web d'un simple `grep`, et dans un APK décompilé aussi facilement. La
manœuvre a été reproduite : avec cette clé, on fabrique en quelques lignes un billet
VIP à 8 000 F que l'écran de contrôle juge valide.

Ce n'est pas un oubli qu'on pourrait corriger dans un prochain commit : **aucune clé
embarquée dans une application cliente ne peut être tenue secrète.** C'est vrai de
toutes les applications, pas seulement de celle-ci.

Ce qui se corrige, en revanche, c'est ce qu'on en dit. L'écran de contrôle
promettait à l'agent que « toute modification du QR est détectée aussitôt » — faux,
et dangereusement, puisqu'il l'aurait invité à laisser monter en confiance. Il dit
désormais exactement ce que le scan prouve :

- **l'intégrité** — un code abîmé, tronqué ou retouché à la main est refusé ;
- **pas l'authenticité** — recouper au guichet ce qui a de la valeur.

`tests/invariants.ts` épingle l'exposition : le test *fabrique* un faux billet et
vérifie qu'il passe, pour que personne ne puisse un jour affirmer le contraire sans
que la suite le contredise.

**La sortie est connue et elle appartient à la compagnie.** Le jour où Saramaya
signe ses billets avec une clé qui ne quitte pas son système, l'authenticité devient
réelle et l'application le dit sans changer d'écran : la variable
`EXPO_PUBLIC_CLE_BILLET` renseignée bascule le message. C'est un argument de plus à
leur présenter — la partie qu'ils seuls peuvent apporter, et qui transforme un
confort de lecture en preuve.

## En résumé

- **Ne teste jamais leur API. Ne cherche jamais de failles. Ne menace jamais.**
- Ce que tu as — le paiement déclaratif — est une **observation publique**, pas une intrusion,
  et c'est ton meilleur argument : formulé comme « le maillon manquant », pas comme « votre
  faille ».
- Si tu vois une vraie faille par hasard, **signale-la gratuitement et en privé**. C'est légal,
  c'est juste, et c'est ce qui inspire le plus confiance.
- Ta force n'est pas de leur faire peur. C'est de connaître leur métier mieux que leur
  prestataire, et de le prouver en résolvant leurs corvées.
