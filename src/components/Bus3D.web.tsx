import { Canvas } from '@react-three/fiber';
import { View } from 'react-native';
import { ScèneBus } from './busScene';

export function Bus3D({ hauteur = 220 }: { hauteur?: number }) {
  return (
    <View style={{ height: hauteur, width: '100%' }}>
      <Canvas camera={{ position: [5.2, 2.6, 5.2], fov: 38 }} gl={{ antialias: true, alpha: true }}>
        <ScèneBus />
      </Canvas>
    </View>
  );
}
