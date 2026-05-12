import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import MoleculeScene from './MoleculeViewer';

export default function CompoundDetail({ compound, onClose }) {
  if (!compound) return null;

  return (
    <AnimatePresence>
      {compound && (
        <motion.div
          key={compound.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', top: 20, right: 20, width: 380,
            bottom: 20, display: 'flex', flexDirection: 'column',
            background: 'rgba(12,12,22,0.94)', backdropFilter: 'blur(16px)',
            borderRadius: 16, color: '#fff', zIndex: 100,
            border: '1px solid rgba(100,200,255,0.2)', boxShadow: '0 0 50px rgba(100,200,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 24px 12px', flexShrink: 0 }}>
            <button onClick={onClose} style={{
              position:'absolute', top:12, right:16, background:'none',
              border:'none', color:'#666', fontSize:22, cursor:'pointer', zIndex:10,
            }}>✕</button>
            <div style={{ fontSize:12, color:'#74c0fc', fontWeight:600, letterSpacing:1 }}>COMPOUND</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:4 }}>
              <span style={{ fontSize:32, fontWeight:700 }}>{compound.formula}</span>
              <span style={{ fontSize:18, opacity:0.7 }}>{compound.name}</span>
            </div>
            <div style={{ fontSize:13, color:'#888', marginTop:4 }}>{compound.nameEn}</div>
          </div>

          {/* 3D Molecule Viewer */}
          <div style={{
            flex: 1, margin: '0 12px 12px', borderRadius: 12, minHeight: 280,
            background: 'rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden',
          }}>
            <Canvas
              camera={{ position: [0, 1, 5], fov: 40 }}
              dpr={[1, 1.5]}
              style={{ width: '100%', height: '100%' }}
            >
              <color attach="background" args={['#06060e']} />
              <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.4}>
                  <MoleculeScene compound={compound} />
                </Bounds>
              </Suspense>
              <OrbitControls enablePan={false} enableZoom={true} autoRotate autoRotateSpeed={2} />
            </Canvas>
          </div>

          <div style={{ padding: '0 24px 20px', fontSize: 13, color: '#aaa', flexShrink: 0 }}>
            <div style={{ marginBottom: 10 }}>{compound.desc}</div>
            {/* Bond type legend */}
            <div style={{ display:'flex', gap:14, marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:20, height:3, background:'#888', borderRadius:2 }} />
                <span style={{ fontSize:11, color:'#999' }}>单键 · 1对共用电子</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <div style={{ width:20, height:2, background:'#e8a838', borderRadius:1 }} />
                  <div style={{ width:20, height:2, background:'#e8a838', borderRadius:1 }} />
                </div>
                <span style={{ fontSize:11, color:'#999' }}>双键 · 2对</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <div style={{ width:20, height:2, background:'#c084fc', borderRadius:1 }} />
                  <div style={{ width:20, height:2, background:'#c084fc', borderRadius:1 }} />
                  <div style={{ width:20, height:2, background:'#c084fc', borderRadius:1 }} />
                </div>
                <span style={{ fontSize:11, color:'#999' }}>三键 · 3对</span>
              </div>
            </div>
            <div style={{ fontSize:11, color:'#555' }}>
              🟡 黄色小点 = 共用电子对 · 原子数 {compound.atoms.length} · 化学键 {compound.bonds.length}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
