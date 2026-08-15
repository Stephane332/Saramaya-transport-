import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Bouton,
  Carte,
  Ecran,
  EnAttenteDeLaCompagnie,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { LogoSaramaya } from '../../src/components/LogoSaramaya';
import {
  CONCEPTEUR,
  NOM_APPLICATION,
  NOM_COMPAGNIE,
  VERSION,
} from '../../src/data/application';
import { useAction } from '../../src/lib/action';
import { etatFonction } from '../../src/lib/disponibilite';
import { RAPPELS_ANNONCES, useEtatNotifications } from '../../src/lib/notifications';
import { calculerFidelite, phraseHabitue } from '../../src/lib/fidelite';
import { initiales, jourFrancais, montant, telephone } from '../../src/lib/format';
import { useApp, voyagesEffectues } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';

export default function Profil() {
  const router = useRouter();
  const voyageur = useApp((e) => e.voyageur);
  const reservations = useApp((e) => e.reservations);
  const colis = useApp((e) => e.colis);
  const supprimerCompte = useApp((e) => e.supprimerCompte);
  const [suppressionDemandee, setSuppressionDemandee] = useState(false);

  if (!voyageur) return null;
  const effectues = voyagesEffectues(reservations);
  const fidelite = calculerFidelite(reservations);
  const phrase = phraseHabitue(fidelite);
  const resume = resumeDonnees(reservations.length, colis.length);

  return (
    <Ecran>
      <Txt v="titre">Profil</Txt>

      {/*
        La carte d'identité du voyageur. C'est elle qu'on présente au guichet :
        elle supprime la ressaisie que l'agent demande aujourd'hui à chaque passage.
      */}
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <LinearGradient colors={degrades.marque} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.carteIdentite}>
          <View style={styles.enteteIdentite}>
            <View style={styles.avatar}>
              <Txt v="sousTitre" couleur="#fff">
                {initiales(voyageur.prenom, voyageur.nom)}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.8)">
                VOYAGEUR SARAMAYA
              </Txt>
              <Txt v="sousTitre" couleur="#fff">
                {voyageur.nom} {voyageur.prenom}
              </Txt>
            </View>
          </View>

          <View style={styles.grilleIdentite}>
            <View>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
                TÉLÉPHONE
              </Txt>
              <Txt v="corpsFort" couleur="#fff">
                {telephone(voyageur.telephone)}
              </Txt>
            </View>
            <View>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
                CNIB
              </Txt>
              <Txt v="corpsFort" couleur="#fff">
                {voyageur.cnib ?? '—'}
              </Txt>
            </View>
            <View>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
                VOYAGES
              </Txt>
              <Txt v="corpsFort" couleur="#fff">
                {effectues.length}
              </Txt>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={couleurs.succes} />
          <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
            Présentez cet écran au guichet : le nom, le contact et la CNIB exigée dès 18 ans y
            sont déjà. L'agent n'a plus rien à vous demander.
          </Txt>
        </View>
      </Carte>

      {/*
        Ce que l'application sait de l'habitué — calculé sur cet appareil, à partir de
        son seul historique. Rien n'est transmis : ces chiffres n'existent que dans le
        téléphone qui les affiche.
      */}
      {fidelite.voyages > 0 ? (
        <>
          <Section>Votre parcours</Section>
          <Carte style={{ gap: espace.md }}>
            <View style={styles.grilleFidelite}>
              <Statistique valeur={String(fidelite.voyages)} libelle="VOYAGES" />
              <Statistique valeur={`${fidelite.kilometres}`} libelle="KILOMÈTRES" />
              <Statistique valeur={montant(fidelite.totalDepense)} libelle="DÉPENSÉ" />
            </View>
            {phrase ? (
              <>
                <Trait />
                <Txt v="petit" couleur={couleurs.texteDoux}>
                  {phrase}
                </Txt>
              </>
            ) : null}
            {fidelite.siegePrefere !== null ? (
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                PLACE HABITUELLE · {fidelite.siegePrefere} — PROPOSÉE D'EMBLÉE À VOTRE PROCHAINE RÉSERVATION
              </Txt>
            ) : null}
          </Carte>
        </>
      ) : null}

      {/*
        Cette carte montrait quatre interrupteurs toujours allumés qui ne
        commandaient rien — dont un « Repli par SMS » décrivant une fonction qui
        n'existe pas et ne peut pas exister sans serveur. À la place : ce qui est
        réellement programmé, et l'état réel de l'autorisation, relu au retour au
        premier plan. Un rappel refusé se voit, au lieu de s'afficher en vert.
      */}
      <Section>Rappels</Section>
      <Carte style={{ gap: espace.md }}>
        <EtatRappels />
        <Trait />
        {RAPPELS_ANNONCES.map((r, i) => (
          <View key={r.titre} style={{ gap: espace.md }}>
            {i > 0 ? <Trait /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.md }}>
              <Ionicons name="notifications-outline" size={18} color={couleurs.marqueVif} />
              <View style={{ flex: 1 }}>
                <Txt v="corpsFort">{r.titre}</Txt>
                <Txt v="minuscule" couleur={couleurs.texteFaible}>
                  {r.detail}
                </Txt>
              </View>
            </View>
          </View>
        ))}
        <Trait />
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          TOUS SONT PROGRAMMÉS PAR CE TÉLÉPHONE · AUCUN SERVEUR NE SAIT QUAND VOUS VOYAGEZ
        </Txt>
      </Carte>

      <Section>Données</Section>
      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="lock-closed-outline" size={18} color={couleurs.texteDoux} />
          <Txt v="petit" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
            Vos informations restent sur ce téléphone. Rien n'est envoyé à un serveur tant que
            la compagnie n'a pas ouvert son système.
          </Txt>
        </View>
      </Carte>
      <Bouton
        titre="Confidentialité et conditions"
        sousTitre="Ce qui est enregistré, ce qui sort — et rien d'autre"
        variante="secondaire"
        icone={<Ionicons name="shield-outline" size={18} color={couleurs.texteDoux} />}
        onPress={() => router.push('/confidentialite')}
      />

      <Section>Anciens voyages</Section>
      <EnAttenteDeLaCompagnie {...etatFonction('HISTORIQUE_ANCIEN_CLIENT')} />

      <Section>Pièce d'identité</Section>
      <Bouton
        titre={voyageur.cnib ? 'Ma CNIB' : 'Renseigner ma CNIB'}
        sousTitre={
          voyageur.cnibExpireLe
            ? // La date se lit comme partout ailleurs dans l'application, et comme
              // sur la carte elle-même : « 30/08/2031 », et non « 2031-08-30 ».
              `Expire le ${jourFrancais(voyageur.cnibExpireLe)} · rappel programmé`
            : 'Exigée dès 18 ans à la gare — reste sur ce téléphone'
        }
        variante="secondaire"
        icone={<Ionicons name="card-outline" size={18} color={couleurs.texteDoux} />}
        onPress={() => router.push('/cnib')}
      />

      <Section>Compte</Section>
      {/*
        Un seul appui effaçait tout : le compte, les billets, l'historique, les
        colis — et rien n'existe ailleurs, puisque rien n'est envoyé sur un serveur.
        C'est le geste le plus destructeur de l'application ; il demande maintenant
        une confirmation, et dit exactement ce qui va disparaître.
      */}
      {!suppressionDemandee ? (
        <Bouton
          titre="Supprimer mon compte"
          sousTitre="Efface vos données de ce téléphone"
          variante="fantome"
          onPress={() => setSuppressionDemandee(true)}
        />
      ) : (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Carte style={{ borderColor: 'rgba(242,84,91,0.45)', gap: espace.sm }}>
            <Txt v="corpsFort" couleur={couleurs.danger}>
              Supprimer définitivement ?
            </Txt>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              {resume} disparaîtront de ce téléphone. Rien n'est enregistré ailleurs : cette
              suppression est définitive, et vos billets déjà payés ne pourront plus être
              présentés depuis l'application.
            </Txt>
          </Carte>
          <Bouton
            titre="Oui, tout supprimer"
            variante="danger"
            onPress={supprimerCompte}
          />
          <Bouton
            titre="Non, garder mes données"
            variante="secondaire"
            onPress={() => setSuppressionDemandee(false)}
          />
        </Animated.View>
      )}

      {/*
        Le pied de l'application : les deux noms, le concepteur, la version.
        Quatre lignes courtes, et rien de plus. Le rappel de qui édite l'application
        est à sa place — conditions d'utilisation et politique de confidentialité,
        atteignables juste au-dessus : un pied de page n'est pas l'endroit d'un
        paragraphe.
      */}
      <Trait />
      <View style={styles.pied}>
        <LogoSaramaya hauteur={22} />
        <Txt v="petit" couleur={couleurs.texteDoux} style={styles.piedNoms}>
          {NOM_COMPAGNIE.toUpperCase()} · {NOM_APPLICATION.toUpperCase()}
        </Txt>
        <Txt v="petit" couleur={couleurs.texteDoux} style={{ textAlign: 'center' }}>
          Conçu par {CONCEPTEUR}
        </Txt>
        <Txt v="minuscule" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
          VERSION {VERSION}
        </Txt>
      </View>
    </Ecran>
  );
}

