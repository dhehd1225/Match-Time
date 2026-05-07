import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Clock, Users, Lock, Check, X, ShieldCheck } from 'lucide-react';
import JerseyIcon from '../JerseyIcon';

interface Player {
  id: number;
  name: string;
  number: number;
  position: string;
  status: 'attending' | 'not-attending' | null;
}

const matchData: Record<string, {
  date: string;
  time: string;
  opponent: string;
  opponentLogo: string;
  location: string;
  format: string;
  formation: string;
  players: Player[];
}> = {
  '1': {
    date: '5월 10일 (토)', time: '17:00', opponent: '서울대 FC', opponentLogo: '🐉',
    location: '서울 도봉 커뮤니티 스포츠센터', format: '11vs11', formation: '4-3-3',
    players: [
      { id: 1, name: '김민수', number: 1, position: 'GK', status: 'attending' },
      { id: 2, name: '이준호', number: 2, position: 'DF', status: 'attending' },
      { id: 3, name: '박성훈', number: 3, position: 'DF', status: 'attending' },
      { id: 4, name: '최지훈', number: 4, position: 'DF', status: null },
      { id: 5, name: '정대현', number: 5, position: 'DF', status: 'attending' },
      { id: 6, name: '강태양', number: 6, position: 'MF', status: 'attending' },
      { id: 7, name: '윤재민', number: 7, position: 'MF', status: 'attending' },
      { id: 8, name: '한동수', number: 8, position: 'MF', status: 'not-attending' },
      { id: 9, name: '서준영', number: 9, position: 'FW', status: 'attending' },
      { id: 10, name: '오현우', number: 10, position: 'FW', status: 'attending' },
      { id: 11, name: '임태규', number: 11, position: 'FW', status: 'attending' },
    ],
  },
  '2': {
    date: '5월 11일 (일)', time: '17:00', opponent: '연세대 FC', opponentLogo: '🦅',
    location: '서울 송파 올림픽공원 축구장', format: '11vs11', formation: '4-4-2',
    players: [
      { id: 1, name: '김민수', number: 1, position: 'GK', status: 'attending' },
      { id: 2, name: '이준호', number: 2, position: 'DF', status: 'attending' },
      { id: 3, name: '박성훈', number: 3, position: 'DF', status: 'attending' },
      { id: 4, name: '최지훈', number: 4, position: 'DF', status: 'attending' },
      { id: 5, name: '정대현', number: 5, position: 'DF', status: 'attending' },
      { id: 6, name: '강태양', number: 6, position: 'MF', status: 'attending' },
      { id: 7, name: '윤재민', number: 7, position: 'MF', status: 'attending' },
      { id: 8, name: '한동수', number: 8, position: 'MF', status: 'attending' },
      { id: 9, name: '서준영', number: 9, position: 'FW', status: 'attending' },
      { id: 10, name: '오현우', number: 10, position: 'FW', status: 'attending' },
      { id: 11, name: '임태규', number: 11, position: 'FW', status: 'attending' },
    ],
  },
  '3': {
    date: '5월 12일 (월)', time: '18:00', opponent: '고려대 United', opponentLogo: '🐯',
    location: '서울 은평 월드컵경기장 보조구장', format: '11vs11', formation: '4-3-3',
    players: [
      { id: 1, name: '김민수', number: 1, position: 'GK', status: 'attending' },
      { id: 2, name: '이준호', number: 2, position: 'DF', status: 'attending' },
      { id: 3, name: '박성훈', number: 3, position: 'DF', status: null },
      { id: 4, name: '최지훈', number: 4, position: 'DF', status: 'not-attending' },
      { id: 5, name: '정대현', number: 5, position: 'DF', status: 'attending' },
      { id: 6, name: '강태양', number: 6, position: 'MF', status: 'attending' },
      { id: 7, name: '윤재민', number: 7, position: 'MF', status: null },
      { id: 8, name: '한동수', number: 8, position: 'MF', status: 'attending' },
      { id: 9, name: '서준영', number: 9, position: 'FW', status: 'attending' },
      { id: 10, name: '오현우', number: 10, position: 'FW', status: null },
      { id: 11, name: '임태규', number: 11, position: 'FW', status: 'not-attending' },
    ],
  },
  '4': {
    date: '5월 13일 (화)', time: '18:00', opponent: '성균관대 SC', opponentLogo: '🦁',
    location: '경기 성남 탄천종합운동장', format: '8vs8', formation: '3-3-1',
    players: [
      { id: 1, name: '김민수', number: 1, position: 'GK', status: 'attending' },
      { id: 2, name: '이준호', number: 2, position: 'DF', status: 'attending' },
      { id: 3, name: '박성훈', number: 3, position: 'DF', status: null },
      { id: 5, name: '정대현', number: 5, position: 'DF', status: 'attending' },
      { id: 6, name: '강태양', number: 6, position: 'MF', status: null },
      { id: 7, name: '윤재민', number: 7, position: 'MF', status: 'attending' },
      { id: 9, name: '서준영', number: 9, position: 'FW', status: 'attending' },
      { id: 10, name: '오현우', number: 10, position: 'FW', status: null },
    ],
  },
  '5': {
    date: '5월 14일 (수)', time: '18:00', opponent: '한양대 FC', opponentLogo: '⚡',
    location: '서울 강동 천호공원 축구장', format: '11vs11', formation: '3-4-3',
    players: [
      { id: 1, name: '김민수', number: 1, position: 'GK', status: 'attending' },
      { id: 2, name: '이준호', number: 2, position: 'DF', status: 'attending' },
      { id: 3, name: '박성훈', number: 3, position: 'DF', status: 'attending' },
      { id: 4, name: '최지훈', number: 4, position: 'DF', status: 'attending' },
      { id: 5, name: '정대현', number: 5, position: 'DF', status: 'attending' },
      { id: 6, name: '강태양', number: 6, position: 'MF', status: 'attending' },
      { id: 7, name: '윤재민', number: 7, position: 'MF', status: 'attending' },
      { id: 8, name: '한동수', number: 8, position: 'MF', status: 'attending' },
      { id: 9, name: '서준영', number: 9, position: 'FW', status: 'attending' },
      { id: 10, name: '오현우', number: 10, position: 'FW', status: 'attending' },
      { id: 11, name: '임태규', number: 11, position: 'FW', status: 'attending' },
    ],
  },
};

