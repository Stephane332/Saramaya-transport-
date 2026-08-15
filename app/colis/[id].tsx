/**
 * Le détail d'un colis : son code de retrait, son suivi, et le bouton qui envoie
 * le code au destinataire.
 *
 * C'est ce bouton qui remplace le geste actuel — recopier un code du guichet dans
 * un message WhatsApp. Ici le message est déjà écrit : nom, code, gare de retrait,
 * téléphone de la gare, et la marche à suivre.
 */

import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import {
  Bouton,
  Carte,
  Ecran,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { ETAPES_SUIVI, FORMATS_COLIS, SEUIL_DECLARATION } from '../../src/data/colis';
import { gareParId } from '../../src/data/reseau';
import { useAction } from '../../src/lib/action';
import { etapeCourante, relanceNecessaire } from '../../src/lib/colis';
import { partagerParWhatsApp } from '../../src/lib/partage';
import { montant, telephone } from '../../src/lib/format';
import { useApp } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';
import type { MoyenPaiement } from '../../src/types';

const LIBELLES_PAIEMENT: Record<MoyenPaiement, string> = {
  ORANGE_MONEY: 'Orange Money',
  MOOV_MONEY: 'Moov Money',
  ESPECES_GUICHET: 'Espèces au guichet',
};

export default function DetailColis() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colis = useApp((e) => e.colis);
  const voyageur = useApp((e) => e.voyageur);
  const marquerCodePartage = useApp((e) => e.marquerCodePartage);
  const marquerColisDepose = useApp((e) => e.marquerColisDepose);
  const [codeGuichet, setCodeGuichet] = useState('');
  const [depotDemande, setDepotDemande] = useState(false);

  const c = colis.find((x) => x.id === id);

  /*
   * Les crochets d'action sont déclarés avant la sortie anticipée : React exige le
   * même nombre de crochets à chaque rendu, et un colis introuvable ne doit pas
   * changer cet ordre.
   */
  const partage = useAction(async () => {
    if (!c || !voyageur) return;
    const ok = await partagerParWhatsApp(c, `${voyageur.nom} ${voyageur.prenom}`);
    if (!ok) throw new Error("Ni WhatsApp ni les SMS n'ont pu être ouverts sur ce téléphone.");
    marquerCodePartage(c.id);
  }, "Le message n'a pas pu être ouvert. Vous pouvez dicter le code au destinataire.");

  const depot = useAction(async () => {
    if (!c) return;
    await marquerColisDepose(c.id, codeGuichet);
    setDepotDemande(false);
    setCodeGuichet('');
  }, "Le dépôt n'a pas pu être enregistré. Réessayez dans un instant.");

  if (!c || !voyageur) {
    return (
      <Ecran>
        <Txt v="titre">Colis introuvable</Txt>
        <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
      </Ecran>
    );
  }

  const depart = gareParId(c.gareDepartId);
  const arrivee = gareParId(c.gareArriveeId);
  const etape = etapeCourante(c.statut);
  const aRelancer = relanceNecessaire(c);
  const aDeposer = c.statut === 'A_DEPOSER';

  return (
    <Ecran>
      <View style={styles.entre}>
        <Pressable onPress={() => router.back()} style={styles.retour}>
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          RÉF. {c.reference}
        </Txt>
      </View>

      {/*
        Tant que le colis n'est pas déposé, on n'affiche pas un code de retrait
        comme s'il était valable : le guichet ne le connaît pas encore, et il peut
        en remettre un autre. On montre donc le récapitulatif du dépôt.
      */}
      {aDeposer ? (
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <LinearGradient colors={degrades.marque} style={styles.carteCode}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.85)">
              À REMETTRE AU GUICHET
            </Txt>
            <Txt v="titre" couleur="#fff" style={{ textAlign: 'center' }}>
              {depart?.nom}
            </Txt>
            <Txt v="geant" couleur="#fff" style={{ fontSize: 34 }}>
              {montant(c.montant)}
            </Txt>
            <Txt v="petit" couleur="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
              Montant estimé, à confirmer au pesage · réf. {c.reference}
            </Txt>
          </LinearGradient>
        </Animated.View>
      ) : (
        /* Le code de retrait, en très grand : c'est l'information centrale. */
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <LinearGradient colors={degrades.marque} style={styles.carteCode}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.85)">
              CODE DE RETRAIT
            </Txt>
            <Txt v="geant" couleur="#fff" style={{ letterSpacing: 4, fontSize: 44 }}>
              {c.codeRetrait}
            </Txt>
            <Txt v="petit" couleur="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
              À présenter au guichet de {arrivee?.nom}, avec une pièce d'identité
            </Txt>
            <View style={styles.cadreQr}>
              <QRCode value={c.codeRetrait} size={92} backgroundColor="#FFFFFF" color="#0A070E" />
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/*
        L'étape qui manquait : le passage au guichet. C'est l'expéditeur qui le
        déclare, faute de lien avec le système de la compagnie — et c'est là qu'on
        récupère le code que le guichet lui a remis, s'il en a remis un.
      */}
      {aDeposer ? (
        <Animated.View entering={FadeIn} style={{ gap: espace.md }}>
          <Carte style={{ borderColor: 'rgba(245,165,36,0.4)', gap: espace.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
              <Ionicons name="storefront" size={18} color={couleurs.attention} />
              <Txt v="corpsFort" couleur={couleurs.attention}>
                Colis pas encore déposé
              </Txt>
            </View>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Présentez cet écran au guichet de {depart?.nom} : tout y est, l'agent n'a rien à
              vous redemander. Le colis est pesé, réglé, et enregistré. Vous pourrez alors
              envoyer le code au destinataire.
            </Txt>
            {depart?.telephones[0] ? (
              <Bouton
                titre={`Appeler la gare · ${depart.telephones[0]}`}
                variante="secondaire"
                icone={<Ionicons name="call-outline" size={18} color={couleurs.texteDoux} />}
                onPress={() => Linking.openURL(`tel:${depart.telephones[0]?.replace(/\s/g, '')}`)}
              />
            ) : null}
          </Carte>

          {!depotDemande ? (
            <Bouton
              titre="J'ai déposé le colis"
              sousTitre="À faire une fois le colis remis et réglé au guichet"
              variante="succes"
              onPress={() => setDepotDemande(true)}
            />
          ) : (
            <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
              <Carte style={{ gap: espace.md }}>
                <Txt v="corpsFort">Le guichet vous a-t-il donné un code ?</Txt>
                <Txt v="petit" couleur={couleurs.texteFaible}>
                  Si oui, recopiez-le : c'est celui-là que le destinataire présentera. Sinon,
                  laissez vide, celui de l'application est conservé.
                </Txt>
                <TextInput
                  value={codeGuichet}
                  onChangeText={setCodeGuichet}
                  placeholder={c.codeRetrait}
                  placeholderTextColor="rgba(255,255,255,0.22)"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.saisieCode}
                />
              </Carte>
              <MessageErreur texte={depot.erreur} />
              <Bouton
                titre={depot.enCours ? 'Enregistrement…' : 'Confirmer le dépôt'}
                variante="succes"
                desactive={depot.enCours}
                onPress={depot.lancer}
              />
              <Bouton
                titre="Pas encore"
                variante="fantome"
                onPress={() => setDepotDemande(false)}
              />
            </Animated.View>
          )}
        </Animated.View>
      ) : null}

      {/* Le geste central : transmettre le code. */}
      {aDeposer ? null : !c.codePartage ? (
        <Animated.View entering={FadeIn} style={{ gap: espace.md }}>
          <Carte style={{ borderColor: 'rgba(245,165,36,0.4)' }}>
            <Txt v="corpsFort" couleur={couleurs.attention}>
              Le destinataire n'a pas encore le code
            </Txt>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              Sans lui, il ne pourra pas retirer le colis. Le message est déjà rédigé — il ne
              reste qu'à l'envoyer.
            </Txt>
          </Carte>
          <MessageErreur texte={partage.erreur} />
          <Bouton
            titre={partage.enCours ? 'Ouverture de WhatsApp…' : 'Envoyer le code par WhatsApp'}
            sousTitre={`À ${c.destinataireNom} · ${telephone(c.destinataireTelephone)}`}
            variante="succes"
            desactive={partage.enCours}
            icone={<Ionicons name="logo-whatsapp" size={20} color="#fff" />}
            onPress={partage.lancer}
          />
        </Animated.View>
      ) : (
        <Carte style={{ borderColor: 'rgba(46,204,143,0.35)' }}>
          <View style={{ flexDirection: 'row', gap: espace.sm }}>
            <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
            {/*
              Aucune promesse d'alerte automatique : le destinataire n'a pas cette
              application, et seule la compagnie peut le prévenir. Le message qu'il
              a reçu contient le numéro de la gare — c'est ce qui marche aujourd'hui.
            */}
            <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
              Le code a été transmis à {c.destinataireNom}, avec le numéro du guichet de{' '}
              {arrivee?.ville} pour qu'il puisse savoir quand le colis est arrivé.
            </Txt>
          </View>
          <MessageErreur texte={partage.erreur} />
          <Bouton
            titre="Renvoyer le code"
            variante="fantome"
            desactive={partage.enCours}
            icone={<Ionicons name="logo-whatsapp" size={18} color={couleurs.texteDoux} />}
            onPress={partage.lancer}
          />
        </Carte>
      )}

      {aRelancer ? (
        <Carte style={{ borderColor: 'rgba(240,86,47,0.45)' }}>
          <Txt v="corpsFort" couleur={couleurs.orange}>
            Colis en attente depuis plus de 48 h
          </Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Il occupe une place au guichet de {arrivee?.ville}. Relancez le destinataire.
          </Txt>
        </Carte>
      ) : null}

      {/* Suivi */}
      <Section>Suivi</Section>
      <Carte>
        {ETAPES_SUIVI.map((e, i) => {
          const faite = i <= etape;
          const courante = i === etape;
          return (
            <View key={e.statut} style={styles.etapeRangee}>
              <View style={{ alignItems: 'center', width: 28 }}>
                <View
                  style={[
                    styles.pastilleEtape,
                    faite && { backgroundColor: couleurs.succes, borderColor: couleurs.succes },
                    courante && { backgroundColor: couleurs.marque, borderColor: couleurs.marque },
                  ]}
                >
                  <Ionicons
                    name={faite ? (e.icone as never) : 'ellipse-outline'}
                    size={12}
                    color={faite ? '#fff' : couleurs.texteFaible}
                  />
                </View>
                {i < ETAPES_SUIVI.length - 1 ? (
                  <View
                    style={[
                      styles.lienEtape,
                      { backgroundColor: i < etape ? couleurs.succes : 'rgba(255,255,255,0.1)' },
                    ]}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, paddingBottom: espace.lg }}>
                <Txt v="corpsFort" couleur={faite ? couleurs.texte : couleurs.texteFaible}>
                  {e.libelle}
                </Txt>
                <Txt v="petit" couleur={couleurs.texteFaible}>
                  {e.detail}
                </Txt>
              </View>
            </View>
          );
        })}
      </Carte>

      {/* Détail */}
      <Section>Le colis</Section>
      <Carte>
        <Rangee gauche="Format" droite={FORMATS_COLIS[c.taille].libelle} />
        <Trait />
        <Rangee gauche="Contenu" droite={c.description} />
        <Trait />
        <Rangee
          gauche="Valeur déclarée"
          droite={c.valeurDeclaree > 0 ? montant(c.valeurDeclaree) : 'Non déclarée'}
        />
        {c.valeurDeclaree > SEUIL_DECLARATION ? (
          <Txt v="minuscule" couleur={couleurs.attention}>
            DÉCLARATION ÉTABLIE AU GUICHET
          </Txt>
        ) : null}
        <Trait />
        <Rangee gauche="Départ" droite={depart?.nom ?? '—'} />
        <Trait />
        <Rangee gauche="Retrait" droite={arrivee?.nom ?? '—'} />
        <Trait />
        <Rangee
          gauche="Préparé le"
          droite={format(parseISO(c.prepareLe), 'd MMM à HH:mm', { locale: fr })}
        />
        {c.deposeLe ? (
          <>
            <Trait />
            <Rangee
              gauche="Déposé le"
              droite={format(parseISO(c.deposeLe), 'd MMM à HH:mm', { locale: fr })}
            />
          </>
        ) : null}
        <Trait />
        {/*
          Le montant n'est jamais présenté comme encaissé tant qu'il ne l'a pas été.
          L'application ne prélève rien : elle ne peut que rapporter ce que
          l'expéditeur déclare avoir réglé au guichet.
        */}
        <Rangee
          gauche={c.regleLe ? 'Réglé au guichet' : 'À régler au dépôt'}
          droite={montant(c.montant)}
        />
        {c.moyenPaiement && !c.regleLe ? (
          <Txt v="minuscule" couleur={couleurs.texteFaible}>
            PAIEMENT PRÉVU · {LIBELLES_PAIEMENT[c.moyenPaiement].toUpperCase()}
          </Txt>
        ) : null}
      </Carte>

      <Section>Destinataire</Section>
      <Carte>
        <Rangee gauche="Nom" droite={c.destinataireNom} />
        <Trait />
        <Rangee gauche="Téléphone" droite={telephone(c.destinataireTelephone)} />
      </Carte>

      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="sync-outline" size={16} color={couleurs.texteFaible} />
          <Txt v="petit" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
            Le suivi avancera automatiquement une fois l'application connectée au système de
            la compagnie. En attendant, la gare vous informe par téléphone.
          </Txt>
        </View>
      </Carte>
    </Ecran>
  );
}

function Rangee({ gauche, droite }: { gauche: string; droite: string }) {
  return (
    <View style={[styles.entre, { paddingVertical: 6 }]}>
      <Txt v="petit" couleur={couleurs.texteFaible}>
        {gauche}
      </Txt>
      <Txt v="corpsFort" numberOfLines={1} style={{ maxWidth: '62%', textAlign: 'right' }}>
        {droite}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayon.rond,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  carteCode: {
    borderRadius: rayon.xl,
    padding: espace.xl,
    alignItems: 'center',
    gap: espace.sm,
  },
  cadreQr: {
    backgroundColor: '#fff',
    borderRadius: rayon.md,
    padding: espace.sm,
    marginTop: espace.sm,
  },
  saisieCode: {
    color: couleurs.texte,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    paddingVertical: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surfaceBasse,
  },
  etapeRangee: { flexDirection: 'row', gap: espace.md },
  pastilleEtape: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
    backgroundColor: couleurs.surfaceHaute,
  },
  lienEtape: { width: 2, flex: 1, marginVertical: 2 },
});
