import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { getShells, SHELL_NAMES } from '../data/shells';

const SHELL_COLORS = ['#ff6b6b','#ffa94d','#ffd43b','#51cf66','#74c0fc','#b197fc','#da77f2'];

// Electron orbiting in XY plane
function Electron({ radius, index, total, speed }) {
  const ref = useRef();
  const offset = (index / total) * Math.PI * 2;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    ref.current.position.set(radius * Math.cos(t), radius * Math.sin(t), 0);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 12, 12]} />
      <meshStandardMaterial color="#74c0fc" emissive="#74c0fc" emissiveIntensity={0.8} />
    </mesh>
  );
}

// Flat orbital ring in XY plane
function OrbitalRing({ radius, shellIdx }) {
  const color = SHELL_COLORS[shellIdx % SHELL_COLORS.length];
  return (
    <mesh rotation={[0, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 96]} />
      <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Tightly packed nucleus
function Nucleus({ protons, neutrons }) {
  const particles = useMemo(() => {
    const pts = [];
    const total = Math.min(protons + neutrons, 80);
    const pCount = Math.min(protons, Math.round(total * protons / (protons + neutrons)));
    const R = 0.13;
    const packR = R * 2.0 * Math.cbrt(total) / 2;
    for (let i = 0; i < total; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const layer = Math.cbrt((i + 1) / total);
      const r = packR * layer;
      pts.push({
        pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), 0.01 * r * Math.cos(phi)],
        isProton: i < pCount,
      });
    }
    return pts;
  }, [protons, neutrons]);

  return (
    <group>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <circleGeometry args={[0.12, 16]} />
          <meshStandardMaterial
            color={p.isProton ? '#ff6b6b' : '#868e96'}
            emissive={p.isProton ? '#ff6b6b' : '#555'}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function AtomScene({ element }) {
  const shells = getShells(element.z);
  const protons = element.z;
  const neutrons = Math.round(element.mass) - protons;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 10]} intensity={0.8} />

      <Nucleus protons={protons} neutrons={Math.max(0, neutrons)} />

      {shells.map((electronCount, shellIdx) => {
        const radius = 1.0 + shellIdx * 0.85;
        const speed = 1.5 / (shellIdx + 1);
        const displayed = Math.min(electronCount, 12);
        const shellColor = SHELL_COLORS[shellIdx % SHELL_COLORS.length];
        return (
          <group key={shellIdx}>
            <OrbitalRing radius={radius} shellIdx={shellIdx} />
            {/* Shell label fixed at right edge */}
            <Text
              position={[radius + 0.25, 0, 0]}
              fontSize={0.2}
              color={shellColor}
              anchorX="left"
              anchorY="middle"
            >
              {SHELL_NAMES[shellIdx]}:{electronCount}
            </Text>
            {Array.from({ length: displayed }).map((_, i) => (
              <Electron key={i} radius={radius} index={i} total={displayed} speed={speed} />
            ))}
          </group>
        );
      })}
    </>
  );
}
