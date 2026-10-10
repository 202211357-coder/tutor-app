import { describe, expect, it } from 'vitest';
import { convert, lookupUnit, normalizeUnitText, parseQuantity } from './units.js';

const { PI } = Math;

describe('parseQuantity', () => {
  it.each([
    ['12.5 kN', 12.5, 'kN'],
    ['12.5kN', 12.5, 'kN'],
    ['  -3 N  ', -3, 'N'],
    ['−3 N', -3, 'N'],
    ['+4 m', 4, 'm'],
    ['.5 m', 0.5, 'm'],
    ['1e3 Pa', 1000, 'Pa'],
    ['2.5E-3 m', 0.0025, 'm'],
    ['1.2×10^3 N', 1200, 'N'],
    ['1.2 x 10^-2 m', 0.012, 'm'],
    ['12,500 N', 12500, 'N'],
    ['62.5%', 62.5, '%'],
    ['1.42°', 1.42, '°'],
    ['42', 42, ''],
  ])('%j → %d %j', (text, value, unitText) => {
    const q = parseQuantity(text);
    expect(q.value).toBeCloseTo(value, 12);
    expect(q.unitText).toBe(unitText);
  });

  it.each(['', '   ', 'abc', 'kN 12', '약 12', null, undefined, 12])('%j 는 숫자로 해석하지 않는다', (text) => {
    expect(parseQuantity(text)).toBeNull();
  });

  it('소수점 콤마(12,5)는 천 단위 구분이 아니므로 숫자 뒤가 단위로 남는다', () => {
    expect(parseQuantity('12,5 N')).toEqual({ value: 12, unitText: ',5 N' });
  });
});

describe('normalizeUnitText / lookupUnit', () => {
  it.each([
    ['N·m', 'N.m'],
    ['N*m', 'N.m'],
    ['N ⋅ m', 'N.m'],
    ['m³/s', 'm3/s'],
    ['m/s^2', 'm/s2'],
    ['N/mm²', 'N/mm2'],
    ['mm⁴', 'mm4'],
  ])('%j 를 %j 로 정규화한다', (input, expected) => {
    expect(normalizeUnitText(input)).toBe(expected);
  });

  it('같은 물리량의 여러 표기를 같은 단위로 인식한다', () => {
    expect(lookupUnit('kN·m')).toMatchObject({ dim: 'moment', factor: 1e3 });
    expect(lookupUnit('kNm')).toMatchObject({ dim: 'moment', factor: 1e3 });
    expect(lookupUnit('N/mm²')).toMatchObject({ dim: 'pressure', factor: 1e6 });
  });

  it('대소문자만 다른 표기(KN, mpa)는 허용한다', () => {
    expect(lookupUnit('KN')).toMatchObject({ key: 'kN' });
    expect(lookupUnit('kpa')).toMatchObject({ key: 'kPa' });
  });

  it('m(밀리)·M(메가)를 바꿔 쓴 표기는 거부한다', () => {
    expect(lookupUnit('mW')).toBeNull(); // MW로 읽으면 10^9배 오차
    expect(lookupUnit('mpa')).toBeNull();
    expect(lookupUnit('MM')).toBeNull();
  });

  it('모멘트(N·m)와 에너지(J)는 다른 차원으로 구분한다', () => {
    expect(lookupUnit('N·m').dim).not.toBe(lookupUnit('J').dim);
  });

  it.each(['', 'furlong', 'kg/m'])('모르는 단위 %j 는 null', (u) => {
    expect(lookupUnit(u)).toBeNull();
  });
});

describe('convert', () => {
  it.each([
    [1, 'kN', 'N', 1000],
    [250, 'MPa', 'Pa', 2.5e8],
    [1, 'N/mm²', 'MPa', 1],
    [1500, 'rpm', 'rad/s', 50 * Math.PI],
    [36, 'km/h', 'm/s', 10],
    [60, 'L/min', 'm³/s', 0.001],
    [2, 'kN·m', 'N·mm', 2e6],
  ])('%d %s = %d %s', (value, from, to, expected) => {
    expect(convert(value, from, to)).toBeCloseTo(expected, 9);
  });

  it('각도·단면 2차 모멘트·백분율 환산', () => {
    expect(convert(180, 'deg', 'rad')).toBeCloseTo(PI, 12);
    expect(convert(1, 'rad', '°')).toBeCloseTo(180 / PI, 12);
    expect(convert(4.1667e6, 'mm⁴', 'm⁴')).toBeCloseTo(4.1667e-6, 15);
    expect(convert(1, 'cm4', 'mm4')).toBeCloseTo(1e4, 9);
    expect(convert(62.5, '%', '%')).toBe(62.5);
  });

  it('차원이 다르면 예외', () => {
    expect(() => convert(1, 'kN', 'MPa')).toThrow('차원');
    expect(() => convert(1, 'N·m', 'J')).toThrow('차원');
  });

  it('모르는 단위면 예외', () => {
    expect(() => convert(1, 'kN', 'lbf')).toThrow('알 수 없는 단위');
  });
});
