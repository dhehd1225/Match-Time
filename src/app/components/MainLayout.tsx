import { Outlet, useNavigate, useLocation } from 'react-router';
import { Home, Trophy, Users } from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: '매치', path: '/matches' },
    { icon: Trophy, label: '라인업', path: '/lineup' },
    { icon: Users, label: '팀', path: '/team' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-200 shadow-2xl">
        <div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all ${
                  isActive ? 'text-red-600' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-1 w-12 h-1 bg-red-600 rounded-b-full" />
                )}
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
