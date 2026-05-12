import { CATEGORY_COLORS } from '../data/layouts';

const LAYOUT_OPTIONS = [
  { key: 'flat', label: '标准' },
  { key: 'terrain', label: '3D 地形' },
  { key: 'spiral', label: '螺旋' },
];

const MODE_OPTIONS = [
  { key: 'table', label: '元素' },
  { key: 'compounds', label: '化合物' },
];

export default function Controls({ layout, onLayoutChange, mode, onModeChange }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, zIndex: 100, padding: '6px 10px',
      background: 'rgba(20,20,30,0.85)', backdropFilter: 'blur(12px)',
      borderRadius: 40, border: '1px solid rgba(255,255,255,0.1)',
      alignItems: 'center',
    }}>
      {/* Mode toggle */}
      {MODE_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onModeChange(opt.key)}
          style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            background: mode === opt.key ? 'rgba(116,192,252,0.2)' : 'transparent',
            color: mode === opt.key ? '#74c0fc' : '#666',
          }}
        >{opt.label}</button>
      ))}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

      {/* Layout toggle (only in table mode) */}
      {mode === 'table' && LAYOUT_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onLayoutChange(opt.key)}
          style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            background: layout === opt.key ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: layout === opt.key ? '#fff' : '#888',
          }}
        >{opt.label}</button>
      ))}
    </div>
  );
}

export function Legend() {
  const cats = Object.entries(CATEGORY_COLORS);
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexWrap: 'wrap', gap: '6px 14px', zIndex: 100,
      padding: '10px 20px', background: 'rgba(20,20,30,0.85)',
      backdropFilter: 'blur(12px)', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.08)', maxWidth: '90vw', justifyContent: 'center',
    }}>
      {cats.map(([cat, col]) => (
        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: col }} />
          <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{cat}</span>
        </div>
      ))}
    </div>
  );
}
