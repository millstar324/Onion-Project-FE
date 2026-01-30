/* eslint-disable react/no-unknown-property */


import { useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import PropTypes from 'prop-types';
import api from '../api/axios';


const NaturalHill = ({ color = "#eeeeee", height = 1.5, spread = 15 }) => {
  const hillGeo = useMemo(() => {
    // 64x64 세그먼트로 세밀한 곡면 표현
    const size = 7;
    const segments = 64;
    const geo = new THREE.CircleGeometry(size, segments);
    
    // 정점 위치 데이터 추출
    const positions = geo.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 1]; // Plane은 기본적으로 XY 평면이므로 Y가 높이가 됨
      
      // 중심(0,0)으로부터의 거리 계산
      const distance = Math.sqrt(x * x + z * z);
      
      // 가우시안 함수 적용: 중심은 솟아오르고 멀어질수록 0에 수렴
      const h = height * Math.exp(-(distance * distance) / spread);
      
      // 높이값(y축) 업데이트
      positions[i + 2] = h;
    }

    // 법선 벡터 재계산 (그림자가 곡면을 따라 자연스럽게 맺히도록 함)
    geo.computeVertexNormals();
    return geo;
  }, [height, spread]);

  return (
    <mesh 
      geometry={hillGeo} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.05, 0]} 
      receiveShadow // 👈 나무나 자신의 높낮이 그림자를 받기 위해 필수!
      castShadow    // 👈 언덕 자체가 그림자를 던지기 위해 필수!
    >
      <meshStandardMaterial 
        color={color} 
        roughness={0.8} 
        metalness={0}
        // 🌟 핵심 1: 양면 렌더링을 허용하거나 법선이 뒤집혀도 빛을 받게 합니다.
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

NaturalHill.propTypes = {
  color: PropTypes.string,
  height: PropTypes.number,
  spread: PropTypes.number,

};

const darkenColor = (colorStart, factor) => {
  const c = new THREE.Color(colorStart);
  const black = new THREE.Color("#000000");
  
  // HSL이 아닌 일반 lerp(RGB)를 사용하면 색상 변이 없이 어두워지기만 합니다.
  c.lerp(black, Math.max(0, Math.min(0.4, factor))); 
  
  return c.getStyle(); 
};

// --- [NEW] 색상 보간 유틸리티 ---
// 두 색상(hex) 사이를 factor(0~1) 비율만큼 섞어서 반환

const lerpColor = (colorStart, colorEnd, factor) => {
  const c1 = new THREE.Color(colorStart);
  const c2 = new THREE.Color(colorEnd);
  
  // 🌟 RGB가 아닌 HSL 공간에서 보간합니다.
  // 이 방식은 중간 지점에서도 채도(S)와 밝기(L)를 최대한 유지합니다.
  c1.lerpHSL(c2, Math.max(0, Math.min(1, factor))); 
  
  return c1.getStyle(); 
};

// --- 유틸리티: 수치 매핑 ---
const mapStat = (val, min, max) => {
  const safeVal = val ?? 5; // 값이 없을 경우 중간값(5) 사용
  return min + (safeVal / 10) * (max - min);
};

const createRNG = (seed) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// 문자열(userId)을 숫자로 바꿔주는 해시 함수
const xmur3 = (str) => {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19;
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
};



