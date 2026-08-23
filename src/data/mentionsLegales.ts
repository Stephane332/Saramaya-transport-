/**
 * Politique de confidentialité et conditions d'utilisation.
 *
 * Les deux boutiques d'applications exigent une politique de confidentialité
 * accessible, et une application qui touche à une pièce d'identité en a besoin
 * pour de vraies raisons, pas seulement pour passer la revue.
 *
 * Le texte vit ici, en un seul endroit, pour trois raisons :
 *
 * 1. **Il est lisible hors ligne**, dans l'application, là où la question se pose.
 * 2. **Il est aussi une page web** : la version web publie le même écran à une
 *    adresse stable, c'est le lien à donner à l'App Store et à Google Play.
 * 3. **Il ne peut pas diverger.** Un texte recopié dans un document à part finit
 *    toujours par ne plus décrire le logiciel.
 *
 * Règle d'écriture : **rien ici ne doit être vrai « en intention ».** Chaque phrase
 * décrit ce que le code fait aujourd'hui. Quand le comportement change, ce fichier
 * change dans le même commit — c'est ce qui distingue une politique d'un décor.
 */

import { CONCEPTEUR, NOM_COMPAGNIE } from './application';

/** Dernière révision du texte, à mettre à jour à chaque modification de fond. */
export const REVISION_MENTIONS = '2026-08-23';

export interface SectionLegale {
  titre: string;
  paragraphes: string[];
  /** Points énumérés sous les paragraphes, quand une liste est plus claire. */
  points?: string[];
}

/*
 * Ce que l'application enregistre. La liste est exhaustive : elle correspond
 * exactement aux champs des types `Voyageur`, `Reservation` et `Colis`, et au
 * contenu de `partialize` dans le magasin.
 */
