/* eslint-disable */
import { Edit2, TreePine, Search, User, HomeIcon, X, LogOut, ChevronDown } from "lucide-react";
import RadiatingButton from '../components/RadiatingButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';

// 메뉴 아이템 설정
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
    
    // 🌟 Hover 상태 관리 (입력창 확장용)
    const [isInputHovered, setIsInputHovered] = useState(false);

    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;

    useEffect(() => {
        if (isLoggedIn) {
            const fetchHomeData = async () => {
                try {
                    const response = await api.get('/user/stats');
                    setUserStats(response.data);
                } catch (error) {
                    console.error("Home Data Load Failed:", error);
                    if (error.response?.status === 401) {
                        handleLogout();
                    }
                }
            };
            fetchHomeData();
        }
    }, [isLoggedIn, token]);

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Log out?',
            text: "See you next time! 🌳",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6D5B98',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Log out',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });
        
        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            await Swal.fire({
                title: 'Logged out.',
                icon: 'success',
                confirmButtonColor: '#6D5B98'
            });
            navigate('/login');
        }
    };

    // 네비게이션 핸들러
    const handleNavigation = (path) => {
        if (!isLoggedIn && path === '/write') {
             Swal.fire({
                title: 'Login required.',
                icon: 'warning',
                confirmButtonColor: '#6D5B98'
            });
            navigate('/login');
            return;
        }
        navigate(path);
    };

    const handleButtonClick = () => navigate('/tree');

    return (
        <div className="min-h-screen w-full bg-brand-bg m-0 p-0 overflow-x-hidden relative">
            
            {/* [사이드 메뉴 버튼 - 기존 유지] */}
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

            {/* [사이드 메뉴 확장 - 기존 유지] */}
            {isNavOpen && (
                <>
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]" onClick={() => setIsNavOpen(false)} />
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
                                        <button
                                            onClick={() => { navigate(item.path); setIsNavOpen(false); }}
                                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${isCurrentPage ? 'bg-zinc-700/50 border border-zinc-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                                        >
                                            <span className={`${isCurrentPage ? 'text-emerald-400' : 'group-hover:scale-110'} transition-transform`}>{item.icon}</span>
                                            <span className={`text-lg ${isCurrentPage ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </nav>
                        <div className="mt-6 pt-6 border-t border-zinc-700">
                            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-2xl transition-all group">
                                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-lg font-bold">Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* [메인 콘텐츠] */}
            <main className="flex flex-col items-center w-full mt-[25vh]">
                
                {/* 제목 */}
                <div className="text-center text-neutral-900/75 text-[clamp(2rem,5vw,3rem)] font-normal font-['Archivo'] leading-tight mb-[4vh]">
                    How was your day?
                </div>
    
                {/* 🌟 [핵심 변경 사항: 인터랙티브 확장형 입력창] 
                   기존의 입력창과 아래의 3개 버튼을 하나로 통합했습니다.
                */}
                <div className="relative w-full max-w-[800px] px-4 flex justify-center z-50">
                    <div 
                        onMouseEnter={() => setIsInputHovered(true)}
                        onMouseLeave={() => setIsInputHovered(false)}
                        className={`
                            relative w-full bg-white/80 backdrop-blur-2xl 
                            shadow-[0px_20px_60px_-10px_rgba(0,0,0,0.1)] border border-white/40
                            transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
                            ${isInputHovered ? 'rounded-[2.5rem] h-[240px]' : 'rounded-full h-[4.5rem]'}
                        `}
                    >
                        {/* 🌈 배경 무지개 글로우 (내부에서 은은하게 비치도록 수정) */}
                        
                        <div 
        className={`absolute inset-0 p-[2.5px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            bg-gradient-to-r from-[#FFB3BA] via-[#FFDFBA] via-[#FFFFBA] via-[#BAFFC9] via-[#BAE1FF] via-[#BDB2FF] to-[#E0C3FC]
            ${isInputHovered ? 'opacity-0 invisible' : 'opacity-80 visible'}
            ${isInputHovered ? 'rounded-[2.5rem]' : 'rounded-full'} 
        `}
        style={{ 
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', 
            maskComposite: 'exclude',
            WebkitMaskComposite: 'destination-out' 
        }}
    />
                        {/* 1. 상단: 입력창 영역 (항상 보임) */}
                        <div 
                            
                            className="w-full h-[4.5rem] flex items-center px-6 cursor-pointer hover:bg-white/50 transition-colors"
                        >
                            {/* 로고 */}
                            <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-white/50 rounded-full shadow-sm">
                                <img className="w-6 h-6 object-contain" src="/onions/main_icon6.png" alt="logo" />
                            </div>

                            {/* 텍스트 */}
                            <div className="ml-5 flex-1 text-left">
                                {isLoggedIn ? (
                                    <span className="text-[#2D2D2D] text-xl font-medium font-['Archivo']">
                                        Hello, {userStats?.nickname || "User"}.
                                    </span>
                                ) : (
                                    <span className="text-neutral-400 text-xl font-normal font-['Archivo']">
                                        Start writing your journal...
                                    </span>
                                )}
                            </div>

                            {/* 상태 표시 아이콘 (확장시 회전) */}
                            <div className={`transition-transform duration-500 ${isInputHovered ? 'rotate-180' : 'rotate-0'}`}>
                                <ChevronDown size={20} className="text-neutral-400" />
                            </div>
                        </div>

                        {/* 2. 하단: 숨겨진 네비게이션 버튼들 (확장 시 나타남) */}
                        <div className={`
                            absolute top-[5rem] left-0 w-full px-6 pb-6
                            flex justify-between gap-4 transition-all duration-500 delay-75
                            ${isInputHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
                        `}>
                            {/* Write Button */}
                            <button 
                                onClick={() => handleNavigation('/write')}
                                className="flex-1 group/btn relative h-[140px] bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] rounded-[2rem] hover:shadow-lg transition-all duration-300 border border-white flex flex-col items-center justify-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-100/50 to-rose-100/50 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                <div className="z-10 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover/btn:scale-110 transition-transform duration-300">
                                    <Edit2 size={24} className="text-rose-400" />
                                </div>
                                <span className="z-10 text-neutral-600 font-medium">Write</span>
                            </button>

                            {/* Explore Button */}
                            <button 
                                onClick={() => handleNavigation('/explore')}
                                className="flex-1 group/btn relative h-[140px] bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] rounded-[2rem] hover:shadow-lg transition-all duration-300 border border-white flex flex-col items-center justify-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-green-100/50 to-sky-100/50 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                <div className="z-10 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover/btn:scale-110 transition-transform duration-300">
                                    <Search size={24} className="text-emerald-400" />
                                </div>
                                <span className="z-10 text-neutral-600 font-medium">Explore</span>
                            </button>

                            {/* My Report Button */}
                            <button 
                                onClick={() => handleNavigation('/report')}
                                className="flex-1 group/btn relative h-[140px] bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] rounded-[2rem] hover:shadow-lg transition-all duration-300 border border-white flex flex-col items-center justify-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 to-purple-100/50 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                <div className="z-10 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover/btn:scale-110 transition-transform duration-300">
                                    <User size={24} className="text-indigo-400" />
                                </div>
                                <span className="z-10 text-neutral-600 font-medium">Report</span>
                            </button>
                        </div>

                    </div>
                </div>

            </main> 
            
            <div className="fixed bottom-[10vh] right-20 z-10">
                <RadiatingButton onClick={handleButtonClick} />
            </div>
        </div>
    );
}