import { describe, expect, test } from 'vitest';
import {
  AU_KM,
  collinearPointsSunCentered,
  earthHeliocentricLongitude,
  lagrangePointsRotating,
  lagrangeSnapshot,
} from './lagrange.js';

const DEG = 180 / Math.PI;

function close(actual, expected, tolerance) {
  expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
}

describe('太阳—地球拉格朗日点解算', () => {
  test('L1/L2 距地球约 150 万公里，L3 落在反日侧', () => {
    const { L1, L2, L3 } = collinearPointsSunCentered();

    close((1 - L1) * AU_KM, 1.49e6, 3e4);
    close((L2 - 1) * AU_KM, 1.5e6, 3e4);
    expect(L1).toBeLessThan(1);
    expect(L2).toBeGreaterThan(1);
    expect(L3).toBeLessThan(0);
    close(Math.abs(L3), 1, 1e-5);
  });

  test('L4/L5 与太阳、地球各自等距 1 AU', () => {
    const { L4, L5 } = lagrangePointsRotating();

    close(Math.hypot(L4[0], L4[1]), 1, 1e-12);
    close(Math.hypot(L4[0] - 1, L4[1]), 1, 1e-12);
    close(L4[1], Math.sqrt(3) / 2, 1e-12);
    close(L5[1], -Math.sqrt(3) / 2, 1e-12);
  });

  test('公转角旋转时五个点整体跟着转', () => {
    const at0 = lagrangeSnapshot(0);
    const at90 = lagrangeSnapshot(90);

    close(at0.points.L4.inertial[0], 0.5, 1e-12);
    close(at0.points.L4.inertial[1], Math.sqrt(3) / 2, 1e-12);
    close(at90.points.L4.inertial[0], -Math.sqrt(3) / 2, 1e-12);
    close(at90.points.L4.inertial[1], 0.5, 1e-12);
    // L4/L5 始终领先/落后地球 60°
    const delta = (a, b) => ((a - b + 540) % 360) - 180;
    close(delta(at90.points.L4.angleDeg, at90.earth.angleDeg), 60, 1e-9);
    close(delta(at0.points.L5.angleDeg, at0.earth.angleDeg), -60, 1e-9);
  });

  test('示意放大只改画图坐标，不改读数', () => {
    const base = lagrangeSnapshot(37);
    const zoomed = lagrangeSnapshot(37, { exaggerate: 20 });

    close(zoomed.points.L1.earthKm, base.points.L1.earthKm, 1e-6);
    close(zoomed.points.L2.sunAU, base.points.L2.sunAU, 1e-12);
    expect(base.points.L1.exaggerated).toBe(false);
    expect(zoomed.points.L1.exaggerated).toBe(true);
    expect(zoomed.points.L1.display).not.toEqual(base.points.L1.display);
    // L4/L5 在真实距离上，不参与放大
    expect(zoomed.points.L4.exaggerated).toBe(false);
    close(zoomed.points.L4.earthAU, base.points.L4.earthAU, 1e-12);
  });

  test('地球黄经与已知日期对齐', () => {
    // 春分：太阳黄经 0°，地球在 180°
    close(earthHeliocentricLongitude(new Date('2026-03-20T12:00:00Z')) * DEG, 180, 1);
    // 元旦：地球约 100.2°
    close(earthHeliocentricLongitude(new Date('2026-01-01T00:00:00Z')) * DEG, 100.2, 1);
  });
});