/** Ce que la suppression va réellement effacer, dit en clair avant de le faire. */
function resumeDonnees(reservations: number, colis: number): string {
  const morceaux = [
    'Votre compte',
    reservations > 0 ? `${reservations} réservation${reservations > 1 ? 's' : ''}` : null,
    colis > 0 ? `${colis} colis` : null,
  ].filter((m): m is string => m !== null);

  if (morceaux.length === 1) return `${morceaux[0]} et son historique`;
  const dernier = morceaux[morceaux.length - 1];
  return `${morceaux.slice(0, -1).join(', ')} et ${dernier}`;
}

function Statistique({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt v="sousTitre">{valeur}</Txt>
      <Txt v="minuscule" couleur={couleurs.texteFaible}>
        {libelle}
      </Txt>
    </View>
  );
}

/**
 * L'autorisation de notifier, dite telle qu'elle est.
 *
 * Trois cas, trois messages différents — parce que « refusé » et « impossible sur
 * le web » n'appellent pas la même action de la part du voyageur.
 */
function EtatRappels() {
  const { etat, demander } = useEtatNotifications();

  const autorisation = useAction(async () => {
    await demander();
  }, "L'autorisation n'a pas pu être demandée. Ouvrez les réglages du téléphone.");

  if (etat === 'ACCORDEES') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
        <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
        <Txt v="petit" couleur={couleurs.succes} style={{ flex: 1 }}>
          Les rappels sont autorisés sur ce téléphone.
        </Txt>
      </View>
    );
  }

  if (etat === 'INDISPONIBLE') {
    return (
      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        <Ionicons name="information-circle-outline" size={18} color={couleurs.texteFaible} />
        <Txt v="petit" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
          Les rappels programmés existent dans l'application installée sur téléphone. Ici, sur
          le web, ils ne sont pas fiables — ils ne sont donc pas annoncés comme actifs.
        </Txt>
      </View>
    );
  }

  if (etat === 'INCONNU') {
    return (
      <Txt v="petit" couleur={couleurs.texteFaible}>
        Vérification de l'autorisation…
      </Txt>
    );
  }

  return (
    <View style={{ gap: espace.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
        <Ionicons name="notifications-off" size={18} color={couleurs.attention} />
        <Txt v="corpsFort" couleur={couleurs.attention} style={{ flex: 1 }}>
          Aucun rappel ne partira
        </Txt>
      </View>
      <Txt v="petit" couleur={couleurs.texteDoux}>
        Les notifications sont refusées pour cette application. Les rappels ci-dessous sont
        programmés, mais votre téléphone ne les affichera pas.
      </Txt>
      <MessageErreur texte={autorisation.erreur} />
      <Bouton
        titre={autorisation.enCours ? 'Demande…' : 'Autoriser les rappels'}
        variante="secondaire"
        desactive={autorisation.enCours}
        onPress={autorisation.lancer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grilleFidelite: { flexDirection: 'row', gap: espace.md },
  carteIdentite: { borderRadius: rayon.xl, padding: espace.lg, gap: espace.lg },
  enteteIdentite: { flexDirection: 'row', alignItems: 'center', gap: espace.md },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  grilleIdentite: { flexDirection: 'row', justifyContent: 'space-between' },
  pied: { alignItems: 'center', gap: 6, paddingVertical: espace.md },
  piedNoms: { textAlign: 'center', letterSpacing: 1.2 },
});
