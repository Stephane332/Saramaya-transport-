/**
 * Ouverture de compte — le tout premier écran d'un nouveau client.
 *
 * Le geste demandé tient en un mot : **une image**. On photographie sa CNIB, ou on
 * choisit une photo déjà prise, et tout se remplit — nom, prénoms, numéro, date de
 * naissance, date d'expiration, lieu de naissance. Les deux faces peuvent être
 * données ; chacune apporte ce que l'autre n'a pas.
 *
 *     image → lecture → vérification par le voyageur → compte créé
 *
 * ## Ce que chaque face apporte
 *
 * Le **dos** porte la bande à lecture machine, et c'est la meilleure source qui
 * soit : chaque champ y est suivi d'une clé de contrôle, si bien qu'une lecture
 * fautive **se détecte** au lieu de s'enregistrer en silence.
 *
 * Le **recto** porte ce que la bande ne contient pas : le lieu de naissance, la
 * profession, la date de délivrance, et le numéro d'identification à dix-sept
 * chiffres. Quand les deux faces se contredisent, l'écran le dit et pointe le champ.
 *
 * ## Deux principes
 *
 * 1. **Rien n'est affirmé.** Ce qui est lu pré-remplit ; le voyageur confirme, et
 *    chaque champ indique d'où il vient. Le dos de leur propre ticket le dit :
 *    « nos agents peuvent se tromper ». Une machine aussi.
 * 2. **Rien ne sort du téléphone.** Les images et l'identité restent sur
 *    l'appareil. C'est ce qui permet de dire à la compagnie : nous ne détenons pas
 *    les pièces d'identité de vos clients, donc nous ne pouvons pas les perdre.
 *
 * Seul le numéro de téléphone se saisit à la main — il ne figure pas sur la carte.
 */

