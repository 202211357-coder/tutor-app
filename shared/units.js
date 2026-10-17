// 단위 파싱·변환. 모든 값은 차원(dim)별 SI 기준 단위로 환산해 비교한다.
// 모멘트(N·m)와 에너지(J)는 SI 차원이 같지만 물리적 의미가 달라 서로 다른 dim으로 둔다.

const UNIT_TABLE = {
  // 길이
  m: { dim: 'length', factor: 1 },
  mm: { dim: 'length', factor: 1e-3 },
  cm: { dim: 'length', factor: 1e-2 },
  km: { dim: 'length', factor: 1e3 },
  // 질량
  kg: { dim: 'mass', factor: 1 },
  g: { dim: 'mass', factor: 1e-3 },
  t: { dim: 'mass', factor: 1e3 },
  // 시간
  s: { dim: 'time', factor: 1 },
  ms: { dim: 'time', factor: 1e-3 },
  min: { dim: 'time', factor: 60 },
  h: { dim: 'time', factor: 3600 },
  // 힘
  N: { dim: 'force', factor: 1 },
  kN: { dim: 'force', factor: 1e3 },
  MN: { dim: 'force', factor: 1e6 },
  // 압력·응력
  Pa: { dim: 'pressure', factor: 1 },
  kPa: { dim: 'pressure', factor: 1e3 },
  MPa: { dim: 'pressure', factor: 1e6 },
  GPa: { dim: 'pressure', factor: 1e9 },
  bar: { dim: 'pressure', factor: 1e5 },
  'N/m2': { dim: 'pressure', factor: 1 },
  'N/mm2': { dim: 'pressure', factor: 1e6 },
  // 모멘트·토크
  'N.m': { dim: 'moment', factor: 1 },
  Nm: { dim: 'moment', factor: 1 },
  'kN.m': { dim: 'moment', factor: 1e3 },
  kNm: { dim: 'moment', factor: 1e3 },
  'N.mm': { dim: 'moment', factor: 1e-3 },
  Nmm: { dim: 'moment', factor: 1e-3 },
  // 에너지·열량
  J: { dim: 'energy', factor: 1 },
  kJ: { dim: 'energy', factor: 1e3 },
  MJ: { dim: 'energy', factor: 1e6 },
  // 비에너지(비엔탈피 등)
  'J/kg': { dim: 'specific_energy', factor: 1 },
  'kJ/kg': { dim: 'specific_energy', factor: 1e3 },
  // 일률
  W: { dim: 'power', factor: 1 },
  kW: { dim: 'power', factor: 1e3 },
  MW: { dim: 'power', factor: 1e6 },
  // 속도·가속도
  'm/s': { dim: 'velocity', factor: 1 },
  'mm/s': { dim: 'velocity', factor: 1e-3 },
  'km/h': { dim: 'velocity', factor: 1 / 3.6 },
  'm/s2': { dim: 'acceleration', factor: 1 },
  // 각속도·진동수
  'rad/s': { dim: 'angular_velocity', factor: 1 },
  rpm: { dim: 'angular_velocity', factor: (2 * Math.PI) / 60 },
  Hz: { dim: 'frequency', factor: 1 },
  // 유량
  'm3/s': { dim: 'volume_flow', factor: 1 },
  'L/s': { dim: 'volume_flow', factor: 1e-3 },
  'L/min': { dim: 'volume_flow', factor: 1e-3 / 60 },
  'kg/s': { dim: 'mass_flow', factor: 1 },
  // 밀도
  'kg/m3': { dim: 'density', factor: 1 },
  // 각도
  rad: { dim: 'angle', factor: 1 },
  deg: { dim: 'angle', factor: Math.PI / 180 },
  '°': { dim: 'angle', factor: Math.PI / 180 },
  // 단면 2차 모멘트
  m4: { dim: 'second_moment', factor: 1 },
  cm4: { dim: 'second_moment', factor: 1e-8 },
  mm4: { dim: 'second_moment', factor: 1e-12 },
  // 절대온도. °C는 영점이 달라(아핀 변환) 배율 환산으로 다룰 수 없으므로 지원하지 않는다.
  K: { dim: 'temperature', factor: 1 },
  // 질량 관성모멘트
  'kg.m2': { dim: 'mass_moment', factor: 1 },
  // 무차원 비율 (효율 등). 단위 없는 답안도 이 차원으로 취급한다.
  '%': { dim: 'ratio', factor: 0.01 },
};

