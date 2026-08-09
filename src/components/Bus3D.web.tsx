import { Canvas } from '@react-three/fiber';
import { View } from 'react-native';
import { useInclinaison } from '../lib/parallaxe';
import { ScèneBus } from './busScene';

export function Bus3D({ hauteur = 220 }: { hauteur?: number }) {
  // Sur le web, useInclinaison renvoie des valeurs à zéro : le bus tourne seul.
  const inclinaison = useInclinaison();
  return (
    <View style={{ height: hauteur, width: '100%' }}>
      <Canvas camera={{ position: [5.2, 2.6, 5.2], fov: 38 }} gl={{ antialias: true, alpha: true }}>
        <ScèneBus inclinaison={inclinaison} />
      </Canvas>
    </View>
  );
}