export const CONFIDENTIALITE: SectionLegale[] = [
  {
    titre: 'En une phrase',
    paragraphes: [
      /*
       * « Cette application », et non le nom de la compagnie.
       *
       * L'application porte désormais le nom de Saramaya Transport, mais écrire
       * « Saramaya Transport n'a pas de serveur » serait faux : la compagnie en a
       * un, c'est celui auquel on veut se brancher. La phrase doit parler du
       * logiciel, pas de l'entreprise.
       */
      "Cette application n'a pas de serveur. Vos informations sont enregistrées sur votre téléphone, et elles y restent : nous ne les recevons pas, nous ne les stockons pas ailleurs, et nous ne pouvons donc ni les consulter, ni les revendre, ni les perdre.",
    ],
  },
  {
    titre: 'Ce qui est enregistré sur votre téléphone',
    paragraphes: [
      "Tout ce que vous saisissez ou scannez est conservé dans l'espace privé de l'application, sur cet appareil :",
    ],
    points: [
      'Votre identité : nom, prénoms, numéro de téléphone.',
      "Votre pièce d'identité, si vous la renseignez : numéro de CNIB, date de naissance, lieu de naissance, date d'expiration, et l'image de la carte si vous en fournissez une.",
      'Vos réservations et vos billets : ligne, date, heure, classe, siège, montant, état du paiement.',
      "Vos colis : nom et téléphone du destinataire, gares, description, valeur déclarée, code de retrait.",
      'Les rappels déjà programmés, pour ne pas vous prévenir deux fois.',
    ],
  },
  {
    titre: "Ce qui sort de votre téléphone — la liste complète",
    paragraphes: [
      "Trois choses seulement quittent l'appareil, et aucune n'emporte votre identité :",
    ],
    points: [
      "**Les messages que vous envoyez vous-même.** Quand vous appelez la gare, envoyez une demande par SMS ou transmettez un code de retrait par WhatsApp, l'application prépare le texte et ouvre votre application de messages. C'est vous qui envoyez, depuis votre compte, à qui vous voulez. Rien ne part sans ce geste.",
      "**L'état du service.** Lorsqu'une adresse d'état est configurée, l'application y lit régulièrement si les réservations sont ouvertes et si des départs ont été ajoutés. Cette requête ne transmet aucune information vous concernant : elle ne fait que lire un fichier. Comme pour toute connexion, le serveur voit votre adresse IP. Si aucune adresse n'est configurée, aucune requête n'est faite.",
      "**Les mises à jour de l'application.** Elles sont téléchargées depuis les serveurs d'Expo (Expo, société américaine), qui reçoivent à cette occasion les informations techniques nécessaires à la mise à jour : version de l'application, système et modèle d'appareil. Aucune donnée de voyage ni d'identité n'y figure.",
    ],
  },
  {
    titre: "L'image de votre CNIB",
    paragraphes: [
      "Elle sert à remplir votre profil sans rien saisir : l'application lit les lignes de caractères au dos de la carte, et les champs imprimés au recto, pour en tirer le nom, les prénoms, le numéro et les dates. **Toute la lecture se fait sur l'appareil**, sans connexion.",
      "Vous pouvez prendre la photo ou choisir une image déjà présente dans votre téléphone. Dans ce second cas, l'application demande l'accès à vos photos : elle n'y lit que l'image que vous désignez, et rien d'autre.",
      "L'image retenue est enregistrée dans l'espace privé de l'application, sur votre téléphone. Elle n'est envoyée nulle part, et elle disparaît avec l'application si vous la désinstallez. Vous pouvez la remplacer ou supprimer l'ensemble de vos données à tout moment depuis votre profil.",
      "Donner une image de sa carte est facultatif : recopier la bande du dos, ou saisir les champs à la main, donne exactement le même résultat.",
    ],
  },
  {
    titre: 'Les notifications',
    paragraphes: [
      "Les rappels de départ, de convocation, d'expiration de billet et d'expiration de CNIB sont des **notifications locales** : votre téléphone les programme et les affiche lui-même, à partir de ce qu'il sait déjà. Aucun jeton de notification n'est créé, et aucun serveur ne sait quand vous voyagez.",
      "Refuser les notifications n'empêche rien d'autre de fonctionner.",
    ],
  },
  {
    titre: "Ce que nous ne faisons pas",
    paragraphes: ["Sans ambiguïté :"],
    points: [
      "Aucun compte à créer chez nous, aucun mot de passe, aucune adresse électronique demandée.",
      "Aucune publicité, aucun traceur, aucun outil de mesure d'audience, aucun réseau social intégré.",
      "Aucune revente ni partage de vos données : nous ne les détenons pas.",
      "Aucune collecte cachée. Ce document décrit l'intégralité de ce qui sort de l'appareil.",
      "Aucune reconnaissance faciale, aucune donnée biométrique.",
      /*
       * Cette ligne n'est pas une déclaration d'intention : elle est tenue par la
       * configuration du build. `blockedPermissions` retire le micro du manifeste
       * Android, où la bibliothèque de la caméra l'ajoutait toute seule — pour la
       * vidéo, que l'application ne filme jamais. Sans ce blocage, le téléphone
       * aurait affiché « Micro » dans la liste des autorisations, et cette page
       * aurait menti.
       */
      "Aucun accès au microphone ni à votre position : l'application ne les demande pas, et le système ne les lui accorderait pas.",
    ],
  },
  {
    titre: 'Vos droits, et comment les exercer immédiatement',
    paragraphes: [
      "La loi n° 010-2004/AN du Burkina Faso sur la protection des données à caractère personnel vous donne un droit d'accès, de rectification et de suppression.",
      "Ici, ces droits ne demandent aucune démarche : les données étant sur votre téléphone, vous y accédez depuis l'écran Profil, vous les corrigez au même endroit, et « Supprimer mon compte » les efface définitivement de l'appareil. Nous n'avons rien à supprimer de notre côté, puisque nous n'avons rien reçu.",
      "Désinstaller l'application supprime également tout son contenu.",
    ],
  },
  {
    titre: 'Enfants',
    paragraphes: [
      "L'application s'adresse aux personnes qui voyagent et réservent elles-mêmes. Elle ne cherche pas à connaître l'âge de ses utilisateurs et ne collecte, de toute façon, rien sur aucun serveur.",
    ],
  },
  {
    titre: 'Si cela change',
    paragraphes: [
      "Le jour où l'application se connectera au système de la compagnie, des informations devront nécessairement lui être transmises pour réserver une place — c'est le principe même d'une réservation. Ce document sera mis à jour **avant** que cela n'arrive, et l'application vous le dira clairement au lieu de le faire en silence.",
    ],
  },
  {
    /*
     * Une politique de confidentialité doit dire **qui répond**. Sans cela elle est
     * incomplète aux yeux des deux boutiques, et surtout inutile à qui voudrait
     * poser une question : un texte qui explique vos droits sans indiquer à qui les
     * adresser ne sert à rien.
     */
    titre: 'Qui est responsable de cette application',
    paragraphes: [
      `Cette application est conçue et publiée par **${CONCEPTEUR}**, voyageur et client de ${NOM_COMPAGNIE}. Bien qu'elle porte le nom de la compagnie, elle n'est ni éditée, ni exploitée, ni approuvée par elle.`,
      "Il n'y a personne d'autre : aucune société, aucun sous-traitant, aucun prestataire d'hébergement — puisqu'il n'y a rien à héberger. Vos données ne sont détenues par personne, pas même par le concepteur.",
      // Ce texte se lit aussi bien dans l'application installée que sur le web, où
      // il n'y a aucune « boutique » : la formule doit tenir dans les deux cas.
      "Pour une question sur l'application elle-même, l'adresse de contact du concepteur est publiée à l'endroit d'où vous l'avez obtenue — fiche de la boutique ou page de téléchargement. Pour une question sur un voyage, un billet ou un colis, c'est la gare qu'il faut appeler : ses numéros figurent sur les écrans concernés.",
      "Et pour exercer un droit d'accès, de rectification ou de suppression, il n'y a personne à contacter — tout est dans votre téléphone, et l'écran Profil vous y donne accès directement.",
    ],
  },
];

