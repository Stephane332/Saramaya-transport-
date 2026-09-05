# Les chiffres à ramener de la gare

Un argumentaire tient sur des chiffres **vrais**. Les estimations se voient, et un dirigeant qui
repère un chiffre inventé cesse d'écouter le reste.

Ces questions se posent au guichet, en cinq minutes, en client curieux. Notez les réponses,
même approximatives — « à peu près une heure par départ » vaut mieux qu'une moyenne inventée.

---

## Les appels de confirmation — le cœur du sujet

1. **Combien de passagers appelez-vous avant chaque départ ?** Tous, ou seulement ceux qui
   n'ont pas payé ?
2. **Combien de temps prend un appel ?** Et combien n'aboutissent pas du premier coup ?
3. **Combien de temps au total, par départ ?**
4. **Qui les passe ?** Le guichetier pendant qu'il sert les clients, ou quelqu'un dédié ?
5. **Combien de départs par jour** depuis cette gare ?

> **Le calcul :**
> appels par départ × durée moyenne × départs par jour = **heures perdues chaque jour**.
> Multipliez par le nombre de gares pour le chiffre qui parle à la direction.

---

## Les places vides

6. **Sur un bus de X places, combien partent vides en moyenne ?**
7. **Combien de passagers annulent trop tard** pour que la place soit revendue ?
8. **La liste d'attente est-elle souvent utilisée ?** Y a-t-il des gens qui attendent sans
   obtenir de place, alors que des sièges partent vides ?

> **Le calcul :** places vides par semaine × tarif = **manque à gagner hebdomadaire**.
> C'est le chiffre le plus frappant, parce que leur ticket reconnaît déjà cette perte.

---

## Les erreurs de saisie

9. **Combien de tickets faut-il rééditer** pour une erreur de date ou d'heure ?
10. **Que se passe-t-il quand un passager se présente avec un mauvais horaire ?**

---

## Le guichet

11. **Combien de temps prend l'établissement d'un ticket** au guichet, de l'arrivée du client
    au ticket en main ?
12. **Combien de ce temps sert à redemander l'identité** — nom, contact, CNIB ?
13. **Aux heures de pointe, combien de personnes dans la file ?**

---

## Les paiements

14. **Quelle part des clients paie par Orange Money** avant de venir, et quelle part paie sur
    place ?
15. **Y a-t-il déjà un compte marchand Orange Money** au nom de la compagnie ?
16. **Que se passe-t-il si quelqu'un paie mais ne vient pas ?**

---

## Digiparc

> **Trois de ces questions ont déjà leur réponse**, trouvée dans la documentation
> publique de Digiparc. Les poser quand même ferait perdre du temps et donnerait
> l'impression de ne pas s'être renseigné. Elles sont conservées ici avec leur
> réponse, pour savoir ce qu'il reste vraiment à demander.

17. **Depuis quand utilisez-vous Digiparc ?** En êtes-vous satisfaits ?

18. ~~Digiparc gère-t-il le plan des sièges ?~~ — **Oui.** Leur documentation dit que
    « les feuilles de route affichent les places disponibles et **leurs numéros** pour
    chaque voyage », et que l'agent réserve « **en cliquant sur une place libre** dans
    l'interface Réservations ». La vraie question devient donc : *pourquoi le numéro
    est-il alors recopié à la main sur le ticket ?* Écran non branché sur
    l'imprimante, habitude du guichet, ou billets pré-imprimés ?

19. ~~Existe-t-il déjà un espace client ?~~ — **Oui**, sur leur instance. La question
    utile est plutôt : *combien de voyageurs s'en servent réellement ?*

20. ~~Digiparc propose-t-il une connexion pour des applications extérieures ?~~ —
    **Oui.** Digiparc annonce une « API ouverte », « API REST documentée et webhooks
    temps réel ». Elle n'a donc rien à développer : la question à poser à la direction
    est **« nous ouvrez-vous un accès en lecture sur votre compte ? »**, ce qui est une
    demande administrative, pas un projet informatique. Voir
    `../integration/digiparc.md`.

21. **Combien d'agences votre instance couvre-t-elle ?** Digiparc est multi-agences, et
    un de leurs clients transport en pilote vingt-quatre depuis une seule base.

---

## L'équipement

21. **Les agents ont-ils un smartphone** au travail ?
22. **Y a-t-il un ordinateur au guichet**, et une connexion internet stable ?
23. **Y a-t-il des lecteurs de code-barres** pour le contrôle à l'embarquement ?

---

## Tableau à remplir

| Question | Réponse | Qui a répondu | Date |
|---|---|---|---|
| Appels par départ | | | |
| Durée moyenne d'un appel | | | |
| Départs par jour (cette gare) | | | |
| **Heures perdues par jour** | | | |
| Places vides par semaine | | | |
| Tarif moyen | | | |
| **Manque à gagner hebdomadaire** | | | |
| Tickets réédités par semaine | | | |
| Durée d'un passage au guichet | | | |
| Part payée par Orange Money | | | |
| Compte marchand existant | | | |

---

## Une précaution

Présentez-vous comme ce que vous êtes : **un client régulier qui a eu une idée**. C'est une
position honnête, et elle désarme la méfiance. N'annoncez pas que vous « faites une étude »
— on vous répondrait autrement.

Et si on vous demande pourquoi ces questions : dites la vérité. « Je travaille sur une
application pour vos voyageurs, j'aimerais qu'elle vous serve à vous aussi. » C'est souvent
là que la conversation devient intéressante.
