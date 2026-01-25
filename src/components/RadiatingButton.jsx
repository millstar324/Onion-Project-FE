// src/components/RadiatingButton.jsx
import { useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// 랜덤 값 생성 함수
const random = (min, max) => Math.random() * (max - min) + min;
// 선형 보간 함수 (부드러운 값 변화)
const lerp = (start, end, factor) => start + (end - start) * factor;

const RadiatingButton = ({ onClick, className = "" }) => {
  const lineCount = 15;
  const typeARatio = 0.7;
  const splitIndex = Math.floor(lineCount * typeARatio);

  // 애니메이션을 위한 참조(Ref) 저장소
  // 리렌더링 없이 DOM을 직접 조작하여 성능을 최적화합니다.
  const linesRef = useRef([]);      // 라인 엘리먼트 (움직임 용)
  const gradientsRef = useRef([]);  // 그라데이션 엘리먼트 (색상 용)
  const animationRef = useRef(null); // 애니메이션 루프 ID

  // 각 선의 상태를 관리하는 변수 (React State가 아닌 일반 변수로 관리하여 성능 확보)
  const linesState = useRef([]);

  // 초기 설정 (각도 및 ID 등 정적인 데이터)
  const linesData = useMemo(() => {
    return Array.from({ length: lineCount }).map((_, i) => {
      const isTypeA = i < splitIndex;
      let angle;

      if (isTypeA) {
        const step = 220 / splitIndex;
        angle = 90 + (step * i) + random(-10, 10);
      } else {
        const bIndex = i - splitIndex;
        const bCount = lineCount - splitIndex;
        const step = 120 / bCount;
        angle = -40 + (step * bIndex) + random(-10, 10);
      }

      const gradId = `grad-${Math.random().toString(36).substr(2, 9)}`;
      
      // 초기 상태 데이터 생성
      linesState.current[i] = {
        isTypeA,
        angle,
        // 길이 관련 상태
        scale: random(1.1, 1.5),       // 현재 길이
        targetScale: random(1.1, 1.5), // 목표 길이
        isGrowing: random(0, 1) > 0.5,               // 현재 커지는 중인지 여부
        speed: 0.009,   // 변화 속도 (매 프레임마다 더해지는 값)
        
        // 색상 관련 상태 (Type A only)
        currentHue: random(0, 40),     // 현재 색상
        targetHue: random(0, 40),      // 목표 색상
        hueSpeed: 0.02,                // 색상 변화 속도
        
        // Type B 변수
        dotColor: `hsl(0, 0%, ${random(20, 40)}%)`,
        width: 4
      };

      return { id: i, isTypeA, gradId, angle };
    });
  }, [lineCount, splitIndex]);

  // 애니메이션 루프
  useEffect(() => {
    const animate = () => {
      linesState.current.forEach((state, i) => {
        const lineEl = linesRef.current[i];
        const gradEl = gradientsRef.current[i];
        
        if (!lineEl) return;

        // -----------------------
        // 1. 길이(Scale) 애니메이션 로직
        // -----------------------
        if (state.isGrowing) {
          // 커지는 중
          state.scale += state.speed;
          
          // 목표 길이에 도달하면 -> 작아지기 시작
          if (state.scale >= state.targetScale) {
            state.isGrowing = false;
            state.targetScale = random(0.5, 0.7); // 줄어들 목표치 랜덤 설정 (짧게)
            state.speed = 0.009    // 속도 약간 랜덤 변화
          }
        } else {
          // 작아지는 중
          state.scale -= state.speed;
          
          // 최소 길이에 도달하면 -> 다시 커지기 시작
          if (state.scale <= state.targetScale) {
            state.isGrowing = true;
            state.targetScale = random(1.1, 1.6); // 커질 목표치 랜덤 설정 (길게)
            state.speed = 0.008;     // 커질 때는 조금 더 빠르게
            
            // [핵심] 다시 길어지기 시작하는 순간, 목표 색상 변경 (Type A만)
            if (state.isTypeA) {
               // Red(0) ~ Yellow(60) 사이에서 랜덤
               state.targetHue = random(0, 50); 
            }
          }
        }

        // DOM 업데이트 (transform)
        lineEl.style.transform = `rotate(${state.angle}deg) scaleX(${state.scale})`;

        // -----------------------
        // 2. 색상(Color) 애니메이션 로직 (Type A)
        // -----------------------
        if (state.isTypeA && gradEl) {
          // 현재 색상을 목표 색상으로 부드럽게 이동 (Linear Interpolation)
          // state.hueSpeed 계수만큼 매 프레임 목표값에 다가감
          state.currentHue = lerp(state.currentHue, state.targetHue, 0.05);

          // DOM 업데이트 (CSS Variable을 그라데이션 엘리먼트에 주입)
          // style 속성을 직접 건드려 브라우저 리페인트 최소화
          gradEl.style.setProperty('--stop-color', `hsl(${state.currentHue}, 100%, 60%)`);
          gradEl.style.setProperty('--center-color', `hsl(${state.currentHue}, 50%, 92%)`);

        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // 애니메이션 시작
    animationRef.current = requestAnimationFrame(animate);

    // 정리(Cleanup)
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`relative group flex items-center justify-center w-24 h-24 rounded-full transition-transform active:scale-95 overflow-visible border-none outline-none focus:outline-none focus:ring-0 bg-transparent ${className}`}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {linesData.filter(l => l.isTypeA).map((line) => (
            <linearGradient
              key={line.gradId}
              id={line.gradId}
              // 그라데이션 DOM 참조 연결
              ref={el => gradientsRef.current[line.id] = el} 
              gradientUnits="userSpaceOnUse"
              x1="50" y1="50" x2="100" y2="50"
            >
              {/* 중심부: 밝은 회색 고정 */}
              <stop 
                offset="0%" 
                style={{ stopColor: 'var(--center-color, hsl(0, 0%, 92%))' }} 
                stopOpacity="0.7" 
              />
              {/* 바깥쪽: JS에서 제어하는 CSS 변수 사용 */}
              <stop 
                offset="100%" 
                stopOpacity="0.7"
                // 초기값 설정 (깜빡임 방지), 이후 JS가 --stop-color를 업데이트함
                style={{ stopColor: 'var(--stop-color, hsl(20, 100%, 60%))' }} 
              />
            </linearGradient>
          ))}
        </defs>

        {linesData.map((line, index) => {
          // JS State 초기값 가져오기 (스타일 초기화용)
          const initialState = linesState.current[index];

          if (line.isTypeA) {
            return (
              <line
                key={line.id}
                // 라인 DOM 참조 연결
                ref={el => linesRef.current[line.id] = el}
                x1="50" y1="50"
                x2="100" y2="50"
                style={{
                  transformOrigin: '50px 50px',
                  strokeWidth: initialState.width,
                  stroke: `url(#${line.gradId})`,
                  strokeLinecap: 'round',
                  // 초기 위치 잡아주기 (JS 로딩 전 레이아웃 깨짐 방지)
                  transform: `rotate(${initialState.angle}deg) scaleX(${initialState.scale})`
                }}
              />
            );
          } else {
            return (
                <g key={line.id}> 
                
                <g 
                ref={el => linesRef.current[line.id] = el}
                style={{
                    transformOrigin: '50px 50px',
                    transform: `rotate(${initialState.angle}deg) scaleX(${initialState.scale})`
                }}
              >
                
                <line
                  x1="50" y1="50"
                  x2="95" y2="50"
                  stroke={initialState.dotColor}
                  strokeWidth="0.5"
                />
                <circle
                  cx="95" cy="50" r="0.7"
                  fill={initialState.dotColor}
                />
                
              </g>
              <circle
          cx="50" cy="50" r="2"
          fill={initialState.dotColor}
          // 여기에 별도의 transform을 주지 않으면 50,50 위치에 고정됩니다.
        />
        </g>
            );
          }
        })}
      </svg>
    </button>
  );
};

RadiatingButton.propTypes = {
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default RadiatingButton;