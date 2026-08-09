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
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { Bouton, Carte, Ecran, Section, Trait, Txt } from '../../src/components/base';
import { ETAPES_SUIVI, FORMATS_COLIS, SEUIL_DECLARATION } from '../../src/data/colis';
import { gareParId } from '../../src/data/reseau';
import { etapeCourante, partagerParWhatsApp, relanceNecessaire } from '../../src/lib/colis';
import { montant, telephone } from '../../src/lib/format';
import { useApp } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';

export default function DetailColis() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colis = useApp((e) => e.colis);
  const voyageur = useApp((e) => e.voyageur);
  const marquerCodePartage = useApp((e) => e.marquerCodePartage);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const c = colis.find((x) => x.id === id);
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

  const partager = async () => {
    setEnvoiEnCours(true);
    const ok = await partagerParWhatsApp(c, `${voyageur.nom} ${voyageur.prenom}`);
    if (ok) marquerCodePartage(c.id);
    setEnvoiEnCours(false);
  };

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

      {/* Le code de retrait, en très grand : c'est l'information centrale. */}
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

      {/* Le geste central : transmettre le code. */}
      {!c.codePartage ? (
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
          <Bouton
            titre={envoiEnCours ? 'Ouverture de WhatsApp…' : 'Envoyer le code par WhatsApp'}
            sousTitre={`À ${c.destinataireNom} · ${telephone(c.destinataireTelephone)}`}
            variante="succes"
            desactive={envoiEnCours}
            icone={<Ionicons name="logo-whatsapp" size={20} color="#fff" />}
            onPress={partager}
          />
        </Animated.View>
      ) : (
        <Carte style={{ borderColor: 'rgba(46,204,143,0.35)' }}>
          <View style={{ flexDirection: 'row', gap: espace.sm }}>
            <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
            <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
              Le code a été transmis à {c.destinataireNom}. Il sera prévenu automatiquement
              dès que le colis arrivera.
            </Txt>
          </View>
          <Bouton
            titre="Renvoyer le code"
            variante="fantome"
            icone={<Ionicons name="logo-whatsapp" size={18} color={couleurs.texteDoux} />}
            onPress={partager}
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
        <Rangee gauche="Déposé le" droite={format(parseISO(c.deposeLe), 'd MMM à HH:mm', { locale: fr })} />
        <Trait />
        <Rangee gauche="Payé" droite={montant(c.montant)} />
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