/** 단위 없이 쓴 무차원 값 */
export const RATIO_UNIT = Object.freeze({ key: '', dim: 'ratio', factor: 1 });

// 대소문자만 다른 입력(KN, mpa 등)을 허용하되, 소문자로 바꿨을 때 충돌하는 키(예: m/M 접두어)는 제외한다.
const LOWERCASE_ALIASES = (() => {
  const counts = new Map();
  for (const key of Object.keys(UNIT_TABLE)) {
    const lower = key.toLowerCase();
    counts.set(lower, (counts.get(lower) ?? []).concat(key));
  }
  const aliases = new Map();
  for (const [lower, keys] of counts) {
    if (keys.length === 1) aliases.set(lower, keys[0]);
  }
  return aliases;
})();

/** 표기 차이(공백, ·, *, ², ^)를 없애 단위 테이블 키 형태로 만든다. */
export function normalizeUnitText(text) {
  return String(text)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[·⋅*×]/g, '.')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/⁴/g, '4')
    .replace(/\^/g, '')
    .replace(/^ℓ/, 'L');
}

/** 단위 문자열을 {key, dim, factor}로 해석한다. 모르는 단위면 null. */
export function lookupUnit(unitText) {
  const normalized = normalizeUnitText(unitText);
  if (normalized === '') return null;
  const key = UNIT_TABLE[normalized] ? normalized : LOWERCASE_ALIASES.get(normalized.toLowerCase());
  if (!key) return null;
  // m(밀리)와 M(메가)는 10^9배 차이라 대소문자 보정 대상에서 제외한다 (예: mW를 MW로 읽지 않음).
  if (key !== normalized && 'mM'.includes(normalized[0]) && normalized[0] !== key[0]) return null;
  return { key, ...UNIT_TABLE[key] };
}

/** value[fromUnit] → toUnit 변환. 차원이 다르거나 모르는 단위면 예외. */
export function convert(value, fromUnit, toUnit) {
  const from = lookupUnit(fromUnit);
  const to = lookupUnit(toUnit);
  if (!from) throw new Error(`알 수 없는 단위: ${fromUnit}`);
  if (!to) throw new Error(`알 수 없는 단위: ${toUnit}`);
  if (from.dim !== to.dim) {
    throw new Error(`차원이 다른 단위는 변환할 수 없습니다: ${fromUnit} → ${toUnit}`);
  }
  return (value * from.factor) / to.factor;
}

// 숫자: 부호(유니코드 마이너스 포함), 천 단위 콤마(1,000 형식만), 소수, 지수(e, ×10^n)
const NUMBER_PATTERN =
  /^([+\-−]?)\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[eE]([+\-−]?\d+)|\s*[×xX*]\s*10\s*\^\s*([+\-−]?\d+))?\s*(.*)$/;

/**
 * "12.5 kN", "-3e2 Pa", "1.2×10^3 N·m" 같은 답안을 {value, unitText}로 분해한다.
 * 숫자로 시작하지 않으면 null. unitText는 단위가 없으면 ''.
 */
export function parseQuantity(text) {
  if (typeof text !== 'string') return null;
  const match = NUMBER_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, sign, digits, eExp, tenExp, rest] = match;
  const exponent = eExp ?? tenExp;
  let value = Number(digits.replace(/,/g, ''));
  if (exponent !== undefined) value *= 10 ** Number(exponent.replace('−', '-'));
  if (sign === '-' || sign === '−') value = -value;
  if (!Number.isFinite(value)) return null;
  return { value, unitText: rest.trim() };
}
