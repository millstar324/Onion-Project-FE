import { useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import PropTypes from 'prop-types';
import api from '../api/axios';

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
const mapBig5ToTree = (stats, userId) => {
  if (!stats) return null;

  // 🌟 사용자 ID와 성격 점수를 합쳐 고유 시드 생성
  const seedStr = userId + JSON.stringify(stats);
  const seed = xmur3(seedStr)();
  const rng = createRNG(seed); // 이 rng() 함수가 Math.random()을 대체합니다.

  return {
    rng, // 🌟 가지와 잎 생성에 쓸 난수 생성기 전달
    branchSpread: mapStat(stats.openness?.adventurousness, 0.4, 0.9),
    complexity: (stats.openness?.intellect || 5) > 6 ? 3 : 2,
    irregularity: mapStat(10 - (stats.conscientiousness?.orderliness || 5), 0.1, 1.2),
    leafDensity: Math.floor(mapStat(stats.extraversion?.gregariousness, 8, 25)),
    treeScale: mapStat(stats.extraversion?.activity_level, 3.5, 5.5),
    leafColor: (stats.extraversion?.cheerfulness || 5) > 5 ? "#77dd77" : "#5F8B5F",
    leafVitality: stats.agreeableness?.trust || 5,
    barkNoise: mapStat(stats.neuroticism?.anxiety, 0.1, 1.5),
    trunkColor: (stats.neuroticism?.depression || 5) > 6 ? "#42342A" : "#5D4037"
  };
};


// --- 내부 컴포넌트들 ---
const RecursiveBranch = ({ start, direction, length, radius, depth, params }) => {
  const { branchGeo, curve, endPoint, nextDirections } = useMemo(() => {
    const mid = start.clone().add(direction.clone().multiplyScalar(length * 0.5));
    
    // 1. 가지가 휘는 정도 (params.rng() 적용됨)
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
        
        // 🌟 수정된 부분: Math.random() 대신 params.rng()를 사용하여 회전 각도를 고정합니다.
        newDir.applyAxisAngle(direction, ((Math.PI * 2) / params.complexity) * i + params.rng() * 0.5);
        
        nextDirs.push(newDir.normalize());
      }
    }
    return { branchGeo: geo, curve, endPoint: end, nextDirections: nextDirs };
  }, [start, direction, length, radius, depth, params]); // params가 바뀌지 않는 한 결과는 고정됨

  const barkMat = useMemo(() => getBarkMaterial(params.trunkColor), [params.trunkColor]);

  return (
    <group>
      <mesh geometry={branchGeo} material={barkMat} castShadow />
      {depth === 0 ? (
        <LeafCluster curve={curve} params={params} />
      ) : (
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

const LeafCluster = ({ curve, params }) => {
  const leaves = useMemo(() => {
    const arr = [];
    for (let i = 0; i < params.leafDensity; i++) {
      // 🌟 수정: Math.random() 대신 params.rng()를 사용하여 나뭇잎의 위치(t)를 고정
      const t = 0.3 + params.rng() * 0.7;
      const pos = curve.getPointAt(t);
      
      // 🌟 수정: 나뭇잎의 회전 각도도 고정된 난수열을 사용하여 결정
      const rotation = [
        params.rng() * Math.PI, 
        params.rng() * Math.PI, 
        0
      ];
      
      arr.push({ pos: [pos.x, pos.y, pos.z], rotation });
    }
    return arr;
  }, [curve, params]); // curve나 params가 바뀌지 않으면 잎의 위치는 절대 변하지 않음

  const leafGeo = useMemo(() => {
    const size = 0.6;
    // 우호성(trust) 수치에 따라 잎의 모양 결정 (둥근 원형 vs 날카로운 평면)
    const geo = params.leafVitality > 5 
      ? new THREE.CircleGeometry(size * 0.7, 8) 
      : new THREE.PlaneGeometry(size * 0.4, size * 1.6);
    geo.translate(0, size, 0);
    return geo;
  }, [params.leafVitality]);

  return (
    <group>
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.pos} rotation={leaf.rotation} geometry={leafGeo} castShadow>
          <meshStandardMaterial 
            color={params.leafColor} 
            side={THREE.DoubleSide} 
            transparent 
            opacity={0.9} 
          />
        </mesh>
      ))}
    </group>
  );
};

