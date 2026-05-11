import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Home, Trophy, Image, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../hooks/useAnalytics';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, teams, team, setCurrentTeamId } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const hasMultipleTeams = teams.length > 1;

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
    { icon: Image, label: '카드', path: '/cards' },
    { icon: Users, label: '마이', path: '/mypage' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <main className="flex-1 overflow-auto hide-scrollbar">
        <div className={hasMultipleTeams ? 'pb-28' : 'pb-20'}>
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#111]/95 backdrop-blur-md border-t border-white/10">
        {hasMultipleTeams && (
          <div className="px-2 py-1.5 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <span className="text-[10px] text-gray-500 shrink-0 px-1">현재 팀</span>
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setCurrentTeamId(t.id)}
                className={`shrink-0 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                  t.id === team?.id ? 'bg-[#7B2D3B] text-white font-bold' : 'bg-white/5 text-gray-400'
                }`}
              >
                {t.logo?.startsWith('http')
                  ? <img src={t.logo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                  : <span>{t.logo}</span>}
                <span className="truncate max-w-[80px]">{t.name}</span>
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
                className={`relative flex flex-col items-center justify-center gap-1 px-6 py-2 transition-colors ${
                  isActive ? 'text-[#7B2D3B]' : 'text-gray-600'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                {item.path === '/mypage' && pendingCount > 0 && (
                  <span className="absolute top-1 right-4 w-2 h-2 bg-[#7B2D3B] rounded-full" />
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
