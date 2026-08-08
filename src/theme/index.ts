/**
 * Identité visuelle dérivée du ticket papier Saramaya Transport :
 * le magenta de l'en-tête et le rouge-orangé du logo, posés sur un fond
 * très sombre pour faire ressortir les animations.
 */

export const couleurs = {
  // Fonds
  fond: '#0A070E',
  fondProfond: '#06040A',
  surface: '#16101C',
  surfaceHaute: '#1F1728',
  surfaceBasse: '#110C17',

  // Marque
  magenta: '#D6216F',
  magentaVif: '#F0357F',
  magentaProfond: '#8E1149',
  orange: '#F04E37',
  orangeProfond: '#B93018',

  // Classes de service
  vip: '#E8B54B',
  vipProfond: '#8A6410',
  classique: '#5B8DEF',

  // États
  succes: '#2ECC8F',
  attention: '#F5A524',
  danger: '#F2545B',
  neutre: '#7C7188',

  // Texte
  texte: '#F7F2FA',
  texteDoux: '#C9BFD4',
  texteFaible: '#8C8098',
  texteInverse: '#0A070E',

  // Traits
  bordure: 'rgba(255,255,255,0.08)',
  bordureForte: 'rgba(255,255,255,0.16)',
  voile: 'rgba(10,7,14,0.72)',
} as const;

export const degrades = {
  marque: ['#F0357F', '#8E1149'] as const,
  marqueDouce: ['rgba(240,53,127,0.24)', 'rgba(170,25,88,0.06)', 'rgba(10,7,14,0)'] as const,
  vip: ['#F0CE7A', '#B98A1E'] as const,
  classique: ['#7BA5F5', '#3A63BC'] as const,
  nuit: ['#1B1024', '#0A070E'] as const,
  chaleur: ['#F04E37', '#D6216F'] as const,
  succes: ['#3DE3A3', '#17916A'] as const,
};

export const espace = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const rayon = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  rond: 999,
} as const;

export const typo = {
  geant: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.2 },
  titre: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.7 },
  sousTitre: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  section: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 1.4 },
  corps: { fontSize: 15, fontWeight: '500' as const },
  corpsFort: { fontSize: 15, fontWeight: '700' as const },
  petit: { fontSize: 13, fontWeight: '500' as const },
  minuscule: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6 },
  chiffres: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
} as const;

export const ombre = {
  douce: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  marquee: {
    shadowColor: couleurs.magenta,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const;

/** Durées d'animation, en millisecondes. */
export const duree = {
  eclair: 140,
  rapide: 240,
  normal: 380,
  lent: 620,
  tresLent: 1100,
} as const;