// --- 텍스처 로더 ---
const textureLoader = new THREE.TextureLoader();
const getBarkMaterial = (color) => {
  const tex = textureLoader.load('/세미그레이줄기texture.jpg');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return new THREE.MeshStandardMaterial({
    color: color,
    map: tex,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
};

// --- 지오메트리 생성 함수 ---
const createTaperedGeometry = (curve, baseRadius, topRadius, noiseLevel, segments = 12) => {
  const geometry = new THREE.BufferGeometry();
  const vertices = [], indices = [], uvs = [], normals = [];
  const radialSegments = 8;
  let normalVec = new THREE.Vector3(1, 0, 0);
  let prevTangent = curve.getTangentAt(0).normalize();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const radius = baseRadius * (1 - t) + topRadius * t;
    const tangent = curve.getTangentAt(t).normalize();

    const axis = new THREE.Vector3().crossVectors(prevTangent, tangent);
    if (axis.length() > 0.00001) {
      axis.normalize();
      const angle = Math.acos(THREE.MathUtils.clamp(prevTangent.dot(tangent), -1, 1));
      normalVec.applyAxisAngle(axis, angle);
    }
    const binormalVec = new THREE.Vector3().crossVectors(tangent, normalVec).normalize();
    normalVec.crossVectors(binormalVec, tangent).normalize();
    prevTangent.copy(tangent);

    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const r = radius + Math.sin(angle * 3 + t * 5) * radius * 0.1 * noiseLevel;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const vertex = new THREE.Vector3().copy(point).addScaledVector(normalVec, x).addScaledVector(binormalVec, y);
      vertices.push(vertex.x, vertex.y, vertex.z);
      const normal = new THREE.Vector3().addScaledVector(normalVec, Math.cos(angle)).addScaledVector(binormalVec, Math.sin(angle)).normalize();
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(j / radialSegments, t);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j, b = (i + 1) * (radialSegments + 1) + j;
      const c = i * (radialSegments + 1) + (j + 1), d = (i + 1) * (radialSegments + 1) + (j + 1);
      indices.push(a, b, c, b, d, c);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
};



// --- [매핑 핵심] 실제 데이터 필드 반영 ---
// --- [매핑 고도화] 성격 + 서비스 이용 일수 반영 ---
const mapBig5ToTree = (stats, userId, serviceDays = 1, fullStats = null) => {
  if (!stats) return null;

  const seedStr = userId + JSON.stringify(stats);
  const seed = xmur3(seedStr)();
  const rng = createRNG(seed);

  // 🌟 전체 일기 개수 추출
  let totalDiaries = 0;
  if (fullStats && fullStats.mood_stats?.all) {
    totalDiaries = Object.values(fullStats.mood_stats.all).reduce((acc, cur) => acc + (Number(cur) || 0), 0);
  }

  // 🌟 [수정 포인트] 조나단의 4단계 컨셉 적용
  // Stage 1: 없음 (0~9개)
  // Stage 2: 오므라든 꽃 (10~19개)
  // Stage 3: 오므라든 꽃 + 만개한 꽃 혼합 (20~39개)
  // Stage 4: 모두 만개 (40개 이상)
  const flowerStage = totalDiaries < 10 ? 1 : totalDiaries < 20 ? 2 : totalDiaries < 40 ? 3 : 4;
  console.log("flowerStage: ", flowerStage);
  const growthFactor = 1 + Math.log10(serviceDays + 1) * 0.5;
  const maxDepth = Math.min(Math.floor(Math.sqrt(serviceDays / 3)) + 1, 4);


  const sympathyFactor = (stats.agreeableness?.sympathy || 5) / 10;
  const depressionFactor = (stats.neuroticism?.depression || 5) / 10;
  const trustFactor = (stats.agreeableness?.trust || 5) / 10;
  const selfDisciplineFactor = (stats.conscientiousness?.self_discipline || 5) / 10;
  const vulnerabilityFactor = (stats.neuroticism?.vulnerability || 5) / 10;
  const selfConsciousnessFactor = (stats.neuroticism?.self_consciousness || 5) / 10;

  return {
    rng,
    maxDepth,
    growthFactor,
    flowerStage,  // 🌟 이제 1, 2, 3, 4 단계가 전달됩니다.
    totalDiaries, 
    branchSpread: mapStat(stats.openness?.adventurousness, 0.4, 0.9),
    complexity: (stats.openness?.intellect || 5) > 6 ? 3 : 2,
    irregularity: mapStat(10 - (stats.conscientiousness?.orderliness || 5), 0.1, 1.2),
    leafDensity: Math.floor(mapStat(stats.extraversion?.gregariousness, 8, 25)),
    treeScale: mapStat(stats.extraversion?.activity_level, 3.5, 5.0) * growthFactor,
    leafColor: lerpColor("#5F8B5F", "#77dd77", sympathyFactor),
    leafVitalityFactor: trustFactor, // 0.0 ~ 1.0
    barkNoise: mapStat(stats.neuroticism?.anxiety, 0.1, 1.5),
    trunkColor: lerpColor("#8D6E63", "#3E2723", depressionFactor),
    flowerColor: lerpColor("#FFF9C4", "#FFB7C5", selfDisciplineFactor),
    vulnerabilityFactor: vulnerabilityFactor,
    selfConsciousnessFactor: selfConsciousnessFactor,
  };
};
const FlowerCluster = ({ curve, radius, params }) => {
  const flowerSize = 0.22;
  const MIN_DIST = flowerSize * 2.1; 

  const flowers = useMemo(() => {
    if (params.flowerStage <= 1) return []; // 1단계: 꽃 없음
    
    const arr = [];
    const maxAttempts = 50; 
    // 일기 2개당 꽃 1개 생성 (최대 15개)
    // 🌟 기존 targetCount에 밀도 계수(flowerDensityFactor)를 곱합니다.
    const baseTarget = Math.min(Math.floor(params.totalDiaries / 2), 15);
    const targetCount = Math.floor(baseTarget * (params.flowerDensityFactor || 1));
  
    // 🌟 중간 가지에도 꽃이 '최소 한 개'는 보일 수 있게 확률적 보정
    const finalTarget = (targetCount === 0 && params.flowerDensityFactor > 0 && params.rng() > 0.7) 
      ? 1 : targetCount;
  
    for (let i = 0; i < maxAttempts; i++) {
      if (arr.length >= finalTarget) break;
  
      // 잎보다는 조금 더 끝 쪽에 피게 t 범위 조정 (0.4 ~ 1.0)
      const t = 0.4 + params.rng() * 0.6;
      const pos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const branchRadiusAtT = radius * (1 - t) + (radius * 0.4) * t;

      let helper = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.y) > 0.9) helper.set(1, 0, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, helper).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      
      const angleOnBranch = params.rng() * Math.PI * 2;
      const surfaceDir = new THREE.Vector3()
        .addScaledVector(normal, Math.cos(angleOnBranch))
        .addScaledVector(binormal, Math.sin(angleOnBranch))
        .normalize();

      const finalPos = pos.clone().add(surfaceDir.clone().multiplyScalar(branchRadiusAtT + 0.01));
      const isOverlapping = arr.some(ef => finalPos.distanceTo(new THREE.Vector3(...ef.pos)) < MIN_DIST);

      if (!isOverlapping) {
        const dummy = new THREE.Object3D();
        dummy.position.copy(finalPos);
        dummy.lookAt(finalPos.clone().add(surfaceDir));
        
        // 🌟 [핵심 수정: 확정적 개화 로직]
        // 1. i(꽃의 인덱스)를 기준으로 개화를 결정하여 RNG 간섭을 차단합니다.
        // 2. 단계 3에서는 일기 개수가 늘어날수록 i가 낮은(먼저 생긴) 꽃부터 차례대로 만개합니다.
        let isFullBloom = false;
        if (params.flowerStage === 2) {
          isFullBloom = false; // 모두 봉오리
        } else if (params.flowerStage === 3) {
          // 일기 20개면 0개 만개, 40개면 모두 만개하도록 순차 적용
          const bloomCount = Math.floor(params.totalDiaries - 20); 
          isFullBloom = arr.length < bloomCount; 
        } else if (params.flowerStage === 4) {
          isFullBloom = true;  // 모두 만개
        }

        arr.push({ 
          pos: [finalPos.x, finalPos.y, finalPos.z], 
          rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z],
          isFullBloom,
          id: arr.length 
        });
      }
    }
    return arr;
  }, [curve, radius, params, MIN_DIST]);

  const petalGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const pLen = flowerSize * 2.2; 
    const pWid = flowerSize * 0.9;
    shape.moveTo(0, 0); 
    shape.bezierCurveTo(pWid * 0.5, pLen * 0.2, pWid, pLen * 0.6, 0, pLen);
    shape.bezierCurveTo(-pWid, pLen * 0.6, -pWid * 0.5, pLen * 0.2, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }, [flowerSize]);

  const stamenGeo = useMemo(() => {
    // 🌟 수술대 굵기를 더 가늘게(0.003) 조정하여 봉오리에서 튀어나오지 않게 함
    const geo = new THREE.CylinderGeometry(0.003, 0.003, 0.16, 4);
    geo.translate(0, 0.08, 0); 
    return geo;
  }, []);

  return (
    <group>
      {flowers.map((f) => {
        // 🌟 [겹꽃 로직 핵심]
        // 1. 레이어 수 결정: 자의식이 높을수록 1층에서 최대 3층까지 쌓임
        const layerCount = f.isFullBloom ? Math.floor(1 + params.selfConsciousnessFactor * 2.5) : 1;
        
        // 2. 기본 꽃잎 수: 만개 시 6~8개 베이스
        const petalsPerLayer = f.isFullBloom ? 6 : 5;

        return (
          <group key={f.id} position={f.pos} rotation={f.rotation}>
            {/* 레이어 반복 생성 */}
            {[...Array(layerCount)].map((_, layerIdx) => {
                const layerScale = 1 - layerIdx * 0.2;
                const layerTilt = f.isFullBloom ? (0.1 + layerIdx * 0.2) : 1.3;
                
                // 🌟 [수정] lerpColor 대신 darkenColor를 사용하여 보랏빛 유지
                const shadowIntensity = layerIdx * 0.25; // 0.25로 조금 더 진하게 조절해봤습니다.
                const layerColor = layerIdx === 0 
                  ? params.flowerColor 
                  : darkenColor(params.flowerColor, shadowIntensity);
              
                return (
                  <group key={layerIdx} scale={layerScale}>
                    {[...Array(petalsPerLayer)].map((__, pIdx) => {
                    const angleOffset = (Math.PI * 2 / petalsPerLayer) * (layerIdx * 0.5);
                    const rotationY = (Math.PI * 2 / petalsPerLayer) * pIdx + angleOffset;
        
                    return (
                      <group key={pIdx} rotation={[0, 0, rotationY]}>
                        <mesh geometry={petalGeo} rotation={[layerTilt, 0, 0]}>
                          <meshStandardMaterial 
                            color={layerColor} 
                            side={THREE.DoubleSide} 
                            emissive={layerColor} 
                            emissiveIntensity={0.2} // 그림자 층은 발광을 낮춰야 더 깊이감 있음
                          />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              );
            })}
            
            {/* 수술 레이어: scale을 통해 봉오리 상태일 땐 거의 소멸 상태로 만듦 */}
            <group scale={f.isFullBloom ? 1.2 : 0.8} position={[0, 0, 0.01 * layerCount]}>
              {[...Array(f.isFullBloom ? 5 : 2)].map((_, k, arr) => (
                <group key={k} rotation={[0, 0, (Math.PI * 2 / arr.length) * k]}>
                  <group rotation={[ (f.isFullBloom ? 0.4 : 0.1) + Math.PI / 2, 0, 0]}>
                    <mesh geometry={stamenGeo}>
                      <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.8} />
                    </mesh>
                    <mesh position={[0, 0.16, 0]}>
                      <sphereGeometry args={[0.015, 6, 6]} />
                      <meshStandardMaterial color="#FFA500" emissive="#FFA500" />
                    </mesh>
                  </group>
                </group>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
};
FlowerCluster.propTypes = {
  curve: PropTypes.instanceOf(THREE.Curve).isRequired,
  radius: PropTypes.number.isRequired,
  params: PropTypes.shape({
    flowerStage: PropTypes.number.isRequired,
    totalDiaries: PropTypes.number.isRequired,
    rng: PropTypes.func.isRequired,
    flowerColor: PropTypes.string.isRequired,
    flowerDensityFactor: PropTypes.number,
    selfConsciousnessFactor: PropTypes.number,
  }).isRequired
};

// --- 수정된 RecursiveBranch ---
const RecursiveBranch = ({ start, direction, length, radius, depth, params }) => {
  const { branchGeo, curve, endPoint, nextDirections } = useMemo(() => {
    const mid = start.clone().add(direction.clone().multiplyScalar(length * 0.5));
    
    // 가지가 휘는 정도 (params.rng() 적용)
    mid.add(new THREE.Vector3(
      (params.rng() - 0.5) * params.irregularity,
      params.rng() * params.irregularity * 0.5,
      (params.rng() - 0.5) * params.irregularity
    ));

    const end = start.clone().add(direction.clone().multiplyScalar(length));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const geo = createTaperedGeometry(curve, radius, radius * 0.4, params.barkNoise);

    const nextDirs = [];
    if (depth > 0) {
      for (let i = 0; i < params.complexity; i++) {
        let axis = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
        if (axis.length() < 0.1) axis = new THREE.Vector3(1, 0, 0);
        
        const newDir = direction.clone().applyAxisAngle(axis, params.branchSpread);
        newDir.applyAxisAngle(direction, ((Math.PI * 2) / params.complexity) * i + params.rng() * 0.5);
        
        nextDirs.push(newDir.normalize());
      }
    }
    return { branchGeo: geo, curve, endPoint: end, nextDirections: nextDirs };
  }, [start, direction, length, radius, depth, params]);

  const barkMat = useMemo(() => getBarkMaterial(params.trunkColor), [params.trunkColor]);

  // --- RecursiveBranch 컴포넌트 내부 ---
return (
  <group>
    <mesh geometry={branchGeo} material={barkMat} castShadow />
    
    {/* 🌟 수정: depth가 0일 때뿐만 아니라 1일 때도 잎을 렌더링합니다. */}
    {depth <= 1 && (
      <LeafCluster curve={curve} radius={radius} params={{
        ...params,
        // 중간 가지(depth 1)는 끝 가지보다 잎을 조금 더 적게(60%) 배치
        leafDensity: depth === 1 ? Math.floor(params.leafDensity * 0.6) : params.leafDensity 
      }} />
    )}

    {/* 꽃은 여전히 가장 끝(정수리)에만 피우고 싶다면 depth === 0 유지 */}
    {/* 🌟 꽃 렌더링 범위 확장: depth 0과 1 모두 출력 */}
    {depth <= 1 && (
      <FlowerCluster 
        curve={curve} 
        radius={radius} 
        params={{
          ...params,
          // 🌟 끝 가지(0)는 100% 확률, 중간 가지(1)는 30% 확률로만 꽃을 생성
          flowerDensityFactor: depth === 0 ? 1.0 : 0.3 
        }} 
      />
    )}

    {depth > 0 && (
      nextDirections.map((dir, i) => (
        <RecursiveBranch 
          key={i} 
          start={endPoint} 
          direction={dir} 
          length={length * 0.75} 
          radius={radius * 0.45} 
          depth={depth - 1} 
          params={params} 
        />
      ))
    )}
  </group>
);
};


RecursiveBranch.propTypes = {
  start: PropTypes.instanceOf(THREE.Vector3).isRequired,
  direction: PropTypes.instanceOf(THREE.Vector3).isRequired,
  length: PropTypes.number.isRequired,
  radius: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  params: PropTypes.object.isRequired
};

// --- 나뭇잎도 꿰뚫리지 않게 수정 ---
const LeafCluster = ({ curve, radius, params }) => {
  const leaves = useMemo(() => {
    const arr = [];
    const dummy = new THREE.Object3D(); // 회전 계산용 임시 객체

    for (let i = 0; i < params.leafDensity; i++) {
      // 🌟 수정: t의 시작 범위를 0.1로 낮춰 가지의 밑부분부터 잎이 나게 합니다.
      // 0.1 + (0.0 ~ 0.9) = 0.1 ~ 1.0 구간 전체 활용
      const t = 0.1 + params.rng() * 0.9; 
      
      const pos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      
      const currentRadius = radius * (1 - t) + (radius * 0.4) * t;
      let helper = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.y) > 0.9) helper.set(1, 0, 0);
      
      const normal = new THREE.Vector3().crossVectors(tangent, helper).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      
      // 가지 둘레의 랜덤한 각도
      const angleOnBranch = params.rng() * Math.PI * 2;
      const surfaceDir = new THREE.Vector3()
        .addScaledVector(normal, Math.cos(angleOnBranch))
        .addScaledVector(binormal, Math.sin(angleOnBranch))
        .normalize();

      const finalPos = pos.clone().add(surfaceDir.clone().multiplyScalar(currentRadius));

      // --- 🌟 회전 로직 핵심 수정 ---
      // 1. 먼저 잎이 나뭇가지 바깥쪽(surfaceDir)을 바라보게 합니다.
      dummy.position.copy(finalPos);
      dummy.lookAt(finalPos.clone().add(surfaceDir));

      // 2. Vulnerability에 따른 처짐(droop)과 랜덤 회전을 추가합니다.
      // 잎의 로컬 X축으로 회전시켜 아래로 처지게 함
      const droop = params.vulnerabilityFactor * Math.PI * 0.4; 
      dummy.rotateX(Math.PI / 2 + droop); // 기본적으로 세우고 수치만큼 눕힘
      
      // 잎의 로컬 Y축(줄기 축)을 기준으로 랜덤하게 돌려 자연스러움 추가
      dummy.rotateY((params.rng() - 0.5) * Math.PI * 0.5); 

      arr.push({ 
        pos: [finalPos.x, finalPos.y, finalPos.z], 
        rotation: [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z] 
      });
    }
    return arr;
  }, [curve, radius, params]);

  const leafGeo = useMemo(() => {
    const baseSize = 0.4 + (params.vulnerabilityFactor * 0.8); 
    const maxWidth = baseSize * (0.2 + params.leafVitalityFactor * 0.6); 
    
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); 
    // 유선형 곡선 정의
    shape.bezierCurveTo(maxWidth * 0.5, baseSize * 0.3, maxWidth, baseSize * 0.7, 0, baseSize * 1.2);
    shape.bezierCurveTo(-maxWidth, baseSize * 0.7, -maxWidth * 0.5, baseSize * 0.3, 0, 0);

    const geo = new THREE.ShapeGeometry(shape);
    // 잎의 뿌리 부분이 회전 중심이 되도록 이미 0,0에서 시작함
    return geo;
  }, [params.vulnerabilityFactor, params.leafVitalityFactor]);

  return (
    <group>
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.pos} rotation={leaf.rotation} geometry={leafGeo} castShadow>
          <meshStandardMaterial 
            color={params.leafColor} 
            side={THREE.DoubleSide} 
            transparent 
            opacity={0.9} 
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

// 중복되었던 PropTypes를 깔끔하게 하나로 정리했습니다.
LeafCluster.propTypes = {
  curve: PropTypes.instanceOf(THREE.Curve).isRequired,
  radius: PropTypes.number.isRequired,
  params: PropTypes.shape({
    rng: PropTypes.func.isRequired,
    leafDensity: PropTypes.number.isRequired,
    leafVitalityFactor: PropTypes.number.isRequired,
    vulnerabilityFactor: PropTypes.number.isRequired,
    leafColor: PropTypes.string.isRequired,
  }).isRequired
};

// --- 메인 페이지 컴포넌트 (API 연동) ---

export default function PsychologicalTreeScene() {
  const [treeData, setTreeData] = useState({ stats: null, days: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullData, setFullData] = useState(null); // 🌟 전체 데이터를 담을 상태

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Login required.");
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/user/stats');
        const json = response.data;

        if (json && json.big5_scores) {
          // 1. 나무 모양 결정용 데이터 저장
          setTreeData({
            stats: json.big5_scores,
            days: json.service_days || 1
          });

          console.log("big5_scores:", json.big5_scores);
          console.log("service_days:", json.service_days);
          
          // 2. 🌟 꽃 피우기 결정용 전체 데이터 저장 (mood_stats 포함됨)
          setFullData(json); 

        } else {
          throw new Error("Data insufficient to create a tree.");
        }
      } catch (err) {
        console.error("Tree Fetch Error:", err);
        setError(err.response?.data?.detail || err.message || "Server response error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return (
    <div className="w-full h-screen flex items-center justify-center bg-[#f8f9fa] text-zinc-500 font-bold animate-pulse">
        Growing a tree from your inner world...
    </div>
  );
  
  if (error) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#f8f9fa] gap-4">
        <div className="text-rose-500 font-bold">⚠️ {error}</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm">Try again</button>
    </div>
  );

  // 🌟 [핵심 수정] mapBig5ToTree에 이용 일수와 전체 데이터를 함께 전달합니다.
  const userId = localStorage.getItem('user_id') || 'guest';
  const treeParams = mapBig5ToTree(treeData.stats, userId, treeData.days, fullData);

  // 성장에 따른 동적 수치 계산 (Depth는 이용 일수에 따라 2~4단계)
  const dynamicDepth = treeData.days <= 10 ? 2 : treeData.days <= 30 ? 3 : 4;
  
  // 나무의 밑동 두께 (로그 함수로 안정적으로 성장)
  const dynamicRadius = 0.8 + (Math.log10(treeData.days + 1) * 0.2);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f8f9fa" }}>
      <Canvas shadows camera={{ position: [0, 10, 25], fov: 45 }}>
        <OrbitControls 
          makeDefault 
          target={[0, treeParams.treeScale * 1.2, 0]} 
          minDistance={5} 
          maxDistance={60} 
        />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 15, 10]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 20, 5]} intensity={1.2} />
        
        <Suspense fallback={<Html center>Growing a tree...</Html>}>
          {treeParams && (
            <RecursiveBranch
              start={new THREE.Vector3(0, 0, 0)}
              direction={new THREE.Vector3(0, 1, 0)}
              length={treeParams.treeScale}
              radius={dynamicRadius}
              depth={dynamicDepth}
              params={treeParams}
            />
          )}
        </Suspense>

        {/* 🌟 [수정된 부분] 입체감이 있는 언덕 형태의 땅 */}
        {/* 🌟 새로운 자연스러운 언덕 적용 */}
        <NaturalHill 
          color="#e2c6ab" 
          height={1.8}  // 솟아오르는 높이
          spread={2}   // 퍼지는 범위 (이 값이 클수록 완만한 평원이 됩니다)
        />

      </Canvas>
    </div>
  );
}

// --- ReportPage용 컴포넌트 ---// --- ReportPage용 컴포넌트 (성장 + 개화 로직 통합 버전) ---
export function TreeOnly({ big5_scores, service_days = 1, mood_stats = null }) {
  const userId = localStorage.getItem('user_id') || 'guest';
  
  if (!big5_scores) return null;

  // 🌟 1. 전체 일기 데이터를 포함하여 파라미터 계산 (꽃 정보 포함)
  // mapBig5ToTree가 4번째 인자로 { mood_stats } 형태를 받도록 설계되었습니다.
  const treeParams = mapBig5ToTree(big5_scores, userId, service_days, { mood_stats });

  // 🌟 2. 성장에 따른 동적 수치 (메인 씬과 동일하게 유지)
  const dynamicDepth = service_days <= 10 ? 2 : service_days <= 30 ? 3 : 4;
  const dynamicRadius = 0.8 + (Math.log10(service_days + 1) * 0.2);

  return (
    <Suspense fallback={null}>
      {treeParams && (
        <RecursiveBranch
          start={new THREE.Vector3(0, 0, 0)}
          direction={new THREE.Vector3(0, 1, 0)}
          length={treeParams.treeScale} 
          radius={dynamicRadius}       
          depth={dynamicDepth}         
          params={treeParams}          // 👈 여기에 flowerStage, flowerColor가 들어있음
        />
      )}
      {/* 🌟 1. 환경광 낮추기: 0.8 -> 0.3으로 낮춰야 그림자가 선명해집니다. */}
      <ambientLight intensity={0.3} />
      
      {/* 🌟 2. 직사광선 추가: 특정 각도에서 빛이 들어와야 언덕의 경사면에 음영이 생깁니다. */}
      <directionalLight
        position={[15, 25, 10]} // 👈 우측 상단에서 비춤
        castShadow
        intensity={1.2}
        shadow-bias={-0.0001}
        shadow-mapSize={[2048, 2048]}
      >
      </directionalLight>
      {/* 포인트 조명은 보조광으로 유지 */}
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      
      <NaturalHill 
        color="#e2c6ab" 
        height={1.8} 
        spread={15} // 👈 spread가 2면 너무 뾰족할 수 있습니다. 15~20 정도를 추천해요.
      />
    </Suspense>

    
  );
}

PsychologicalTreeScene.propTypes = { userId: PropTypes.string };
TreeOnly.propTypes = { big5_scores: PropTypes.object.isRequired, service_days: PropTypes.number, mood_stats: PropTypes.object };