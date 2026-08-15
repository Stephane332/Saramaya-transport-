import { differenceInDays, differenceInMinutes, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/** Montants en francs CFA, séparés par espace insécable : « 3 500 F ». */
export function montant(valeur: number): string {
  return `${valeur.toLocaleString('fr-FR').replace(/ |,/g, ' ')} F`;
}

export function jourCourt(iso: string): string {
  return format(parseISO(iso), 'EEE d MMM', { locale: fr });
}

export function jourLong(iso: string): string {
  return format(parseISO(iso), 'EEEE d MMMM yyyy', { locale: fr });
}

export function jourEtMois(iso: string): string {
  return format(parseISO(iso), 'd MMMM', { locale: fr });
}

/** Téléphone burkinabè : 66 79 80 31. */
export function telephone(numero: string): string {
  const chiffres = numero.replace(/\D/g, '');
  return chiffres.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export function initiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

/**
 * Un prénom tel qu'on l'adresse à quelqu'un.
 *
 * Les prénoms viennent de la CNIB, où tout est en capitales — et c'est ainsi
 * qu'ils doivent rester dans le profil, puisque c'est cette forme que l'agent
 * compare à la carte. Mais « Bonjour ANGE » sur l'écran d'accueil crie ; on
 * n'accueille pas quelqu'un en majuscules. La donnée reste fidèle à la carte, seul
 * l'affichage s'adoucit.
 *
 * Les prénoms composés gardent leur capitale : « JEAN-PAUL » devient « Jean-Paul ».
 */
export function prenomAffiche(prenom: string): string {
  return prenom
    .toLocaleLowerCase('fr')
    .replace(/(^|[\s'\-])([\p{L}])/gu, (_, avant: string, lettre: string) =>
      `${avant}${lettre.toLocaleUpperCase('fr')}`,
    );
}

/** « dans 2 h 15 », « dans 34 min », « départ passé ». */
export function compteARebours(cible: Date, maintenant: Date = new Date()): string {
  const minutes = differenceInMinutes(cible, maintenant);
  if (minutes < 0) return 'départ passé';
  if (minutes < 1) return "c'est maintenant";
  if (minutes < 60) return `dans ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures < 24) return reste === 0 ? `dans ${heures} h` : `dans ${heures} h ${reste}`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? 'demain' : `dans ${jours} jours`;
}

/** Jours restants avant l'expiration d'un billet. */
export function joursAvantExpiration(expireLe: string, maintenant: Date = new Date()): number {
  return differenceInDays(parseISO(expireLe), maintenant);
}

export function dureeTrajet(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, '0')}`;
}

/**
 * Décale une heure « HH:mm » d'un nombre de minutes.
 *
 * Une heure mal formée n'a rien d'hypothétique : elle peut venir d'un ticket
 * papier scanné de travers ou d'un champ corrigé à la main. Plutôt que de
 * produire « NaN:NaN » sur le billet d'un voyageur, on renvoie l'heure d'origine
 * telle quelle — visiblement inchangée, donc repérable, mais jamais absurde.
 */
export function decalerHeure(heure: string, minutes: number): string {
  const [hTexte, mTexte] = heure.split(':');
  const h = Number(hTexte);
  const m = Number(mTexte);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return heure;

  const total = (((h * 60 + m + minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}


/** Vrai si la date ISO (AAAA-MM-JJ) est aujourd'hui. */
export function estAujourdhui(dateIso: string, maintenant = new Date()): boolean {
  return dateIso === format(maintenant, 'yyyy-MM-dd');
}

/**
 * Filtre les départs encore atteignables : pour aujourd'hui, on retire ceux dont
 * l'heure est déjà passée. C'est le temps réel de base — inutile de proposer un
 * bus de 8 h quand il est 9 h.
 */
export function departsAVenir<T extends { heure: string }>(
  departs: T[],
  dateIso: string,
  maintenant = new Date(),
): T[] {
  if (!estAujourdhui(dateIso, maintenant)) return departs;
  const hhmm = format(maintenant, 'HH:mm');
  return departs.filter((d) => d.heure > hhmm);
}
