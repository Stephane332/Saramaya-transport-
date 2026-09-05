import { Canvas } from '@react-three/fiber/native';
import { View } from 'react-native';
import { useInclinaison } from '../lib/parallaxe';
import { ScèneBus } from './busScene';

export function Bus3D({ hauteur = 220 }: { hauteur?: number }) {
  const inclinaison = useInclinaison();
  return (
    <View style={{ height: hauteur, width: '100%' }}>
      <Canvas camera={{ position: [5.2, 2.6, 5.2], fov: 38 }}>
        <ScèneBus inclinaison={inclinaison} />
      </Canvas>
    </View>
  );
}
