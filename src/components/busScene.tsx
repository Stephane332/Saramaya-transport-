/**
 * L'autocar VIP Saramaya en trois dimensions.
 *
 * Modelé d'après les photos de la flotte réelle : carrosserie blanche, grande
 * courbe rouge qui balaie le flanc en remontant vers l'avant, face avant rouge
 * surmontée d'un pare-buffle, écusson rond rouge sur le côté, blocs de
 * climatisation blancs en toiture et bandeau vitré très sombre.
 *
 * La scène est partagée entre le web et le natif ; seul le composant <Canvas> qui
 * l'accueille change (voir Bus3D.tsx et Bus3D.web.tsx).
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Shape, type Group } from 'three';
import type { Inclinaison } from '../lib/parallaxe';

const ROUGE = '#D81F26';
const CARROSSERIE = '#FBF8F9';
const CARROSSERIE_OMBRE = '#DCD4D7';
const VITRE = '#0E1116';
const PNEU = '#15131A';
const CHROME = '#B9B2BC';

function Roue({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.24, 28]} />
        <meshStandardMaterial color={PNEU} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.05, 24]} />
        <meshStandardMaterial color={CHROME} metalness={0.85} roughness={0.28} />
      </mesh>
    </group>
  );
}

/** Bloc de climatisation en toiture, comme les capots blancs des photos. */
function BlocClim({ x }: { x: number }) {
  return (
    <mesh position={[x, 1.83, 0]}>
      <boxGeometry args={[0.55, 0.13, 0.9]} />
      <meshStandardMaterial color={CARROSSERIE} roughness={0.55} />
    </mesh>
  );
}

/**
 * L'écusson rond peint sur les deux flancs : anneau rouge, intérieur clair.
 * Posé haut, dans la zone blanche, comme sur les autocars.
 */
function Ecusson({ z }: { z: number }) {
  const face = z > 0 ? 1 : -1;
  return (
    <group position={[-0.75, 1.0, z + face * 0.015]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.23, 0.23, 0.015, 32]} />
        <meshStandardMaterial color={ROUGE} roughness={0.35} />
      </mesh>
      <mesh position={[0, face * 0.012, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.012, 32]} />
        <meshStandardMaterial color={CARROSSERIE} roughness={0.45} />
      </mesh>
    </group>
  );
}

/**
 * La grande courbe rouge du flanc.
 *
 * Une forme extrudée plutôt qu'un assemblage de boîtes : c'est la seule façon
 * d'obtenir le balayage continu des vraies carrosseries, qui part bas à l'arrière
 * et remonte franchement vers l'avant.
 */
function CourbeLaterale({ z }: { z: number }) {
  const forme = useMemo(() => {
    const s = new Shape();
    s.moveTo(-2.14, 0.19);
    s.lineTo(-2.14, 0.66);
    // Le creux au milieu, puis la remontée vers la face avant.
    s.bezierCurveTo(-1.1, 0.5, 0.35, 0.66, 2.14, 1.26);
    s.lineTo(2.14, 0.19);
    s.closePath();
    return s;
  }, []);

  return (
    <mesh position={[0, 0, z]}>
      <extrudeGeometry args={[forme, { depth: 0.02, bevelEnabled: false }]} />
      <meshStandardMaterial color={ROUGE} roughness={0.28} metalness={0.22} />
    </mesh>
  );
}

