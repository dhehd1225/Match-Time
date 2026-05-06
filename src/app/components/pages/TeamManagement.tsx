import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Award, Target, UserPlus } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  number: number;
  position: string;
  appearances: number;
  goals: number;
  assists: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

const players: Player[] = [
  { id: 1, name: '김민수', number: 1, position: 'GK', appearances: 15, goals: 0, assists: 0, rating: 7.8, trend: 'up' },
  { id: 2, name: '이준호', number: 2, position: 'DF', appearances: 14, goals: 2, assists: 3, rating: 7.5, trend: 'stable' },
  { id: 3, name: '박성훈', number: 3, position: 'DF', appearances: 15, goals: 1, assists: 2, rating: 7.6, trend: 'up' },
  { id: 4, name: '최지훈', number: 4, position: 'DF', appearances: 12, goals: 0, assists: 1, rating: 7.2, trend: 'down' },
  { id: 5, name: '정대현', number: 5, position: 'DF', appearances: 13, goals: 3, assists: 1, rating: 7.4, trend: 'stable' },
  { id: 6, name: '강태양', number: 6, position: 'MF', appearances: 15, goals: 5, assists: 7, rating: 8.2, trend: 'up' },
  { id: 7, name: '윤재민', number: 7, position: 'MF', appearances: 14, goals: 4, assists: 6, rating: 7.9, trend: 'up' },
  { id: 8, name: '한동수', number: 8, position: 'MF', appearances: 11, goals: 2, assists: 4, rating: 7.3, trend: 'stable' },
  { id: 9, name: '서준영', number: 9, position: 'FW', appearances: 15, goals: 12, assists: 3, rating: 8.5, trend: 'up' },
  { id: 10, name: '오현우', number: 10, position: 'FW', appearances: 14, goals: 10, assists: 5, rating: 8.3, trend: 'stable' },
  { id: 11, name: '임태규', number: 11, position: 'FW', appearances: 13, goals: 8, assists: 4, rating: 7.8, trend: 'down' },
];

const positionColors: Record<string, string> = {
  GK: 'bg-yellow-500',
  DF: 'bg-blue-500',
  MF: 'bg-green-500',
  FW: 'bg-red-500',
};

export default function TeamManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('전체');

  const positions = ['전체', 'GK', 'DF', 'MF', 'FW'];

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = selectedPosition === '전체' || player.position === selectedPosition;
    return matchesSearch && matchesPosition;
  });

  const topScorer = players.reduce((prev, current) =>
    (prev.goals > current.goals) ? prev : current
  );

  const topAssist = players.reduce((prev, current) =>
    (prev.assists > current.assists) ? prev : current
  );

  const mvp = players.reduce((prev, current) =>
    (prev.rating > current.rating) ? prev : current
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">경축</h1>
        <p className="text-sm text-red-100">팀 선수 명단 및 통계</p>
      </div>

      {/* Team Stats Cards */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <Award className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-xs text-gray-600 mb-1">MVP</p>
          <p className="font-bold text-sm">{mvp.name}</p>
          <p className="text-xs text-gray-500">{mvp.rating}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <Target className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-xs text-gray-600 mb-1">득점왕</p>
          <p className="font-bold text-sm">{topScorer.name}</p>
          <p className="text-xs text-gray-500">{topScorer.goals}골</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center">
          <UserPlus className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-xs text-gray-600 mb-1">도움왕</p>
          <p className="font-bold text-sm">{topAssist.name}</p>
          <p className="text-xs text-gray-500">{topAssist.assists}개</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="선수 이름 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedPosition === pos
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Players Table */}
      <div className="px-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-4 py-3 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 border-b border-gray-200">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">선수명</div>
            <div className="col-span-1 text-center">POS</div>
            <div className="col-span-2 text-center">출전</div>
            <div className="col-span-2 text-center">득점</div>
            <div className="col-span-2 text-center">도움</div>
            <div className="col-span-1 text-center"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map(player => (
                <div
                  key={player.id}
                  className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 transition-colors"
                >
                  {/* Number */}
                  <div className="col-span-1 pr-2">
                    <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {player.number}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="col-span-3 pl-1">
                    <p className="font-semibold text-sm text-gray-900">{player.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-gray-500">평점 {player.rating}</span>
                      {player.trend === 'up' && <TrendingUp size={12} className="text-green-500" />}
                      {player.trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
                    </div>
                  </div>

                  {/* Position Badge */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`${positionColors[player.position]} text-white text-xs px-2 py-1 rounded font-semibold`}>
                      {player.position}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-gray-900">{player.appearances}</span>
                    <span className="text-xs text-gray-500 ml-1">경기</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-bold text-red-600">{player.goals}</span>
                    <span className="text-xs text-gray-500 ml-1">골</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-bold text-green-600">{player.assists}</span>
                    <span className="text-xs text-gray-500 ml-1">도움</span>
                  </div>

                  {/* Action */}
                  <div className="col-span-1 text-center">
                    <button className="text-blue-600 hover:text-blue-700">
                      <span className="text-xl">›</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Player Button */}
      <div className="px-4 mt-4">
        <button className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all">
          <UserPlus size={20} />
          새 선수 추가
        </button>
      </div>
    </div>
  );
}
