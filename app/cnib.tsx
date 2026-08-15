/**
 * Renseigner ou mettre à jour sa pièce d'identité.
 *
 * La CNIB est exigée dès 18 ans à l'entrée de la gare. La renseigner une fois évite
 * de la ressortir et de la dicter à chaque passage — et sa date d'expiration, une
 * fois connue, permet de prévenir avant qu'une carte périmée ne transforme un
 * contrôle routier de routine en mauvaise soirée.
 *
 * Le geste est le même qu'à l'inscription, et il n'y en a qu'un : **donner une
 * image de la carte**. Photographiée sur place ou choisie dans la galerie, une ou
 * les deux faces. Le dos porte la bande à lecture machine — la source la plus sûre,
 * chaque champ y ayant sa clé de contrôle — et le recto porte ce que la bande ne
 * contient pas.
 *
 * Recopier la bande à la main reste possible et donne exactement le même résultat,
 * par le même chemin : c'est une voie de secours, pas une version dégradée.
 *
 * Où vont ces données : nulle part. Elles restent sur l'appareil, comme le reste du
 * compte. L'image sert à remplir le formulaire, sur place, et n'est jamais transmise.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { CarteVirtuelle } from '../src/components/CarteVirtuelle';
import {
  Bouton,
  Carte,
  EnTeteRetour,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../src/components/base';
import { useAction } from '../src/lib/action';
import {
  CARTE_VIDE,
  CHAMPS,
  appliquerFusion,
  fusionnerCarte,
  libelleSource,
  type CarteIdentite,
  type ChampCarte,
  type SourceChamp,
} from '../src/lib/carteIdentite';
import { joursAvantExpirationCnib, lireBandeTD1 } from '../src/lib/cnib';
import {
  choisirDepuisGalerie,
  lireImageCarte,
  photographier,
  type LectureFace,
} from '../src/lib/imageCarte';
import { programmerRappelsCnib } from '../src/lib/notifications';
import { useRetourMateriel } from '../src/lib/retour';
import { useApp } from '../src/store/useApp';
import { couleurs, espace, rayon } from '../src/theme';

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Exemple de bande, affiché en filigrane.
 *
 * Volontairement **fictif**. Un exemple tiré d'une vraie carte se prend pour une
 * donnée déjà lue : on ne sait plus si l'application a compris quelque chose ou
 * attend qu'on tape.
 */
const EXEMPLE_BANDE = [
  'I<BFAB987654323<<<<<<<<<<<<<<<',
  '9005145F3203112BFA<<<<<<<<<<<2',
  'OUEDRAOGO<<FATIMATA<ADIZA<<<<<',
].join('\n');

const SOURCES_VIDES = Object.fromEntries(CHAMPS.map((c) => [c, 'AUCUNE'])) as Record<
  ChampCarte,
  SourceChamp
>;

