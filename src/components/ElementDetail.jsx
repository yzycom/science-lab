import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_COLORS } from '../data/layouts';
import { getShells, SHELL_NAMES } from '../data/shells';
import AtomScene from './AtomViewer';

export default function ElementDetail({ element, onClose }) {
  if (!element) return null;
  const color = CATEGORY_COLORS[element.category] || '#868e96';
  const shells = getShells(element.z);
  const shellStr = shells.map((n, i) => `${SHELL_NAMES[i]}:${n}`).join('  ');

  const rows = [
    ['Atomic Number', element.z],
    ['Mass', element.mass + ' u'],
    ['Category', element.category],
    ['Group / Period', `${element.group} / ${element.period}`],
    ['Electronegativity', element.electronegativity ?? '—'],
    ['Radius', element.radius ? element.radius + ' pm' : '—'],
  ];

  // Max shell radius for initial camera hint
  const maxR = 1.0 + (shells.length - 1) * 0.85 + 0.5;

  return (
    <AnimatePresence>
      {element && (
        <motion.div
          key={element.z}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', top: 20, right: 20, width: 380,
            bottom: 20, display: 'flex', flexDirection: 'column',
            background: 'rgba(12,12,22,0.94)', backdropFilter: 'blur(16px)',
            borderRadius: 16, color: '#fff', zIndex: 100,
            border: `1px solid ${color}44`, boxShadow: `0 0 50px ${color}22`,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px 12px', flexShrink: 0 }}>
            <button onClick={onClose} style={{
              position:'absolute', top:12, right:16, background:'none',
              border:'none', color:'#666', fontSize:22, cursor:'pointer', zIndex:10,
            }}>✕</button>
            <div style={{ fontSize:12, color, fontWeight:600, letterSpacing:1, textTransform:'uppercase' }}>
              {element.category}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:4 }}>
              <span style={{ fontSize:44, fontWeight:700, color }}>{element.symbol}</span>
              <span style={{ fontSize:20, opacity:0.8 }}>{element.name}</span>
            </div>
          </div>

          {/* 2D Atom Viewer */}
          <div style={{
            flex: '0 0 280px', margin: '0 12px', borderRadius: 12,
            background: 'rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden',
          }}>
            <Canvas
              orthographic
              camera={{ position: [0, 0, 10], zoom: 280 / (maxR * 2.5), near: 0.1, far: 100 }}
              dpr={[1, 1.5]}
              style={{ width: '100%', height: '100%' }}
              resize={{ scroll: false, debounce: { scroll: 50, resize: 50 } }}
            >
              <color attach="background" args={['#06060e']} />
              <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.3}>
                  <AtomScene element={element} />
                </Bounds>
              </Suspense>
              <OrbitControls enablePan={false} enableZoom={true} enableRotate={false} />
            </Canvas>
            {/* Legend overlay */}
            <div style={{
              position:'absolute', bottom:8, left:10, right:10,
              display:'flex', gap:12, fontSize:10, color:'#888',
            }}>
              <span>🔴 质子 {element.z}</span>
              <span>⚪ 中子 {Math.max(0, Math.round(element.mass) - element.z)}</span>
              <span>🔵 电子 {element.z}</span>
            </div>
          </div>

          {/* Shell config */}
          <div style={{ padding: '10px 24px 4px', fontSize: 12, color: '#999', flexShrink: 0 }}>
            <span style={{ color: '#666' }}>电子层：</span>{shellStr}
          </div>

          {/* Properties grid */}
          <div style={{
            padding: '8px 24px 20px', flex: 1, overflowY: 'auto',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', alignContent: 'start',
          }}>
            {rows.map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:10, color:'#666', textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
                <div style={{ fontSize:15, fontWeight:500, marginTop:2 }}>{val}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
