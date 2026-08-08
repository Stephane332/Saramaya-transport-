import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  BadgeClasse,
  BadgeStatut,
  Carte,
  Ecran,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { ligneParId } from '../../src/data/reseau';
import { montant } from '../../src/lib/format';
import { useApp } from '../../src/store/useApp';
import { couleurs, espace, rayon } from '../../src/theme';

type Filtre = 'TOUS' | 'A_VENIR' | 'EFFECTUES';

export default function Voyages() {
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const [filtre, setFiltre] = useState<Filtre>('TOUS');

  const maintenant = new Date();
  const liste = useMemo(() => {
    const trie = [...reservations].sort((a, b) =>
      `${b.date}T${b.heure}`.localeCompare(`${a.date}T${a.heure}`),
    );
    if (filtre === 'A_VENIR') {
      return trie.filter(
        (r) =>
          new Date(`${r.date}T${r.heure}:00`) >= maintenant &&
          !['ANNULEE', 'EMBARQUE'].includes(r.statut),
      );
    }
    if (filtre === 'EFFECTUES') return trie.filter((r) => r.statut === 'EMBARQUE');
    return trie;
  }, [reservations, filtre]);

  const depense = useMemo(
    () =>
      reservations
        .filter((r) => r.statut === 'EMBARQUE')
        .reduce((t, r) => t + r.montant, 0),
    [reservations],
  );

  return (
    <Ecran>
      <View>
        <Txt v="titre">Mes voyages</Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Tout votre historique, y compris les tickets papier scannés.
        </Txt>
      </View>

      <Carte>
        <View style={styles.entre}>
          <View>
            <Txt v="minuscule" couleur={couleurs.texteFaible}>
              TOTAL DÉPENSÉ
            </Txt>
            <Txt v="chiffres" couleur={couleurs.marqueVif}>
              {montant(depense)}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="minuscule" couleur={couleurs.texteFaible}>
              VOYAGES
            </Txt>
            <Txt v="chiffres">
              {reservations.filter((r) => r.statut === 'EMBARQUE').length}
            </Txt>
          </View>
        </View>
      </Carte>

      <View style={styles.filtres}>
        {(
          [
            ['TOUS', 'Tous'],
            ['A_VENIR', 'À venir'],
            ['EFFECTUES', 'Effectués'],
          ] as const
        ).map(([cle, libelle]) => (
          <Pressable key={cle} style={{ flex: 1 }} onPress={() => setFiltre(cle)}>
            <View style={[styles.filtre, filtre === cle && styles.filtreActif]}>
              <Txt v="petit" couleur={filtre === cle ? '#fff' : couleurs.texteFaible}>
                {libelle}
              </Txt>
            </View>
          </Pressable>
        ))}
      </View>

      {liste.length === 0 ? (
        <Carte>
          <Txt v="corpsFort">Rien à afficher</Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Vos voyages apparaîtront ici.
          </Txt>
        </Carte>
      ) : null}

      {liste.map((r, i) => {
        const ligne = ligneParId(r.ligneId);
        return (
          <Pressable key={r.id} onPress={() => router.push(`/billet/${r.id}`)}>
            <Carte index={Math.min(i, 8)} style={{ gap: espace.sm }}>
              <View style={styles.entre}>
                <Txt v="corpsFort">
                  {ligne?.origine} → {ligne?.destination}
                </Txt>
                <BadgeStatut statut={r.statut} />
              </View>
              <View style={styles.entre}>
                <Txt v="petit" couleur={couleurs.texteFaible}>
                  {format(parseISO(r.date), 'd MMM yyyy', { locale: fr })} · {r.heure}
                  {r.siege ? ` · siège ${r.siege}` : ''}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
                  <BadgeClasse classe={r.classe} petit />
                  <Txt v="petit">{montant(r.montant)}</Txt>
                </View>
              </View>
              {r.importeDuPapier ? (
                <>
                  <Trait />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="document-text-outline" size={13} color={couleurs.texteFaible} />
                    <Txt v="minuscule" couleur={couleurs.texteFaible}>
                      IMPORTÉ DEPUIS UN TICKET PAPIER · N° {r.reference}
                    </Txt>
                  </View>
                </>
              ) : null}
            </Carte>
          </Pressable>
        );
      })}

      <Section>Refaire un trajet</Section>
      <Animated.View entering={FadeIn} style={{ gap: espace.md }}>
        {[...new Set(reservations.map((r) => r.ligneId))].slice(0, 3).map((ligneId) => {
          const l = ligneParId(ligneId);
          if (!l) return null;
          return (
            <Pressable key={ligneId} onPress={() => router.push('/reserver')}>
              <View style={styles.raccourci}>
                <Ionicons name="repeat" size={18} color={couleurs.marqueVif} />
                <Txt v="corpsFort" style={{ flex: 1 }}>
                  {l.origine} → {l.destination}
                </Txt>
                <Txt v="petit" couleur={couleurs.marqueVif}>
                  {montant(l.tarifs.ORDINAIRE)}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filtres: { flexDirection: 'row', gap: espace.sm },
  filtre: {
    alignItems: 'center',
    paddingVertical: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  filtreActif: { backgroundColor: couleurs.marqueProfond, borderColor: couleurs.marqueVif },
  raccourci: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    padding: espace.md,
    borderRadius: rayon.lg,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
});
