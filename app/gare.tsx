/**
 * Écran gare — horizon 2.
 *
 * C'est la réponse au vrai problème de la compagnie : aujourd'hui, un agent
 * appelle chaque passager avant la convocation pour savoir qui a payé et qui
 * viendra. Ici, il ne surveille qu'une liste, et n'appelle que les rares
 * personnes dont la notification n'est pas passée.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Bouton, Carte, Ecran, Jauge, Section, Trait, Txt } from '../src/components/base';
import { LIBELLES_CLASSE_COURT, MINUTES_LIBERATION_PLACE, ligneParId } from '../src/data/reseau';
import { ETIQUETTES_ETAT, manifesteDemo, type PassagerManifeste } from '../src/data/passagers';
import { montant, telephone } from '../src/lib/format';
import { couleurs, degrades, espace, rayon } from '../src/theme';

const LIGNE_DEMO = 'ligne-ouahigouya-ouaga';

export default function EcranGare() {
  const router = useRouter();
  const ligne = ligneParId(LIGNE_DEMO)!;
  const [heure, setHeure] = useState(ligne.departs[3]?.heure ?? ligne.departs[0].heure);
  const [filtre, setFiltre] = useState<'TOUS' | 'A_TRAITER'>('TOUS');

  const classeDuDepart =
    ligne.departs.find((d) => d.heure === heure)?.classe ?? 'ORDINAIRE';
  const passagers = useMemo(
    () => manifesteDemo(classeDuDepart, ligne.tarifs[classeDuDepart]),
    [ligne, classeDuDepart],
  );

  const compte = useMemo(() => {
    const c = { CONFIRME: 0, PAYE_NON_CONFIRME: 0, SANS_REPONSE: 0, ANNULE: 0, INJOIGNABLE: 0, EMBARQUE: 0 };
    passagers.forEach((p) => (c[p.etat] += 1));
    return c;
  }, [passagers]);

  const aTraiter = passagers.filter((p) =>
    ['INJOIGNABLE', 'SANS_REPONSE', 'ANNULE'].includes(p.etat),
  );
  const appelsNecessaires = compte.INJOIGNABLE;
  const repondus = compte.CONFIRME + compte.ANNULE;
  const affiches = filtre === 'TOUS' ? passagers : aTraiter;
  const remboursements = passagers.filter((p) => p.etat === 'ANNULE');

  return (
    <Ecran>
      <View style={styles.entre}>
        <Pressable onPress={() => router.back()} style={styles.retour}>
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
        <View style={styles.etiquetteDemo}>
          <Txt v="minuscule" couleur={couleurs.attention}>
            APERÇU — CÔTÉ GARE
          </Txt>
        </View>
      </View>

      <View>
        <Txt v="titre">Départs du jour</Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Gare de Ouahigouya · {format(new Date(), 'EEEE d MMMM', { locale: fr })}
        </Txt>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          {ligne.departs.map((d) => (
            <Pressable key={d.heure} onPress={() => setHeure(d.heure)}>
              <View style={[styles.creneau, d.heure === heure && styles.creneauActif]}>
                <Txt v="corpsFort" couleur={d.heure === heure ? '#fff' : couleurs.texteDoux}>
                  {d.heure}
                </Txt>
                <Txt
                  v="minuscule"
                  couleur={d.heure === heure ? 'rgba(255,255,255,0.75)' : couleurs.texteFaible}
                >
                  {LIBELLES_CLASSE_COURT[d.classe]}
                </Txt>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Le chiffre qui porte tout l'argument. */}
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <LinearGradient
          colors={['rgba(46,204,143,0.20)', 'rgba(23,145,106,0.05)']}
          style={styles.bandeauGain}
        >
          <Ionicons name="call-outline" size={22} color={couleurs.succes} />
          <View style={{ flex: 1 }}>
            <Txt v="sousTitre" couleur={couleurs.succes}>
              {appelsNecessaires} appel{appelsNecessaires > 1 ? 's' : ''} à passer
            </Txt>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              au lieu de {passagers.length} — {repondus} voyageurs ont répondu dans l'application
            </Txt>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.grilleCompteurs}>
        <Compteur valeur={compte.CONFIRME} libelle="confirmés" couleur={couleurs.succes} />
        <Compteur valeur={compte.PAYE_NON_CONFIRME} libelle="payés" couleur={couleurs.classique} />
        <Compteur valeur={compte.SANS_REPONSE} libelle="en attente" couleur={couleurs.attention} />
        <Compteur valeur={compte.ANNULE} libelle="annulés" couleur={couleurs.danger} />
      </View>

      <Carte>
        <View style={styles.entre}>
          <Txt v="corpsFort">Remplissage</Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            {passagers.length - compte.ANNULE} / {passagers.length} places
          </Txt>
        </View>
        <Jauge valeur={(passagers.length - compte.ANNULE) / passagers.length} couleur={couleurs.succes} />
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Les {compte.ANNULE} places annulées sont déjà proposées à la liste d'attente. À{' '}
          {MINUTES_LIBERATION_PLACE} minutes du départ, les absents seront remplacés.
        </Txt>
      </Carte>

      {remboursements.length > 0 ? (
        <>
          <Section>À traiter en caisse</Section>
          <Carte>
            {remboursements.map((p, i) => (
              <View key={p.nom}>
                {i > 0 ? <Trait /> : null}
                <View style={[styles.entre, { paddingVertical: espace.sm }]}>
                  <View>
                    <Txt v="corpsFort">{p.nom}</Txt>
                    <Txt v="minuscule" couleur={couleurs.texteFaible}>
                      SIÈGE {p.siege} · ANNULÉ À TEMPS
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt v="corpsFort" couleur={couleurs.attention}>
                      {montant(p.montant)}
                    </Txt>
                    <Txt v="minuscule" couleur={couleurs.texteFaible}>
                      À REMBOURSER
                    </Txt>
                  </View>
                </View>
              </View>
            ))}
          </Carte>
        </>
      ) : null}

      <View style={styles.entre}>
        <Section>Manifeste</Section>
        <View style={styles.bascule}>
          {(['TOUS', 'A_TRAITER'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFiltre(f)}>
              <View style={[styles.optionBascule, filtre === f && styles.optionBasculeActive]}>
                <Txt v="minuscule" couleur={filtre === f ? '#fff' : couleurs.texteFaible}>
                  {f === 'TOUS' ? 'TOUS' : `À TRAITER (${aTraiter.length})`}
                </Txt>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {affiches.map((p, i) => (
        <RangeePassager key={p.nom} passager={p} index={i} />
      ))}

      <Bouton
        titre="Scanner un billet à l'embarquement"
        variante="secondaire"
        icone={<Ionicons name="scan" size={18} color={couleurs.texte} />}
      />
    </Ecran>
  );
}

