import { useMemo } from 'react';
import * as THREE from 'three';

// 값을 0~1 사이로 정규화하는 헬퍼 함수
const normalize = (value, min, max) => Math.max(0, Math.min(1, (value - min) / (max - min)));

/**
 * 심리 데이터를 받아 '갈색 계열' 내에서 변화된 색상을 반환하는 함수
 * @param {Object} traits - { neuroticism, extraversion, openness, agreeableness }
 * @param {Object} range - 입력값의 범위 (예: -5 ~ 5라면 {min: -5, max: 5})
 */
export const usePsychColor = (traits, range = { min: 0, max: 10 }) => {
  const { neuroticism, extraversion, openness, agreeableness } = traits;

  return useMemo(() => {
    // 1. 모든 수치를 0.0 ~ 1.0 사이로 변환 (정규화)
    const n = normalize(neuroticism, range.min, range.max); // 신경성 (Hue)
    const e = normalize(extraversion, range.min, range.max); // 외향성 (Value/Lightness)
    const o = normalize(openness, range.min, range.max);     // 개방성 (Saturation)
    const a = normalize(agreeableness, range.min, range.max); // 우호성 (Temperature)

    // --- 색상 계산 로직 (Brown Identity 유지) ---

    // 1. Hue (색상): 신경성 (N)
    // 원칙: 높음=Red(0도), 낮음=Blue(180도)
    // 조정: 갈색 유지를 위해 0도(붉은 갈색) ~ 60도(노란/올리브 갈색) 사이로 제한
    // N이 높을수록 0도에 가까워짐 (붉음), 낮을수록 60도에 가까워짐 (차분함)
    const baseHue = 60 - (n * 60); 

    // 2. Saturation (채도): 개방성 (O)
    // 원칙: 높음=선명, 낮음=무채색
    // 범위: 10%(회색빛 갈색) ~ 95%(쨍한 구리색)
    const saturation = 10 + (o * 85);

    // 3. Lightness (명도): 외향성 (E)
    // 원칙: 높음=밝음, 낮음=어두움
    // 범위: 15%(다크 초콜릿) ~ 85%(베이지/모래색)
    const lightness = 15 + (e * 70);

    // Three.js Color 객체 생성 (HSL 모드)
    const color = new THREE.Color().setHSL(baseHue / 360, saturation / 100, lightness / 100);

    // 4. Temperature (온도): 우호성 (A)
    // 원칙: 높음=웜톤, 낮음=쿨톤
    // 구현: 쿨톤일 경우 '아주 연한 푸른빛'을 섞어서(Lerp) '애쉬 브라운' 느낌을 냄
    if (a < 0.5) {
      // 우호성이 낮으면(쿨톤), 차가운 파란색(#004488)을 살짝 섞음
      // 섞는 강도는 (0.5 - a) * 0.4 (최대 20% 혼합)
      const coolColor = new THREE.Color('#2a3d4f'); // 차가운 회청색
      color.lerp(coolColor, (0.5 - a) * 0.4);
    } else {
      // 우호성이 높으면(웜톤), 따뜻한 오렌지(#ff8800)를 살짝 섞음
      const warmColor = new THREE.Color('#ff4400');
      color.lerp(warmColor, (a - 0.5) * 0.2);
    }

    return "#" + color.getHexString();
  }, [neuroticism, extraversion, openness, agreeableness, range.min, range.max]);
};