// 중복되었던 PropTypes를 깔끔하게 하나로 정리했습니다.
LeafCluster.propTypes = {
  curve: PropTypes.instanceOf(THREE.Curve).isRequired,
  params: PropTypes.shape({
    rng: PropTypes.func.isRequired,
    leafDensity: PropTypes.number.isRequired,
    leafVitality: PropTypes.number.isRequired,
    leafColor: PropTypes.string.isRequired,
  }).isRequired
};

// --- 메인 페이지 컴포넌트 (API 연동) ---


export default function PsychologicalTreeScene() {
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // 🌟 userId가 없거나 유효하지 않으면 요청을 보내지 않음
    if (!token) {
      console.warn("토큰이 없습니다. 로그인이 필요합니다.");
      setLoading(false);
      setError("로그인이 필요한 서비스입니다.");
      return;
  }

  const fetchStats = async () => {
      try {
          setLoading(true);
          setError(null); // 에러 상태 초기화
  
          // 🌟 1. api 인스턴스 사용 (Base URL, Authorization 헤더 자동 포함)
          const response = await api.get('/user/stats');
  
          // 🌟 2. Axios는 데이터가 response.data에 들어있습니다.
          const json = response.data;
  
          // 🌟 3. 백엔드에서 준 big5_scores를 상태에 저장
          if (json && json.big5_scores) {
              setStats(json.big5_scores);
          } else {
              // 데이터는 왔지만 내용이 비어있는 경우
              throw new Error("나무를 생성할 데이터(Big5)가 아직 부족합니다.");
          }
  
      } catch (err) {
          console.error("Tree Fetch Error:", err);
          
          // 🌟 4. Axios 에러 처리 (401, 404, 500 등)
          if (err.response?.status === 401) {
              setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          } else {
              setError(err.response?.data?.detail || err.message || "서버 응답 오류");
          }
      } finally {
          setLoading(false);
      }
  };

  fetchStats();
  }, []); // 처음에 한 번만 실행
  
  if (loading) return (
    <div className="w-full h-screen flex items-center justify-center bg-[#f8f9fa] text-zinc-500 font-bold animate-pulse">
        당신의 내면 세계를 나무로 생성 중입니다...
    </div>
  );
  
  if (error) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#f8f9fa] gap-4">
        <div className="text-rose-500 font-bold">⚠️ {error}</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm">다시 시도</button>
    </div>
  );

  const treeParams = mapBig5ToTree(stats);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f8f9fa" }}>
      <Canvas shadows camera={{ position: [0, 8, 20], fov: 45 }}>
        
        <OrbitControls 
          makeDefault 
          target={[0, 6, 0]}  // 👈 여기를 수정! (기존은 0, 0, 0 혹은 설정 없음)
          minDistance={5} 
          maxDistance={50} 
        />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 15, 10]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 20, 5]} intensity={1.2} />
        
        <Suspense fallback={<Html center>나무 렌더링 중...</Html>}>
          {treeParams && (
            <RecursiveBranch
              start={new THREE.Vector3(0, 0, 0)}
              direction={new THREE.Vector3(0, 1, 0)}
              length={treeParams.treeScale}
              radius={0.8}
              depth={3}
              params={treeParams}
            />
          )}
        </Suspense>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#eeeeee" />
        </mesh>
      </Canvas>
    </div>
  );
}

// --- ReportPage용 컴포넌트 ---
export function TreeOnly({ big5_scores }) {
  const userId = localStorage.getItem('user_id') || 'guest';
  if (!big5_scores) return null;
  const treeParams = mapBig5ToTree(big5_scores, userId);

  return (
    <Suspense fallback={null}>
      {treeParams && (
        <RecursiveBranch
        start={new THREE.Vector3(0, 0, 0)}
        direction={new THREE.Vector3(0, 1, 0)}
        length={treeParams.treeScale}
        radius={0.8}
        depth={3}
        params={treeParams}
      />
      )}
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
    </Suspense>
  );
}

PsychologicalTreeScene.propTypes = { userId: PropTypes.string };
TreeOnly.propTypes = { big5_scores: PropTypes.object.isRequired };