import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CATEGORY_COLORS } from '../data/layouts';
import * as THREE from 'three';

export default function ElementBlock({ element, position, onClick, isSelected }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const color = CATEGORY_COLORS[element.category] || '#868e96';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const goalY = hovered ? position[1] + 0.25 : position[1];
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], 5 * delta);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, goalY, 5 * delta);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], 5 * delta);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(element); }}
      >
        <boxGeometry args={[1.8, 1.8, 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : isSelected ? 0.3 : 0.05}
          metalness={0.1}
          roughness={0.55}
        />
      </mesh>
      <Text position={[0, 0.1, 0.25]} fontSize={0.55} color="#fff" anchorX="center" anchorY="middle">
        {element.symbol}
      </Text>
      <Text position={[-0.6, 0.65, 0.25]} fontSize={0.22} color="#b3b3b3" anchorX="left" anchorY="middle">
        {String(element.z)}
      </Text>
      <Text position={[0, -0.45, 0.25]} fontSize={0.18} color="#808080" anchorX="center" anchorY="middle">
        {String(element.mass)}
      </Text>
    </group>
  );
}
