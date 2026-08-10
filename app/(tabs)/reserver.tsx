import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import {
  BadgeClasse,
  Bouton,
  Carte,
  Ecran,
  EnAttenteDeLaCompagnie,
  EnTeteRetour,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { PlanSieges } from '../../src/components/PlanSieges';
import { ScannerCamera } from '../../src/components/ScannerCamera';
import {
  GARES,
  LIGNES,
  LIGNE_DEFAUT,
  PLANS_BUS,
  TELEPHONES_RESERVATION,
  garesDeLaVille,
  identifiantDepart,
  ligneParId,
} from '../../src/data/reseau';
import { decalerHeure, montant } from '../../src/lib/format';
import { departsDuJour } from '../../src/lib/departs';
import { etatFonction } from '../../src/lib/disponibilite';
import { useRetourMateriel } from '../../src/lib/retour';
import { programmerRappels } from '../../src/lib/notifications';
import { useStatutService } from '../../src/lib/statutService';
import { useApp } from '../../src/store/useApp';
import { couleurs, espace, rayon } from '../../src/theme';
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
  const voyageur = useApp((e) => e.voyageur);
  const statut = useStatutService();

  const [enCours, setEnCours] = useState(false);
  const [etape, setEtape] = useState<Etape>('LIGNE');
  const [ligneId, setLigneId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [heure, setHeure] = useState<string | null>(null);
  const [classe, setClasse] = useState<Classe>('ORDINAIRE');
  const [siege, setSiege] = useState<number | null>(null);
  const [gareId, setGareId] = useState<string | null>(null);

  const ligne = ligneId ? ligneParId(ligneId) : null;
  const indexEtape = ETAPES.findIndex((e) => e.cle === etape);

  /**
   * Revenir d'une étape. Une seule définition, partagée par la flèche à l'écran et
   * par le bouton matériel d'Android : les deux doivent faire exactement la même
   * chose, sinon l'un des deux perd la saisie en cours.
   */
  const etapePrecedente = useCallback(() => {
    const precedente = ETAPES[indexEtape - 1];
    if (precedente) setEtape(precedente.cle);
  }, [indexEtape]);

  // Sur Android, le retour matériel remonte d'une étape au lieu de quitter l'onglet.
  useRetourMateriel(indexEtape > 0, etapePrecedente);

  /**
   * Départs réellement proposables : la grille publiée, plus les départs ajoutés
   * par la compagnie pour ce jour-là, moins ceux dont l'heure est déjà passée.
   */
  const departs = useMemo(
    () =>
      ligne && ligneId
        ? departsDuJour(ligne.departs, ligneId, date, statut.departsSupplementaires)
        : [],
    [ligne, ligneId, date, statut.departsSupplementaires],
  );

  /**
   * Crée la réservation. Elle naît « à payer » : le paiement se fait ensuite par
   * Orange Money, aux vraies coordonnées affichées sur le billet, et le retrait au
   * guichet. Rien n'est facturé ni confirmé automatiquement — ce serait faux sans le
   * système de la compagnie. Les rappels sont programmés dès la création.
   */
  const creerReservation = async () => {
    if (!ligne || !heure || !voyageur || enCours) return;
    setEnCours(true);
    const reservation = await creer({
      voyageurId: voyageur.id,
      departId: identifiantDepart(ligne.id, date, heure, classe),
      ligneId: ligne.id,
      gareDepartId: gareId ?? garesDeLaVille(ligne.origine)[0]?.id ?? '',
      date,
      heure,
      classe,
      siege,
      montant: ligne.tarifs[classe],
    });
    await programmerRappels(reservation);
    setEnCours(false);
    router.push(`/billet/${reservation.id}`);
  };

  if (params.scan) {
    return <PanneauScan onFermer={() => router.setParams({ scan: undefined })} />;
  }

  // La compagnie a suspendu les réservations : on n'en propose plus, on informe.
  if (!statut.ouvert) {
    return (
      <Ecran>
        <Txt v="titre">Réservations suspendues</Txt>
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <Carte style={{ borderColor: 'rgba(245,165,36,0.4)', gap: espace.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
              <Ionicons name="pause-circle" size={22} color={couleurs.attention} />
              <Txt v="corpsFort" couleur={couleurs.attention}>
                Service temporairement fermé
              </Txt>
            </View>
            <Txt v="corps" couleur={couleurs.texteDoux}>
              {statut.message ??
                'Saramaya Transport a suspendu les réservations en ligne pour le moment. Réessayez plus tard — vous pouvez toujours vous présenter à la gare.'}
            </Txt>
          </Carte>
        </Animated.View>
        <Txt v="minuscule" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
          CETTE PAGE SE RÉACTIVERA DÈS LA RÉOUVERTURE
        </Txt>
      </Ecran>
    );
  }

  return (
    <Ecran>
      {indexEtape > 0 ? (
        <EnTeteRetour
          onRetour={etapePrecedente}
          titre="Réserver"
          etiquette={
            <View style={styles.etiquetteEtape}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                {indexEtape + 1}/{ETAPES.length}
              </Txt>
            </View>
          }
        />
      ) : (
        <View>
          <Txt v="titre">Réserver</Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Choisissez votre place, l'app prépare tout pour la gare.
          </Txt>
        </View>
      )}

      <FilAriane
        index={indexEtape}
        onAller={(i) => {
          const cible = ETAPES[i];
          if (cible && i < indexEtape) setEtape(cible.cle);
        }}
      />

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
                    {l.departs.length} départs · {l.distanceKm} km
                  </Txt>
                  <Txt v="petit" couleur={couleurs.marqueVif}>
                    dès {montant(l.tarifs.ORDINAIRE)}
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
          <Section>Choisissez votre départ</Section>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Chaque départ a sa classe : la compagnie fait rouler des cars Ordinaire,
            VIP 1re classe et VIP directe à des horaires différents.
          </Txt>

          {departs.length === 0 ? (
            <Carte>
              <Txt v="corpsFort">Plus de départ aujourd'hui</Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                Tous les départs de la journée sont passés. Choisissez une autre date.
              </Txt>
              <Bouton titre="Changer de date" variante="secondaire" onPress={() => setEtape('DATE')} />
            </Carte>
          ) : null}

          {departs.map((d, i) => (
            <Pressable
              key={d.heure}
              onPress={() => {
                setHeure(d.heure);
                setClasse(d.classe);
                setSiege(null);
                setEtape('SIEGE');
              }}
            >
              <Carte index={i} style={{ gap: espace.sm }}>
                <View style={styles.entre}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.md }}>
                    <Txt v="sousTitre">{d.heure}</Txt>
                    <BadgeClasse classe={d.classe} petit />
                    {d.ajoute ? (
                      <View style={styles.badgeAjoute}>
                        <Txt v="minuscule" couleur={couleurs.succes}>
                          AJOUTÉ
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                  <Txt v="corpsFort" couleur={couleurs.marqueVif}>
                    {montant(ligne.tarifs[d.classe])}
                  </Txt>
                </View>
                <View style={styles.entre}>
                  <Txt v="minuscule" couleur={couleurs.texteFaible}>
                    CONVOCATION {decalerHeure(d.heure, -30)}
                  </Txt>
                  <Txt v="minuscule" couleur={couleurs.texteFaible}>
                    {(PLANS_BUS[d.classe].equipements[0] ?? 'Climatisation').toUpperCase()}
                  </Txt>
                </View>
              </Carte>
            </Pressable>
          ))}

          <NoteDepartsAjoutes ligneId={ligneId} />
        </Animated.View>
      ) : null}

      {etape === 'SIEGE' && ligne && heure ? (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Section>Place souhaitée</Section>
          <EnAttenteDeLaCompagnie {...etatFonction('PLACES_OCCUPEES')} />
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Indiquez la place que vous préférez : elle part avec votre demande à la gare, qui
            l'attribue au moment de l'émission du billet. Les places déjà prises s'afficheront
            une fois l'application connectée au système de la compagnie.
          </Txt>
          <PlanSieges classe={classe} occupes={[]} choisi={siege} onChoisir={setSiege} />
          <Bouton
            titre={siege ? `Continuer avec le siège ${siege}` : 'Choisissez une place'}
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
              <Txt v="sousTitre" couleur={couleurs.marqueVif}>
                {montant(ligne.tarifs[classe])}
              </Txt>
            </View>
          </Carte>

          <Carte>
            <View style={{ flexDirection: 'row', gap: espace.sm }}>
              <Ionicons name="information-circle" size={18} color={couleurs.classique} />
              <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                Votre réservation naît « à payer ». Sur l'écran suivant, réglez par Orange
                Money aux coordonnées de la gare, puis présentez-vous au guichet pour retirer
                votre billet. L'agent n'a rien à vous redemander : tout est déjà là.
              </Txt>
            </View>
          </Carte>

          <Bouton
            titre={enCours ? 'Création…' : 'Créer ma réservation'}
            sousTitre={`${montant(ligne.tarifs[classe])} · à payer par Orange Money`}
            desactive={enCours}
            onPress={creerReservation}
          />
        </Animated.View>
      ) : null}
    </Ecran>
  );
}

/**
 * La grille publiée n'est pas exhaustive, et le dire vaut mieux que de le cacher.
 *
 * En période de forte affluence, la compagnie ajoute des départs qu'elle n'annonce
 * nulle part. Tant qu'elle ne les déclare pas dans son fichier d'état, la seule
 * façon de les connaître reste d'appeler la gare — alors on propose l'appel, avec
 * le vrai numéro de réservation de la ligne concernée.
 */
function NoteDepartsAjoutes({ ligneId }: { ligneId: string | null }) {
  const numeros = ligneId ? (TELEPHONES_RESERVATION[ligneId] ?? []) : [];
  const numero = numeros[0];

  return (
    <Carte style={{ gap: espace.sm }}>
      <View style={{ flexDirection: 'row', gap: espace.sm }}>
        <Ionicons name="information-circle-outline" size={18} color={couleurs.texteFaible} />
        <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
          Aux périodes chargées, Saramaya ajoute des départs qui ne figurent pas dans la
          grille publiée. Ceux que la compagnie signale apparaissent ici marqués{' '}
          <Txt v="minuscule" couleur={couleurs.succes}>
            AJOUTÉ
          </Txt>
          . Pour les autres, la gare reste la source sûre.
        </Txt>
      </View>
      {numero ? (
        <Bouton
          titre={`Appeler la gare · ${numero}`}
          variante="secondaire"
          icone={<Ionicons name="call-outline" size={18} color={couleurs.texteDoux} />}
          onPress={() => Linking.openURL(`tel:${numero.replace(/\s/g, '')}`)}
        />
      ) : null}
    </Carte>
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
                  { backgroundColor: passee || active ? couleurs.marqueVif : 'rgba(255,255,255,0.1)' },
                ]}
              />
              <Txt v="minuscule" couleur={active ? couleurs.marqueVif : couleurs.texteFaible}>
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

/**
 * Ajout d'un ticket papier.
 *
 * La caméra lit le code-barres et en tire le numéro du ticket ; le voyageur
 * confirme ensuite le trajet à partir de son ticket réel — le code-barres seul ne
 * contient pas la ligne, la date ni le siège. Rien n'est deviné.
 */
function PanneauScan({ onFermer }: { onFermer: () => void }) {
  const importer = useApp((e) => e.importerPapier);
  const router = useRouter();
  const [phase, setPhase] = useState<'SCAN' | 'SAISIE'>('SCAN');
  const [reference, setReference] = useState('');
  const [ligneId, setLigneId] = useState(LIGNE_DEFAUT);
  const [dateTicket, setDateTicket] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [heureTicket, setHeureTicket] = useState('16:00');
  const [classeTicket, setClasseTicket] = useState<Classe>('ORDINAIRE');
  const [siegeTicket, setSiegeTicket] = useState('');
  const [montantTicket, setMontantTicket] = useState('');
  const [enCours, setEnCours] = useState(false);

  const ligne = ligneParId(ligneId);

  const importerTicket = async () => {
    if (!reference.trim() || enCours) return;
    setEnCours(true);
    const r = await importer({
      reference: reference.trim(),
      ligneId,
      date: dateTicket,
      heure: heureTicket,
      classe: classeTicket,
      siege: siegeTicket ? Number(siegeTicket.replace(/\D/g, '')) : null,
      montant: montantTicket ? Number(montantTicket.replace(/\D/g, '')) : ligne?.tarifs[classeTicket] ?? 0,
    });
    setEnCours(false);
    router.replace(`/billet/${r.id}`);
  };

  /**
   * Retour depuis la saisie : on revient au scan plutôt que de tout fermer. Les
   * champs déjà corrigés à la main survivent, et une fausse manœuvre ne coûte pas
   * un second passage devant la caméra.
   */
  const retour = useCallback(() => {
    if (phase === 'SAISIE') setPhase('SCAN');
    else onFermer();
  }, [phase, onFermer]);

  useRetourMateriel(true, retour);

  return (
    <Ecran>
      <EnTeteRetour
        onRetour={retour}
        titre="Ajouter un ticket"
        icone={phase === 'SAISIE' ? 'chevron-back' : 'close'}
      />

      {phase === 'SCAN' ? (
        <>
          <Carte>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Votre ticket papier porte un code-barres. Scannez-le pour récupérer son numéro,
              puis confirmez le trajet — il rejoindra vos voyages, sans que la compagnie ait
              rien à faire.
            </Txt>
          </Carte>
          <ScannerCamera
            onScan={(valeur) => {
              setReference(valeur.replace(/\s/g, ''));
              setPhase('SAISIE');
            }}
            onSaisieManuelle={() => setPhase('SAISIE')}
          />
        </>
      ) : (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Section>Les informations de votre ticket</Section>
          <Carte style={{ gap: espace.md }}>
            <SaisieTicket libelle="N° DU TICKET" valeur={reference} onChange={setReference} placeholder="66456" clavier="number-pad" />
          </Carte>

          <Section>Trajet</Section>
          {LIGNES.map((l) => (
            <Pressable key={l.id} onPress={() => setLigneId(l.id)}>
              <View style={[styles.optionLigne, l.id === ligneId && styles.optionLigneActive]}>
                <Txt v="corpsFort">
                  {l.origine} → {l.destination}
                </Txt>
                {l.id === ligneId ? (
                  <Ionicons name="checkmark-circle" size={18} color={couleurs.marqueVif} />
                ) : null}
              </View>
            </Pressable>
          ))}

          <Section>Détails</Section>
          <Carte style={{ gap: espace.md }}>
            <SaisieTicket libelle="DATE (AAAA-MM-JJ)" valeur={dateTicket} onChange={setDateTicket} placeholder="2026-08-06" />
            <Trait />
            <SaisieTicket libelle="HEURE (HH:MM)" valeur={heureTicket} onChange={setHeureTicket} placeholder="16:00" />
            <Trait />
            <View style={styles.selecteurClasse}>
              {(['ORDINAIRE', 'VIP_1RE', 'VIP_DIRECTE'] as Classe[]).map((c) => (
                <Pressable key={c} style={{ flex: 1 }} onPress={() => setClasseTicket(c)}>
                  <View style={[styles.optionClasse, classeTicket === c && styles.optionClasseActive]}>
                    <BadgeClasse classe={c} petit />
                  </View>
                </Pressable>
              ))}
            </View>
            <Trait />
            <SaisieTicket libelle="SIÈGE (facultatif)" valeur={siegeTicket} onChange={setSiegeTicket} placeholder="93" clavier="number-pad" />
            <Trait />
            <SaisieTicket
              libelle={`TARIF (${montant(ligne?.tarifs[classeTicket] ?? 0)} par défaut)`}
              valeur={montantTicket}
              onChange={setMontantTicket}
              placeholder={String(ligne?.tarifs[classeTicket] ?? '')}
              clavier="number-pad"
            />
          </Carte>

          <Bouton
            titre={enCours ? 'Ajout…' : 'Ajouter à mes voyages'}
            desactive={!reference.trim() || enCours}
            onPress={importerTicket}
          />
          <Bouton titre="Rescanner" variante="fantome" onPress={() => setPhase('SCAN')} />
        </Animated.View>
      )}
    </Ecran>
  );
}

function SaisieTicket({
  libelle,
  valeur,
  onChange,
  placeholder,
  clavier = 'default',
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clavier?: 'default' | 'number-pad';
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
        autoCapitalize="none"
        style={styles.saisieTicket}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  etiquetteEtape: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surfaceHaute,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeAjoute: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: 'rgba(46,204,143,0.45)',
    backgroundColor: 'rgba(46,204,143,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saisieTicket: { color: '#F7F2FA', fontSize: 16, fontWeight: '600', paddingVertical: 6 },
  optionLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#16101C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionLigneActive: { borderColor: '#F0362F' },
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
  jourActif: { backgroundColor: couleurs.marqueProfond, borderColor: couleurs.marqueVif },
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
  optionClasseActive: { borderColor: couleurs.marqueVif, backgroundColor: 'rgba(214,33,111,0.12)' },
  montantAPayer: {
    borderRadius: rayon.xl,
    padding: espace.xl,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(240,53,127,0.3)',
  },
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