export function ScèneBus({
  vitesse = 0.26,
  inclinaison,
}: {
  vitesse?: number;
  inclinaison?: Inclinaison;
}) {
  const bus = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!bus.current) return;
    bus.current.rotation.y += delta * vitesse;
    // Léger tangage, pour que l'objet respire au lieu de tourner mécaniquement.
    bus.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.04;

    // Effet spatial : le bus s'incline vers le geste, en douceur.
    if (inclinaison) {
      const cibleX = -inclinaison.y.value * 0.28;
      const cibleZ = inclinaison.x.value * 0.28;
      bus.current.rotation.x += (cibleX - bus.current.rotation.x) * 0.1;
      bus.current.rotation.z += (cibleZ - bus.current.rotation.z) * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 7, 5]} intensity={1.8} castShadow />
      <directionalLight position={[-5, 2, -4]} intensity={0.6} color={ROUGE} />
      <pointLight position={[2, 1, 4]} intensity={0.6} color="#FFFFFF" />

      <group ref={bus} scale={0.9}>
        {/* Caisse blanche */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[4.3, 1.5, 1.62]} />
          <meshStandardMaterial color={CARROSSERIE} roughness={0.3} metalness={0.12} />
        </mesh>

        {/* Jupe inférieure, légèrement plus sombre */}
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[4.26, 0.28, 1.6]} />
          <meshStandardMaterial color={CARROSSERIE_OMBRE} roughness={0.6} />
        </mesh>

        {/* Toit et blocs de climatisation */}
        <mesh position={[0, 1.79, 0]}>
          <boxGeometry args={[4.15, 0.12, 1.5]} />
          <meshStandardMaterial color={CARROSSERIE} roughness={0.5} />
        </mesh>
        <BlocClim x={1.1} />
        <BlocClim x={-0.6} />

        {/* Bandeau vitré très sombre, sur les deux flancs */}
        <mesh position={[-0.2, 1.46, 0]}>
          <boxGeometry args={[3.55, 0.44, 1.655]} />
          <meshStandardMaterial color={VITRE} roughness={0.05} metalness={0.92} />
        </mesh>

        {/* La courbe rouge, de chaque côté */}
        <CourbeLaterale z={0.805} />
        <CourbeLaterale z={-0.825} />
        <Ecusson z={0.83} />
        <Ecusson z={-0.83} />

        {/* Face avant rouge */}
        <mesh position={[2.17, 0.72, 0]}>
          <boxGeometry args={[0.12, 0.85, 1.62]} />
          <meshStandardMaterial color={ROUGE} roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Pare-brise incliné */}
        <mesh position={[2.14, 1.5, 0]} rotation={[0, 0, -0.16]}>
          <boxGeometry args={[0.1, 0.78, 1.52]} />
          <meshStandardMaterial color={VITRE} roughness={0.04} metalness={0.95} />
        </mesh>

        {/* Pare-buffle : traverses rouges devant la calandre */}
        {[0.5, 0.74].map((y) => (
          <mesh key={y} position={[2.3, y, 0]}>
            <boxGeometry args={[0.07, 0.09, 1.5]} />
            <meshStandardMaterial color={ROUGE} roughness={0.35} metalness={0.3} />
          </mesh>
        ))}
        {[-0.52, 0, 0.52].map((z) => (
          <mesh key={z} position={[2.3, 0.62, z]}>
            <boxGeometry args={[0.07, 0.34, 0.08]} />
            <meshStandardMaterial color={ROUGE} roughness={0.35} metalness={0.3} />
          </mesh>
        ))}

        {/* Phares */}
        {[-0.58, 0.58].map((z) => (
          <mesh key={z} position={[2.2, 0.95, z]}>
            <boxGeometry args={[0.06, 0.18, 0.32]} />
            <meshStandardMaterial
              color="#FFF8E8"
              emissive="#FFE0A8"
              emissiveIntensity={2.6}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Rétroviseurs sur hampes blanches */}
        {[-0.92, 0.92].map((z) => (
          <group key={`retro${z}`}>
            <mesh position={[2.02, 1.72, z]}>
              <boxGeometry args={[0.05, 0.05, 0.22]} />
              <meshStandardMaterial color={CARROSSERIE} roughness={0.5} />
            </mesh>
            <mesh position={[2.02, 1.55, z * 1.12]}>
              <boxGeometry args={[0.07, 0.3, 0.1]} />
              <meshStandardMaterial color={CARROSSERIE} roughness={0.45} />
            </mesh>
          </group>
        ))}

        {/* Arrière rouge */}
        <mesh position={[-2.18, 0.78, 0]}>
          <boxGeometry args={[0.1, 0.95, 1.6]} />
          <meshStandardMaterial color={ROUGE} roughness={0.35} />
        </mesh>
        {[-0.55, 0.55].map((z) => (
          <mesh key={`feu${z}`} position={[-2.24, 0.95, z]}>
            <boxGeometry args={[0.05, 0.22, 0.28]} />
            <meshStandardMaterial
              color={ROUGE}
              emissive={ROUGE}
              emissiveIntensity={1.9}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Roues */}
        <Roue position={[1.42, 0.34, 0.84]} />
        <Roue position={[1.42, 0.34, -0.84]} />
        <Roue position={[-1.34, 0.34, 0.84]} />
        <Roue position={[-1.34, 0.34, -0.84]} />

        {/* Ombre portée stylisée */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.4, 2.5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.3} />
        </mesh>
      </group>
    </>
  );
}
