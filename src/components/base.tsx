import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, degrades, espace, ombre, rayon, typo } from '../theme';
import type { Classe } from '../types';

const PressableAnime = Animated.createAnimatedComponent(Pressable);

/* ── Écran ─────────────────────────────────────────────────────────────────── */

export function Ecran({
  children,
  defilant = true,
  padHaut = true,
}: {
  children: ReactNode;
  defilant?: boolean;
  padHaut?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const contenu = (
    <View
      style={{
        // Sans défilement, le contenu occupe toute la hauteur pour pouvoir se centrer.
        flex: defilant ? undefined : 1,
        paddingTop: padHaut ? insets.top + espace.lg : 0,
        paddingBottom: insets.bottom + (defilant ? 96 : espace.lg),
        paddingHorizontal: espace.lg,
        gap: espace.lg,
      }}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.ecran}>
      <LinearGradient
        colors={['#22100F', couleurs.fond, couleurs.fondProfond]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Halo />
      {defilant ? (
        <ScrollView showsVerticalScrollIndicator={false}>{contenu}</ScrollView>
      ) : (
        contenu
      )}
    </View>
  );
}

/** Lueur magenta diffuse en haut d'écran — la signature visuelle de la marque. */
function Halo() {
  return (
    <LinearGradient
      colors={degrades.marqueDouce}
      locations={[0, 0.55, 1]}
      style={{ position: 'absolute', top: -140, left: -60, right: -60, height: 620 }}
      start={{ x: 0.25, y: 0 }}
      end={{ x: 0.75, y: 1 }}
    />
  );
}

/* ── Texte ─────────────────────────────────────────────────────────────────── */

type VariantesTexte = keyof typeof typo;

export function Txt({
  children,
  v = 'corps',
  couleur = couleurs.texte,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  v?: VariantesTexte;
  couleur?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[typo[v], { color: couleur }, style]}>
      {children}
    </Text>
  );
}

/**
 * En-tête avec flèche de retour.
 *
 * Le même geste au même endroit sur tous les écrans : sans repère constant, on
 * cherche la sortie, et chercher la sortie dans une file d'attente à la gare suffit
 * à faire refermer l'application. La zone tactile fait 44 points, le minimum pour
 * être atteinte du pouce sans viser.
 */
export function EnTeteRetour({
  onRetour,
  titre,
  etiquette,
  icone = 'chevron-back',
}: {
  onRetour: () => void;
  titre?: string;
  /** Pastille à droite, par exemple « ÉTAPE 2 SUR 5 ». */
  etiquette?: ReactNode;
  icone?: 'chevron-back' | 'close';
}) {
  return (
    <View style={styles.enTeteRetour}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRetour();
        }}
        // Élargit la cible tactile au-delà du dessin, sans décaler la mise en page.
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        style={styles.boutonRetour}
      >
        <Ionicons name={icone} size={22} color={couleurs.texte} />
      </Pressable>

      {titre ? (
        <Text style={[typo.sousTitre, { color: couleurs.texte, flex: 1 }]} numberOfLines={1}>
          {titre}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {etiquette}
    </View>
  );
}

/**
 * Fonction qui attend l'ouverture du système de la compagnie.
 *
 * On la montre plutôt que de la cacher : le voyageur comprend ce que l'application
 * fera, et ce qui manque pour cela. Rien n'est simulé — le bloc dit ce qui se passe
 * en attendant, et disparaîtra de lui-même le jour de la connexion.
 */
export function EnAttenteDeLaCompagnie({
  promesse,
  raison,
}: {
  promesse: string;
  raison: string;
}) {
  return (
    <View style={styles.attente}>
      <View style={styles.enteteAttente}>
        <Ionicons name="time-outline" size={16} color={couleurs.attention} />
        <Text style={[typo.minuscule, { color: couleurs.attention }]}>
          INDISPONIBLE POUR LE MOMENT
        </Text>
      </View>
      <Text style={[typo.petit, { color: couleurs.texteDoux }]}>{promesse}</Text>
      <Text style={[typo.minuscule, { color: couleurs.texteFaible }]}>{raison}</Text>
    </View>
  );
}