import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
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
import { Bus3D } from '../src/components/Bus3D';
import {
  Bouton,
  Carte,
  EnTeteRetour,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../src/components/base';
import { CONTACTS_COMPAGNIE } from '../src/data/reseau';
import { useAction } from '../src/lib/action';
import {
  CARTE_VIDE,
  CHAMPS,
  appliquerFusion,
  carteSuffisante,
  fusionnerCarte,
  libelleSource,
  type CarteIdentite,
  type ChampCarte,
  type SourceChamp,
} from '../src/lib/carteIdentite';
import { lireBandeTD1 } from '../src/lib/cnib';
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

const SOURCES_VIDES = Object.fromEntries(CHAMPS.map((c) => [c, 'AUCUNE'])) as Record<
  ChampCarte,
  SourceChamp
>;

export default function Bienvenue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const creerCompte = useApp((e) => e.creerCompte);
  const voyageurExistant = useApp((e) => e.voyageur);

  const [etape, setEtape] = useState<'ACCUEIL' | 'IDENTITE'>('ACCUEIL');

  /** Les faces déjà lues, au plus une par face. */
  const [lectures, setLectures] = useState<LectureFace[]>([]);
  const [carte, setCarte] = useState<CarteIdentite>(CARTE_VIDE);
  const [sources, setSources] = useState<Record<ChampCarte, SourceChamp>>(SOURCES_VIDES);
  const [desaccords, setDesaccords] = useState<ChampCarte[]>([]);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [messageLecture, setMessageLecture] = useState<string | null>(null);
  const [bandeManuelle, setBandeManuelle] = useState('');

  /** Le seul champ absent de la carte. */
  const [telephone, setTelephone] = useState('');

  useRetourMateriel(etape === 'IDENTITE', () => setEtape('ACCUEIL'));

  const telOk = telephone.replace(/\D/g, '').length >= 8;
  const complet = carteSuffisante(carte) && telOk;

  const recto = useMemo(() => lectures.find((l) => l.face === 'RECTO'), [lectures]);
  const verso = useMemo(() => lectures.find((l) => l.face === 'VERSO'), [lectures]);

  /**
   * Range une lecture et reporte le résultat sur le formulaire.
   *
   * La fusion est **recalculée depuis toutes les faces**, et non appliquée par
   * incréments : c'est ce qui permet de détecter qu'un recto et un dos se
   * contredisent, ce qu'un remplissage au fil de l'eau ne verrait jamais.
   */
  const integrer = (lecture: LectureFace) => {
    const suivantes = [...lectures.filter((l) => l.face !== lecture.face), lecture];
    setLectures(suivantes);

    const bande = suivantes.find((l) => l.bande)?.bande ?? null;
    const champsRecto = suivantes.find((l) => l.recto)?.recto ?? null;
    const fusion = fusionnerCarte(
      bande,
      champsRecto,
      suivantes.flatMap((l) => l.avertissements),
    );

    const applique = appliquerFusion(carte, sources, fusion);
    setCarte(applique.carte);
    setSources(applique.sources);
    setDesaccords(fusion.desaccords);
    setAvertissements(fusion.avertissements);
    setMessageLecture(lecture.raisonIndisponible ?? null);
  };

  /** Corriger un champ à la main : la correction ne sera plus jamais écrasée. */
  const corriger = (champ: ChampCarte, valeur: string) => {
    setCarte((c) => ({ ...c, [champ]: valeur }));
    setSources((s) => ({ ...s, [champ]: 'SAISIE' }));
    setDesaccords((d) => d.filter((c) => c !== champ));
  };

  const importer = useAction(async (origine: 'APPAREIL' | 'GALERIE') => {
    const uri = origine === 'APPAREIL' ? await photographier() : await choisirDepuisGalerie();
    if (!uri) return; // Annulé : ce n'est pas un échec.
    const lecture = await lireImageCarte(uri);
    integrer(lecture);
  }, "L'image n'a pas pu être lue. Réessayez avec une photo bien à plat et bien éclairée.");

  /** Voie de secours : recopier la bande du dos donne exactement le même résultat. */
  const saisirBande = useAction(async () => {
    const decodee = lireBandeTD1(bandeManuelle);
    if (!decodee.ok) throw new Error(decodee.raison);
    integrer({
      face: 'VERSO',
      uri: '',
      texte: bandeManuelle,
      bande: decodee.identite,
      avertissements: decodee.avertissements,
    });
  }, "La bande n'a pas pu être décodée. Vérifiez les trois lignes de trente caractères.");

  const ouverture = useAction(async () => {
    if (!complet) return;
    creerCompte({
      prenom: carte.prenoms.trim().split(/\s+/)[0] ?? carte.prenoms.trim(),
      nom: carte.nom.trim().toUpperCase(),
      telephone: telephone.replace(/\D/g, ''),
      cnib: carte.numeroCarte.trim() || undefined,
      dateNaissance: carte.dateNaissance || undefined,
      cnibExpireLe: DATE_ISO.test(carte.dateExpiration) ? carte.dateExpiration : undefined,
      cnibPhotoUri: recto?.uri || verso?.uri || undefined,
    });
    // Le rappel d'expiration est un confort : son échec ne doit pas priver le
    // voyageur du compte qu'il vient de créer.
    if (DATE_ISO.test(carte.dateExpiration)) {
      await programmerRappelsCnib(carte.dateExpiration).catch(() => undefined);
    }
    router.replace('/');
  }, "Le compte n'a pas pu être créé. Réessayez dans un instant.");

  // Après le dernier crochet, jamais avant : une sortie placée plus haut ferait
  // rendre moins de crochets au second rendu, et React ferait tomber tout l'arbre.
  if (voyageurExistant) return <Redirect href="/" />;

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

  /* ── Identité, à partir d'une image de la carte ─────────────────────────── */

  return (
    <View style={[styles.fond, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: espace.lg, paddingBottom: insets.bottom + 130, gap: espace.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <EnTeteRetour onRetour={() => setEtape('ACCUEIL')} titre="Votre identité" />

          <Txt v="petit" couleur={couleurs.texteFaible}>
            Ajoutez une image de votre CNIB : tout se remplit. Le dos est le plus fiable — sa
            bande porte des clés de contrôle. Vos informations restent sur ce téléphone.
          </Txt>

          <Section>Votre carte</Section>
          <View style={{ gap: espace.md }}>
            <View style={{ flexDirection: 'row', gap: espace.md }}>
              <VignetteFace titre="RECTO" lecture={recto} />
              <VignetteFace titre="DOS" lecture={verso} />
            </View>

            <MessageErreur texte={importer.erreur} />

            <Bouton
              titre={importer.enCours ? 'Lecture…' : 'Photographier ma carte'}
              sousTitre="Le dos de préférence — reste sur ce téléphone"
              desactive={importer.enCours}
              icone={<Ionicons name="camera-outline" size={18} color={couleurs.texte} />}
              onPress={() => importer.lancer('APPAREIL')}
            />
            <Bouton
              titre="Choisir une image existante"
              sousTitre="Une photo de la carte déjà dans votre téléphone"
              variante="secondaire"
              desactive={importer.enCours}
              icone={<Ionicons name="images-outline" size={18} color={couleurs.texteDoux} />}
              onPress={() => importer.lancer('GALERIE')}
            />
            {lectures.length === 1 ? (
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                AJOUTEZ L'AUTRE FACE : ELLE COMPLÈTE CE QUI MANQUE ET CONFIRME LE RESTE
              </Txt>
            ) : null}
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
                  Le recto et le dos donnent des valeurs différentes pour{' '}
                  {desaccords.map((c) => LIBELLES[c].toLowerCase()).join(', ')}. La valeur du dos
                  est retenue, car elle est vérifiée — mais regardez votre carte et corrigez si
                  besoin.
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
              libelle="NOM"
              valeur={carte.nom}
              source={sources.nom}
              enDesaccord={desaccords.includes('nom')}
              onChange={(v) => corriger('nom', v)}
              placeholder="SAWADOGO"
              majuscule
            />
            <Trait />
            <Champ
              libelle="PRÉNOMS"
              valeur={carte.prenoms}
              source={sources.prenoms}
              enDesaccord={desaccords.includes('prenoms')}
              onChange={(v) => corriger('prenoms', v)}
              placeholder="ANGE STEPHANE"
              majuscule
            />
            <Trait />
            <Champ
              libelle="TÉLÉPHONE"
              valeur={telephone}
              source="AUCUNE"
              onChange={setTelephone}
              placeholder="70 45 12 88"
              clavier="phone-pad"
              note="NE FIGURE PAS SUR LA CARTE"
            />
            <Trait />
            <Champ
              libelle="NUMÉRO CNIB"
              valeur={carte.numeroCarte}
              source={sources.numeroCarte}
              enDesaccord={desaccords.includes('numeroCarte')}
              onChange={(v) => corriger('numeroCarte', v)}
              placeholder="B13654737"
              majuscule
            />
            <Trait />
            <Champ
              libelle="EXPIRE LE (AAAA-MM-JJ)"
              valeur={carte.dateExpiration}
              source={sources.dateExpiration}
              enDesaccord={desaccords.includes('dateExpiration')}
              onChange={(v) => corriger('dateExpiration', v)}
              placeholder="2031-08-30"
            />
            <Trait />
            <Champ
              libelle="NÉ(E) LE (AAAA-MM-JJ)"
              valeur={carte.dateNaissance}
              source={sources.dateNaissance}
              enDesaccord={desaccords.includes('dateNaissance')}
              onChange={(v) => corriger('dateNaissance', v)}
              placeholder="2004-10-01"
            />
            {carte.lieuNaissance ? (
              <>
                <Trait />
                <Champ
                  libelle="LIEU DE NAISSANCE"
                  valeur={carte.lieuNaissance}
                  source={sources.lieuNaissance}
                  onChange={(v) => corriger('lieuNaissance', v)}
                  placeholder="OUAHIGOUYA"
                  majuscule
                />
              </>
            ) : null}
          </Carte>

          {/*
            Voie de secours, et non version dégradée : recopier la bande donne
            exactement le même résultat que la lecture d'image — mêmes champs, même
            décodage, mêmes clés de contrôle.
          */}
          <Section>Ou recopiez la bande du dos</Section>
          <Carte style={{ gap: espace.md }}>
            <TextInput
              value={bandeManuelle}
              onChangeText={setBandeManuelle}
              placeholder={'I<BFAB136547379<<<<<<<<<<<<<<<\n0410014M3108309BFA<<<<<<<<<<<0\nSAWADOGO<<ANGE<STEPHANE<<<<<<<'}
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

          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={18} color={couleurs.succes} />
            <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
              Rien n'est envoyé : les images et vos informations restent sur cet appareil. Avec
              la date d'expiration, vous serez prévenu avant qu'une carte périmée ne pose
              problème à un contrôle.
            </Txt>
          </View>

          <Bouton
            titre="Ce qui est fait de vos informations"
            variante="fantome"
            onPress={() => router.push('/confidentialite')}
          />
        </ScrollView>

        <View style={[styles.barreBas, { paddingBottom: insets.bottom + espace.md, gap: espace.sm }]}>
          <MessageErreur texte={ouverture.erreur} />
          <Bouton
            titre={ouverture.enCours ? 'Création…' : 'Ouvrir mon compte'}
            sousTitre={complet ? undefined : 'Nom, prénoms et téléphone sont nécessaires'}
            desactive={!complet || ouverture.enCours}
            onPress={ouverture.lancer}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const LIBELLES: Record<ChampCarte, string> = {
  nom: 'Le nom',
  prenoms: 'Les prénoms',
  dateNaissance: 'La date de naissance',
  dateExpiration: "La date d'expiration",
  numeroCarte: 'Le numéro de carte',
  lieuNaissance: 'Le lieu de naissance',
  numeroIdentification: "Le numéro d'identification",
  sexe: 'Le sexe',
  profession: 'La profession',
  dateDelivrance: 'La date de délivrance',
};

/** Aperçu d'une face déjà lue, ou emplacement vide qui indique ce qui manque. */
function VignetteFace({ titre, lecture }: { titre: string; lecture?: LectureFace }) {
  const lue = Boolean(lecture?.bande || lecture?.recto);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={[styles.vignette, lue && { borderColor: 'rgba(46,204,143,0.5)' }]}>
        {lecture?.uri ? (
          <Image source={{ uri: lecture.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
  clavier = 'default',
  majuscule = false,
  enDesaccord = false,
  note,
}: {
  libelle: string;
  valeur: string;
  source: SourceChamp;
  onChange: (v: string) => void;
  placeholder?: string;
  clavier?: 'default' | 'phone-pad';
  majuscule?: boolean;
  enDesaccord?: boolean;
  note?: string;
}) {
  const origine = note ?? libelleSource(source);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          {libelle}
        </Txt>
        {enDesaccord ? (
          <Ionicons name="alert-circle" size={13} color={couleurs.danger} />
        ) : null}
      </View>
      <TextInput
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.22)"
        keyboardType={clavier}
        autoCapitalize={majuscule ? 'characters' : 'words'}
        autoCorrect={false}
        style={[styles.saisie, enDesaccord && { color: couleurs.danger }]}
      />
      {origine ? (
        <Txt
          v="minuscule"
          couleur={source === 'BANDE' ? couleurs.succes : couleurs.texteFaible}
        >
          {origine}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.fond },
  accueil: { flex: 1, paddingHorizontal: espace.lg },
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