export default function EcranCnib() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const voyageur = useApp((e) => e.voyageur);
  const mettreAJourProfil = useApp((e) => e.mettreAJourProfil);

  const [lectures, setLectures] = useState<LectureFace[]>([]);
  /*
   * Le formulaire part de ce que le compte sait déjà : ces valeurs ont été
   * confirmées par le voyageur la dernière fois, elles comptent donc comme saisies
   * et ne seront pas écrasées par une relecture — seulement complétées.
   */
  const [carte, setCarte] = useState<CarteIdentite>({
    ...CARTE_VIDE,
    numeroCarte: voyageur?.cnib ?? '',
    dateExpiration: voyageur?.cnibExpireLe ?? '',
    dateNaissance: voyageur?.dateNaissance ?? '',
  });
  const [sources, setSources] = useState<Record<ChampCarte, SourceChamp>>({
    ...SOURCES_VIDES,
    ...(voyageur?.cnib ? { numeroCarte: 'SAISIE' as const } : {}),
    ...(voyageur?.cnibExpireLe ? { dateExpiration: 'SAISIE' as const } : {}),
    ...(voyageur?.dateNaissance ? { dateNaissance: 'SAISIE' as const } : {}),
  });
  const [desaccords, setDesaccords] = useState<ChampCarte[]>([]);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [messageLecture, setMessageLecture] = useState<string | null>(null);
  const [bandeManuelle, setBandeManuelle] = useState('');
  const [photo, setPhoto] = useState<string | null>(voyageur?.cnibPhotoUri ?? null);

  useRetourMateriel(true, () => router.back());

  const recto = useMemo(() => lectures.find((l) => l.face === 'RECTO'), [lectures]);
  const verso = useMemo(() => lectures.find((l) => l.face === 'VERSO'), [lectures]);

  const integrer = (lecture: LectureFace) => {
    const suivantes = [...lectures.filter((l) => l.face !== lecture.face), lecture];
    setLectures(suivantes);
    if (lecture.uri) setPhoto((p) => p ?? lecture.uri);

    const fusion = fusionnerCarte(
      suivantes.find((l) => l.bande)?.bande ?? null,
      suivantes.find((l) => l.recto)?.recto ?? null,
      suivantes.flatMap((l) => l.avertissements),
    );

    const applique = appliquerFusion(carte, sources, fusion);
    setCarte(applique.carte);
    setSources(applique.sources);
    setDesaccords(fusion.desaccords);
    setAvertissements(fusion.avertissements);
    setMessageLecture(lecture.raisonIndisponible ?? null);
  };

  const corriger = (champ: ChampCarte, valeur: string) => {
    setCarte((c) => ({ ...c, [champ]: valeur }));
    setSources((s) => ({ ...s, [champ]: 'SAISIE' }));
    setDesaccords((d) => d.filter((c) => c !== champ));
  };

  const importer = useAction(async (origine: 'APPAREIL' | 'GALERIE') => {
    const uri = origine === 'APPAREIL' ? await photographier() : await choisirDepuisGalerie();
    if (!uri) return;
    integrer(await lireImageCarte(uri));
  }, "L'image n'a pas pu être lue. Réessayez avec une photo bien à plat et bien éclairée.");

  const saisirBande = useAction(async () => {
    const decodee = lireBandeTD1(bandeManuelle);
    if (!decodee.ok) throw new Error(decodee.raison);
    integrer({
      face: 'VERSO',
      uri: '',
      texte: bandeManuelle,
      bande: decodee.identite,
      bandeBrute: bandeManuelle,
      avertissements: decodee.avertissements,
    });
    setBandeManuelle('');
  }, "La bande n'a pas pu être décodée. Vérifiez les trois lignes de trente caractères.");

  const enregistrement = useAction(async () => {
    const dateValide = DATE_ISO.test(carte.dateExpiration);
    /*
     * Chaque champ n'est transmis que s'il a une valeur.
     *
     * `mettreAJourProfil` fusionne par étalement : un `undefined` explicite écrase
     * la valeur enregistrée au lieu de la laisser tranquille. Une date d'expiration
     * momentanément mal formée — le temps d'une frappe — effaçait donc celle qui
     * était déjà connue, et avec elle les rappels avant contrôle.
     */
    mettreAJourProfil({
      ...(carte.numeroCarte.trim() ? { cnib: carte.numeroCarte.trim() } : {}),
      ...(photo ? { cnibPhotoUri: photo } : {}),
      ...(dateValide ? { cnibExpireLe: carte.dateExpiration } : {}),
      ...(carte.dateNaissance ? { dateNaissance: carte.dateNaissance } : {}),
    });
    // Le rappel est un confort : son échec ne doit pas empêcher l'enregistrement de
    // la carte, qui, lui, sert au contrôle à la gare.
    if (dateValide) await programmerRappelsCnib(carte.dateExpiration).catch(() => undefined);
    router.back();
  }, "Vos informations n'ont pas pu être enregistrées. Réessayez dans un instant.");

  const jours = DATE_ISO.test(carte.dateExpiration)
    ? joursAvantExpirationCnib(carte.dateExpiration)
    : null;
  // Une carte se montre dès qu'elle a de quoi être reconnue ; sinon il n'y a rien
  // à afficher qu'un bouton.
  const carteLue = Boolean(carte.numeroCarte || carte.nom);

  return (
    <View style={[styles.fond, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: espace.lg, paddingBottom: insets.bottom + 140, gap: espace.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <EnTeteRetour onRetour={() => router.back()} titre="Ma pièce d'identité" />

          <Txt v="petit" couleur={couleurs.texteFaible}>
            {carteLue
              ? 'Votre carte, telle que l’application la connaît. Présentez cet écran au guichet.'
              : 'Ajoutez une image de votre carte : tout se remplit. Vos informations restent sur ce téléphone — rien n’est envoyé.'}
          </Txt>

          {carteLue ? (
            <CarteVirtuelle
              carte={carte}
              sources={sources}
              desaccords={desaccords}
              photoUri={recto?.uri ?? photo}
              bande={verso?.bandeBrute ?? null}
            />
          ) : null}

          <View style={{ gap: espace.md }}>
            {!carteLue ? (
              <View style={{ flexDirection: 'row', gap: espace.md }}>
                <VignetteFace titre="RECTO" lecture={recto} repli={photo} />
                <VignetteFace titre="DOS" lecture={verso} />
              </View>
            ) : null}

            <MessageErreur texte={importer.erreur} />

            <Bouton
              titre={
                importer.enCours
                  ? 'Lecture…'
                  : carteLue
                    ? 'Mettre à jour depuis une photo'
                    : 'Photographier ma carte'
              }
              sousTitre={carteLue ? undefined : 'Le dos de préférence — reste sur ce téléphone'}
              variante={carteLue ? 'secondaire' : 'principal'}
              desactive={importer.enCours}
              icone={
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={carteLue ? couleurs.texteDoux : couleurs.texte}
                />
              }
              onPress={() => importer.lancer('APPAREIL')}
            />
            <Bouton
              titre="Choisir une image existante"
              variante="secondaire"
              desactive={importer.enCours}
              icone={<Ionicons name="images-outline" size={18} color={couleurs.texteDoux} />}
              onPress={() => importer.lancer('GALERIE')}
            />
          </View>

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

          {desaccords.length > 0 ? (
            <Animated.View entering={FadeInDown}>
              <Carte style={{ borderColor: 'rgba(242,84,91,0.45)', gap: espace.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
                  <Ionicons name="alert-circle" size={18} color={couleurs.danger} />
                  <Txt v="corpsFort" couleur={couleurs.danger}>
                    Les deux faces ne concordent pas
                  </Txt>
                </View>
                <Txt v="petit" couleur={couleurs.texteDoux}>
                  Regardez votre carte et corrigez les champs signalés en rouge. La valeur du
                  dos est retenue, car elle est vérifiée par une clé de contrôle.
                </Txt>
              </Carte>
            </Animated.View>
          ) : null}

          {avertissements.length > 0 ? (
            <Carte style={{ borderColor: 'rgba(245,165,36,0.35)', gap: 4 }}>
              <Txt v="minuscule" couleur={couleurs.attention}>
                À VÉRIFIER
              </Txt>
              {avertissements.map((a) => (
                <Txt key={a} v="petit" couleur={couleurs.texteDoux}>
                  · {a}
                </Txt>
              ))}
            </Carte>
          ) : null}

          <Section>Vos informations</Section>
          <Carte style={{ gap: espace.md }}>
            <Champ
              libelle="NUMÉRO CNIB"
              valeur={carte.numeroCarte}
              source={sources.numeroCarte}
              enDesaccord={desaccords.includes('numeroCarte')}
              onChange={(v) => corriger('numeroCarte', v)}
              placeholder="B98765432"
            />
            <Trait />
            <Champ
              libelle="EXPIRE LE (AAAA-MM-JJ)"
              valeur={carte.dateExpiration}
              source={sources.dateExpiration}
              enDesaccord={desaccords.includes('dateExpiration')}
              onChange={(v) => corriger('dateExpiration', v)}
              placeholder="2032-03-11"
            />
            {jours !== null ? (
              <Txt
                v="minuscule"
                couleur={jours < 0 ? couleurs.danger : jours < 60 ? couleurs.attention : couleurs.succes}
              >
                {jours < 0
                  ? `CARTE EXPIRÉE DEPUIS ${-jours} JOUR${-jours > 1 ? 'S' : ''}`
                  : `VALIDE ENCORE ${jours} JOUR${jours > 1 ? 'S' : ''}`}
              </Txt>
            ) : null}
            <Trait />
            <Champ
              libelle="NÉ(E) LE (AAAA-MM-JJ)"
              valeur={carte.dateNaissance}
              source={sources.dateNaissance}
              enDesaccord={desaccords.includes('dateNaissance')}
              onChange={(v) => corriger('dateNaissance', v)}
              placeholder="1990-05-14"
            />
          </Carte>

          <Section>Ou recopiez la bande du dos</Section>
          <Carte style={{ gap: espace.md }}>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Les trois lignes de caractères au dos de la carte contiennent déjà tout.
              Recopiez-les ici : chaque champ y porte une clé de contrôle, donc une faute de
              frappe est repérée au lieu d'être enregistrée.
            </Txt>
            <TextInput
              value={bandeManuelle}
              onChangeText={setBandeManuelle}
              placeholder={EXEMPLE_BANDE}
              placeholderTextColor="rgba(255,255,255,0.18)"
              multiline
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.bande}
            />
            <MessageErreur texte={saisirBande.erreur} />
            <Bouton
              titre="Remplir depuis la bande"
              variante="secondaire"
              desactive={bandeManuelle.trim().length < 30 || saisirBande.enCours}
              onPress={saisirBande.lancer}
            />
          </Carte>

          <Carte>
            <View style={{ flexDirection: 'row', gap: espace.sm }}>
              <Ionicons name="notifications-outline" size={18} color={couleurs.marqueVif} />
              <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                Avec la date d'expiration, l'application vous préviendra un mois, une semaine
                puis un jour avant — de quoi faire renouveler la carte sans se faire surprendre
                à un contrôle. Le rappel est local à ce téléphone.
              </Txt>
            </View>
          </Carte>
        </ScrollView>

        <View style={[styles.barreBas, { paddingBottom: insets.bottom + espace.md, gap: espace.sm }]}>
          <MessageErreur texte={enregistrement.erreur} />
          <Bouton
            titre={enregistrement.enCours ? 'Enregistrement…' : 'Enregistrer'}
            sousTitre={carte.numeroCarte.trim() ? undefined : 'Renseignez au moins le numéro'}
            desactive={!carte.numeroCarte.trim() || enregistrement.enCours}
            onPress={enregistrement.lancer}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function VignetteFace({
  titre,
  lecture,
  repli,
}: {
  titre: string;
  lecture?: LectureFace;
  /** Image déjà enregistrée au compte, affichée tant qu'aucune nouvelle n'est lue. */
  repli?: string | null;
}) {
  const lue = Boolean(lecture?.bande || lecture?.recto);
  const image = lecture?.uri || repli;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={[styles.vignette, lue && { borderColor: 'rgba(46,204,143,0.5)' }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name="card-outline" size={26} color={couleurs.texteFaible} />
        )}
        {lue ? (
          <View style={styles.pastilleLue}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        ) : null}
      </View>
      <Txt v="minuscule" couleur={lue ? couleurs.succes : couleurs.texteFaible}>
        {titre} {lue ? '· LU' : '· À AJOUTER'}
      </Txt>
    </View>
  );
}

function Champ({
  libelle,
  valeur,
  source,
  onChange,
  placeholder,
  enDesaccord = false,
}: {
  libelle: string;
  valeur: string;
  source: SourceChamp;
  onChange: (v: string) => void;
  placeholder?: string;
  enDesaccord?: boolean;
}) {
  const origine = libelleSource(source);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          {libelle}
        </Txt>
        {enDesaccord ? <Ionicons name="alert-circle" size={13} color={couleurs.danger} /> : null}
      </View>
      <TextInput
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.22)"
        autoCapitalize="characters"
        autoCorrect={false}
        style={[styles.saisie, enDesaccord && { color: couleurs.danger }]}
      />
      {origine ? (
        <Txt v="minuscule" couleur={source === 'BANDE' ? couleurs.succes : couleurs.texteFaible}>
          {origine}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.fond },
  vignette: {
    height: 96,
    borderRadius: rayon.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.bordureForte,
    backgroundColor: couleurs.surfaceBasse,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pastilleLue: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: couleurs.succes,
    alignItems: 'center',
    justifyContent: 'center',
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