export const CONDITIONS: SectionLegale[] = [
  {
    titre: "Ce qu'est cette application",
    paragraphes: [
      `Cette application est indépendante, conçue par ${CONCEPTEUR}, client de ${NOM_COMPAGNIE}, pour ses propres voyages. **Elle n'est ni éditée, ni exploitée, ni approuvée par ${NOM_COMPAGNIE}**, dont le nom, le logo et les horaires sont repris à titre d'information sur les services de la compagnie.`,
      "Pour toute question sur un voyage, un billet ou un colis, la gare reste votre interlocuteur : les numéros figurent sur chaque écran concerné.",
    ],
  },
  {
    titre: "Ce que l'application fait, et ne fait pas",
    paragraphes: [
      "Elle vous aide à préparer et à garder vos voyages. Tant qu'elle n'est pas reliée au système de la compagnie, elle ne peut pas faire à sa place ce qui lui appartient :",
    ],
    points: [
      "**Elle ne vend pas de billet et n'encaisse aucun paiement.** Aucun montant n'est prélevé par l'application. Vous payez par Orange Money ou au guichet, directement à la compagnie.",
      "**Elle ne réserve pas une place à votre place.** Une réservation créée ici est une demande, préparée pour la gare. Une place n'est retenue que lorsque la gare l'a enregistrée.",
      "**Elle ne connaît pas les places déjà occupées** ni les départs ajoutés qui ne sont pas annoncés. Le siège que vous choisissez est une préférence transmise à la gare.",
      "**Un billet n'apparaît qu'une fois le paiement établi.** Avant cela, l'écran affiche une réservation en attente, et non un titre de transport.",
    ],
  },
  {
    titre: 'Les horaires et les tarifs',
    paragraphes: [
      "Les lignes, horaires et tarifs affichés proviennent des informations publiées par la compagnie et du dos de ses tickets. Ils peuvent changer sans que l'application en soit informée. **En cas de désaccord, ce que dit la gare fait foi.**",
      "Les tarifs de colis sont des estimations, à confirmer au pesage.",
    ],
  },
  {
    titre: 'Les conditions de la compagnie continuent de s’appliquer',
    paragraphes: [
      "Le billet reste soumis aux conditions imprimées au dos du ticket : validité de trente jours, convocation trente minutes avant le départ, présentation de la CNIB ou du passeport dès 18 ans, remplacement par la liste d'attente cinq minutes avant le départ, déclaration obligatoire au-delà de 50 000 F de valeur.",
      "Vérifiez la date et l'heure dès réception de votre ticket : la compagnie indique elle-même que ses agents peuvent se tromper.",
    ],
  },
  {
    titre: 'Responsabilité',
    paragraphes: [
      "L'application est fournie telle quelle, sans garantie. Elle ne peut pas être tenue responsable d'un départ manqué, d'une place non attribuée, d'un paiement mal adressé ou d'une information devenue inexacte.",
      "Les rappels dépendent de votre téléphone : s'il est éteint, en économie de batterie, ou si les notifications sont refusées, ils peuvent ne pas s'afficher. **Ne comptez pas sur eux seuls pour un départ important.**",
    ],
  },
  {
    titre: 'Usage',
    paragraphes: [
      "L'application est destinée à un usage personnel. Le code de retrait d'un colis et le code d'un billet sont personnels : les partager avec quelqu'un d'autre revient à lui confier ce qu'ils ouvrent.",
    ],
  },
];
