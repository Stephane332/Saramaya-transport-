import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import {
  BadgeClasse,
  Bouton,
  Carte,
  Ecran,
  Jauge,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { PlanSieges } from '../../src/components/PlanSieges';
import { GARES, LIGNES, PLANS_BUS, garesDeLaVille, ligneParId, nombreDeSieges } from '../../src/data/reseau';
import { identifiantDepart, siegesOccupes } from '../../src/lib/disponibilite';
import { decalerHeure, montant } from '../../src/lib/format';
import { useApp } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';
import type { Classe } from '../../src/types';

type Etape = 'LIGNE' | 'DATE' | 'DEPART' | 'SIEGE' | 'RECAP';

const ETAPES: { cle: Etape; titre: string }[] = [
  { cle: 'LIGNE', titre: 'Trajet' },
  { cle: 'DATE', titre: 'Date' },
  { cle: 'DEPART', titre: 'Départ' },
  { cle: 'SIEGE', titre: 'Place' },
  { cle: 'RECAP', titre: 'Résumé' },
];

export default function Reserver() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scan?: string }>();
  const creer = useApp((e) => e.creer);

  const [etape, setEtape] = useState<Etape>('LIGNE');
  const [ligneId, setLigneId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [heure, setHeure] = useState<string | null>(null);
  const [classe, setClasse] = useState<Classe>('CLASSIQUE');
  const [siege, setSiege] = useState<number | null>(null);
  const [gareId, setGareId] = useState<string | null>(null);

  const ligne = ligneId ? ligneParId(ligneId) : null;
  const occupes = useMemo(
    () =>
      ligneId && heure ? siegesOccupes(identifiantDepart(ligneId, date, heure, classe), classe) : [],
    [ligneId, date, heure, classe],
  );

  const indexEtape = ETAPES.findIndex((e) => e.cle === etape);

  const valider = async () => {
    if (!ligne || !heure) return;
    const reservation = await creer({
      voyageurId: 'voyageur-1',
      departId: identifiantDepart(ligne.id, date, heure, classe),
      ligneId: ligne.id,
      gareDepartId: gareId ?? garesDeLaVille(ligne.origine)[0]?.id ?? '',
      date,
      heure,
      classe,
      siege,
      montant: ligne.tarifs[classe],
    });
    router.push(`/billet/${reservation.id}`);
  };

  if (params.scan) {
    return <PanneauScan onFermer={() => router.setParams({ scan: undefined })} />;
  }

  return (
    <Ecran>
      <View>
        <Txt v="titre">Réserver</Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Choisissez votre place, l'app prépare tout pour la gare.
        </Txt>
      </View>

      <FilAriane index={indexEtape} onAller={(i) => i < indexEtape && setEtape(ETAPES[i].cle)} />

      {etape === 'LIGNE' ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout} style={{ gap: espace.md }}>
          <Section>Où allez-vous ?</Section>
          {LIGNES.map((l, i) => (
            <Pressable
              key={l.id}
              onPress={() => {
                setLigneId(l.id);
                setGareId(garesDeLaVille(l.origine)[0]?.id ?? null);
                setEtape('DATE');
              }}
            >
              <Carte index={i} style={{ gap: espace.sm }}>
                <View style={styles.entre}>
                  <Txt v="corpsFort">
                    {l.origine} → {l.destination}
                  </Txt>
                  <Ionicons name="chevron-forward" size={16} color={couleurs.texteFaible} />
                </View>
                <View style={styles.entre}>
                  <Txt v="petit" couleur={couleurs.texteFaible}>
                    {l.horaires.length} départs · {l.distanceKm} km
                  </Txt>
                  <Txt v="petit" couleur={couleurs.magentaVif}>
                    dès {montant(l.tarifs.CLASSIQUE)}
                  </Txt>
                </View>
              </Carte>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}

      {etape === 'DATE' && ligne ? (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Section>Quel jour ?</Section>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: espace.sm }}>
              {Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)).map((d) => {
                const iso = format(d, 'yyyy-MM-dd');
                const actif = iso === date;
                return (
                  <Pressable key={iso} onPress={() => setDate(iso)}>
                    <View style={[styles.jour, actif && styles.jourActif]}>
                      <Txt v="minuscule" couleur={actif ? '#fff' : couleurs.texteFaible}>
                        {format(d, 'EEE', { locale: fr }).toUpperCase()}
                      </Txt>
                      <Txt v="sousTitre" couleur={actif ? '#fff' : couleurs.texte}>
                        {format(d, 'd')}
                      </Txt>
                      <Txt v="minuscule" couleur={actif ? 'rgba(255,255,255,0.8)' : couleurs.texteFaible}>
                        {format(d, 'MMM', { locale: fr })}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Bouton titre="Voir les départs" onPress={() => setEtape('DEPART')} />
        </Animated.View>
      ) : null}

      {etape === 'DEPART' && ligne ? (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Section>Départ et classe</Section>
          <View style={styles.selecteurClasse}>
            {(['CLASSIQUE', 'VIP'] as Classe[]).map((c) => (
              <Pressable key={c} style={{ flex: 1 }} onPress={() => setClasse(c)}>
                <View style={[styles.optionClasse, classe === c && styles.optionClasseActive]}>
                  <BadgeClasse classe={c} petit />
                  <Txt v="corpsFort">{montant(ligne.tarifs[c])}</Txt>
                  <Txt v="minuscule" couleur={couleurs.texteFaible} numberOfLines={1}>
                    {PLANS_BUS[c].equipements[0]}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </View>

          {ligne.horaires.map((h, i) => {
            const occ = siegesOccupes(identifiantDepart(ligne.id, date, h, classe), classe);
            const total = nombreDeSieges(classe);
            const libres = total - occ.length;
            return (
              <Pressable
                key={h}
                onPress={() => {
                  setHeure(h);
                  setSiege(null);
                  setEtape('SIEGE');
                }}
              >
                <Carte index={i} style={{ gap: espace.sm }}>
                  <View style={styles.entre}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: espace.sm }}>
                      <Txt v="sousTitre">{h}</Txt>
                      <Txt v="minuscule" couleur={couleurs.texteFaible}>
                        CONVOCATION {decalerHeure(h, -30)}
                      </Txt>
                    </View>
                    <Txt
                      v="petit"
                      couleur={libres < 8 ? couleurs.attention : couleurs.succes}
                    >
                      {libres} places
                    </Txt>
                  </View>
                  <Jauge
                    valeur={occ.length / total}
                    couleur={libres < 8 ? couleurs.attention : couleurs.magenta}
                  />
                </Carte>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}

      {etape === 'SIEGE' && ligne && heure ? (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Section>Votre place</Section>
          <PlanSieges classe={classe} occupes={occupes} choisi={siege} onChoisir={setSiege} />
          <Bouton
            titre={siege ? `Continuer avec le siège ${siege}` : 'Choisissez un siège'}
            desactive={!siege}
            onPress={() => setEtape('RECAP')}
          />
          <Bouton
            titre="Sans préférence de place"
            variante="fantome"
            onPress={() => {
              setSiege(null);
              setEtape('RECAP');
            }}
          />
        </Animated.View>
      ) : null}

      {etape === 'RECAP' && ligne && heure ? (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Section>Résumé</Section>
          <Carte surbrillance>
            <View style={styles.entre}>
              <Txt v="sousTitre">
                {ligne.origine} → {ligne.destination}
              </Txt>
              <BadgeClasse classe={classe} petit />
            </View>
            <Trait />
            <Ligne gauche="Date" droite={format(new Date(date), 'EEEE d MMMM', { locale: fr })} />
            <Ligne gauche="Départ" droite={heure} />
            <Ligne gauche="Convocation" droite={decalerHeure(heure, -30)} />
            <Ligne gauche="Siège" droite={siege ? String(siege) : 'Sans préférence'} />
            <Ligne gauche="Gare" droite={GARES.find((g) => g.id === gareId)?.nom ?? '—'} />
            <Trait />
            <View style={styles.entre}>
              <Txt v="corpsFort">Total</Txt>
              <Txt v="sousTitre" couleur={couleurs.magentaVif}>
                {montant(ligne.tarifs[classe])}
              </Txt>
            </View>
          </Carte>

          <Carte>
            <View style={{ flexDirection: 'row', gap: espace.sm }}>
              <Ionicons name="information-circle" size={18} color={couleurs.classique} />
              <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                Votre demande part à la gare avec toutes les informations déjà remplies.
                L'agent n'a plus qu'à la saisir — il ne vous redemandera rien.
              </Txt>
            </View>
          </Carte>

          <Bouton titre="Créer ma réservation" sousTitre="Puis l'envoyer à la gare" onPress={valider} />
        </Animated.View>
      ) : null}
    </Ecran>
  );
}

function FilAriane({ index, onAller }: { index: number; onAller: (i: number) => void }) {
  return (
    <View style={styles.fil}>
      {ETAPES.map((e, i) => {
        const passee = i < index;
        const active = i === index;
        return (
          <Pressable key={e.cle} onPress={() => onAller(i)} style={{ flex: 1 }}>
            <View style={{ gap: 6 }}>
              <View
                style={[
                  styles.barre,
                  { backgroundColor: passee || active ? couleurs.magentaVif : 'rgba(255,255,255,0.1)' },
                ]}
              />
              <Txt v="minuscule" couleur={active ? couleurs.magentaVif : couleurs.texteFaible}>
                {e.titre.toUpperCase()}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function Ligne({ gauche, droite }: { gauche: string; droite: string }) {
  return (
    <View style={styles.entre}>
      <Txt v="petit" couleur={couleurs.texteFaible}>
        {gauche}
      </Txt>
      <Txt v="corpsFort">{droite}</Txt>
    </View>
  );
}

/** Scan d'un ticket papier — le pont sans intégration. */
function PanneauScan({ onFermer }: { onFermer: () => void }) {
  const importer = useApp((e) => e.importerPapier);
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  const simuler = async () => {
    setEnCours(true);
    // Démonstration : les champs du ticket papier réel qui a inspiré le projet.
    const r = await importer({
      reference: '66456',
      ligneId: 'ligne-ouahigouya-ouaga',
      date: format(new Date(), 'yyyy-MM-dd'),
      heure: '16:00',
      classe: 'CLASSIQUE',
      siege: 93,
      montant: 3500,
    });
    setEnCours(false);
    router.replace(`/billet/${r.id}`);
  };

  return (
    <Ecran>
      <View style={styles.entre}>
        <Txt v="titre">Scanner un ticket</Txt>
        <Pressable onPress={onFermer}>
          <Ionicons name="close" size={24} color={couleurs.texteFaible} />
        </Pressable>
      </View>

      <Carte>
        <Txt v="petit" couleur={couleurs.texteDoux}>
          Votre ticket papier porte un code-barres et toutes les informations du voyage.
          En le scannant, il rejoint vos voyages — sans que la compagnie ait rien à faire.
        </Txt>
      </Carte>

      <LinearGradient colors={degrades.marqueDouce} style={styles.viseur}>
        <View style={styles.cadreScan}>
          <Ionicons name="scan-outline" size={64} color={couleurs.magentaVif} />
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Cadrez le code-barres du ticket
          </Txt>
        </View>
      </LinearGradient>

      <Bouton
        titre={enCours ? 'Lecture…' : 'Simuler la lecture du ticket n° 66456'}
        sousTitre="Ouahigouya → Ouagadougou · 3 500 F · siège 93"
        onPress={simuler}
        desactive={enCours}
      />
      <Bouton titre="Saisir les informations à la main" variante="secondaire" onPress={onFermer} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fil: { flexDirection: 'row', gap: espace.sm },
  barre: { height: 3, borderRadius: 2 },
  jour: {
    width: 62,
    alignItems: 'center',
    paddingVertical: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: 2,
  },
  jourActif: { backgroundColor: couleurs.magentaProfond, borderColor: couleurs.magentaVif },
  selecteurClasse: { flexDirection: 'row', gap: espace.md },
  optionClasse: {
    alignItems: 'flex-start',
    gap: 6,
    padding: espace.md,
    borderRadius: rayon.lg,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  optionClasseActive: { borderColor: couleurs.magentaVif, backgroundColor: 'rgba(214,33,111,0.12)' },
  viseur: { borderRadius: rayon.xl, padding: espace.xxl, alignItems: 'center' },
  cadreScan: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: rayon.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(240,53,127,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.md,
  },
});