const formations: Record<string, { x: number; y: number }[]> = {
  '4-3-3': [
    { x: 50, y: 90 },
    { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 },
    { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 },
    { x: 30, y: 20 }, { x: 50, y: 20 }, { x: 70, y: 20 },
  ],
  '4-4-2': [
    { x: 50, y: 90 },
    { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
    { x: 40, y: 20 }, { x: 60, y: 20 },
  ],
  '3-4-3': [
    { x: 50, y: 90 },
    { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
    { x: 30, y: 20 }, { x: 50, y: 20 }, { x: 70, y: 20 },
  ],
  '3-3-1': [
    { x: 50, y: 90 },
    { x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 },
    { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 },
    { x: 50, y: 20 },
  ],
};

const positionColors: Record<string, string> = {
  GK: 'bg-yellow-500 text-yellow-900',
  DF: 'bg-blue-500 text-white',
  MF: 'bg-green-500 text-white',
  FW: 'bg-red-500 text-white',
};

export default function LineupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'members' | 'formation'>('members');

  // 회장 여부 (실제로는 로그인 유저 정보에서 가져옴)
  const isPresident = true;

  const match = matchData[id || '1'];
  if (!match) return null;

  const [formation, setFormation] = useState(match.formation);

  const attendingPlayers = match.players.filter(p => p.status === 'attending');
  const notAttendingPlayers = match.players.filter(p => p.status === 'not-attending');
  const pendingPlayers = match.players.filter(p => p.status === null);

  const positions = formations[formation] || formations['4-3-3'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <button onClick={() => navigate('/lineup')} className="mb-3 p-1 hover:bg-white/20 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-4xl">{match.opponentLogo}</div>
          <div>
            <h1 className="text-xl font-bold">vs {match.opponent}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-red-100">
              <span>{match.date}</span>
              <span>{match.time}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match Info */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} />
          <span>{match.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={14} />
          <span>{match.format}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white px-4 pt-3 pb-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            참여 팀원
          </button>
          <button
            onClick={() => setActiveTab('formation')}
            className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'formation'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            포메이션
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'members' ? (
        <div className="px-4 py-4 space-y-4">
          {/* Attending */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h3 className="font-semibold text-sm text-gray-900">참여 ({attendingPlayers.length}명)</h3>
            </div>
            <div className="space-y-2">
              {attendingPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {player.number}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{player.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${positionColors[player.position]}`}>
                        {player.position}
                      </span>
                    </div>
                  </div>
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <Check size={16} /> 참여
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Not Attending */}
          {notAttendingPlayers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <h3 className="font-semibold text-sm text-gray-900">불참 ({notAttendingPlayers.length}명)</h3>
              </div>
              <div className="space-y-2">
                {notAttendingPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-400 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {player.number}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{player.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${positionColors[player.position]}`}>
                          {player.position}
                        </span>
                      </div>
                    </div>
                    <span className="text-red-600 text-sm flex items-center gap-1">
                      <X size={16} /> 불참
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pendingPlayers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <h3 className="font-semibold text-sm text-gray-900">미응답 ({pendingPlayers.length}명)</h3>
              </div>
              <div className="space-y-2">
                {pendingPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {player.number}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-500">{player.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${positionColors[player.position]}`}>
                          {player.position}
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm">미응답</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-4">
          {/* Formation Selector - 회장만 변경 가능 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900">포메이션</h3>
              {!isPresident && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Lock size={12} />
                  <span>회장만 변경 가능</span>
                </div>
              )}
              {isPresident && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <ShieldCheck size={12} />
                  <span>회장</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {Object.keys(formations).map((f) => (
                <button
                  key={f}
                  onClick={() => isPresident && setFormation(f)}
                  disabled={!isPresident}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                    formation === f
                      ? 'bg-red-600 text-white shadow-md'
                      : isPresident
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Soccer Field */}
          <div
            className="relative bg-gradient-to-b from-green-600 to-green-500 rounded-2xl shadow-xl overflow-hidden"
            style={{ aspectRatio: '3/4' }}
          >
            {/* Field Lines */}
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-24 border-2 border-white/40 border-b-0" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-24 border-2 border-white/40 border-t-0" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-12 border-2 border-white/40 border-b-0" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-12 border-2 border-white/40 border-t-0" />
            </div>

            {/* Players on Field */}
            {positions.map((pos, idx) => {
              const player = attendingPlayers[idx];
              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  {player ? (
                    <div className="flex flex-col items-center">
                      <JerseyIcon
                        number={player.number}
                        primaryColor="#DC143C"
                        secondaryColor="#000000"
                        size="md"
                      />
                      <div className="mt-1 bg-white px-2 py-0.5 rounded shadow-sm">
                        <span className="text-xs font-semibold text-gray-900">{player.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-14 bg-gray-300/50 border-2 border-white border-dashed rounded shadow-lg flex items-center justify-center">
                        <span className="text-white text-xl">?</span>
                      </div>
                      <div className="mt-1 bg-white/70 px-2 py-0.5 rounded shadow-sm">
                        <span className="text-xs text-gray-400">미정</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 bg-white p-3 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">배치된 선수</span>
              <span className="font-bold text-gray-900">{Math.min(attendingPlayers.length, positions.length)}/{positions.length}명</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
