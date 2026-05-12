import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// CPK coloring
const ATOM_COLORS = {
  H:'#ffffff', C:'#555555', N:'#3344ff', O:'#ff2200',
  S:'#ffcc00', Na:'#ab5cf2', Cl:'#1fef1f', F:'#90e050',
  P:'#ff8000', Fe:'#e06633', Ca:'#3dff00',
};
const ATOM_RADIUS = {
  H:0.25, C:0.4, N:0.38, O:0.38, S:0.5, Na:0.45, Cl:0.45,
  F:0.35, P:0.42, Fe:0.45, Ca:0.45,
};
const BOND_COLORS = { 1: '#888888', 2: '#e8a838', 3: '#c084fc' };
const BOND_LABELS = { 1: '单键', 2: '双键', 3: '三键' };

function Atom({ el, pos }) {
  const color = ATOM_COLORS[el] || '#aaaaaa';
  const r = ATOM_RADIUS[el] || 0.35;
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[r, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      <Text position={[0, r + 0.18, 0]} fontSize={0.2} color="#fff" anchorX="center" anchorY="bottom">
        {el}
      </Text>
    </group>
  );
}

// Shared electron pair - two small dots orbiting near bond midpoint
function ElectronPair({ center, axis, pairOffset, speed }) {
  const ref1 = useRef();
  const ref2 = useRef();
  const perpA = useMemo(() => {
    const up = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    return new THREE.Vector3().crossVectors(axis, up).normalize();
  }, [axis]);
  const perpB = useMemo(() => new THREE.Vector3().crossVectors(axis, perpA).normalize(), [axis, perpA]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    const r = 0.08;
    // Two electrons orbit around bond axis at the pair offset position
    const cx = center[0] + perpA.x * pairOffset;
    const cy = center[1] + perpA.y * pairOffset;
    const cz = center[2] + perpA.z * pairOffset;
    if (ref1.current) {
      ref1.current.position.set(
        cx + perpB.x * r * Math.cos(t) + axis.x * r * Math.sin(t),
        cy + perpB.y * r * Math.cos(t) + axis.y * r * Math.sin(t),
        cz + perpB.z * r * Math.cos(t) + axis.z * r * Math.sin(t),
      );
    }
    if (ref2.current) {
      ref2.current.position.set(
        cx - perpB.x * r * Math.cos(t) - axis.x * r * Math.sin(t),
        cy - perpB.y * r * Math.cos(t) - axis.y * r * Math.sin(t),
        cz - perpB.z * r * Math.cos(t) - axis.z * r * Math.sin(t),
      );
    }
  });

  return (
    <>
      <mesh ref={ref1}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#ffd43b" emissive="#ffd43b" emissiveIntensity={1} /></mesh>
      <mesh ref={ref2}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#ffd43b" emissive="#ffd43b" emissiveIntensity={1} /></mesh>
    </>
  );
}

function Bond({ from, to, order }) {
  const mid = useMemo(() => [(from[0]+to[0])/2,(from[1]+to[1])/2,(from[2]+to[2])/2], [from,to]);
  const dir = useMemo(() => new THREE.Vector3(to[0]-from[0],to[1]-from[1],to[2]-from[2]), [from,to]);
  const len = dir.length();
  const normDir = useMemo(() => dir.clone().normalize(), [dir]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0,1,0), normDir);
    return q;
  }, [normDir]);

  const bondColor = BOND_COLORS[order] || '#888';
  const offsets = order === 1 ? [0] : order === 2 ? [-0.07, 0.07] : [-0.1, 0, 0.1];

  // Electron pair positions along the bond
  const pairOffsets = order === 1 ? [0] : order === 2 ? [-0.12, 0.12] : [-0.16, 0, 0.16];

  return (
    <group>
      {/* Bond sticks */}
      <group position={mid} quaternion={quat}>
        {offsets.map((off, i) => (
          <mesh key={i} position={[off, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, len * 0.75, 8]} />
            <meshStandardMaterial color={bondColor} roughness={0.5} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>

      {/* Shared electron pairs */}
      {pairOffsets.map((po, i) => (
        <ElectronPair
          key={i}
          center={mid}
          axis={normDir}
          pairOffset={po}
          speed={2 + i * 0.5}
        />
      ))}

      {/* Bond type label */}
      <Text
        position={[mid[0], mid[1] + 0.22, mid[2]]}
        fontSize={0.12}
        color={bondColor}
        anchorX="center"
        anchorY="bottom"
      >
        {BOND_LABELS[order]}
      </Text>
    </group>
  );
}

export default function MoleculeScene({ compound }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.7} />
      <pointLight position={[-4, -3, 4]} intensity={0.3} color="#74c0fc" />

      {compound.atoms.map((a, i) => (
        <Atom key={i} el={a.el} pos={a.pos} />
      ))}
      {compound.bonds.map(([a, b, order], i) => (
        <Bond key={i} from={compound.atoms[a].pos} to={compound.atoms[b].pos} order={order} />
      ))}
    </>
  );
}
