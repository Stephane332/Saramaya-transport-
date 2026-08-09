/**
 * Ouverture de compte — le tout premier écran d'un nouveau client.
 *
 * Le parcours : le client arrive, saisit son identité (prénom, nom, téléphone, et
 * sa CNIB exigée dès 18 ans), et son compte est créé pour de bon sur son téléphone.
 * Aucune donnée n'est inventée : à partir de là, il construit son historique en
 * scannant ses vrais tickets et en réservant vraiment.
 *
 * La vérification du numéro par SMS s'ajoutera quand un fournisseur d'envoi sera
 * branché — l'étape est prévue dans le parcours, mais rien n'est simulé en
 * attendant : le compte est créé avec les informations réelles du voyageur.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bus3D } from '../src/components/Bus3D';
import { Bouton, EnTeteRetour, Txt } from '../src/components/base';
import { CONTACTS_COMPAGNIE } from '../src/data/reseau';
import { useRetourMateriel } from '../src/lib/retour';
import { useApp } from '../src/store/useApp';
import { couleurs, espace, rayon } from '../src/theme';

export default function Bienvenue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const creerCompte = useApp((e) => e.creerCompte);

  const [etape, setEtape] = useState<'ACCUEIL' | 'IDENTITE'>('ACCUEIL');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [cnib, setCnib] = useState('');

  // Depuis la saisie d'identité, le retour d'Android revient à l'accueil plutôt que
  // de fermer l'application au tout premier contact avec elle.
  useRetourMateriel(etape === 'IDENTITE', () => setEtape('ACCUEIL'));

  const telOk = telephone.replace(/\D/g, '').length >= 8;
  const complet = prenom.trim().length >= 2 && nom.trim().length >= 2 && telOk;

  const creer = () => {
    if (!complet) return;
    creerCompte({
      prenom: prenom.trim(),
      nom: nom.trim().toUpperCase(),
      telephone: telephone.replace(/\D/g, ''),
      cnib: cnib.trim() || undefined,
    });
    router.replace('/');
  };

  return (
    <View style={[styles.fond, { paddingTop: insets.top }]}>
      {etape === 'ACCUEIL' ? (
        <Animated.View entering={FadeIn.duration(500)} style={styles.accueil}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Bus3D hauteur={240} />
          </View>
          <View style={{ gap: espace.md, paddingBottom: insets.bottom + espace.lg }}>
            <Txt v="section" couleur={couleurs.marqueVif}>
              SARAMAYA TRANSPORT
            </Txt>
            <Txt v="geant">Vos voyages,{'\n'}dans votre poche.</Txt>
            <Txt v="corps" couleur={couleurs.texteDoux}>
              Réservez, gardez vos billets hors ligne, envoyez vos colis et ne manquez plus
              jamais un départ.
            </Txt>
            <View style={{ height: espace.sm }} />
            <Bouton titre="Créer mon compte" onPress={() => setEtape('IDENTITE')} />
            <Txt v="minuscule" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
              {CONTACTS_COMPAGNIE.devise.toUpperCase()}
            </Txt>
          </View>
        </Animated.View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              padding: espace.lg,
              paddingBottom: insets.bottom + 120,
              gap: espace.lg,
            }}
            showsVerticalScrollIndicator={false}
          >
            <EnTeteRetour onRetour={() => setEtape('ACCUEIL')} />

            <View>
              <Txt v="titre">Votre identité</Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                Saisie une seule fois. Vous la présenterez au guichet au lieu de la redonner
                à chaque voyage.
              </Txt>
            </View>

            <Animated.View entering={FadeInDown} style={styles.carte}>
              <Champ libelle="PRÉNOM" valeur={prenom} onChange={setPrenom} placeholder="Ange" />
              <Sep />
              <Champ
                libelle="NOM"
                valeur={nom}
                onChange={setNom}
                placeholder="SAWADOGO"
                majuscule
              />
              <Sep />
              <Champ
                libelle="TÉLÉPHONE"
                valeur={telephone}
                onChange={setTelephone}
                placeholder="66 79 80 31"
                clavier="phone-pad"
              />
              <Sep />
              <Champ
                libelle="CNIB (facultatif ici)"
                valeur={cnib}
                onChange={setCnib}
                placeholder="B 1234567"
              />
            </Animated.View>

            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={18} color={couleurs.succes} />
              <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                Vos informations restent sur votre téléphone. La vérification de votre numéro
                par SMS s'ajoutera prochainement. Dès 18 ans, la CNIB est exigée à l'entrée de
                la gare : renseignez-la avant votre premier voyage.
              </Txt>
            </View>
          </ScrollView>

          <View style={[styles.barreBas, { paddingBottom: insets.bottom + espace.md }]}>
            <Bouton
              titre="Ouvrir mon compte"
              sousTitre={complet ? undefined : 'Renseignez prénom, nom et téléphone'}
              desactive={!complet}
              onPress={creer}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Champ({
  libelle,
  valeur,
  onChange,
  placeholder,
  clavier = 'default',
  majuscule = false,
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clavier?: 'default' | 'phone-pad';
  majuscule?: boolean;
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
        autoCapitalize={majuscule ? 'characters' : 'words'}
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
  accueil: { flex: 1, paddingHorizontal: espace.lg },
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
});
