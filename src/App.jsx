import { useState, useCallback, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import elements from './data/elements.json';
import compounds from './data/compounds.json';
import { flatLayout, terrainLayout, spiralLayout } from './data/layouts';
import ElementBlock from './components/ElementBlock';
import ElementDetail from './components/ElementDetail';
import CompoundDetail from './components/CompoundDetail';
import Controls, { Legend } from './components/Controls';
import './App.css';

const LAYOUTS = { flat: flatLayout, terrain: terrainLayout, spiral: spiralLayout };

function Scene({ layoutKey, selected, onSelect }) {
  const layoutFn = LAYOUTS[layoutKey];
  const positions = useMemo(() => elements.map(el => layoutFn(el)), [layoutFn]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 20, 10]} intensity={0.8} />
      <pointLight position={[-20, 10, -10]} intensity={0.4} color="#74c0fc" />

      {elements.map((el, i) => (
        <ElementBlock
          key={el.z}
          element={el}
          position={positions[i]}
          onClick={onSelect}
          isSelected={selected?.z === el.z}
        />
      ))}
    </>
  );
}

export default function App() {
  const [layoutKey, setLayoutKey] = useState('flat');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('table'); // 'table' | 'compounds'
  const [selectedCompound, setSelectedCompound] = useState(null);

  const handleSelect = useCallback((el) => {
    setSelected(prev => prev?.z === el.z ? null : el);
    setSelectedCompound(null);
  }, []);

  const handleCompoundClick = useCallback((c) => {
    setSelectedCompound(prev => prev?.id === c.id ? null : c);
    setSelected(null);
  }, []);

  return (
    <div className="app-root">
      <h1 className="app-title">3D Periodic Table</h1>
      <Controls
        layout={layoutKey} onLayoutChange={setLayoutKey}
        mode={mode} onModeChange={(m) => { setMode(m); setSelected(null); setSelectedCompound(null); }}
      />
      <Legend />

      {/* Element detail */}
      {mode === 'table' && <ElementDetail element={selected} onClose={() => setSelected(null)} />}

      {/* Compound detail */}
      <CompoundDetail compound={selectedCompound} onClose={() => setSelectedCompound(null)} />

      {/* Compound list overlay */}
      {mode === 'compounds' && (
        <div className="compound-list">
          <div className="compound-list-title">常见化合物</div>
          {compounds.map(c => (
            <button
              key={c.id}
              className={`compound-item ${selectedCompound?.id === c.id ? 'active' : ''}`}
              onClick={() => handleCompoundClick(c)}
            >
              <span className="compound-formula">{c.formula}</span>
              <span className="compound-name">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <Canvas
        camera={{ position: [18, -8, 45], fov: 50, near: 0.1, far: 500 }}
        style={{ position: 'fixed', inset: 0 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a0a14']} />
        <Suspense fallback={null}>
          <Scene layoutKey={layoutKey} selected={selected} onSelect={handleSelect} />
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={5} maxDistance={120} />
      </Canvas>
    </div>
  );
}
