/**
 * Le car Saramaya en trois dimensions.
 *
 * La scène est partagée entre le web et le natif ; seul le composant <Canvas> qui
 * l'accueille change (voir Bus3D.tsx et Bus3D.web.tsx). La livrée reprend le
 * magenta de l'en-tête du ticket et le rouge-orangé du logo.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

const MAGENTA = '#D6216F';
const MAGENTA_PROFOND = '#8E1149';
const ORANGE = '#F04E37';
const CARROSSERIE = '#F4EFF7';
const VITRE = '#160E1E';
const PNEU = '#14101A';

function Roue({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.22, 24]} />
        <meshStandardMaterial color={PNEU} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        <meshStandardMaterial color="#8C8098" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

export function ScèneBus({ vitesse = 0.28 }: { vitesse?: number }) {
  const bus = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!bus.current) return;
    bus.current.rotation.y += delta * vitesse;
    // Léger tangage, pour que l'objet respire au lieu de tourner mécaniquement.
    bus.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.04;
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 4]} intensity={1.7} castShadow />
      <directionalLight position={[-5, 2, -3]} intensity={0.7} color={MAGENTA} />
      <pointLight position={[0, -2, 3]} intensity={0.5} color={ORANGE} />

      <group ref={bus} scale={0.92}>
        {/* Caisse principale */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[4.1, 1.35, 1.6]} />
          <meshStandardMaterial color={CARROSSERIE} roughness={0.35} metalness={0.15} />
        </mesh>

        {/* Toit légèrement rentré */}
        <mesh position={[0, 1.72, 0]}>
          <boxGeometry args={[3.95, 0.14, 1.48]} />
          <meshStandardMaterial color="#E4DCEA" roughness={0.5} />
        </mesh>

        {/* Bandeau magenta — la signature de la marque */}
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[4.12, 0.52, 1.62]} />
          <meshStandardMaterial color={MAGENTA} roughness={0.3} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[4.14, 0.2, 1.63]} />
          <meshStandardMaterial color={MAGENTA_PROFOND} roughness={0.4} />
        </mesh>

        {/* Bandeau vitré */}
        <mesh position={[0, 1.33, 0.01]}>
          <boxGeometry args={[3.75, 0.5, 1.66]} />
          <meshStandardMaterial
            color={VITRE}
            roughness={0.08}
            metalness={0.85}
            emissive={MAGENTA_PROFOND}
            emissiveIntensity={0.18}
          />
        </mesh>

        {/* Pare-brise avant, incliné */}
        <mesh position={[2.06, 1.24, 0]} rotation={[0, 0, -0.13]}>
          <boxGeometry args={[0.12, 0.72, 1.5]} />
          <meshStandardMaterial color={VITRE} roughness={0.06} metalness={0.9} />
        </mesh>

        {/* Phares */}
        {[-0.52, 0.52].map((z) => (
          <mesh key={z} position={[2.09, 0.62, z]}>
            <boxGeometry args={[0.06, 0.16, 0.34]} />
            <meshStandardMaterial
              color="#FFF6E0"
              emissive="#FFD79A"
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Feux arrière */}
        {[-0.5, 0.5].map((z) => (
          <mesh key={`ar${z}`} position={[-2.07, 0.68, z]}>
            <boxGeometry args={[0.05, 0.2, 0.3]} />
            <meshStandardMaterial
              color={ORANGE}
              emissive={ORANGE}
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Roues */}
        <Roue position={[1.35, 0.32, 0.82]} />
        <Roue position={[1.35, 0.32, -0.82]} />
        <Roue position={[-1.3, 0.32, 0.82]} />
        <Roue position={[-1.3, 0.32, -0.82]} />

        {/* Ombre portée stylisée */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.2, 2.4]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} />
        </mesh>
      </group>
    </>
  );
}
