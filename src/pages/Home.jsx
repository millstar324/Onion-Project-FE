import inputLogo from '../1_homepage/입력창로고.png';
import { Edit2, TreePine, Search, User, HomeIcon, X, LogOut } from "lucide-react"; // 아이콘 일괄 임포트
import RadiatingButton from '../components/RadiatingButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import api from '../api/axios';
import { useEffect } from 'react';

// [최적화] menuItems를 컴포넌트 외부로 이동하여 리렌더링 방지
// 아이콘 이름을 HomeIcon 등으로 변경하여 Home 컴포넌트와 충돌 피하기
const menuItems = [
    { name: "Home", path: "/", icon: <HomeIcon size={20} /> },
    { name: "Personality Tree", path: "/tree", icon: <TreePine size={20} /> },
    { name: "Write Page", path: "/write", icon: <Edit2 size={20} /> },
    { name: "Explore Page", path: "/explore", icon: <Search size={20} /> },
    { name: "My Report Page", path: "/report", icon: <User size={20} /> },
];

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [userStats, setUserStats] = useState(null);

    // 🌟 로그인 정보 가져오기
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;

    useEffect(() => {
        if (isLoggedIn) {
            const fetchHomeData = async () => {
                try {
                    const response = await api.get('/user/stats');
                    setUserStats(response.data);
                    console.log(userStats);
                } catch (error) {
                    console.error("Home Data Load Failed:", error);
                    // 토큰이 만료되었을 경우 로그아웃 처리
                    if (error.response?.status === 401) {
                        handleLogout();
                    }
                }
            };
            fetchHomeData();
        }
    }, [isLoggedIn, token]);

    // 🌟 로그아웃 함수 추가
    const handleLogout = () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            alert("로그아웃 되었습니다.");
            navigate('/login');
        }
    };

    // 🌟 클릭 핸들러: 로그인 여부에 따라 이동 경로 결정
    const handleJournalInputClick = () => {
        if (isLoggedIn) {
            navigate('/write');
        } else {
            alert("로그인이 필요한 서비스입니다.");
            navigate('/login');
        }
    };

    const handleButtonClick = () => navigate('/tree');
    const handleWriteClick = () => navigate('/write');
    const handleExploreClick = () => navigate('/explore');
    const handleMyReportClick = () => navigate('/report');

    return (
        <div className="min-h-screen w-full bg-brand-bg m-0 p-0 overflow-x-hidden relative">
            
            {/* [사이드 배너 버튼] */}
            <div 
                onClick={() => setIsNavOpen(true)}
                className="fixed right-0 top-[5vh] w-14 h-16 flex items-center justify-center z-[60] cursor-pointer group"
            >
                <div className="w-14 h-16 bg-zinc-800 rounded-tl-[20px] rounded-bl-[20px] flex items-center justify-center shadow-lg group-hover:w-16 transition-all">
                    <div className="w-9 h-9 flex items-center justify-center">
                        <HomeIcon size={30} color="white" />
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

            {/* 나머지 메인 UI 컨텐츠 */}
            <div className="text-center text-neutral-900/75 text-5xl font-normal font-['Archivo'] leading-5 pt-[20vh]">
                How was your day?
            </div>  

            {/* 🌟 수정된 입력창 영역 */}
            <div className="flex flex-col items-center justify-center pt-[5vh]">
                <div 
                    onClick={handleJournalInputClick}
                    className="cursor-pointer hover:scale-[1.02] transition-all flex flex-col w-[821px] h-20 relative bg-[linear-gradient(150deg,_rgba(238,202,94,0.37),_rgba(241,219,128,0.37),_rgba(252,227,186,0.37),_rgba(242,224,220,0.37))] rounded-full shadow-[inset_0px_0px_30px_8px_#FFFBEF,_0px_1px_30px_10px_rgba(255,255,255,0.25),_inset_10px_10px_29px_0px_rgba(251,165,99,0.10)] backdrop-blur-[10px] inline-flex justify-start items-center gap-48 overflow-hidden"
                >
                    <div className="left-[94px] top-[31px] absolute text-center justify-start text-neutral-900/60 text-3xl font-normal font-['Archivo'] leading-5">
                        {/* 🌟 로그인 여부에 따른 문구 조건부 렌더링 */}
                        {isLoggedIn ? (
                            <span className="text-neutral-900 font-medium">
                            {/* 🌟 userStats에서 닉네임이 오면 그걸 보여주고, 없으면 user_id 노출 */}
                            {userStats?.nickname || localStorage.getItem('user_id')}님 안녕하세요.
                        </span>
                        ) : (
                            "Start writing your journal."
                        )}
                    </div>
                    <img className="w-16 h-16 left-[13px] top-[5.50px] absolute" src={inputLogo} alt="logo" />
                </div>
            </div>
            
            <div className="fixed bottom-[10vh] right-20 z-10">
                <RadiatingButton onClick={handleButtonClick} />
            </div>

            <div className="flex justify-center items-center gap-10 absolute bottom-[100pt] w-full h-[300px] mt-10">
                {/* Write 버튼 */}
                <div className="flex flex-col items-center group">
                    <div onClick={handleWriteClick} className="cursor-pointer hover:scale-110 transition-transform flex w-24 h-24 items-center justify-center rotate-[-28.64deg] bg-[linear-gradient(190deg,_rgba(253,216,42,0.5),_rgba(229,215,111,0.5),_rgba(217,215,145,0.5),_rgba(205,214,179,0.5))] rounded-full shadow-[inset_0px_0px_5px_5px_#FFFBEF,0px_1px_30px_10px_rgba(255,255,255,0.25)] outline outline-[3px] outline-offset-[-3px] outline-white/50 backdrop-blur-[10px]">
                        <div className="rotate-[28.64deg]"><Edit2 size="40" color="white" /></div>
                    </div>
                    <div className="mt-4 text-neutral-900/75 text-xl font-normal font-['Archivo']">Write</div>
                </div>
                
                {/* Explore 버튼 */}
                <div className="flex flex-col items-center group">
                    <div onClick={handleExploreClick} className="cursor-pointer hover:scale-110 transition-transform flex w-24 h-24 items-center justify-center rotate-[-28.64deg] bg-[linear-gradient(190deg,_rgba(203,235,173,0.5),_rgba(171,225,176,0.5),_rgba(151,217,178,0.5),_rgba(131,211,183,0.5))] rounded-full shadow-[inset_10px_10px_29px_0px_rgba(255,255,255,0.25)] outline outline-[3px] outline-offset-[-3px] outline-white/50 backdrop-blur-[10px]">
                        <div className="rotate-[28.64deg]"><Search size="40" color="white" /></div>
                    </div>
                    <div className="mt-4 text-neutral-900/75 text-xl font-normal font-['Archivo']">Explore</div>
                </div>
                
                {/* My Report 버튼 */}
                <div className="flex flex-col items-center group">
                    <div onClick={handleMyReportClick} className="cursor-pointer hover:scale-110 transition-transform flex w-24 h-24 items-center justify-center rotate-[-28.64deg] bg-[linear-gradient(190deg,_rgba(182,213,233,0.5),_rgba(191,205,229,0.5),_rgba(196,200,227,0.5),_rgba(201,196,225,0.5))] rounded-full shadow-[inset_10px_10px_29px_0px_rgba(255,255,255,0.25)] outline outline-[3px] outline-offset-[-3px] outline-white/50 backdrop-blur-[10px]">
                        <div className="rotate-[28.64deg]"><User size="40" color="white" /></div>
                    </div>
                    <div className="mt-4 text-neutral-900/75 text-xl font-normal font-['Archivo']">My Report</div>
                </div>
            </div>
        </div>
    );
}