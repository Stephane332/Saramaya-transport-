import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { CodeBarres } from '../../src/components/CodeBarres';
import { CarteSpatiale } from '../../src/components/CarteSpatiale';
import { LogoSaramaya } from '../../src/components/LogoSaramaya';
import {
  BadgeClasse,
  Bouton,
  Carte,
  Ecran,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { CONDITIONS_TRANSPORT, gareParId, ligneParId, paiementPourVille } from '../../src/data/reseau';
import { useAction } from '../../src/lib/action';
import { politiqueAnnulation } from '../../src/lib/annulation';
import { dateHeureDepart, retractationPossible } from '../../src/lib/confirmation';
import { compteARebours, joursAvantExpiration, montant, telephone } from '../../src/lib/format';
import { messagePourLaGare } from '../../src/sync/localProvider';
import { construireQrBillet } from '../../src/lib/billetQr';
import { actionsPossibles, libelleEtape } from '../../src/lib/parcours';
import { useApp } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';

export default function Billet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const voyageur = useApp((e) => e.voyageur);
  /*
   * Un sélecteur par action, et non `useApp()` tout entier : sans sélecteur, cet
   * écran se redessine à la moindre modification du magasin — un colis ajouté, un
   * rappel programmé — alors qu'il n'affiche qu'un billet.
   */
  const marquerPaiementDeclare = useApp((e) => e.marquerPaiementDeclare);
  const confirmer = useApp((e) => e.confirmer);
  const reprendre = useApp((e) => e.reprendre);
  const [conditionsVisibles, setConditionsVisibles] = useState(false);

  const r = reservations.find((x) => x.id === id);

  // Tous les hooks avant le moindre retour : l'ordre d'appel doit rester stable.
  // QR signé : le contrôleur y lit siège, nom, trajet et paiement sans réseau, et
  // toute retouche du code est détectée à la vérification.
  const contenuQr = useMemo(
    () => (r && voyageur ? construireQrBillet(r, voyageur) : ''),
    [r, voyageur],
  );

  /*
   * Ces trois actions changent l'état du billet. Lancées telles quelles dans un
   * `onPress`, elles renvoyaient une promesse que personne n'attendait : un échec
   * disparaissait, et le voyageur pouvait déclarer deux fois son paiement en
   * tapant deux fois.
   */
  const declaration = useAction(async () => {
    if (!r) return;
    await marquerPaiementDeclare(r.id, 'ORANGE_MONEY');
  }, "Votre déclaration n'a pas pu être enregistrée. Réessayez.");

  const presence = useAction(async () => {
    if (!r) return;
    await confirmer(r.id);
  }, "Votre confirmation n'a pas pu être enregistrée. Réessayez, ou appelez la gare.");

  const reprise = useAction(async () => {
    if (!r) return;
    await reprendre(r.id);
  }, "Votre place n'a pas pu être reprise. Réessayez, ou appelez la gare.");

  const demandeGare = useAction(async () => {
    if (!r || !voyageur) return;
    const texte = messagePourLaGare(r, voyageur);
    const numero = (gareParId(r.gareDepartId)?.telephones[0] ?? '').replace(/\s/g, '');
    const separateur = Platform.OS === 'ios' ? '&' : '?';
    const url =
      Platform.OS === 'web'
        ? `sms:${numero}?body=${encodeURIComponent(texte)}`
        : `sms:${numero}${separateur}body=${encodeURIComponent(texte)}`;
    await Linking.openURL(url);
  }, "L'application de messages n'a pas pu être ouverte. Le numéro de la gare est indiqué sur le billet.");

  if (!r || !voyageur) {
    return (
      <Ecran>
        <Txt v="titre">Billet introuvable</Txt>
        <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
      </Ecran>
    );
  }

  const ligne = ligneParId(r.ligneId);
  const gare = gareParId(r.gareDepartId);
  const politique = politiqueAnnulation(r);
  const jours = joursAvantExpiration(r.expireLe);
  const rattrapable = retractationPossible(r);
  const passe = ['EMBARQUE', 'NO_SHOW'].includes(r.statut);
  const paiement = gare ? paiementPourVille(gare.ville) : undefined;

  // Les règles du parcours viennent d'un seul endroit, testé — et non de conditions
  // reconstruites ici, qui avaient laissé passer un billet délivré avant paiement.
  const actions = actionsPossibles(r);
  const etape = libelleEtape(r);

  return (
    <Ecran>
      <View style={styles.entre}>
        <Pressable onPress={() => router.back()} style={styles.retour}>
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
        <View style={styles.etatEnTete}>
          <Txt v="minuscule" couleur={actions.afficherBillet ? couleurs.succes : couleurs.attention}>
            {etape.titre.toUpperCase()}
          </Txt>
        </View>
      </View>

      {/* Le billet, dessiné comme le ticket papier. Il prend du relief à l'inclinaison. */}
      <Animated.View entering={FadeInDown.springify().damping(18)}>
       <CarteSpatiale intensite={8} style={styles.billet}>
        <LinearGradient colors={degrades.ticket} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.souche}>
          <View style={{ gap: 8, flex: 1 }}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.85)">
              {actions.afficherBillet ? 'TICKET DE VOYAGE' : 'RÉSERVATION'}
            </Txt>
            {/* Sur leurs supports, l'emblème est toujours posé sur du blanc. */}
            <View style={styles.plaqueLogo}>
              <LogoSaramaya hauteur={40} surFondClair />
            </View>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.7)">
              Un service des hommes intègres
            </Txt>
          </View>
          <View style={styles.numero}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
              N°
            </Txt>
            <Txt v="sousTitre" couleur="#fff">
              {r.reference}
            </Txt>
            <View style={styles.sens}>
              <Txt v="minuscule" couleur="#fff" style={{ fontSize: 9 }}>
                ALLER SIMPLE
              </Txt>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.corpsBillet}>
          <View style={styles.trajet}>
            <View style={{ flex: 1 }}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                DÉPART
              </Txt>
              <Txt v="sousTitre">{ligne?.origine}</Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                {gare?.nom}
              </Txt>
            </View>
            <Ionicons name="arrow-forward" size={18} color={couleurs.marqueVif} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                ARRIVÉE
              </Txt>
              <Txt v="sousTitre">{ligne?.destination}</Txt>
            </View>
          </View>

          <Trait />

          <View style={styles.grille}>
            <Case titre="DATE" valeur={format(parseISO(r.date), 'dd/MM/yyyy')} />
            <Case titre="HEURE" valeur={r.heure} />
            <Case titre="CONVOCATION" valeur={r.convocation} accent />
          </View>
          <View style={styles.grille}>
            <Case titre="SIÈGE" valeur={r.siege ? String(r.siege) : '—'} />
            <Case titre="TARIF" valeur={montant(r.montant)} />
            <View style={{ flex: 1 }}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                CLASSE
              </Txt>
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                <BadgeClasse classe={r.classe} petit />
              </View>
            </View>
          </View>

          <Trait />

          <View style={styles.grille}>
            <Case
              titre="LIGNE"
              valeur={`${ligne?.origine.toUpperCase()}-${ligne?.destination}`}
            />
          </View>

          <View style={styles.grille}>
            <Case titre="NOM" valeur={`${voyageur.nom} ${voyageur.prenom}`} />
            <Case titre="CONTACT" valeur={telephone(voyageur.telephone)} />
          </View>

          {/* Perforation, comme sur le ticket détachable. */}
          <View style={styles.perforation}>
            <View style={styles.encocheGauche} />
            <View style={styles.pointilles} />
            <View style={styles.encocheDroite} />
          </View>

          {/*
            Le code n'apparaît qu'une fois le paiement établi. Avant cela, la place
            est retenue mais aucun titre de transport n'existe : afficher un QR
            tromperait le voyageur, qui se croirait en règle à la porte du bus.
          */}
          {!actions.afficherBillet ? (
            <View style={styles.zoneQr}>
              <View style={styles.cadreAttente}>
                <Ionicons name="lock-closed-outline" size={34} color={couleurs.texteFaible} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="corpsFort">{etape.titre}</Txt>
                <Txt v="petit" couleur={couleurs.texteFaible}>
                  {etape.explication}
                </Txt>
              </View>
            </View>
          ) : (
          <View style={styles.zoneQr}>
            <View style={styles.cadreQr}>
              <QRCode
                value={contenuQr}
                size={132}
                backgroundColor="#FFFFFF"
                color="#0A070E"
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt v="corpsFort">Présentez ce code</Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                Il fonctionne sans réseau. Gardez-le à l'écran à l'embarquement.
              </Txt>
              <View style={styles.supports}>
                {r.supports.map((s) => (
                  <View key={s} style={styles.support}>
                    <Ionicons
                      name={s === 'PAPIER' ? 'document-text-outline' : 'phone-portrait-outline'}
                      size={12}
                      color={couleurs.texteDoux}
                    />
                    <Txt v="minuscule" couleur={couleurs.texteDoux}>
                      {s === 'PAPIER' ? 'PAPIER' : 'NUMÉRIQUE'}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          </View>
          )}

          {/*
            Code-barres Code 39, lisible par les mêmes lecteurs que le ticket papier —
            et réservé, lui aussi, au billet réellement émis. Avant paiement, seule la
            référence s'affiche en clair : de quoi la dicter à la gare, sans donner
            l'apparence d'un titre de transport.
          */}
          {actions.afficherBillet ? (
            <View style={styles.zoneCodeBarres}>
              <CodeBarres valeur={r.reference} hauteur={40} />
              <Txt v="minuscule" couleur="#0A070E" style={{ letterSpacing: 4 }}>
                {r.reference}
              </Txt>
            </View>
          ) : (
            <View style={styles.zoneReference}>
              <Txt v="minuscule" couleur="#0A070E">
                RÉFÉRENCE DE VOTRE RÉSERVATION
              </Txt>
              <Txt v="sousTitre" couleur="#0A070E" style={{ letterSpacing: 3 }}>
                {r.reference}
              </Txt>
            </View>
          )}

          <View style={{ gap: 2 }}>
            <Txt v="minuscule" couleur={couleurs.texteFaible}>
              TICKET NON REMBOURSABLE · VALIDE UNIQUEMENT POUR CE TRAJET · 30 JOURS
            </Txt>
            {gare ? (
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                {gare.nom.toUpperCase()} · {gare.telephones.join(' · ')}
              </Txt>
            ) : null}
            <Txt v="minuscule" couleur={couleurs.texteFaible}>
              www.saramayatransport.com
            </Txt>
          </View>
        </View>
       </CarteSpatiale>
      </Animated.View>

      {/* Expiration : la mention « valide 30 jours » du ticket papier, rendue vivante. */}
      {!passe ? (
        <Carte style={{ borderColor: jours <= 7 ? 'rgba(245,165,36,0.4)' : couleurs.bordure }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.md }}>
            <Ionicons
              name="hourglass-outline"
              size={20}
              color={jours <= 7 ? couleurs.attention : couleurs.texteDoux}
            />
            <View style={{ flex: 1 }}>
              <Txt v="corpsFort" couleur={jours <= 7 ? couleurs.attention : couleurs.texte}>
                {jours > 0 ? `Valide encore ${jours} jours` : 'Billet expiré'}
              </Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                Jusqu'au {format(parseISO(r.expireLe), 'd MMMM yyyy', { locale: fr })}
              </Txt>
            </View>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              {compteARebours(dateHeureDepart(r))}
            </Txt>
          </View>
        </Carte>
      ) : null}

      {rattrapable ? (
        <Animated.View entering={FadeIn}>
          <Carte style={{ borderColor: 'rgba(46,204,143,0.4)' }}>
            <Txt v="corpsFort" couleur={couleurs.succes}>
              Annulation encore rattrapable
            </Txt>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              Votre place n'a pas encore été réattribuée. Vous pouvez revenir en arrière.
            </Txt>
            <MessageErreur texte={reprise.erreur} />
            <Bouton
              titre={reprise.enCours ? 'Reprise…' : 'Reprendre ma place'}
              variante="succes"
              desactive={reprise.enCours}
              onPress={reprise.lancer}
            />
          </Carte>
        </Animated.View>
      ) : null}

      {/* Actions selon l'état. */}
      {!passe && r.statut !== 'ANNULEE' ? (
        <View style={{ gap: espace.md }}>
          <Section>Actions</Section>

          {!actions.afficherBillet ? (
            <>
              <Carte style={{ borderColor: 'rgba(245,165,36,0.35)' }}>
                <Txt v="corpsFort" couleur={couleurs.attention}>
                  {r.paiementDeclareLe ? 'Paiement déclaré' : 'Réservation à payer'}
                </Txt>
                <Txt v="petit" couleur={couleurs.texteFaible}>
                  {r.paiementDeclareLe
                    ? "Vous avez indiqué avoir payé. Le paiement sera confirmé au guichet à la récupération de votre billet."
                    : "Payez par Orange Money aux coordonnées ci-dessous, puis présentez-vous au guichet 30 minutes avant le départ pour retirer votre billet."}
                </Txt>
              </Carte>

              {paiement ? (
                <Carte>
                  <View style={styles.entre}>
                    <Txt v="corpsFort">Orange Money · {paiement.intitule}</Txt>
                    <Txt v="corpsFort" couleur={couleurs.marqueVif}>
                      {montant(r.montant)}
                    </Txt>
                  </View>
                  <Trait />
                  <Rangee gauche="Numéros" droite={paiement.numeros.join('  ·  ')} />
                  <Rangee gauche="Code paiement" droite={paiement.codes[0] ?? "—"} />
                  <Txt v="minuscule" couleur={couleurs.texteFaible}>
                    APPELEZ LE NUMÉRO, SUIVEZ LES INSTRUCTIONS, PUIS ENTREZ LE CODE ET LE MONTANT.
                  </Txt>
                </Carte>
              ) : (
                /*
                  La compagnie n'a publié de compte Orange Money que pour Ouaga et
                  Bobo. Pour les autres gares, on ne devine pas : donner un numéro
                  approchant enverrait l'argent à la mauvaise agence. On renvoie donc
                  vers le guichet concerné, dont le téléphone, lui, est exact.
                */
                <Carte style={{ borderColor: 'rgba(245,165,36,0.35)', gap: espace.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
                    <Ionicons name="call-outline" size={18} color={couleurs.attention} />
                    <Txt v="corpsFort" couleur={couleurs.attention}>
                      Demandez le numéro à votre gare
                    </Txt>
                  </View>
                  <Txt v="petit" couleur={couleurs.texteDoux}>
                    Saramaya ne publie pas de compte Orange Money pour {gare?.ville ?? 'cette gare'}.
                    Chaque caisse a le sien : appelez {gare?.nom ?? 'la gare'} pour l'obtenir, ou
                    réglez directement au guichet.
                  </Txt>
                  {gare?.telephones[0] ? (
                    <Bouton
                      titre={`Appeler ${gare.nom} · ${gare.telephones[0]}`}
                      variante="secondaire"
                      onPress={() =>
                        Linking.openURL(`tel:${gare.telephones[0]?.replace(/\s/g, '')}`).catch(
                          () => undefined,
                        )
                      }
                    />
                  ) : null}
                </Carte>
              )}

              {actions.declarerPaiement ? (
                <>
                  <MessageErreur texte={declaration.erreur} />
                  <Bouton
                    titre={declaration.enCours ? 'Enregistrement…' : "J'ai effectué le paiement"}
                    sousTitre="À confirmer ensuite au guichet"
                    variante="succes"
                    desactive={declaration.enCours}
                    onPress={declaration.lancer}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {r.statut === 'PAYEE' ? (
            <>
              <MessageErreur texte={presence.erreur} />
              <Bouton
                titre={presence.enCours ? 'Enregistrement…' : 'Je confirme ma présence'}
                variante="succes"
                desactive={presence.enCours}
                onPress={presence.lancer}
              />
            </>
          ) : null}

          <MessageErreur texte={demandeGare.erreur} />
          <Bouton
            titre="Envoyer la demande à la gare"
            sousTitre={`SMS pré-rempli vers ${gare?.telephones[0] ?? 'la gare'}`}
            variante="secondaire"
            desactive={demandeGare.enCours}
            onPress={demandeGare.lancer}
          />

          <Bouton
            titre="Reporter mon voyage"
            sousTitre={
              politique.peutReporter
                ? 'Gratuit — dans la validité de 30 jours'
                : 'Indisponible'
            }
            variante="secondaire"
            desactive={!politique.peutReporter}
            onPress={() => router.push(`/confirmation/${r.id}?action=reporter`)}
          />

          <Bouton
            titre="Annuler ce voyage"
            variante="danger"
            onPress={() => router.push(`/confirmation/${r.id}?action=annuler`)}
          />
        </View>
      ) : null}

      <Pressable onPress={() => setConditionsVisibles((v) => !v)}>
        <Carte>
          <View style={styles.entre}>
            <Txt v="corpsFort">Conditions de transport</Txt>
            <Ionicons
              name={conditionsVisibles ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={couleurs.texteFaible}
            />
          </View>
          {conditionsVisibles ? (
            <Animated.View entering={FadeIn} style={{ gap: espace.sm }}>
              {CONDITIONS_TRANSPORT.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: espace.sm }}>
                  <Txt v="petit" couleur={couleurs.marqueVif}>
                    {i + 1}.
                  </Txt>
                  <Txt v="petit" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
                    {c}
                  </Txt>
                </View>
              ))}
            </Animated.View>
          ) : null}
        </Carte>
      </Pressable>
    </Ecran>
  );
}

function Rangee({ gauche, droite }: { gauche: string; droite: string }) {
  return (
    <View style={[styles.entre, { paddingVertical: 4 }]}>
      <Txt v="petit" couleur={couleurs.texteFaible}>
        {gauche}
      </Txt>
      <Txt v="corpsFort" numberOfLines={1} style={{ maxWidth: '62%', textAlign: 'right' }}>
        {droite}
      </Txt>
    </View>
  );
}

function Case({ titre, valeur, accent = false }: { titre: string; valeur: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt v="minuscule" couleur={couleurs.texteFaible}>
        {titre}
      </Txt>
      <Txt v="corpsFort" couleur={accent ? couleurs.marqueVif : couleurs.texte} numberOfLines={1}>
        {valeur}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  etatEnTete: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
    backgroundColor: couleurs.surfaceHaute,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  zoneReference: { alignItems: 'center', gap: 4, paddingVertical: espace.md },
  cadreAttente: {
    width: 132,
    height: 132,
    borderRadius: rayon.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surfaceBasse,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.bordureForte,
  },
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
  billet: {
    borderRadius: rayon.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surface,
  },
  souche: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espace.lg,
  },
  numero: { alignItems: 'flex-end', gap: 4 },
  plaqueLogo: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: rayon.md,
    paddingHorizontal: espace.md,
    paddingVertical: espace.sm,
  },
  sens: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zoneCodeBarres: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: rayon.md,
    paddingVertical: espace.md,
    paddingHorizontal: espace.lg,
  },
  corpsBillet: { padding: espace.lg, gap: espace.md },
  trajet: { flexDirection: 'row', alignItems: 'center', gap: espace.md },
  grille: { flexDirection: 'row', gap: espace.md },
  perforation: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -espace.lg },
  encocheGauche: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: couleurs.fond,
    marginLeft: -9,
  },
  encocheDroite: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: couleurs.fond,
    marginRight: -9,
  },
  pointilles: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.bordureForte,
  },
  zoneQr: { flexDirection: 'row', alignItems: 'center', gap: espace.lg },
  cadreQr: { padding: espace.sm, backgroundColor: '#fff', borderRadius: rayon.md },
  supports: { flexDirection: 'row', gap: espace.sm, marginTop: 2 },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
