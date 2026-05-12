export interface Profile {
  id: string;
  kakao_id: string;
  name: string;
  avatar_url: string | null;
  position: string;
  back_number: number | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  description: string | null;
  instagram: string | null;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  appearances: number;
  goals: number;
  assists: number;
  rating: number;
  joined_at: string;
  // joined relations
  profile?: Profile;
  team?: Team;
}

export interface Match {
  id: string;
  date: string;
  time: string;
  region: string | null;
  stadium: string;
  format: string;
  level: string;
  home_team_id: string;
  away_team_id: string | null;
  status: 'open' | 'pending' | 'confirmed' | 'completed';
  created_by: string;
  created_at: string;
  // joined relations
  home_team?: Team;
  away_team?: Team | null;
}

export interface MatchAttendance {
  id: string;
  match_id: string;
  user_id: string;
  status: 'attending' | 'not-attending' | null;
}

export interface Lineup {
  id: string;
  match_id: string;
  quarter: '1Q' | '2Q' | '3Q' | '4Q';
  formation: string;
  positions: LineupPosition[];
  updated_by: string | null;
  updated_at: string;
}

export interface LineupPosition {
  slot_index: number;
  user_id: string | null;
  x: number;
  y: number;
}

export interface ChatRoom {
  id: string;
  type: 'team' | 'captain_dm' | 'match';
  team_id: string | null;
  match_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  // joined
  sender?: Profile;
}

export interface MatchApplication {
  id: string;
  match_id: string;
  team_id: string;
  applied_by: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  // joined
  team?: Team;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'match_request' | 'team_join' | 'match_vote' | 'info';
  title: string;
  description: string | null;
  related_id: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Ranking {
  id: string;
  team_id: string;
  category: 'overall' | 'campus' | 'regional';
  power_rating: number;
  rank: number;
  previous_rank: number;
  updated_at: string;
  // joined
  team?: Team;
}
