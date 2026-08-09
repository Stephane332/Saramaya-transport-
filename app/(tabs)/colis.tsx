/**
 * Courrier et colis.
 *
 * Reprend le service que la compagnie annonce déjà — « Distribution et Réception
 * de courrier » — et corrige ce qui coince aujourd'hui : le code de retrait est
 * généré, partagé en un geste sur WhatsApp, et le colis se suit du dépôt jusqu'au
 * retrait. Plus de code perdu, plus d'appel pour savoir si c'est arrivé.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Bouton,
  Carte,
  Ecran,
  EnTeteRetour,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { FORMATS_COLIS, REFUSES, SEUIL_DECLARATION, tarifColis } from '../../src/data/colis';
import {
  GARES,
  GARE_ARRIVEE_DEFAUT,
  GARE_DEPART_DEFAUT,
  gareParId,
} from '../../src/data/reseau';
import { montant } from '../../src/lib/format';
import { useRetourMateriel } from '../../src/lib/retour';
import { useApp } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';
import type { Colis, MoyenPaiement, TailleColis } from '../../src/types';

const ETIQUETTES: Record<Colis['statut'], { texte: string; couleur: string }> = {
  DEPOSE: { texte: 'Déposé', couleur: couleurs.classique },
  EN_TRANSIT: { texte: 'En route', couleur: couleurs.attention },
  ARRIVE: { texte: 'À retirer', couleur: couleurs.succes },
  RETIRE: { texte: 'Retiré', couleur: couleurs.neutre },
  RETOUR_EXPEDITEUR: { texte: 'Retour', couleur: couleurs.danger },
};

export default function EcranColis() {
  const router = useRouter();
  const colis = useApp((e) => e.colis);
  const [envoiOuvert, setEnvoiOuvert] = useState(false);

  const enCours = colis.filter((c) => c.statut !== 'RETIRE');
  const termines = colis.filter((c) => c.statut === 'RETIRE');

  if (envoiOuvert) return <FormulaireEnvoi onFermer={() => setEnvoiOuvert(false)} />;

  return (
    <Ecran>
      <View>
        <Txt v="titre">Colis et courrier</Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Envoyez un colis, partagez le code, suivez-le jusqu'au retrait.
        </Txt>
      </View>

      <Pressable onPress={() => setEnvoiOuvert(true)}>
        <LinearGradient colors={degrades.marque} style={styles.grandBouton}>
          <Ionicons name="cube" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Txt v="sousTitre" couleur="#fff">
              Envoyer un colis
            </Txt>
            <Txt v="petit" couleur="rgba(255,255,255,0.85)">
              Le code part au destinataire par WhatsApp
            </Txt>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </Pressable>

      {enCours.length > 0 ? (
        <>
          <Section>En cours</Section>
          {enCours.map((c, i) => (
            <CarteColis key={c.id} colis={c} index={i} onPress={() => router.push(`/colis/${c.id}`)} />
          ))}
        </>
      ) : null}

      {termines.length > 0 ? (
        <>
          <Section>Historique</Section>
          {termines.map((c, i) => (
            <CarteColis key={c.id} colis={c} index={i} onPress={() => router.push(`/colis/${c.id}`)} />
          ))}
        </>
      ) : null}

      {colis.length === 0 ? (
        <Carte>
          <Txt v="corpsFort">Aucun colis</Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Vos envois apparaîtront ici, avec leur code de retrait.
          </Txt>
        </Carte>
      ) : null}

      <Section>Bon à savoir</Section>
      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="alert-circle-outline" size={18} color={couleurs.attention} />
          <View style={{ flex: 1, gap: espace.sm }}>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Au-delà de {montant(SEUIL_DECLARATION)}, la valeur du colis doit être déclarée.
            </Txt>
            <Trait />
            <Txt v="minuscule" couleur={couleurs.texteFaible}>
              NON ACCEPTÉ : {REFUSES.join(' · ')}
            </Txt>
          </View>
        </View>
      </Carte>
    </Ecran>
  );
}

function CarteColis({
  colis,
  index,
  onPress,
}: {
  colis: Colis;
  index: number;
  onPress: () => void;
}) {
  const e = ETIQUETTES[colis.statut];
  const depart = gareParId(colis.gareDepartId);
  const arrivee = gareParId(colis.gareArriveeId);

  return (
    <Pressable onPress={onPress}>
      <Carte index={Math.min(index, 6)} style={{ gap: espace.sm }}>
        <View style={styles.entre}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
            <Ionicons
              name={FORMATS_COLIS[colis.taille].icone as never}
              size={16}
              color={couleurs.marqueVif}
            />
            <Txt v="corpsFort">{colis.destinataireNom}</Txt>
          </View>
          <View style={[styles.etat, { backgroundColor: `${e.couleur}1E`, borderColor: `${e.couleur}55` }]}>
            <Txt v="minuscule" couleur={e.couleur}>
              {e.texte.toUpperCase()}
            </Txt>
          </View>
        </View>

        <View style={styles.entre}>
          <Txt v="petit" couleur={couleurs.texteFaible} numberOfLines={1} >
            {depart?.ville} → {arrivee?.ville}
          </Txt>
          <Txt v="corpsFort" couleur={couleurs.marqueVif}>
            {colis.codeRetrait}
          </Txt>
        </View>

        {!colis.codePartage ? (
          <View style={styles.alerteCode}>
            <Ionicons name="logo-whatsapp" size={14} color={couleurs.attention} />
            <Txt v="minuscule" couleur={couleurs.attention}>
              CODE PAS ENCORE ENVOYÉ AU DESTINATAIRE
            </Txt>
          </View>
        ) : null}
      </Carte>
    </Pressable>
  );
}

/* ── Formulaire d'envoi ────────────────────────────────────────────────────── */

