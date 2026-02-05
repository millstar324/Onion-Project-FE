import { Edit2, ChevronRight, RotateCw,  ChevronLeft, Sparkles } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { TreeOnly } from '../4_reportpage/TreeScene';
import {  TreePine, Search, User, HomeIcon, X, LogOut } from "lucide-react"; // 아이콘 일괄 임포트
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useRef } from 'react';
import Swal from 'sweetalert2';


const menuItems = [
    { name: "Home", path: "/", icon: <HomeIcon size={20} /> },
    { name: "Personality Tree", path: "/tree", icon: <TreePine size={20} /> },
    { name: "Write Page", path: "/write", icon: <Edit2 size={20} /> },
    { name: "Explore Page", path: "/explore", icon: <Search size={20} /> },
    { name: "My Report Page", path: "/report", icon: <User size={20} /> },
];

export default function ReportPage() {
    // --- 1. 상태 관리 (State) ---
    const [treeAge, setTreeAge] = useState(0);
    const [moodRawData, setMoodRawData] = useState(null); // API 전체 데이터 저장
    const [moodScope, setMoodScope] = useState('all'); // 현재 모드 (week | month | all)
    const [tagData, setTagData] = useState([]);
    const [keywordData, setKeywordData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState('stats'); // 'stats' | 'onion'
    const [onionStage, setOnionStage] = useState(0); // 0, 1, 2, 3단계
   
    const [isAnalyzing, setIsAnalyzing] = useState(false); // API 로딩 상태
    const [lifeMapReport, setLifeMapReport] = useState(null); // 결과 데이터
    const [isModalOpen, setIsModalOpen] = useState(false); // 리포트 모달
    const [isPeeling, setIsPeeling] = useState(false); // 애니메이션 트리거
    const [progress, setProgress] = useState(0);
    // --- 1. 상태 관리 부분에 추가 ---
    const [big5Scores, setBig5Scores] = useState(null); // 🌟 나무 데이터를 위한 상태 추가
    const [flower, setFlower] = useState(null);
    const [serviceDays, setServiceDays] = useState(0);

    // 🌟 이미지 참조를 위한 Ref 추가
    const onionRef = useRef(null);
    const peelRef = useRef(null);

    // ReportPage 함수 최상단 상태 선언부에 추가
    const [isPeelHovered, setIsPeelHovered] = useState(false);
    const [isOnionHovered, setIsOnionHovered] = useState(false);
    

    const navigate = useNavigate();
    const location = useLocation();
    const [isNavOpen, setIsNavOpen] = useState(false);

    const [usageCount, setUsageCount] = useState(0); // 현재 사용량 (DB값)
    const [usageLimit, setUsageLimit] = useState(2); // 월간 한도 (DB값)

    const token = localStorage.getItem('token');

    const peelStyles = useMemo(() => ({
        1: {
            img: 'translate(-10px, 60px) rotate(15deg)',
            label: 'translate(30px, -40px)'
        },
        2: {
            img: 'translate(-10px, 80px) rotate(15deg)', // 2단계는 조금 더 오른쪽 아래로
            label: 'translate(30px, -40px)'
        }
    }), []);

    const currentPeelStyle = peelStyles[onionStage] || peelStyles[1];

    // 🌟 양파 본체 정밀 호버 감지
    const handleOnionMouseMove = (e) => {
        if (onionRef.current) {
            const isOnColor = isPixelColorPresent(e, onionRef.current);
            setIsOnionHovered(isOnColor);
        }
    };
    
    const handleOnionMouseLeave = () => {
        setIsOnionHovered(false);
    };

    // 🌟 픽셀 투명도를 체크하는 함수
    // 🌟 픽셀 투명도를 정밀하게 체크하는 함수
    const isPixelColorPresent = (e, imgElement) => {
        if (!imgElement || !imgElement.complete || imgElement.naturalWidth === 0) return false;
    
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 원본 이미지 크기만큼 캔버스 생성
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        ctx.drawImage(imgElement, 0, 0);
    
        // 이미지의 화면상 실제 위치와 크기 구하기
        const rect = imgElement.getBoundingClientRect();
        
        // 마우스 클릭 위치를 이미지 내부 좌표로 변환 (비율 계산)
        const x = ((e.clientX - rect.left) / rect.width) * imgElement.naturalWidth;
        const y = ((e.clientY - rect.top) / rect.height) * imgElement.naturalHeight;
    
        // 범위를 벗어난 클릭 방어 로직
        if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) return false;
    
        try {
            // 해당 좌표의 1x1 픽셀 데이터 가져오기
            const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            // pixel[3]은 투명도(Alpha). 20 이상이면 "투명하지 않음"으로 판단
            return pixel[3] > 20; 
        } catch (err) {
            // 크로스 오리진(CORS) 에러 발생 시 로그 출력
            console.error("Canvas 접근 에러: 이미지가 보안 정책에 걸려있을 수 있습니다.", err);
            return false;
        }
    };

    // 🌟 껍질 위에서 마우스가 움직일 때 실행되는 정밀 호버 감지
    const handlePeelMouseMove = (e) => {
        if (onionStage > 0 && peelRef.current) {
            const isOnColor = isPixelColorPresent(e, peelRef.current);
            setIsPeelHovered(isOnColor);
        }
    };
    
    // 마우스가 영역을 완전히 벗어나면 무조건 호버 해제
    const handlePeelMouseLeave = () => {
        setIsPeelHovered(false);
    };

    // 🌟 통합 클릭 핸들러
    // 🌟 통합 클릭 핸들러
    const handleCompositeClick = (e) => {
        // 마우스 이벤트의 기본 동작 방지
        e.preventDefault();
    
        // 1. 껍질(Peel) 우선 체크: 껍질이 위에 있으므로 먼저 검사합니다.
        if (onionStage > 0 && peelRef.current) {
            if (isPixelColorPresent(e, peelRef.current)) {
                console.log("✅ 껍질(과거 리포트) 클릭됨");
                viewPastReport(e);
                return; // 껍질 클릭 성공 시 여기서 중단
            }
        }
    
        // 2. 양파 본체 체크: 껍질의 투명한 부분을 눌렀거나 껍질 밖을 눌렀을 때 실행됩니다.
        if (onionRef.current) {
            if (isPixelColorPresent(e, onionRef.current)) {
                console.log("✅ 양파 본체(분석하기) 클릭됨");
                handleOnionClick();
            }
        }
    };


    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
      
        return date.toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };
      

    // --- 로딩 및 게이지 애니메이션 로직 ---
    useEffect(() => {
        let interval;
        if (isAnalyzing) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress((prev) => {
                    // 15초 동안 약 90%에 도달하도록 계산 (0.5초마다 3%씩 상승)
                    if (prev < 90) return prev + 3; 
                    return prev; // 90%에서 멈춰서 서버 응답 대기
                });
            }, 500);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing]);



    const handleOnionClick = async () => {
        if (usageCount >= usageLimit) {
            Swal.fire({
                title: 'Warning',
                text: `You have reached your monthly analysis limit of ${usageLimit}.`,
                icon: 'warning',
                confirmButtonText: 'OK',
                confirmButtonColor: '#6D5B98' // ONION 앱 메인 컬러로 맞추면 더 좋겠죠?
              });
            
            return;
        }
        // 0, 1단계일 때만 분석 가능
        if (onionStage >= 2) {
            Swal.fire({
                title: 'Analysis complete!',
                text: 'Analysis complete! Tap a layer to reveal your report.',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#6D5B98' // ONION 앱 메인 컬러로 맞추면 더 좋겠죠?
              });
            
            
            return;
        }
    
        setIsPeeling(true);
        setIsAnalyzing(true); 
    
        try {
            await api.post('/analyze-life-map', {});
            
            const response = await api.get('/life-map');
            
            setProgress(100);
            setTimeout(() => {
                setLifeMapReport(response.data);
                setIsModalOpen(true);
                setIsAnalyzing(false);
                setIsPeeling(false);
                // 🌟 여기서 미리 fetchData를 한 번 더 호출해두면 창을 닫기 전에도 내부 상태가 준비됩니다.
            }, 600);
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("An error occurred during analysis.");
            setIsAnalyzing(false);
            setIsPeeling(false);
        }
    };

    

    const viewPastReport = async (e) => {
        e.stopPropagation();
        setIsAnalyzing(true);
        try {
            // 🌟 URL 수정 및 헤더 추가
            const response = await api.get('/life-map');
            
            if (response.data) {
                setLifeMapReport(response.data);
                setIsModalOpen(true);
            } else {
                alert("No analysis reports found.");
            }
        } catch (error) {
            console.error("Load failed:", error);
            alert("Failed to load records.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    

    // 🌟 로그아웃 함수 추가
    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Log out of your account?',
            text: "You can always come back and write your diary! 🌳",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6D5B98', // ONION 메인 컬러
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Log out',
            cancelButtonText: 'Cancel',
            reverseButtons: true            // 버튼 위치를 OS 표준에 맞게 조정
        });
        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');

            Swal.fire({
                title: 'Logged out.',
                text: 'Logged out successfully.',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#6D5B98' // ONION 앱 메인 컬러로 맞추면 더 좋겠죠?
              });
            
            navigate('/login');
        }
    };

    

    const fetchData = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            if (!token) return navigate('/login'); // 토큰 없으면 튕김

            // 🌟 URL에서 user_id 삭제
            
            const response = await api.get('/user/stats');
            const data = await response.data;

            // 데이터 처리 로직 (동일)
            const actualUsage = typeof data.life_map_usage === 'object' 
                ? data.life_map_usage.count 
                : (data.life_map_usage || 0);

            setUsageCount(actualUsage);
            setOnionStage(actualUsage);

           
            setUsageLimit(data.life_map_limit || 2);
            setMoodRawData(data.mood_stats); 
            setTreeAge(data.service_days || 0);


            if (!isSilent) setOnionStage(actualUsage);
            if (data.big5_scores) {
                setBig5Scores(data.big5_scores);
            }
            if (data.mood_stats) {
                setFlower(data.mood_stats);
            }
            if (data.service_days) {
                setServiceDays(data.service_days);
            }

            if (data.user_tag_counts) {
                // 태그 필터링 및 변환 로직 동일...
                const formattedTags = Object.entries(data.user_tag_counts)
                    .filter(([name]) => name !== 'unsorted') 
                    .map(([name, count], index) => ({
                        name: name, count: count,
                        color: ['bg-blue-400', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-purple-400'][index % 5]
                    }));
                setTagData(formattedTags);
            }

            // 🌟 2. 키워드 데이터 저장 (여기서 setKeywordData를 사용합니다!)
            if (data.ai_trait_counts) {
                const formattedKeywords = Object.entries(data.ai_trait_counts)
                    .map(([text, count]) => ({
                        text: text,
                        count: count
                    }))
                    // 🌟 1. 빈도수(count)가 높은 순서대로 정렬
                    .sort((a, b) => b.count - a.count)
                    // 🌟 2. 상위 10개만 선택
                    .slice(0, 20);
                
                setKeywordData(formattedKeywords); 
            }
            // ... 키워드 데이터 처리 동일
        } catch (error) {
            console.error("Load failed:", error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    

    


    

    useEffect(() => {
        fetchData();
    }, []);

    // --- 3. 데이터 가공 (Memo) ---
    const currentMoodStats = useMemo(() => {
        // DB에 없는 항목도 0으로 표시하기 위한 기본 틀
        const categories = [
            { key: 'happy', label: 'Happy', color: 'from-pink-300 to-rose-400' },
            { key: 'soso', label: 'Soso', color: 'from-yellow-200 to-orange-400' },
            { key: 'sad', label: 'Sad', color: 'from-blue-300 to-indigo-400' },
            { key: 'angry', label: 'Angry', color: 'from-red-400 to-red-600' },
            { key: 'cloudy', label: 'Cloudy', color: 'from-gray-400 to-slate-600' }
        ];

        if (!moodRawData || !moodRawData[moodScope]) {
            return categories.map(cat => ({ ...cat, count: 0 }));
        }

        const scopeData = moodRawData[moodScope];
        return categories.map(cat => ({
            ...cat,
            count: scopeData[cat.key] || 0 // 데이터가 없으면 0으로 처리
        }));
    }, [moodRawData, moodScope]);

    const maxMoodCount = Math.max(...currentMoodStats.map(s => s.count), 1);
    
    const cycleMoodScope = () => {
        const scopes = ['week', 'month', 'all'];
        const currentIndex = scopes.indexOf(moodScope);
        const nextIndex = (currentIndex + 1) % scopes.length;
        setMoodScope(scopes[nextIndex]);
    };

    if (loading) return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;

    const maxTagCount = Math.max(...tagData.map(t => t.count), 1);
    
    // 키워드 크기 계산용
    const kwCounts = keywordData.length ? keywordData.map(k => k.count) : [1];
    const maxKwCount = Math.max(...kwCounts);
    const minKwCount = Math.min(...kwCounts);

  

    

    return (
        <div className="w-screen h-screen bg-container_purple bg-[linear-gradient(150deg,_rgba(228,223,237,0.8),_rgba(227,221,238,0.8),_rgba(215,198,246,0.8),_rgb(218,187,250,0.8))] m-0 p-0 overflow-hidden relative flex items-center justify-center">
        
        {/* [사이드 배너 버튼] */}
        <div onClick={() => setIsNavOpen(true)} className="fixed right-0 top-[5vh] w-14 h-16 flex items-center justify-center z-[60] cursor-pointer group">
            <div className="w-14 h-16 bg-zinc-800 rounded-tl-[20px] rounded-bl-[20px] flex items-center justify-center shadow-lg group-hover:w-16 transition-all">
                <div className="w-9 h-9 flex items-center justify-center"><User size={30} color="white" /></div>
            </div>
        </div>
            {/* [확장되는 메뉴 박스] */}
            {isNavOpen && (
                <>
                    {/* 배경 오버레이 */}
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]" 
                        onClick={() => setIsNavOpen(false)} 
                    />
                    
                    {/* 실제 메뉴창 */}
                    <div className={`fixed right-0 top-[5vh] h-auto min-h-[400px] w-72 bg-zinc-800 rounded-tl-[30px] rounded-bl-[30px] shadow-2xl z-[80] transition-transform duration-300 flex flex-col p-8`}>
                        <div className="flex justify-between items-center mb-10">
                            <span className="text-zinc-400 font-bold tracking-widest text-sm uppercase">Menu</span>
                            <button onClick={() => setIsNavOpen(false)} className="text-white hover:rotate-90 transition-transform">
                                <X size={24} />
                            </button>
                        </div>

                        <nav className="flex flex-col gap-4">
                            {menuItems.map((item) => {
                                const isCurrentPage = location.pathname === item.path;
                                return (
                                    <div key={item.path} className="relative">
                                        {isCurrentPage ? (
                                            <div className="flex items-center gap-4 px-6 py-4 bg-zinc-700/50 rounded-2xl border border-zinc-600 opacity-100 cursor-default text-white">
                                                <span className="text-emerald-400">{item.icon}</span>
                                                <span className="font-bold text-lg">{item.name}</span>
                                                <div className="absolute right-4 w-2 h-2 bg-emerald-400 rounded-full" />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    navigate(item.path);
                                                    setIsNavOpen(false);
                                                }}
                                                className="w-full flex items-center gap-4 px-6 py-4 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-2xl transition-all group"
                                            >
                                                <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                                                <span className="text-lg font-medium">{item.name}</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>

                        {/* 🌟 로그아웃 영역 (경계선 포함) */}
                        <div className="mt-6 pt-6 border-t border-zinc-700">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 px-6 py-4 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-2xl transition-all group"
                            >
                                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-lg font-bold">Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
            {/* --- 🌟 뷰 전환 화살표 버튼 (오른쪽 끝) --- */}
            <button onClick={() => setViewMode(viewMode === 'stats' ? 'onion' : 'stats')} className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all shadow-xl group">
            {viewMode === 'stats' ? <ChevronRight size={40} className="group-hover:translate-x-1 transition-transform" /> : <ChevronLeft size={40} className="group-hover:-translate-x-1 transition-transform" />}
        </button>

            
            {/* --- [A] 일반 통계 모드 (Stats View) --- */}
        {viewMode === 'stats' && (
            <div className="w-[96vw] h-[92vh] flex flex-row items-stretch justify-center gap-4 animate-in fade-in slide-in-from-left duration-700">
                
                {/* [1] 왼쪽 나무 카드: 너비 45% -> 50% 확장 */}
                <div className="flex-1 h-full relative  overflow-hidden  ">
                    <div className="absolute  opacity-80
                    /* 🌟 글래스모피즘 핵심: 반투명 배경 + 블러 */
                    bg-white/10 backdrop-blur-xl 
                    /* 🌟 거울 테두리 느낌: 밝은 선 추가 */
                    border-x border-white/40 
                    /* 🌟 입체감: 은은한 그림자 */
                    shadow-[10px_0_30px_rgba(0,0,0,0.05)] rounded-full
                    top-8 left-1/2 -translate-x-1/2 z-20 px-8 py-3 ">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none rounded-full" />
                        <span className=" text-black text-2xl opacity-100 font-normal font-['Archivo']">Mind Tree</span>
                    </div>
                    <div className="w-full h-full cursor-grab active:cursor-grabbing">
                        <Canvas shadows camera={{ position: [0, 5, 33], fov: 45 }} gl={{ antialias: true }}>
                            <OrbitControls makeDefault target={[0, 8.5, 0]} minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} enableZoom={false} enablePan={false} />
                            <Suspense fallback={null}>
                                {big5Scores && <TreeOnly big5_scores={big5Scores} service_days={serviceDays} mood_stats={flower}/>}
                            </Suspense>
                            <ambientLight intensity={0.8} />
                            <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
                        </Canvas>
                    </div>
                </div>

                {/* [2] 오른쪽 정보 컨테이너: 너비 55% -> 50% 및 내부 유동적 배치 */}
                <div className="flex-1 h-full flex flex-col justify-between py-4 pr-12 pl-4 overflow-hidden">
                    <div className="flex flex-col gap-4 w-full h-full">
                        
                        {/* 상단 섹션: Tree Age & Mood (높이 비율 4:6) */}
                        <div className="flex flex-row gap-4 h-[35%] w-full">
                            {/* Tree Age 박스 */}
                            <div className="flex-[0.8] rounded-[30px] p-6 relative 
                            /* 🌟 글래스모피즘 핵심: 반투명 배경 + 블러 */
                            bg-white/20 backdrop-blur-xl 
                            /* 🌟 거울 테두리 느낌: 밝은 선 추가 */
                            border-x border-white/40 
                            /* 🌟 입체감: 은은한 그림자 */
                            shadow-[10px_0_30px_rgba(0,0,0,0.05)]
                            flex flex-col overflow-hidden">
                                <div className="absolute inset-0 rounded-[30px] bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
                                
                                {/* 1. 타이틀: 왼쪽 상단 (기본 padding p-6에 의해 자동 위치) */}
                                <div className="text-neutral-800 text-lg font-bold font-['Archivo'] flex items-center gap-2 z-10">
                                    <Sparkles size={18} className="text-emerald-600" /> 
                                    Tree Age
                                </div>
                            
                                {/* 2. 나이 정보 영역: 가로 중앙 정렬 및 하단 20% 위치 */}
                                <div 
                                    className="absolute  left-1/2 -translate-x-1/2 translate-y-1/2 flex items-baseline gap-2 whitespace-nowrap"
                                    style={{top: '5%' }} 
                                >
                                    {/* 숫자 크기는 조나단이 설정한 시원한 clamp 유지 */}
                                    <span className="text-black text-[clamp(4rem,10vw,7.5rem)] font-normal font-['Archivo'] leading-none tracking-tighter">
                                        {treeAge}
                                    </span>
                                    <span className="text-neutral-600 text-lg font-['Archivo'] font-medium opacity-80 pb-2">
                                        days old
                                    </span>
                                </div>
                            
                            </div>
                            
                            {/* Mood Trends */}
                            <div className="flex-[1.2] rounded-[30px]  p-5 flex 
                            /* 🌟 글래스모피즘 핵심: 반투명 배경 + 블러 */
                            bg-white/20 backdrop-blur-xl 
                            /* 🌟 거울 테두리 느낌: 밝은 선 추가 */
                            border-x border-white/40 
                            /* 🌟 입체감: 은은한 그림자 */
                            shadow-[10px_0_30px_rgba(0,0,0,0.05)]
                            flex-col">
                                <div className="absolute inset-0 rounded-[30px] bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
                                <div className="flex justify-between items-center mb-2">
                                <div className="text-neutral-800 text-lg font-bold font-['Archivo'] mb-2 flex items-center gap-2 z-10"><Sparkles size={18} className="text-emerald-600" /> Mood Trends</div>
                                    <button onClick={cycleMoodScope} className="px-3 py-1 bg-zinc-800/10 hover:bg-zinc-800/20 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-neutral-700 transition-all">
                                        <RotateCw size={12} /> <span>{moodScope.toUpperCase()}</span>
                                    </button>
                                </div>
                                <div className="flex-1 flex items-end justify-around pb-2 gap-2">
                                    {currentMoodStats.map((item, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1 h-full justify-end flex-1">
                                            <div className={`w-full max-w-[30px] bg-gradient-to-b ${item.color} rounded-t-full shadow-sm transition-all duration-1000 ease-out`} style={{ height: `${Math.max((item.count / maxMoodCount) * 100, 10)}%` }} />
                                            <span className="text-[10px] text-neutral-600 font-bold">{item.key.slice(0,3).toUpperCase()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 중간 섹션: Monthly Tags (높이 25%) */}
                        <div className="h-[25%] rounded-[30px]  p-6 
                        /* 🌟 글래스모피즘 핵심: 반투명 배경 + 블러 */
                        bg-white/20 backdrop-blur-xl 
                        /* 🌟 거울 테두리 느낌: 밝은 선 추가 */
                        border-x border-white/40 
                        /* 🌟 입체감: 은은한 그림자 */
                        shadow-[10px_0_30px_rgba(0,0,0,0.05)]
                        flex flex-col min-h-0">
                            <div className="absolute inset-0 rounded-[30px] bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
    
                            {/* 타이틀 영역 */}
                            <div className="text-neutral-800 text-lg font-bold font-['Archivo'] mb-2 flex items-center gap-2 z-10"><Sparkles size={18} className="text-emerald-600" /> Monthly Tags</div>
                        
                            {/* 🌟 태그 리스트: 개수에 따라 grid 열(cols)을 유동적으로 조절 */}
                            {(() => {
                                const visibleTags = tagData
                                    .filter(tag => tag.count > 0) // 0보다 큰 것만 통과
                                    .slice(0, 100);                 // 그 중 상위 6개만 선택
                        
                                return (
                                    <div className={`flex-1 grid gap-x-10 min-h-0 overflow-y-auto scrollbar-hide
                                        content-center /* 🌟 내용물을 수직 중앙에 예쁘게 모아줍니다 */
                                        ${/* 🌟 2. 필터링된 개수(visibleTags.length)를 기준으로 그리드 모양 결정 */
                                          visibleTags.length <= 2 ? 'grid-cols-1' : 
                                          visibleTags.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}
                                    `}>
                                        {visibleTags.map((tag, i) => (
                                            <div 
                                                key={i} 
                                                className={`flex flex-col justify-center transition-all duration-500 ${
                                                    visibleTags.length <= 3 ? 'gap-1' : 'gap-0.5'
                                                }`}
                                            >
                                                <div className="flex justify-between items-baseline px-1">
                                                    <span className="text-neutral-800  text-[clamp(0.5rem,1vw,1.2rem)] font-normal font-['Archivo'] truncate">
                                                        # {tag.name}
                                                    </span>
                                                    <span className="text-emerald-600 text-sm font-normal font-['Archivo']">
                                                        {tag.count}
                                                    </span>
                                                </div>
                        
                                                <div className="w-full h-2.5 bg-white/30 rounded-full overflow-hidden shadow-inner border border-white/20">
                                                    <div 
                                                        className={`h-full ${tag.color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)]`} 
                                                        style={{ width: `${(tag.count / maxTagCount) * 100}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                        
                                        {/* 🌟 3. 데이터가 없거나, 있더라도 모두 0개라서 visibleTags가 비어있을 때 메시지 출력 */}
                                        {visibleTags.length === 0 && (
                                            <div className="col-span-full text-center text-neutral-400 italic text-sm">
                                                No active tags this month.
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* --- 하단 섹션: Discovery Keywords (상위 10개 최적화) --- */}
                    <div className="flex-1 rounded-[30px] p-6 flex flex-col relative overflow-hidden
                        /* 🌟 글래스모피즘 스타일 유지 */
                        bg-white/20 backdrop-blur-xl 
                        border-x border-white/40 
                        shadow-[10px_0_30px_rgba(0,0,0,0.05)]">
                        
                        <div className="absolute inset-0 rounded-[30px] bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
                        
                        <div className="text-neutral-800 text-lg font-bold font-['Archivo'] mb-1 flex items-center gap-1 z-10">
                            <Sparkles size={18} className="text-emerald-600" /> 
                            Discovery Keywords
                        </div>
                    
                        {/* 🌟 가변 키워드 영역 */}
                        <div className="flex-1 flex flex-wrap justify-center content-center gap-x-6 gap-y-3 z-10 p-2">
                            {keywordData.length > 0 ? (
                                // 🌟 1. 데이터 복사 후 빈도수(count) 기준 내림차순 정렬
                                // 🌟 2. slice(0, 10)으로 상위 10개만 선별
                                [...keywordData]
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 10)
                                    .map((kw, i) => {
                                        const fontSize = maxKwCount === minKwCount 
                                            ? 20 
                                            : ((kw.count - minKwCount) / (maxKwCount - minKwCount)) * (24 - 12) + 12;
                                        
                                        return (
                                            <span key={i} className="cursor-default hover:text-emerald-700 hover:scale-110 transition-all duration-300 font-['Archivo'] font-bold text-neutral-700/80"
                                                style={{ fontSize: `${fontSize}px`, opacity: 0.6 + (kw.count / maxKwCount) * 0.4 }}>
                                                {kw.text}
                                            </span>
                                        );
                                    })
                            ) : (
                                <div className="text-neutral-400 italic">No keywords found.</div>
                            )}
                        </div>
                    </div>

                    </div>
                </div>
            </div>
        )}


            {/* --- [B] 양파 분석 모드 (Onion View) --- */}
        {viewMode === 'onion' && (
            // 🌟 justify-center, items-center로 화면 정중앙 배치
            <div className="w-full h-full flex flex-col items-center justify-center relative animate-in fade-in zoom-in duration-700">
                <div className="absolute text-center mb-8 top-[16vh] z-30 pointer-events-none">
                    <h2 className="text-6xl font-bold text-neutral-800 mb-2 font-['Archivo'] tracking-tight drop-shadow-sm">Deep Core Analysis</h2>
                    <p className="text-neutral-600 text-xl font-['Archivo']">Peel back another layer of your inner self. ({usageCount}/{usageLimit})</p>
                </div>

                <div className="relative w-[600px] h-[600px] flex items-center justify-center">
                    <img 
                        ref={onionRef}
                        src={`/onions/onion_stage_${onionStage}.png`} 
                        alt="Onion" 
                        onMouseMove={handleOnionMouseMove}
                        onMouseLeave={handleOnionMouseLeave}
                        onClick={handleCompositeClick}
                        className={`absolute w-[500px] h-[500px] object-contain transition-all duration-500 z-10 cursor-pointer ${isPeeling ? 'animate-shake scale-110' : ''} ${!isPeeling && isOnionHovered ? 'scale-[1.03] brightness-105' : 'scale-100 brightness-100'} ${!isPeeling && !isOnionHovered ? 'grayscale-[0.1]' : 'grayscale-0'} ${onionStage === 3 ? 'opacity-50' : ''}`}
                        crossOrigin="anonymous"
                    />
                    
                    {onionStage > 0 && !isPeeling && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div className="relative pointer-events-auto">
                                <img 
                                    ref={peelRef}
                                    src={`/onions/peel_stage_${onionStage}.png`} 
                                    alt="Peel" 
                                    onMouseMove={handlePeelMouseMove}
                                    onMouseLeave={handlePeelMouseLeave}
                                    onClick={handleCompositeClick}
                                    className={`w-[300px] h-[300px] object-contain drop-shadow-xl transition-all duration-300 cursor-pointer ${isPeelHovered ? 'brightness-110 drop-shadow-2xl' : 'brightness-100'}`}
                                    style={{ transform: `${currentPeelStyle.img} ${isPeelHovered ? 'scale(1.1)' : 'scale(1.0)'}` }}
                                    crossOrigin="anonymous"
                                />
                                <div className={`absolute pointer-events-none select-none transition-all duration-300 ${isPeelHovered ? 'opacity-100 translate-y-[-5px]' : 'opacity-80'}`} style={{ transform: `${currentPeelStyle.label} ${isPeelHovered ? 'scale(1.1)' : 'scale(1.0)'}` }}>
                                    <span className="bg-emerald-600 text-white text-xs px-4 py-2 rounded-full font-bold shadow-lg uppercase tracking-wider">Past Report</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 로딩 바 */}
                {isAnalyzing && (
                    <div className="absolute bottom-20 w-[400px] flex flex-col items-center gap-2">
                        <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-emerald-700 font-bold font-mono">{Math.floor(progress)}%</span>
                    </div>
                )}
            </div>
        )}

            {/* --- 🌟 Life Map 리포트 모달 (오버레이) --- */}
            {isModalOpen && lifeMapReport && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <div className="bg-white/90 w-full max-w-4xl max-h-[90vh] rounded-[50px] shadow-2xl p-12 overflow-y-auto relative border border-white/50 custom-scroll">
                        {/* 리포트 모달 내부의 닫기 버튼 */}
                        <button 
                            onClick={() => {
                                setIsModalOpen(false);
                                // 🌟 창을 닫는 순간 이미지를 다음 단계로 업데이트하고 DB 통계를 다시 가져옴
                                fetchData(true); 
                            }} 
                            className="fixed right-12 top-12 p-3 hover:bg-black/5 rounded-full transition-colors z-50"
                        >
                            <X size={35} color="#333" />
                        </button>
                        
                        <div className="font-['Archivo'] text-neutral-800 space-y-12">
                            <div className="text-center">
                                <h2 className="text-5xl font-bold text-emerald-800 mb-2">Life Map Report</h2>
                                Final report date: {formatDate(lifeMapReport.created_at)}
                            </div>

                            <div className="flex flex-wrap justify-center gap-3">
                                {lifeMapReport.result?.life_keywords?.map((kw, i) => (
                                    <span key={i} className="px-5 py-2 bg-emerald-100 text-emerald-700 rounded-full font-bold shadow-sm">{kw}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="bg-white/50 p-8 rounded-[30px] border border-emerald-100">
                                    <h3 className="text-2xl font-bold mb-4 text-emerald-700">Timeline</h3>
                                    <ul className="space-y-4">
                                        {lifeMapReport.result?.major_events_timeline?.map((event, i) => (
                                            <li key={i} className="text-lg border-l-4 border-emerald-200 pl-4">{event}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white/50 p-8 rounded-[30px] border border-emerald-100">
                                    <h3 className="text-2xl font-bold mb-4 text-emerald-700">Deep Patterns</h3>
                                    <ul className="space-y-4">
                                        {lifeMapReport.result?.deep_patterns?.map((pattern, i) => (
                                            <li key={i} className="text-lg list-disc ml-5">{pattern}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-8 bg-zinc-100/50 rounded-[35px]"><h3 className="text-2xl font-bold mb-3">Past vs Present</h3><p className="text-xl">{lifeMapReport.result?.past_vs_present}</p></div>
                                <div className="p-8 bg-amber-50/50 rounded-[35px]"><h3 className="text-2xl font-bold mb-3">Current Phase</h3><p className="text-xl">{lifeMapReport.result?.change_analysis}</p></div>
                            </div>

                            <div className="p-10 bg-emerald-800 text-white rounded-[40px] shadow-xl">
                                <h3 className="text-2xl font-bold mb-4 opacity-80 italic">Advice</h3>
                                <p className="text-2xl font-medium">{lifeMapReport.result?.advice_for_future}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 추가 스타일 (흔들기 애니메이션) */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shake {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(5deg); }
                    50% { transform: rotate(-5deg); }
                    75% { transform: rotate(5deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out infinite; }
            `}} />
                    </div>
                );
            }
            