/**
 * Configuration de la caisse — côté agent Saramaya.
 *
 * Chaque caissière encaisse sur son propre numéro Orange Money : c'est là que
 * doit arriver le paiement d'une réservation. Cet écran laisse l'agent enregistrer,
 * sur son poste, le guichet, le numéro et le code marchand de sa caisse.
 *
 * Ce qui est réel dès maintenant : la configuration est enregistrée sur l'appareil
 * (definirCaisse), affichée, modifiable, effaçable. Ce qui attend le système
 * partagé : la propagation de ce numéro vers les instructions de paiement du
 * voyageur, pour que chacun paie la bonne caisse. Rien n'est simulé — tant que la
 * compagnie n'a pas ouvert son système, ce réglage reste local au poste.
 *
 * Les numéros proposés en raccourci sont les vrais comptes Orange Money des agences,
 * relevés sur le site de la compagnie : l'agent touche le sien s'il figure dans la
 * liste, ou saisit celui de sa caisse.
 */

import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bouton, Carte, Section, Txt } from '../src/components/base';
import { GARES, gareParId, paiementPourVille } from '../src/data/reseau';
import { telephone } from '../src/lib/format';
import { MODE_AGENT } from '../src/lib/modeAgent';
import { useApp } from '../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../src/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function EcranCaisse() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const caisse = useApp((e) => e.caisse);
  const definirCaisse = useApp((e) => e.definirCaisse);
  const effacerCaisse = useApp((e) => e.effacerCaisse);

  const [edition, setEdition] = useState(!caisse);
  const [nom, setNom] = useState(caisse?.nom ?? '');
  const [gareId, setGareId] = useState(caisse?.gareId ?? '');
  const [numero, setNumero] = useState(caisse?.numeroOrangeMoney ?? '');
  const [code, setCode] = useState(caisse?.codePaiement ?? '');

  const gare = gareId ? gareParId(gareId) : undefined;
  const numeroOk = numero.replace(/\D/g, '').length >= 8;
  const complet = nom.trim().length >= 2 && !!gareId && numeroOk;

  // Comptes Orange Money connus de l'agence de la gare choisie — de vrais numéros
  // que l'agent peut toucher si c'est le sien, plutôt que de le retaper.
  const agence = gare ? paiementPourVille(gare.ville) : undefined;

  // Réservé au personnel. La garde vient après les crochets : leur nombre doit
  // rester constant d'un rendu à l'autre, c'est la règle de React.
  if (!MODE_AGENT) return <Redirect href="/" />;

  const enregistrer = () => {
    if (!complet) return;
    definirCaisse({
      nom: nom.trim(),
      gareId,
      numeroOrangeMoney: numero.replace(/\D/g, ''),
      codePaiement: code.trim() || undefined,
    });
    setEdition(false);
  };

  const retirer = () => {
    effacerCaisse();
    setNom('');
    setGareId('');
    setNumero('');
    setCode('');
    setEdition(true);
  };

  return (
    <View style={[styles.fond, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: espace.lg,
            paddingBottom: insets.bottom + 140,
            gap: espace.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.entete}>
            <Pressable onPress={() => router.back()} style={styles.retour}>
              <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
            </Pressable>
            <View style={styles.etiquetteAgent}>
              <Txt v="minuscule" couleur={couleurs.attention}>
                CÔTÉ AGENT
              </Txt>
            </View>
          </View>

          <View>
            <Txt v="titre">Ma caisse</Txt>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              Le numéro Orange Money où les paiements de vos voyageurs doivent arriver.
              Chaque guichet a le sien.
            </Txt>
          </View>

          {caisse && !edition ? (
            <CaisseEnregistree
              caisse={caisse}
              onModifier={() => setEdition(true)}
              onRetirer={retirer}
            />
          ) : (
            <>
              <Animated.View entering={FadeInDown} style={styles.carte}>
                <Champ
                  libelle="NOM DU GUICHET OU DE LA CAISSIÈRE"
                  valeur={nom}
                  onChange={setNom}
                  placeholder="Caisse 2 · Awa"
                />
              </Animated.View>

              <View>
                <Section>Gare</Section>
                <View style={styles.grilleGares}>
                  {GARES.map((g) => {
                    const actif = g.id === gareId;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => setGareId(g.id)}
                        style={[styles.puceGare, actif && styles.puceGareActive]}
                      >
                        <Txt
                          v="petit"
                          couleur={actif ? '#fff' : couleurs.texteDoux}
                          style={{ fontWeight: actif ? '700' : '500' }}
                        >
                          {g.nom}
                        </Txt>
                        <Txt
                          v="minuscule"
                          couleur={actif ? 'rgba(255,255,255,0.75)' : couleurs.texteFaible}
                        >
                          {g.ville}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Animated.View entering={FadeInDown} style={styles.carte}>
                <Champ
                  libelle="NUMÉRO ORANGE MONEY"
                  valeur={numero}
                  onChange={setNumero}
                  placeholder="05 48 40 02"
                  clavier="phone-pad"
                />
                <Sep />
                <Champ
                  libelle="CODE MARCHAND (facultatif)"
                  valeur={code}
                  onChange={setCode}
                  placeholder="144101375257"
                  clavier="phone-pad"
                />
              </Animated.View>

              {agence && agence.numeros.length > 0 ? (
                <View style={{ gap: espace.sm }}>
                  <Txt v="minuscule" couleur={couleurs.texteFaible}>
                    NUMÉROS CONNUS DE L'AGENCE — TOUCHEZ LE VÔTRE
                  </Txt>
                  <View style={styles.suggestions}>
                    {agence.numeros.map((n, i) => {
                      const actif = n.replace(/\D/g, '') === numero.replace(/\D/g, '');
                      return (
                        <Pressable
                          key={n}
                          onPress={() => {
                            setNumero(n);
                            if (agence.codes[i]) setCode(agence.codes[i]);
                          }}
                          style={[styles.suggestion, actif && styles.suggestionActive]}
                        >
                          <Ionicons
                            name="card-outline"
                            size={14}
                            color={actif ? couleurs.marqueVif : couleurs.texteFaible}
                          />
                          <Txt v="minuscule" couleur={actif ? couleurs.texte : couleurs.texteDoux}>
                            {n}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.note}>
                <Ionicons name="information-circle-outline" size={18} color={couleurs.attention} />
                <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                  Ce réglage reste sur ce poste. Une fois le système de la compagnie ouvert, ce
                  numéro alimentera automatiquement les instructions de paiement affichées au
                  voyageur — chacun paiera la bonne caisse, sans erreur d'aiguillage.
                </Txt>
              </View>
            </>
          )}
        </ScrollView>

        {edition ? (
          <View style={[styles.barreBas, { paddingBottom: insets.bottom + espace.md }]}>
            <Bouton
              titre="Enregistrer la caisse"
              sousTitre={complet ? undefined : 'Nom, gare et numéro sont requis'}
              desactive={!complet}
              onPress={enregistrer}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function CaisseEnregistree({
  caisse,
  onModifier,
  onRetirer,
}: {
  caisse: { nom: string; gareId: string; numeroOrangeMoney: string; codePaiement?: string };
  onModifier: () => void;
  onRetirer: () => void;
}) {
  const gare = gareParId(caisse.gareId);
  return (
    <Animated.View entering={FadeIn} style={{ gap: espace.lg }}>
      <LinearGradient
        colors={degrades.marque}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.carteCaisse}
      >
        <View style={styles.enteteCaisse}>
          <View style={styles.rondCaisse}>
            <Ionicons name="cash-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.8)">
              CAISSE ENREGISTRÉE
            </Txt>
            <Txt v="sousTitre" couleur="#fff">
              {caisse.nom}
            </Txt>
          </View>
        </View>

        <View style={styles.grilleCaisse}>
          <View style={{ flex: 1 }}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
              GARE
            </Txt>
            <Txt v="corpsFort" couleur="#fff">
              {gare ? gare.nom : caisse.gareId}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
              ORANGE MONEY
            </Txt>
            <Txt v="corpsFort" couleur="#fff">
              {telephone(caisse.numeroOrangeMoney)}
            </Txt>
          </View>
        </View>

        {caisse.codePaiement ? (
          <View>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
              CODE MARCHAND
            </Txt>
            <Txt v="corpsFort" couleur="#fff">
              {caisse.codePaiement}
            </Txt>
          </View>
        ) : null}
      </LinearGradient>

      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={couleurs.succes} />
          <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
            Prêt. Dès que la compagnie relie l'application à son système, les réservations
            payées sur ce guichet arriveront sur ce numéro, et le voyageur verra exactement
            où payer — sans appel de vérification.
          </Txt>
        </View>
      </Carte>

      <Bouton
        titre="Modifier la caisse"
        variante="secondaire"
        icone={<Ionicons name="create-outline" size={18} color={couleurs.texteDoux} />}
        onPress={onModifier}
      />
      <Bouton
        titre="Retirer cette caisse"
        sousTitre="Efface le numéro enregistré sur ce poste"
        variante="fantome"
        onPress={onRetirer}
      />
    </Animated.View>
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
  clavier?: 'default' | 'phone-pad';
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

function Sep() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.fond },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  etiquetteAgent: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.4)',
    backgroundColor: 'rgba(245,165,36,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.lg,
    gap: espace.md,
  },
  saisie: {
    color: couleurs.texte,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 6,
  },
  sep: { height: 1, backgroundColor: couleurs.bordure },
  grilleGares: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm, marginTop: espace.sm },
  puceGare: {
    paddingHorizontal: espace.md,
    paddingVertical: espace.sm,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  puceGareActive: { backgroundColor: couleurs.marque, borderColor: couleurs.marqueVif },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espace.md,
    paddingVertical: espace.sm,
    borderRadius: rayon.rond,
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  suggestionActive: { borderColor: 'rgba(240,54,47,0.55)', backgroundColor: 'rgba(240,54,47,0.10)' },
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
  carteCaisse: { borderRadius: rayon.xl, padding: espace.lg, gap: espace.lg },
  enteteCaisse: { flexDirection: 'row', alignItems: 'center', gap: espace.md },
  rondCaisse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  grilleCaisse: { flexDirection: 'row', gap: espace.md },
});
