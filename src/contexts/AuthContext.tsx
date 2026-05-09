import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setAnalyticsUser, trackEvent } from '../hooks/useAnalytics';
import type { Profile, Team, TeamMember } from '../lib/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  teams: Team[];
  memberships: TeamMember[];
  team: Team | null; // 현재 선택된 팀
  membership: TeamMember | null; // 현재 선택된 팀의 멤버십
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setCurrentTeamId: (teamId: string) => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  teams: [],
  memberships: [],
  team: null,
  membership: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  setCurrentTeamId: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<TeamMember[]>([]);
  const [currentTeamId, setCurrentTeamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);

      // 모든 팀 멤버십 로드
      const { data: memberData } = await supabase
        .from('team_members')
        .select('*, team:teams(*)')
        .eq('user_id', userId);

      if (memberData && memberData.length > 0) {
        setMemberships(memberData);
        const allTeams = memberData.map(m => m.team).filter(Boolean) as Team[];
        setTeams(allTeams);

        // 현재 선택된 팀이 없거나 더이상 소속이 아니면 첫 번째 팀 선택
        setCurrentTeamIdState(prev => {
          if (prev && allTeams.some(t => t.id === prev)) return prev;
          return allTeams[0]?.id || null;
        });
      } else {
        setMemberships([]);
        setTeams([]);
        setCurrentTeamIdState(null);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setAnalyticsUser(s.user.id);
        trackEvent('login');
        loadProfile(s.user.id);
      } else {
        setAnalyticsUser(null);
        setProfile(null);
        setTeams([]);
        setMemberships([]);
        setCurrentTeamIdState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setTeams([]);
    setMemberships([]);
    setCurrentTeamIdState(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const setCurrentTeamId = (teamId: string) => {
    setCurrentTeamIdState(teamId);
  };

  // 현재 선택된 팀과 멤버십
  const team = teams.find(t => t.id === currentTeamId) || null;
  const membership = memberships.find(m => m.team_id === currentTeamId) || null;

  return (
    <AuthContext.Provider value={{
      user, session, profile,
      teams, memberships,
      team, membership,
      loading, signOut, refreshProfile, setCurrentTeamId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
