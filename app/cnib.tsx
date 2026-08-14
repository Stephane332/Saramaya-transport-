/**
 * Renseigner sa pièce d'identité.
 *
 * La CNIB est exigée dès 18 ans à l'entrée de la gare. La saisir une fois évite de
 * la ressortir et de la dicter à chaque passage — et sa date d'expiration, une fois
 * connue, permet de prévenir avant qu'une carte périmée ne pose problème lors d'un
 * contrôle routier.
 *
 * ## Trois façons d'entrer, du plus fiable au plus manuel
 *
 * 1. **La bande au dos**, saisie ou collée. Trois lignes de trente caractères qui
 *    contiennent tout — numéro, nom, prénoms, naissance, expiration — et dont chaque
 *    groupe porte sa clé de contrôle. Une erreur est détectée, pas enregistrée.
 * 2. **La photo du dos**, conservée sur le téléphone pour recopier tranquillement,
 *    et pour montrer au guichet si besoin.
 * 3. **La saisie directe** du numéro et de la date.
 *
 * ## Ce qui n'est pas encore là, et pourquoi
 *
 * Transformer automatiquement la photo en texte demande un module de reconnaissance
 * de caractères absent d'Expo Go. Plutôt qu'un bouton qui ferait semblant, l'écran
 * propose la photo et la saisie de la bande : le décodage, lui, est complet et
 * vérifié dès maintenant. Le jour où la reconnaissance sera disponible, elle
 * alimentera exactement la même fonction, sans rien changer à cet écran.
 *
 * ## Où vont ces données
 *
 * Nulle part. Elles restent sur l'appareil, comme le reste du compte. La photo n'est
 * jamais transmise ; elle sert à remplir le formulaire, sur place.
 */

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
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
import {
  Bouton,
  Carte,
  EnAttenteDeLaCompagnie,
  EnTeteRetour,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../src/components/base';
import { useAction } from '../src/lib/action';
import { joursAvantExpirationCnib, lireBandeTD1, type IdentiteLue } from '../src/lib/cnib';
import { programmerRappelsCnib } from '../src/lib/notifications';
import { useApp } from '../src/store/useApp';
import { couleurs, espace, rayon } from '../src/theme';

export default function EcranCnib() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const voyageur = useApp((e) => e.voyageur);
  const mettreAJourProfil = useApp((e) => e.mettreAJourProfil);

  const [permission, demanderPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<string | null>(voyageur?.cnibPhotoUri ?? null);
  const [appareilOuvert, setAppareilOuvert] = useState(false);

  const [bande, setBande] = useState('');
  const [numero, setNumero] = useState(voyageur?.cnib ?? '');
  const [expiration, setExpiration] = useState(voyageur?.cnibExpireLe ?? '');
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lu, setLu] = useState<IdentiteLue | null>(null);

  /** Décode la bande saisie et pré-remplit — sans jamais valider à la place du voyageur. */
  const decoder = () => {
    const resultat = lireBandeTD1(bande);
    if (!resultat.ok) {
      setErreur(resultat.raison);
      setLu(null);
      setAvertissements([]);
      return;
    }
    setErreur(null);
    setLu(resultat.identite);
    setAvertissements(resultat.avertissements);
    setNumero(resultat.identite.numero);
    setExpiration(resultat.identite.dateExpiration);
  };

  const acces = useAction(async () => {
    if (!permission?.granted) {
      const accord = await demanderPermission();
      if (!accord.granted) {
        throw new Error(
          "L'accès à l'appareil photo a été refusé. Autorisez-le dans les réglages du téléphone, ou recopiez la bande du dos ci-dessous.",
        );
      }
    }
    setAppareilOuvert(true);
  }, "L'appareil photo n'a pas pu être ouvert. Recopiez la bande du dos ci-dessous.");

  const photographie = useAction(async () => {
    try {
      const cliche = await camera.current?.takePictureAsync({ quality: 0.7 });
      if (cliche?.uri) setPhoto(cliche.uri);
    } finally {
      // On referme la caméra dans tous les cas : un échec de capture ne doit pas
      // enfermer le voyageur dans un écran noir sans issue.
      setAppareilOuvert(false);
    }
  }, "La photo n'a pas pu être prise. Réessayez, ou recopiez la bande du dos.");

  const enregistrement = useAction(async () => {
    const dateValide = /^\d{4}-\d{2}-\d{2}$/.test(expiration);
    mettreAJourProfil({
      cnib: numero.trim() || undefined,
      cnibPhotoUri: photo ?? undefined,
      cnibExpireLe: dateValide ? expiration : undefined,
      ...(lu?.dateNaissance ? { dateNaissance: lu.dateNaissance } : {}),
    });
    // Le rappel est un confort : son échec ne doit pas empêcher l'enregistrement
    // de la carte, qui, lui, sert au contrôle à la gare.
    if (dateValide) await programmerRappelsCnib(expiration).catch(() => undefined);
    router.back();
  }, "Vos informations n'ont pas pu être enregistrées. Réessayez dans un instant.");

  const jours = /^\d{4}-\d{2}-\d{2}$/.test(expiration)
    ? joursAvantExpirationCnib(expiration)
    : null;

  if (appareilOuvert) {
    return (
      <View style={styles.fondCamera}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
        <View style={[styles.barreCamera, { paddingBottom: insets.bottom + espace.xl }]}>
          <Txt v="petit" couleur="#fff" style={{ textAlign: 'center' }}>
            Cadrez le dos de la carte, bien à plat et bien éclairé.
          </Txt>
          <Bouton
            titre={photographie.enCours ? 'Capture…' : 'Prendre la photo'}
            desactive={photographie.enCours}
            onPress={photographie.lancer}
          />
          <Bouton titre="Annuler" variante="fantome" onPress={() => setAppareilOuvert(false)} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fond, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: espace.lg, paddingBottom: insets.bottom + 140, gap: espace.lg }}
          showsVerticalScrollIndicator={false}
        >
          <EnTeteRetour onRetour={() => router.back()} titre="Ma pièce d'identité" />

          <Txt v="petit" couleur={couleurs.texteFaible}>
            Saisie une fois, présentée au guichet. Vos informations restent sur ce
            téléphone — rien n'est envoyé.
          </Txt>

          <Section>Photo de la carte</Section>
          {Platform.OS === 'web' ? (
            /*
              Sur le web, la caméra d'expo-camera charge un script de lecture depuis un
              service extérieur. Puisque rien de ce projet ne doit sortir sans raison, on
              ne la propose pas ici : la version web sert à découvrir l'application, et la
              bande se recopie tout aussi bien. Sur téléphone, la photo est disponible.
            */
            <Carte>
              <Txt v="petit" couleur={couleurs.texteDoux}>
                La photo de la carte est disponible dans l'application installée sur
                téléphone. Ici, recopiez la bande du dos : le résultat est identique.
              </Txt>
            </Carte>
          ) : photo ? (
            <Animated.View entering={FadeIn} style={{ gap: espace.sm }}>
              <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              <Txt v="minuscule" couleur={couleurs.succes}>
                ENREGISTRÉE SUR CE TÉLÉPHONE — JAMAIS ENVOYÉE
              </Txt>
              <Bouton titre="Reprendre la photo" variante="fantome" onPress={() => setAppareilOuvert(true)} />
            </Animated.View>
          ) : (
            <Bouton
              titre="Photographier ma CNIB"
              sousTitre="Bien à plat, bien éclairée, les deux faces si possible"
              desactive={acces.enCours}
              icone={<Ionicons name="camera-outline" size={18} color={couleurs.texte} />}
              onPress={acces.lancer}
            />
          )}

          <MessageErreur texte={acces.erreur ?? photographie.erreur} />

          <EnAttenteDeLaCompagnie
            promesse="Vos informations remplies automatiquement à partir de la photo."
            raison="La lecture automatique d'une image demande un module de reconnaissance absent d'Expo Go. En attendant, recopiez la bande du dos ci-dessous — elle contient tout — ou saisissez les champs à la main."
          />

          <Section>La bande au dos</Section>
          <Carte style={{ gap: espace.md }}>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Les trois lignes de caractères au dos de la carte contiennent déjà tout.
              Recopiez-les ici : chaque champ y porte une clé de contrôle, donc une faute
              de frappe est repérée au lieu d'être enregistrée.
            </Txt>
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
            <Bouton titre="Décoder la bande" variante="secondaire" onPress={decoder} />
          </Carte>

          {erreur ? (
            <Animated.View entering={FadeIn}>
              <Carte style={{ borderColor: 'rgba(242,84,91,0.4)' }}>
                <View style={{ flexDirection: 'row', gap: espace.sm }}>
                  <Ionicons name="alert-circle" size={18} color={couleurs.danger} />
                  <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                    {erreur}
                  </Txt>
                </View>
              </Carte>
            </Animated.View>
          ) : null}

          {lu ? (
            <Animated.View entering={FadeInDown}>
              <Carte style={{ gap: espace.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
                  <Ionicons name="reader-outline" size={18} color={couleurs.succes} />
                  <Txt v="corpsFort">Lu sur la carte</Txt>
                </View>
                <Trait />
                <Txt v="petit" couleur={couleurs.texteDoux}>
                  {lu.nom} {lu.prenoms} · né(e) le {lu.dateNaissance} · {lu.nationalite}
                </Txt>
                {/*
                  Le résultat n'est jamais présenté comme certain : c'est au voyageur de
                  confirmer. Le dos de leur propre ticket le rappelle — même les agents
                  se trompent en recopiant.
                */}
                <Txt v="minuscule" couleur={couleurs.attention}>
                  VÉRIFIEZ AVANT D'ENREGISTRER
                </Txt>
                {avertissements.map((a) => (
                  <Txt key={a} v="minuscule" couleur={couleurs.attention}>
                    · {a}
                  </Txt>
                ))}
              </Carte>
            </Animated.View>
          ) : null}

          <Section>Vos informations</Section>
          <Carte style={{ gap: espace.md }}>
            <Champ libelle="NUMÉRO CNIB" valeur={numero} onChange={setNumero} placeholder="B 1234567" />
            <Trait />
            <Champ
              libelle="EXPIRE LE (AAAA-MM-JJ)"
              valeur={expiration}
              onChange={setExpiration}
              placeholder="2030-12-31"
            />
            {jours !== null ? (
              <Txt v="minuscule" couleur={jours < 0 ? couleurs.danger : jours < 60 ? couleurs.attention : couleurs.succes}>
                {jours < 0
                  ? `CARTE EXPIRÉE DEPUIS ${-jours} JOUR${-jours > 1 ? 'S' : ''}`
                  : `VALIDE ENCORE ${jours} JOUR${jours > 1 ? 'S' : ''}`}
              </Txt>
            ) : null}
          </Carte>

          <Carte>
            <View style={{ flexDirection: 'row', gap: espace.sm }}>
              <Ionicons name="notifications-outline" size={18} color={couleurs.marqueVif} />
              <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                Avec la date d'expiration, l'application vous préviendra un mois, une
                semaine puis un jour avant — de quoi faire renouveler la carte sans se
                faire surprendre à un contrôle. Le rappel est local à ce téléphone.
              </Txt>
            </View>
          </Carte>
        </ScrollView>

        <View style={[styles.barreBas, { paddingBottom: insets.bottom + espace.md, gap: espace.sm }]}>
          <MessageErreur texte={enregistrement.erreur} />
          <Bouton
            titre={enregistrement.enCours ? 'Enregistrement…' : 'Enregistrer'}
            sousTitre={numero.trim() ? undefined : 'Renseignez au moins le numéro'}
            desactive={!numero.trim() || enregistrement.enCours}
            onPress={enregistrement.lancer}
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
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.saisie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.fond },
  fondCamera: { flex: 1, backgroundColor: '#000' },
  barreCamera: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: espace.lg,
    gap: espace.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bande: {
    color: couleurs.texte,
    fontSize: 13,
    // Une police à chasse fixe : les colonnes de la bande doivent s'aligner pour
    // qu'on repère un caractère manquant à l'œil.
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 78,
    textAlignVertical: 'top',
    backgroundColor: couleurs.surfaceBasse,
    borderRadius: rayon.md,
    padding: espace.md,
  },
  saisie: { color: couleurs.texte, fontSize: 17, fontWeight: '600', paddingVertical: 6 },
  photo: { width: '100%', height: 190, borderRadius: rayon.lg, backgroundColor: couleurs.surface },
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
