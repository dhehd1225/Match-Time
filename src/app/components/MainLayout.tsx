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
    <div className="h-screen flex flex-col bg-[#F7F6F3]">
      <main className="flex-1 overflow-auto hide-scrollbar">
        <div className={hasTeams ? 'pb-28' : 'pb-20'}>
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-[#E5E2DC]">
        {hasTeams && (
          <div className="px-3 py-2 border-b border-[#E5E2DC] flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setCurrentTeamId(t.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  t.id === team?.id
                    ? 'bg-[#111] text-white font-semibold'
                    : 'bg-[#F0EEE9] text-[#555]'
                }`}
              >
                {t.id === team?.id && <span className="w-2 h-2 rounded-full bg-[#C8102E]" />}
                {t.logo?.startsWith('http') ? (
                  <img src={t.logo} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <span className="text-xs">{t.logo}</span>
                )}
                <span className="text-xs truncate max-w-[80px]">{t.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-around items-center h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { trackEvent('tab_click', { tab: item.label, path: item.path }); navigate(item.path); }}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-4 py-1 transition-colors ${
                  isActive ? 'text-[#111]' : 'text-[#CCC]'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
                {item.path === '/mypage' && pendingCount > 0 && (
                  <span className="absolute top-0.5 right-2 w-2 h-2 bg-[#C8102E] rounded-full" />
                )}
                <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
