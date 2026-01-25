import TreeScene from '../4_reportpage/TreeScene';
import { Edit2, TreePine, Search, User, HomeIcon, X, LogOut } from "lucide-react"; // 🌟 LogOut 추가
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

const menuItems = [
  { name: "Home", path: "/", icon: <HomeIcon size={20} /> },
  { name: "Personality Tree", path: "/tree", icon: <TreePine size={20} /> },
  { name: "Write Page", path: "/write", icon: <Edit2 size={20} /> },
  { name: "Explore Page", path: "/explore", icon: <Search size={20} /> },
  { name: "My Report Page", path: "/report", icon: <User size={20} /> },
];

export default function FullPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isNavOpen, setIsNavOpen] = useState(false);

    // 🌟 로그아웃 함수 (다른 페이지와 동일하게 추가)
    const handleLogout = () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            alert("로그아웃 되었습니다.");
            navigate('/login');
        }
    };

    return (
      <div className="relative w-full h-screen">
        {/* [사이드 배너 버튼] */}
        <div 
            onClick={() => setIsNavOpen(true)}
            className="fixed right-0 top-[5vh] w-14 h-16 flex items-center justify-center z-[60] cursor-pointer group"
        >
            <div className="w-14 h-16 bg-zinc-800 rounded-tl-[20px] rounded-bl-[20px] flex items-center justify-center shadow-lg group-hover:w-16 transition-all text-white">
                <TreePine size={30} />
            </div>
        </div>

        {/* [확장되는 메뉴 박스] */}
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

                    {/* 🌟 로그아웃 영역 추가 (일관성 유지) */}
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

        {/* 🌟 [수정] userId 프롭을 제거합니다. (TreeScene 내부에서 토큰으로 처리) */}
        <TreeScene className="w-full h-full" />
      </div>
    );
}