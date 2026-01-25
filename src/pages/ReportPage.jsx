import { Edit2, ChevronRight, RotateCw,  ChevronLeft } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { TreeOnly } from '../4_reportpage/TreeScene';
import {  TreePine, Search, User, HomeIcon, X, LogOut } from "lucide-react"; // 아이콘 일괄 임포트
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useRef } from 'react';


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
    const [moodScope, setMoodScope] = useState('month'); // 현재 모드 (week | month | all)
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
            alert(`이번 달 분석 한도(${usageLimit}회)를 모두 사용하셨습니다.`);
            return;
        }
        // 0, 1단계일 때만 분석 가능
        if (onionStage >= 2) {
            alert("이미 모든 분석을 완료했습니다. 껍질을 눌러 리포트를 확인하세요!");
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
            console.error("분석 실패:", error);
            alert("분석 중 오류가 발생했습니다.");
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
                alert("저장된 분석 리포트가 없습니다.");
            }
        } catch (error) {
            console.error("조회 실패:", error);
            alert("기록을 불러오지 못했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    

    // 🌟 로그아웃 함수 추가
    const handleLogout = () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            alert("로그아웃 되었습니다.");
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
                const formattedKeywords = Object.entries(data.ai_trait_counts).map(([text, count]) => ({
                    text: text,
                    count: count
                }));
                
                // 🚀 바로 여기서 호출! 이렇게 하면 'never read' 경고가 사라집니다.
                setKeywordData(formattedKeywords); 
            }
            // ... 키워드 데이터 처리 동일
        } catch (error) {
            console.error("로드 실패:", error);
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
        <div className="w-full h-screen bg-[linear-gradient(150deg,_rgba(182,213,233,0.37),_rgba(191,205,229,0.37),_rgba(196,200,227,0.37),_rgb(201,196,225,0.37))] m-0 p-0 overflow-hidden relative flex">
            
            {/* [사이드 배너 버튼] */}
            <div 
                onClick={() => setIsNavOpen(true)}
                className="fixed right-0 top-[5vh] w-14 h-16 flex items-center justify-center z-[60] cursor-pointer group"
            >
                <div className="w-14 h-16 bg-zinc-800 rounded-tl-[20px] rounded-bl-[20px] flex items-center justify-center shadow-lg group-hover:w-16 transition-all">
                    <div className="w-9 h-9 flex items-center justify-center">
                        <User size={30} color="white" />
                    </div>
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
            <button 
                onClick={() => setViewMode(viewMode === 'stats' ? 'onion' : 'stats')}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all shadow-xl group"
            >
                {viewMode === 'stats' ? <ChevronRight size={40} className="group-hover:translate-x-1 transition-transform" /> : <ChevronLeft size={40} className="group-hover:-translate-x-1 transition-transform" />}
            </button>

            
            {/* --- [A] 일반 통계 모드 (Stats View) --- */}
            {viewMode === 'stats' && (
                <>
                    {/* 왼쪽 나무 카드 */}
                    <div className="w-[45%] h-full flex flex-col items-center justify-center overflow-hidden animate-in fade-in slide-in-from-left duration-700">

                        <div className="z-20 w-[532px] flex-col p-3 mb-1 top-[64px] absolute bg-cyan-100/25 rounded-[100px] shadow-[0px_3px_4px_0px_rgba(53,52,52,0.25)] outline outline-[1.40px] outline-white/40 inline-flex justify-center items-center gap-4">
                            <div className="text-black text-2xl font-normal font-['Archivo']">A Tree of New Beginnings</div>
                            <button className="absolute right-6 p-2 hover:bg-black/5 rounded-full transition-colors">
                                <ChevronRight size={24} color="black" />
                            </button>
                        </div>
                        
                        {/* --- 나무 렌더링 부분 --- */}
                        <div className="w-full h-full bg-transparent cursor-grab active:cursor-grabbing">
                            <Canvas shadows camera={{ position: [0, 5, 28], fov: 45 }} gl={{ antialias: true }}>
                                <OrbitControls makeDefault target={[0, 8.5, 0]} minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} enableZoom={false} enablePan={false} />
                                {/* 🌟 big5Scores를 프롭으로 넘겨줍니다. */}
                                <Suspense fallback={null}>
                                    {big5Scores && <TreeOnly big5_scores={big5Scores} />}
                                </Suspense>
                                <ambientLight intensity={0.8} />
                                <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
                            </Canvas>
                        </div>
                    </div>

                    {/* 오른쪽 정보 카드 컨테이너 */}
                    <div className="w-[55%] h-full flex flex-col items-start justify-center overflow-hidden relative p-8 animate-in fade-in slide-in-from-right duration-700">
                        <div className="flex flex-col items-center gap-6 w-full max-w-[702px]">
                            
                            <div className="flex flex-row items-center justify-between w-full gap-6">
                                {/* [1] Tree Age */}
                                <div className="w-60 min-h-[200px] relative bg-zinc-500/10 rounded-lg shadow-lg outline outline-[0.75px] outline-white/40 backdrop-blur-3xl p-6">
                                    <div className="text-neutral-700 text-xl font-normal font-['Archivo']">The age of your tree</div>
                                    <div className="mt-4 text-black text-8xl font-normal font-['Archivo'] leading-none">{treeAge}</div>
                                    <div className="absolute right-12 bottom-6 text-neutral-700 text-xl">days</div>
                                </div>
        
                                {/* [2] Mood Stats */}
                                {/* 🌟 [2] Mood Stats (수정된 섹션) */}
                                <div className="flex-1 min-h-[200px] relative bg-zinc-500/10 rounded-lg shadow-lg outline outline-[0.75px] outline-white/40 backdrop-blur-3xl p-6 transition-all">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="text-neutral-700 text-2xl font-['Archivo']">
                                            {moodScope === 'week' ? 'Weekly' : moodScope === 'month' ? 'Monthly' : 'Total'} Mood
                                        </div>
                                        {/* 토글 버튼 */}
                                        <button 
                                            onClick={cycleMoodScope}
                                            className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors flex items-center gap-2 text-sm font-['Archivo']"
                                        >
                                            <RotateCw size={16} /> 
                                            <span>{moodScope.toUpperCase()}</span>
                                        </button>
                                    </div>
        
                                    <div className="flex justify-between items-end h-24 w-full pr-40">
                                        {currentMoodStats.map((item, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2 group">
                                                {/* 0개여도 막대기가 미세하게 보이게 최소 높이 조절 가능 */}
                                                <div 
                                                    className={`w-3 bg-gradient-to-b ${item.color} rounded-full transition-all duration-700 ease-out`} 
                                                    style={{ height: `${(item.count / maxMoodCount) * 80}px`, minHeight: item.count > 0 ? '4px' : '0px' }} 
                                                />
                                                <span className="text-[10px] text-neutral-500 uppercase">{item.key[0]}</span>
                                            </div>
                                        ))}
                                    </div>
        
                                    {/* 우측 범례 영역 */}
                                    <div className="absolute right-6 top-16 flex flex-col gap-1 text-black text-sm items-end font-['Archivo']">
                                        {currentMoodStats.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 opacity-80">
                                                <span>{item.label} - {item.count}</span>
                                                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${item.color}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
        
                            {/* [3] Tag Stats */}
                            <div className="w-full min-h-[190px] relative bg-zinc-500/10 rounded-lg shadow-lg outline outline-[0.75px] outline-white/40 backdrop-blur-3xl p-6">
                                <div className="text-neutral-700 text-2xl font-normal font-['Archivo'] mb-6">Monthly tags statistics</div>
                                <div className="flex flex-wrap gap-x-8 gap-y-4 px-2">
                                    {tagData.map((tag, i) => (
                                        <div key={i} className="flex flex-col gap-1.5 w-[calc(33%-16px)] min-w-[140px]">
                                            <div className="flex justify-between text-sm font-['Archivo']">
                                                <span className="text-neutral-700"># {tag.name}</span>
                                                <span className="text-neutral-500">{tag.count}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                <div className={`h-full ${tag.color || 'bg-blue-400'} rounded-full transition-all duration-1000`} style={{ width: `${(tag.count / maxTagCount) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
        
                            {/* [4] Keyword Stats (Word Cloud) */}
                            <div className="w-full min-h-[220px] relative bg-zinc-500/10 rounded-lg shadow-lg outline outline-[0.75px] outline-white/40 backdrop-blur-3xl p-6">
                                <div className="text-neutral-700 text-2xl font-normal font-['Archivo'] mb-4">Discovery Keywords statistics</div>
                                <div className="relative w-full h-32 mt-4 flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
                                    {keywordData.map((kw, i) => {
                                        const fontSize = maxKwCount === minKwCount ? 20 : ((kw.count - minKwCount) / (maxKwCount - minKwCount)) * (36 - 14) + 14;
                                        return (
                                            <div key={i} className="cursor-default transition-all duration-300 hover:scale-125 hover:text-black text-neutral-600 font-['Archivo']"
                                                style={{
                                                    fontSize: `${fontSize}px`,
                                                    fontWeight: kw.count > maxKwCount * 0.7 ? '700' : '400',
                                                    animation: `floating 3s ease-in-out infinite`,
                                                    animationDelay: `${(i * 0.5) % 2}s`,
                                                    opacity: 0.6 + (kw.count / maxKwCount) * 0.4
                                                }}>
                                                {kw.text}
                                            </div>
                                        );
                                    })}
                                </div>
                                <style dangerouslySetInnerHTML={{ __html: `@keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }` }} />
                            </div>
                        </div>
                    </div>
                </>
                )}


            {/* --- [B] 🌟 양파 분석 모드 (Onion View) --- */}
            {/* --- [B] 🌟 양파 분석 모드 --- */}
            {viewMode === 'onion' && (
                <div className="w-full h-full flex flex-col items-center justify-start pt-32 relative animate-in fade-in zoom-in duration-700">
                    {/* 🌟 텍스트 섹션: pt-32로 전체적으로 내리고, mb-4로 양파와 간격을 좁혔습니다. */}
                    <div className="text-center mb-4 z-30 pointer-events-none transition-all">
                        <h2 className="text-5xl font-bold text-neutral-800 mb-3 font-['Archivo'] tracking-tight">Deep Core Analysis</h2>
                        <p className="text-neutral-600 text-lg font-['Archivo'] opacity-80">
                            당신의 내면을 한 꺼풀 더 벗겨보세요. ({usageCount}/{usageLimit})
                        </p>
                    </div>
    
                    {/* 🌟 겹쳐진 양파 컨테이너 */}
                    <div 
                        className="relative w-[600px] h-[550px] mt-[-100px] flex items-center justify-center"
                        style={{ cursor: 'default' }} 
                    >
                        {/* 1. 아래쪽: 양파 본체 */}
                        {console.log("onstage", onionStage)}
                        <img 
                            ref={onionRef}
                            src={`/onions/onion_stage_${onionStage}.png`} 
                            alt="Onion" 
                            // 🌟 이벤트 핸들러 연결
                            onMouseMove={handleOnionMouseMove}
                            onMouseLeave={handleOnionMouseLeave}
                            onClick={handleCompositeClick}
                            
                            // 🌟 isOnionHovered 상태에 따라 효과 적용
                            // 기존 CSS hover:scale-105를 제거하고 아래와 같이 작성합니다.
                            className={`absolute w-[480px] h-[480px] object-contain transition-all duration-500 z-10 cursor-pointer
                                ${isPeeling ? 'animate-shake scale-110' : ''}
                                ${!isPeeling && isOnionHovered ? 'scale-[1.03] brightness-105' : 'scale-100 brightness-100'}
                                ${!isPeeling && !isOnionHovered ? 'grayscale-[0.1]' : 'grayscale-0'} 
                                ${onionStage === 3 ? 'opacity-50' : ''}
                            `}
                            crossOrigin="anonymous"
                        />
    
                        {/* 2. 위쪽: 양파 껍질 (Stage 1부터 등장) */}
                        {/* 2. 위쪽: 양파 껍질 */}
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
                                        
                                        className={`w-[280px] h-[280px] object-contain drop-shadow-xl transition-all duration-300 cursor-pointer 
                                            ${isPeelHovered ? 'brightness-110 drop-shadow-2xl' : 'brightness-100'}
                                        `}
                                        style={{ 
                                            // 🌟 1단계에서 정한 기본 위치 + 호버 시 scale 효과 결합
                                            transform: `${currentPeelStyle.img} ${isPeelHovered ? 'scale(1.1)' : 'scale(1.0)'}` 
                                        }}
                                        crossOrigin="anonymous"
                                    />
                                    
                                    {/* 🌟 라벨 위치도 단계별로 동적 적용 */}
                                    <div 
                                        className={`absolute pointer-events-none select-none transition-all duration-300
                                            ${isPeelHovered ? 'opacity-100 translate-y-[-5px]' : 'opacity-80'}
                                        `}
                                        style={{ 
                                            transform: `${currentPeelStyle.label} ${isPeelHovered ? 'scale(1.1)' : 'scale(1.0)'}` 
                                        }}
                                    >
                                        <span className="bg-emerald-600 text-white text-[11px] px-3 py-1.5 rounded-full font-bold shadow-lg uppercase tracking-wider">
                                            Past Report
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
    
                    {/* 🌟 분석 중일 때의 로딩 UI (위치 최적화) */}
                    {isAnalyzing && (
                        <div className="fixed inset-0 z-[1200] flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                            <div className="mt-60 w-[450px] flex flex-col items-center gap-6 bg-white/90 p-8 rounded-[40px] shadow-2xl border border-white/50 animate-in slide-in-from-bottom-10 duration-500">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-neutral-800 font-['Archivo']">Analyzing your core...</h3>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-sm text-neutral-500">Gemini deep dive...</span>
                                            <span className="text-emerald-600 font-bold font-mono">{Math.floor(progress)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
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
                                최종 리포트 생성 날짜 : {formatDate(lifeMapReport.created_at)}
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
            