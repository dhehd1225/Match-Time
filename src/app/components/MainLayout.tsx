import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Home, Trophy, Image, Users, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../hooks/useAnalytics';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, teams, team, setCurrentTeamId } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const hasTeams = teams.length > 0;

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');
      setPendingCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navItems = [
    { icon: Home, label: '매치', path: '/matches' },
    { icon: Trophy, label: '라인업', path: '/lineup' },
    { icon: Shield, label: '팀', path: '/team' },
    { icon: Image, label: '카드', path: '/cards' },
    { icon: Users, label: '마이', path: '/mypage' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#FAFAF8]">
      <main className="flex-1 overflow-auto hide-scrollbar">
        <div className={hasTeams ? 'pb-28' : 'pb-20'}>
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200">
        {hasTeams && (
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setCurrentTeamId(t.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                  t.id === team?.id
                    ? 'bg-[#7B2D3B] text-white font-bold'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.logo?.startsWith('http') ? (
                  <img src={t.logo} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="text-sm">{t.logo}</span>
                )}
                <span className="text-xs truncate max-w-[80px]">{t.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-around items-center h-16 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { trackEvent('tab_click', { tab: item.label, path: item.path }); navigate(item.path); }}
                className={`relative flex flex-col items-center justify-center gap-1 px-5 py-2 transition-colors ${
                  isActive ? 'text-[#7B2D3B]' : 'text-gray-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#7B2D3B]/10' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                {item.path === '/mypage' && pendingCount > 0 && (
                  <span className="absolute top-1.5 right-3 w-2 h-2 bg-[#7B2D3B] rounded-full" />
                )}
                <span className={`text-[10px] ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