/**
 * Échec d'une action, montré à l'utilisateur.
 *
 * Une action qui rate doit le dire là où elle a été lancée. Renvoyer quelqu'un vers
 * un écran d'erreur générique, ou pire ne rien afficher, le laisse retoucher le
 * bouton sans comprendre.
 */
export function MessageErreur({ texte }: { texte: string | null }) {
  if (!texte) return null;
  return (
    <View style={styles.messageErreur}>
      <Ionicons name="alert-circle" size={18} color={couleurs.danger} />
      <Text style={[typo.petit, { color: couleurs.texteDoux, flex: 1 }]}>{texte}</Text>
    </View>
  );
}

export function Section({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.enteteSection}>
      <Txt v="section" couleur={couleurs.texteFaible}>
        {String(children).toUpperCase()}
      </Txt>
      {action}
    </View>
  );
}

/* ── Carte ─────────────────────────────────────────────────────────────────── */

export function Carte({
  children,
  style,
  surbrillance = false,
  index = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  surbrillance?: boolean;
  index?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(18)}
      style={[
        styles.carte,
        surbrillance && { borderColor: 'rgba(214,33,111,0.45)' },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ── Bouton ────────────────────────────────────────────────────────────────── */

export function Bouton({
  titre,
  sousTitre,
  onPress,
  variante = 'principal',
  icone,
  desactive = false,
  pleineLargeur = true,
}: {
  titre: string;
  sousTitre?: string;
  onPress?: () => void;
  variante?: 'principal' | 'secondaire' | 'fantome' | 'danger' | 'succes';
  icone?: ReactNode;
  desactive?: boolean;
  pleineLargeur?: boolean;
}) {
  const echelle = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

  const presser = () => {
    if (desactive) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const corps = (
    <View style={styles.contenuBouton}>
      {icone}
      <View>
        <Text
          style={[
            typo.corpsFort,
            { color: variante === 'fantome' ? couleurs.texteDoux : couleurs.texte, fontSize: 16 },
          ]}
        >
          {titre}
        </Text>
        {sousTitre ? (
          <Text style={[typo.petit, { color: 'rgba(255,255,255,0.72)', marginTop: 2 }]}>
            {sousTitre}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const degrade =
    variante === 'principal'
      ? degrades.marque
      : variante === 'danger'
        ? (['#F2545B', '#A81E33'] as const)
        : variante === 'succes'
          ? degrades.succes
          : null;

  return (
    <PressableAnime
      onPress={presser}
      onPressIn={() => (echelle.value = withSpring(0.96, { damping: 16 }))}
      onPressOut={() => (echelle.value = withSpring(1, { damping: 12 }))}
      style={[
        anim,
        styles.bouton,
        pleineLargeur && { alignSelf: 'stretch' },
        desactive && { opacity: 0.4 },
        variante === 'secondaire' && styles.boutonSecondaire,
        variante === 'fantome' && styles.boutonFantome,
        degrade ? ombre.marquee : null,
      ]}
    >
      {degrade ? (
        <LinearGradient colors={degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.remplissage}>
          {corps}
        </LinearGradient>
      ) : (
        corps
      )}
    </PressableAnime>
  );
}

/* ── Pastilles ─────────────────────────────────────────────────────────────── */

const HABILLAGE_CLASSE: Record<
  Classe,
  { degrade: readonly [string, string]; encre: string; libelle: string }
> = {
  ORDINAIRE: { degrade: degrades.classique, encre: '#0B1830', libelle: 'ORDINAIRE' },
  VIP_1RE: { degrade: degrades.vip, encre: '#3B2A05', libelle: 'VIP 1RE' },
  VIP_DIRECTE: { degrade: degrades.vipDirecte, encre: '#2B1503', libelle: 'VIP DIRECTE' },
};

export function BadgeClasse({ classe, petit = false }: { classe: Classe; petit?: boolean }) {
  const h = HABILLAGE_CLASSE[classe];
  return (
    <LinearGradient
      colors={h.degrade}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, petit && { paddingVertical: 3, paddingHorizontal: 8 }]}
    >
      <Text
        style={[
          typo.minuscule,
          { color: h.encre, fontSize: petit ? 9 : 11, fontWeight: '800' },
        ]}
      >
        {h.libelle}
      </Text>
    </LinearGradient>
  );
}

const LIBELLES_STATUT: Record<string, { texte: string; couleur: string }> = {
  OPTION: { texte: 'À payer', couleur: couleurs.attention },
  PAYEE: { texte: 'Payé', couleur: couleurs.succes },
  CONFIRMEE: { texte: 'Confirmé', couleur: couleurs.succes },
  SANS_REPONSE: { texte: 'Sans réponse', couleur: couleurs.attention },
  REPORTEE: { texte: 'Reporté', couleur: couleurs.classique },
  ANNULEE: { texte: 'Annulé', couleur: couleurs.danger },
  EMBARQUE: { texte: 'Effectué', couleur: couleurs.neutre },
  NO_SHOW: { texte: 'Absent', couleur: couleurs.danger },
};

export function BadgeStatut({ statut }: { statut: string }) {
  const s = LIBELLES_STATUT[statut] ?? { texte: statut, couleur: couleurs.neutre };
  return (
    <View style={[styles.pastille, { backgroundColor: `${s.couleur}22`, borderColor: `${s.couleur}55` }]}>
      <View style={[styles.point, { backgroundColor: s.couleur }]} />
      <Text style={[typo.minuscule, { color: s.couleur }]}>{s.texte.toUpperCase()}</Text>
    </View>
  );
}

/* ── Divers ────────────────────────────────────────────────────────────────── */

export function Trait() {
  return <View style={styles.trait} />;
}

export function Rangee({
  gauche,
  droite,
  fort = false,
}: {
  gauche: string;
  droite: string;
  fort?: boolean;
}) {
  return (
    <View style={styles.rangee}>
      <Txt v="petit" couleur={couleurs.texteFaible}>
        {gauche}
      </Txt>
      <Txt v={fort ? 'corpsFort' : 'petit'} couleur={fort ? couleurs.texte : couleurs.texteDoux}>
        {droite}
      </Txt>
    </View>
  );
}

/** Barre de progression animée, utilisée pour le remplissage des bus. */
export function Jauge({ valeur, couleur = couleurs.marque }: { valeur: number; couleur?: string }) {
  const largeur = useSharedValue(0);
  largeur.value = withTiming(Math.min(1, Math.max(0, valeur)), { duration: 900 });
  const anim = useAnimatedStyle(() => ({ width: `${largeur.value * 100}%` }));
  return (
    <View style={styles.jauge}>
      <Animated.View style={[styles.jaugeRemplie, { backgroundColor: couleur }, anim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  messageErreur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.sm,
    padding: espace.md,
    borderRadius: rayon.md,
    borderWidth: 1,
    borderColor: 'rgba(242,84,91,0.4)',
    backgroundColor: 'rgba(242,84,91,0.08)',
  },
  attente: {
    gap: 6,
    padding: espace.md,
    borderRadius: rayon.md,
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.3)',
    backgroundColor: 'rgba(245,165,36,0.07)',
  },
  enteteAttente: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  enTeteRetour: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
  },
  boutonRetour: {
    width: 44,
    height: 44,
    borderRadius: rayon.rond,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  enteteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -espace.sm,
    marginTop: espace.sm,
  },
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.lg,
    gap: espace.md,
    ...ombre.douce,
  },
  bouton: { borderRadius: rayon.lg, overflow: 'hidden' },
  boutonSecondaire: {
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
  },
  boutonFantome: { backgroundColor: 'transparent' },
  remplissage: { width: '100%' },
  contenuBouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.sm,
    paddingVertical: espace.lg - 2,
    paddingHorizontal: espace.lg,
  },
  badge: { borderRadius: rayon.rond, paddingHorizontal: 10, paddingVertical: 4 },
  pastille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: rayon.rond,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  point: { width: 6, height: 6, borderRadius: 3 },
  trait: { height: 1, backgroundColor: couleurs.bordure },
  rangee: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jauge: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  jaugeRemplie: { height: '100%', borderRadius: 3 },
});