function FormulaireEnvoi({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const envoyerColis = useApp((e) => e.envoyerColis);

  const [gareDepartId, setGareDepartId] = useState(GARE_DEPART_DEFAUT);
  const [gareArriveeId, setGareArriveeId] = useState(GARE_ARRIVEE_DEFAUT);
  const [taille, setTaille] = useState<TailleColis>('PETIT');
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [description, setDescription] = useState('');
  const [valeur, setValeur] = useState('');
  const [enPaiement, setEnPaiement] = useState<MoyenPaiement | null>(null);

  const distance = useMemo(() => {
    const a = gareParId(gareDepartId);
    const b = gareParId(gareArriveeId);
    // Approximation suffisante pour la tarification par paliers.
    return a?.ville === b?.ville ? 0 : a?.ville === 'Ouagadougou' || b?.ville === 'Ouagadougou' ? 200 : 360;
  }, [gareDepartId, gareArriveeId]);

  const valeurNombre = Number(valeur.replace(/\D/g, '')) || 0;
  const prix = tarifColis(taille, distance, valeurNombre);
  const declarationRequise = valeurNombre > SEUIL_DECLARATION;
  const complet =
    nom.trim().length > 1 && tel.replace(/\D/g, '').length >= 8 && gareDepartId !== gareArriveeId;

  const valider = async (moyen: MoyenPaiement) => {
    if (!complet || enPaiement) return;
    setEnPaiement(moyen);
    const colis = await envoyerColis(
      {
        destinataireNom: nom.trim(),
        destinataireTelephone: tel.replace(/\D/g, ''),
        gareDepartId,
        gareArriveeId,
        taille,
        description: description.trim() || FORMATS_COLIS[taille].libelle,
        valeurDeclaree: valeurNombre,
        montant: prix,
      },
      moyen,
    );
    await new Promise((r) => setTimeout(r, 1200));
    setEnPaiement(null);
    router.push(`/colis/${colis.id}`);
  };

  useRetourMateriel(true, onFermer);

  return (
    <Ecran>
      <EnTeteRetour onRetour={onFermer} titre="Envoyer un colis" icone="close" />

      <Section>Format</Section>
      <View style={styles.formats}>
        {(Object.keys(FORMATS_COLIS) as TailleColis[]).map((t) => {
          const f = FORMATS_COLIS[t];
          const actif = t === taille;
          return (
            <Pressable key={t} style={{ flex: 1 }} onPress={() => setTaille(t)}>
              <View style={[styles.format, actif && styles.formatActif]}>
                <Ionicons
                  name={f.icone as never}
                  size={20}
                  color={actif ? couleurs.marqueVif : couleurs.texteFaible}
                />
                <Txt v="minuscule" couleur={actif ? couleurs.texte : couleurs.texteFaible}>
                  {f.libelle.toUpperCase()}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Txt v="petit" couleur={couleurs.texteFaible}>
        {FORMATS_COLIS[taille].description}
      </Txt>

      <Section>Trajet du colis</Section>
      <SelecteurGare titre="DÉPART" valeur={gareDepartId} onChange={setGareDepartId} />
      <SelecteurGare titre="ARRIVÉE" valeur={gareArriveeId} onChange={setGareArriveeId} />
      {gareDepartId === gareArriveeId ? (
        <Txt v="petit" couleur={couleurs.danger}>
          Choisissez deux gares différentes.
        </Txt>
      ) : null}

      <Section>Destinataire</Section>
      <Carte style={{ gap: espace.md }}>
        <Champ libelle="NOM COMPLET" valeur={nom} onChange={setNom} placeholder="OUEDRAOGO Fatimata" />
        <Trait />
        <Champ
          libelle="TÉLÉPHONE (WHATSAPP)"
          valeur={tel}
          onChange={setTel}
          placeholder="70 45 12 88"
          clavier="phone-pad"
        />
        <Trait />
        <Champ
          libelle="CONTENU"
          valeur={description}
          onChange={setDescription}
          placeholder="Documents, vêtements…"
        />
        <Trait />
        <Champ
          libelle="VALEUR DÉCLARÉE (F)"
          valeur={valeur}
          onChange={setValeur}
          placeholder="0"
          clavier="number-pad"
        />
        {declarationRequise ? (
          <View style={styles.alerteCode}>
            <Ionicons name="document-text" size={14} color={couleurs.attention} />
            <Txt v="minuscule" couleur={couleurs.attention} style={{ flex: 1 }}>
              AU-DELÀ DE {montant(SEUIL_DECLARATION)}, UNE DÉCLARATION SERA ÉTABLIE AU GUICHET
            </Txt>
          </View>
        ) : null}
      </Carte>

      <Section>Paiement</Section>
      <LinearGradient colors={degrades.marqueDouce} style={styles.montantAPayer}>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          MONTANT À RÉGLER
        </Txt>
        <Txt v="geant" couleur={couleurs.marqueVif}>
          {montant(prix)}
        </Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          {FORMATS_COLIS[taille].libelle} · {gareParId(gareDepartId)?.ville} →{' '}
          {gareParId(gareArriveeId)?.ville}
        </Txt>
      </LinearGradient>

      {enPaiement ? (
        <Carte>
          <View style={{ alignItems: 'center', gap: espace.md, paddingVertical: espace.lg }}>
            <ActivityIndicator color={couleurs.marqueVif} size="large" />
            <Txt v="corpsFort">Paiement en cours…</Txt>
          </View>
        </Carte>
      ) : (
        <>
          <Bouton
            titre="Payer par Orange Money"
            sousTitre={complet ? montant(prix) : 'Complétez les informations du destinataire'}
            desactive={!complet}
            onPress={() => valider('ORANGE_MONEY')}
          />
          <Bouton
            titre="Payer au guichet"
            variante="secondaire"
            desactive={!complet}
            onPress={() => valider('ESPECES_GUICHET')}
          />
        </>
      )}
    </Ecran>
  );
}

function SelecteurGare({
  titre,
  valeur,
  onChange,
}: {
  titre: string;
  valeur: string;
  onChange: (id: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const gare = gareParId(valeur);

  return (
    <View>
      <Pressable onPress={() => setOuvert((o) => !o)}>
        <Carte style={{ paddingVertical: espace.md }}>
          <View style={styles.entre}>
            <View>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                {titre}
              </Txt>
              <Txt v="corpsFort">{gare?.nom}</Txt>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                {gare?.ville.toUpperCase()}
              </Txt>
            </View>
            <Ionicons
              name={ouvert ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={couleurs.texteFaible}
            />
          </View>
        </Carte>
      </Pressable>

      {ouvert ? (
        <Animated.View entering={FadeIn} style={{ gap: 6, marginTop: 6 }}>
          {GARES.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => {
                onChange(g.id);
                setOuvert(false);
              }}
            >
              <View style={[styles.optionGare, g.id === valeur && styles.optionGareActive]}>
                <Txt v="petit" couleur={g.id === valeur ? couleurs.texte : couleurs.texteDoux}>
                  {g.nom} · {g.ville}
                </Txt>
              </View>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Champ({
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
  clavier?: 'default' | 'phone-pad' | 'number-pad';
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
        style={styles.saisie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grandBouton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    padding: espace.lg,
    borderRadius: rayon.xl,
  },
  etat: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alerteCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,165,36,0.12)',
    borderRadius: rayon.sm,
    paddingHorizontal: espace.sm,
    paddingVertical: 6,
  },
  formats: { flexDirection: 'row', gap: espace.sm },
  format: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: espace.md,
    paddingHorizontal: 4,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  formatActif: { borderColor: couleurs.marqueVif, backgroundColor: 'rgba(216,31,38,0.12)' },
  optionGare: {
    paddingVertical: espace.md,
    paddingHorizontal: espace.lg,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surfaceBasse,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  optionGareActive: { borderColor: couleurs.marqueVif },
  saisie: {
    color: couleurs.texte,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  montantAPayer: {
    borderRadius: rayon.xl,
    padding: espace.xl,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(240,54,47,0.3)',
  },
});
