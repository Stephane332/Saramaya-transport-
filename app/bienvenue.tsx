/**
 * Ouverture de compte — le tout premier écran d'un nouveau client.
 *
 * Le geste demandé est simple : **photographier sa CNIB**, et tout se remplit. Nom,
 * prénoms, numéro, date de naissance, date d'expiration : la bande à lecture machine
 * au dos les contient tous, et chacun y porte sa clé de contrôle, si bien qu'une
 * lecture fautive se détecte au lieu de s'enregistrer.
 *
 *     photo → lecture → vérification par le voyageur → compte créé
 *
 * Deux principes gouvernent cet écran :
 *
 * 1. **Rien n'est affirmé.** Ce qui est lu pré-remplit ; le voyageur confirme. Le dos
 *    de leur propre ticket le dit : « nos agents peuvent se tromper ». Une machine
 *    aussi.
 * 2. **Rien ne sort du téléphone.** La photo et l'identité restent sur l'appareil.
 *    C'est ce qui permet de dire à la compagnie : nous ne détenons pas les pièces
 *    d'identité de vos clients, donc nous ne pouvons pas les perdre.
 *
 * Si la lecture automatique n'est pas disponible — c'est le cas dans Expo Go —
 * l'écran ne fait pas semblant : il propose de recopier la bande, ce qui remplit les
 * mêmes champs par le même chemin. Le compte peut toujours s'ouvrir.
 */

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bus3D } from '../src/components/Bus3D';
import { Bouton, Carte, EnTeteRetour, Section, Trait, Txt } from '../src/components/base';
import { CONTACTS_COMPAGNIE } from '../src/data/reseau';
import { extraireBandeDepuisTexte, lireBandeTD1 } from '../src/lib/cnib';
import { programmerRappelsCnib } from '../src/lib/notifications';
import { lireTexteImage } from '../src/lib/ocr';
import { useRetourMateriel } from '../src/lib/retour';
import { useApp } from '../src/store/useApp';
import { couleurs, espace, rayon } from '../src/theme';

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export default function Bienvenue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const creerCompte = useApp((e) => e.creerCompte);
  const voyageurExistant = useApp((e) => e.voyageur);

  const [etape, setEtape] = useState<'ACCUEIL' | 'IDENTITE'>('ACCUEIL');
  const [permission, demanderPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [appareilOuvert, setAppareilOuvert] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [lecture, setLecture] = useState<'attente' | 'encours' | 'reussie'>('attente');
  const [messageLecture, setMessageLecture] = useState<string | null>(null);
  const [avertissements, setAvertissements] = useState<string[]>([]);

  const [bande, setBande] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [cnib, setCnib] = useState('');
  const [expiration, setExpiration] = useState('');
  const [naissance, setNaissance] = useState('');

  useRetourMateriel(etape === 'IDENTITE', () => setEtape('ACCUEIL'));

  if (voyageurExistant) return <Redirect href="/" />;

  const telOk = telephone.replace(/\D/g, '').length >= 8;
  const complet = prenom.trim().length >= 2 && nom.trim().length >= 2 && telOk;

  /** Applique une bande décodée aux champs. Ne valide jamais à la place du voyageur. */
  const appliquerBande = (texteBande: string): boolean => {
    const resultat = lireBandeTD1(texteBande);
    if (!resultat.ok) {
      setMessageLecture(resultat.raison);
      return false;
    }
    const { identite } = resultat;
    setNom(identite.nom);
    // La bande sépare les prénoms par des espaces ; le premier fait l'usuel.
    setPrenom(identite.prenoms.split(' ')[0] ?? '');
    setCnib(identite.numero);
    setExpiration(identite.dateExpiration);
    setNaissance(identite.dateNaissance);
    setAvertissements(resultat.avertissements);
    setMessageLecture(null);
    setLecture('reussie');
    return true;
  };

  const prendrePhoto = async () => {
    const cliche = await camera.current?.takePictureAsync({ quality: 0.8 });
    setAppareilOuvert(false);
    if (!cliche?.uri) return;
    setPhoto(cliche.uri);
    setLecture('encours');

    const reconnaissance = await lireTexteImage(cliche.uri);
    if (!reconnaissance.disponible) {
      setLecture('attente');
      setMessageLecture(reconnaissance.raison ?? null);
      return;
    }
    const bandeTrouvee = extraireBandeDepuisTexte(reconnaissance.texte);
    if (!bandeTrouvee) {
      setLecture('attente');
      setMessageLecture(
        "La bande du dos n'a pas été retrouvée sur la photo. Reprenez-la bien à plat et bien éclairée, ou recopiez-la ci-dessous.",
      );
      return;
    }
    setBande(bandeTrouvee);
    appliquerBande(bandeTrouvee);
  };

  const ouvrirCompte = async () => {
    if (!complet) return;
    creerCompte({
      prenom: prenom.trim(),
      nom: nom.trim().toUpperCase(),
      telephone: telephone.replace(/\D/g, ''),
      cnib: cnib.trim() || undefined,
      dateNaissance: naissance || undefined,
      cnibExpireLe: DATE_ISO.test(expiration) ? expiration : undefined,
      cnibPhotoUri: photo ?? undefined,
    });
    if (DATE_ISO.test(expiration)) await programmerRappelsCnib(expiration);
    router.replace('/');
  };

  /* ── Caméra plein écran ─────────────────────────────────────────────────── */

  if (appareilOuvert) {
    return (
      <View style={styles.fondCamera}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
        {/* Repère aux proportions d'une carte : c'est le dos qu'il faut cadrer. */}
        <View style={styles.cadre} pointerEvents="none" />
        <View style={[styles.barreCamera, { paddingBottom: insets.bottom + espace.xl }]}>
          <Txt v="petit" couleur="#fff" style={{ textAlign: 'center' }}>
            Photographiez le dos de votre CNIB, bien à plat et bien éclairé — c'est là que
            se trouvent les lignes de caractères.
          </Txt>
          <Bouton titre="Prendre la photo" onPress={prendrePhoto} />
          <Bouton titre="Annuler" variante="fantome" onPress={() => setAppareilOuvert(false)} />
        </View>
      </View>
    );
  }

  /* ── Accueil ────────────────────────────────────────────────────────────── */

  if (etape === 'ACCUEIL') {
    return (
      <View style={[styles.fond, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.accueil}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Bus3D hauteur={240} />
          </View>
          <View style={{ gap: espace.md, paddingBottom: insets.bottom + espace.lg }}>
            <Txt v="section" couleur={couleurs.marqueVif}>
              SARAMAYA TRANSPORT
            </Txt>
            <Txt v="geant">Vos voyages,{'\n'}dans votre poche.</Txt>
            <Txt v="corps" couleur={couleurs.texteDoux}>
              Réservez, gardez vos billets hors ligne, envoyez vos colis et ne manquez plus
              jamais un départ.
            </Txt>
            <View style={{ height: espace.sm }} />
            <Bouton titre="Créer mon compte" onPress={() => setEtape('IDENTITE')} />
            <Txt v="minuscule" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
              {CONTACTS_COMPAGNIE.devise.toUpperCase()}
            </Txt>
          </View>
        </Animated.View>
      </View>
    );
  }

  /* ── Identité, à partir de la carte ─────────────────────────────────────── */

  return (
    <View style={[styles.fond, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: espace.lg, paddingBottom: insets.bottom + 130, gap: espace.lg }}
          showsVerticalScrollIndicator={false}
        >
          <EnTeteRetour onRetour={() => setEtape('ACCUEIL')} titre="Votre identité" />

          <Txt v="petit" couleur={couleurs.texteFaible}>
            Photographiez votre CNIB : tout se remplit. Vous vérifiez, et c'est fait. Vos
            informations restent sur ce téléphone.
          </Txt>

          {photo ? (
            <Animated.View entering={FadeIn} style={{ gap: espace.sm }}>
              <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              <Bouton titre="Reprendre la photo" variante="fantome" onPress={() => setAppareilOuvert(true)} />
            </Animated.View>
          ) : (
            <Bouton
              titre="Photographier ma CNIB"
              sousTitre="Le dos de la carte — reste sur ce téléphone"
              icone={<Ionicons name="camera-outline" size={18} color={couleurs.texte} />}
              onPress={async () => {
                if (!permission?.granted) {
                  const accord = await demanderPermission();
                  if (!accord.granted) return;
                }
                setAppareilOuvert(true);
              }}
            />
          )}

          {lecture === 'encours' ? (
            <Carte>
              <Txt v="petit" couleur={couleurs.texteDoux}>
                Lecture de la carte…
              </Txt>
            </Carte>
          ) : null}

          {lecture === 'reussie' ? (
            <Animated.View entering={FadeInDown}>
              <Carte style={{ borderColor: 'rgba(46,204,143,0.35)', gap: espace.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
                  <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
                  <Txt v="corpsFort" couleur={couleurs.succes}>
                    Carte lue
                  </Txt>
                </View>
                <Txt v="minuscule" couleur={couleurs.attention}>
                  VÉRIFIEZ LES CHAMPS CI-DESSOUS AVANT DE CONTINUER
                </Txt>
                {avertissements.map((a) => (
                  <Txt key={a} v="minuscule" couleur={couleurs.attention}>
                    · {a}
                  </Txt>
                ))}
              </Carte>
            </Animated.View>
          ) : null}

          {messageLecture ? (
            <Animated.View entering={FadeIn}>
              <Carte style={{ borderColor: 'rgba(245,165,36,0.35)' }}>
                <View style={{ flexDirection: 'row', gap: espace.sm }}>
                  <Ionicons name="information-circle-outline" size={18} color={couleurs.attention} />
                  <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                    {messageLecture}
                  </Txt>
                </View>
              </Carte>
            </Animated.View>
          ) : null}

          {/*
            Recopier la bande donne exactement le même résultat que la lecture
            automatique : mêmes champs, même décodage, mêmes clés de contrôle. C'est
            une voie de secours, pas une version dégradée.
          */}
          <Section>Ou recopiez la bande du dos</Section>
          <Carte style={{ gap: espace.md }}>
            <TextInput
              value={bande}
              onChangeText={setBande}
              placeholder={'I<BFAD231458907<<<<<<<<<<<<<<<\n7408122F1204159BFA<<<<<<<<<<<6\nSAWADOGO<<ANGE<<<<<<<<<<<<<<<<'}
              placeholderTextColor="rgba(255,255,255,0.18)"
              multiline
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.bande}
            />
            <Bouton
              titre="Remplir depuis la bande"
              variante="secondaire"
              desactive={bande.trim().length < 30}
              onPress={() => appliquerBande(bande)}
            />
          </Carte>

          <Section>Vos informations</Section>
          <Carte style={{ gap: espace.md }}>
            <Champ libelle="PRÉNOM" valeur={prenom} onChange={setPrenom} placeholder="Ange" />
            <Trait />
            <Champ libelle="NOM" valeur={nom} onChange={setNom} placeholder="SAWADOGO" majuscule />
            <Trait />
            <Champ
              libelle="TÉLÉPHONE"
              valeur={telephone}
              onChange={setTelephone}
              placeholder="66 79 80 31"
              clavier="phone-pad"
            />
            <Trait />
            <Champ libelle="NUMÉRO CNIB" valeur={cnib} onChange={setCnib} placeholder="B 1234567" majuscule />
            <Trait />
            <Champ
              libelle="CNIB EXPIRE LE (AAAA-MM-JJ)"
              valeur={expiration}
              onChange={setExpiration}
              placeholder="2030-12-31"
            />
          </Carte>

          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={18} color={couleurs.succes} />
            <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
              Rien n'est envoyé : la photo et vos informations restent sur cet appareil. Avec
              la date d'expiration, vous serez prévenu avant qu'une carte périmée ne pose
              problème à un contrôle.
            </Txt>
          </View>
        </ScrollView>

        <View style={[styles.barreBas, { paddingBottom: insets.bottom + espace.md }]}>
          <Bouton
            titre="Ouvrir mon compte"
            sousTitre={complet ? undefined : 'Prénom, nom et téléphone sont nécessaires'}
            desactive={!complet}
            onPress={ouvrirCompte}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Champ({
  libelle,
  valeur,
  onChange,
  placeholder,
  clavier = 'default',
  majuscule = false,
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clavier?: 'default' | 'phone-pad';
  majuscule?: boolean;
}) {
  return (
    <View>
      <Txt v="minuscule" couleur={couleurs.texteFaible}>
        {libelle}
      </Txt>
      <TextInput
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.22)"
        keyboardType={clavier}
        autoCapitalize={majuscule ? 'characters' : 'words'}
        autoCorrect={false}
        style={styles.saisie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.fond },
  fondCamera: { flex: 1, backgroundColor: '#000' },
  accueil: { flex: 1, paddingHorizontal: espace.lg },
  cadre: {
    position: 'absolute',
    top: '28%',
    left: '8%',
    right: '8%',
    aspectRatio: 1.58, // proportions d'une carte d'identité
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: rayon.md,
  },
  barreCamera: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: espace.lg,
    gap: espace.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photo: { width: '100%', height: 190, borderRadius: rayon.lg, backgroundColor: couleurs.surface },
  bande: {
    color: couleurs.texte,
    fontSize: 13,
    // Chasse fixe : les colonnes s'alignent, un caractère manquant se voit.
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 78,
    textAlignVertical: 'top',
    backgroundColor: couleurs.surfaceBasse,
    borderRadius: rayon.md,
    padding: espace.md,
  },
  saisie: { color: couleurs.texte, fontSize: 17, fontWeight: '600', paddingVertical: 6 },
  note: { flexDirection: 'row', gap: espace.sm, paddingHorizontal: espace.xs },
  barreBas: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: espace.lg,
    paddingTop: espace.md,
    backgroundColor: couleurs.voile,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
});