function Compteur({ valeur, libelle, couleur }: { valeur: number; libelle: string; couleur: string }) {
  return (
    <View style={[styles.compteur, { borderColor: `${couleur}44` }]}>
      <Txt v="sousTitre" couleur={couleur}>
        {valeur}
      </Txt>
      <Txt v="minuscule" couleur={couleurs.texteFaible} numberOfLines={1}>
        {libelle.toUpperCase()}
      </Txt>
    </View>
  );
}

function RangeePassager({ passager, index }: { passager: PassagerManifeste; index: number }) {
  const e = ETIQUETTES_ETAT[passager.etat];
  const urgent = passager.etat === 'INJOIGNABLE';
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, 12) * 35)}>
      <View style={[styles.rangeePassager, urgent && styles.rangeeUrgente]}>
        <View style={[styles.siegeRond, { borderColor: `${e.couleur}66` }]}>
          <Txt v="minuscule" couleur={e.couleur}>
            {passager.siege}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="corpsFort" numberOfLines={1}>
            {passager.nom}
          </Txt>
          <Txt v="minuscule" couleur={couleurs.texteFaible}>
            {telephone(passager.telephone)}
            {!passager.notificationDelivree ? ' · NOTIFICATION NON DÉLIVRÉE' : ''}
          </Txt>
        </View>
        <View style={[styles.etat, { backgroundColor: `${e.couleur}1E`, borderColor: `${e.couleur}55` }]}>
          <Ionicons name={e.icone as never} size={12} color={e.couleur} />
          <Txt v="minuscule" couleur={e.couleur}>
            {e.texte}
          </Txt>
        </View>
      </View>
    </Animated.View>
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
  etiquetteDemo: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.4)',
    backgroundColor: 'rgba(245,165,36,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  creneau: {
    paddingVertical: espace.md,
    paddingHorizontal: espace.lg,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    gap: 2,
  },
  creneauActif: { backgroundColor: couleurs.marqueProfond, borderColor: couleurs.marqueVif },
  bandeauGain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    padding: espace.lg,
    borderRadius: rayon.xl,
    borderWidth: 1,
    borderColor: 'rgba(46,204,143,0.35)',
  },
  grilleCompteurs: { flexDirection: 'row', gap: espace.sm },
  compteur: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
  },
  bascule: { flexDirection: 'row', gap: 4 },
  optionBascule: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rayon.rond,
    backgroundColor: couleurs.surfaceHaute,
  },
  optionBasculeActive: { backgroundColor: couleurs.marqueProfond },
  rangeePassager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    paddingVertical: espace.md,
    paddingHorizontal: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  rangeeUrgente: { borderColor: 'rgba(240,78,55,0.45)', backgroundColor: 'rgba(240,78,55,0.07)' },
  siegeRond: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  etat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: rayon.rond,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
