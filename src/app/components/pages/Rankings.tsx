import { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Medal } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  logo: string;
  rank: number;
  previousRank: number;
  powerRating: number;
}

const overallRankings: Team[] = [
  { id: 1, name: '서울대 FC', logo: '🐉', rank: 1, previousRank: 1, powerRating: 95.8 },
  { id: 2, name: '경축', logo: '🐆', rank: 2, previousRank: 3, powerRating: 92.4 },
  { id: 3, name: '연세대 FC', logo: '🦅', rank: 3, previousRank: 2, powerRating: 89.7 },
  { id: 4, name: '고려대 United', logo: '🐯', rank: 4, previousRank: 5, powerRating: 86.3 },
  { id: 5, name: '성균관대 SC', logo: '🦁', rank: 5, previousRank: 4, powerRating: 83.9 },
  { id: 6, name: '한양대 FC', logo: '⚡', rank: 6, previousRank: 6, powerRating: 79.5 },
  { id: 7, name: '중앙대 United', logo: '💙', rank: 7, previousRank: 8, powerRating: 75.2 },
  { id: 8, name: '경희대 FC', logo: '💚', rank: 8, previousRank: 7, powerRating: 71.8 },
];

const campusRankings: Team[] = [
  { id: 2, name: '경축', logo: '🐆', rank: 1, previousRank: 2, powerRating: 94.2 },
  { id: 9, name: '경영대 A팀', logo: '🔵', rank: 2, previousRank: 1, powerRating: 91.7 },
  { id: 10, name: '공대 United', logo: '⚙️', rank: 3, previousRank: 3, powerRating: 87.3 },
  { id: 11, name: '인문대 SC', logo: '📚', rank: 4, previousRank: 4, powerRating: 82.6 },
];

const regionalRankings: Team[] = [
  { id: 2, name: '경축', logo: '🐆', rank: 1, previousRank: 1, powerRating: 92.4 },
  { id: 3, name: '서울대 FC', logo: '🐉', rank: 2, previousRank: 3, powerRating: 89.7 },
  { id: 12, name: '연세대 FC', logo: '🦅', rank: 3, previousRank: 2, powerRating: 85.9 },
  { id: 13, name: '고려대 United', logo: '🐯', rank: 4, previousRank: 4, powerRating: 81.4 },
];

type RankingTab = 'overall' | 'campus' | 'regional';

export default function Rankings() {
  const [activeTab, setActiveTab] = useState<RankingTab>('overall');

  const getRankings = () => {
    switch (activeTab) {
      case 'overall':
        return overallRankings;
      case 'campus':
        return campusRankings;
      case 'regional':
        return regionalRankings;
    }
  };

  const rankings = getRankings();
  const myTeam = rankings.find(team => team.id === 2);

  const getRankChange = (current: number, previous: number) => {
    if (current < previous) return 'up';
    if (current > previous) return 'down';
    return 'stable';
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Trophy size={28} />
          팀 순위
        </h1>
        <p className="text-sm text-red-100">2026 시즌 파워 랭킹</p>
      </div>

      {/* My Team Highlight */}
      {myTeam && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-red-700 to-red-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-sm text-red-100 mb-2">우리 팀 현재 순위</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{myTeam.logo}</div>
              <div>
                <h2 className="text-2xl font-bold">{myTeam.name}</h2>
                <p className="text-sm opacity-90">파워 랭킹: {myTeam.powerRating}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold">{myTeam.rank}</div>
              <div className="text-xs opacity-90">위</div>
              {getRankChange(myTeam.rank, myTeam.previousRank) === 'up' && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={16} />
                  <span className="text-xs">↑{myTeam.previousRank - myTeam.rank}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('overall')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'overall'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            전체 순위
          </button>
          <button
            onClick={() => setActiveTab('campus')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'campus'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            교내 순위
          </button>
          <button
            onClick={() => setActiveTab('regional')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'regional'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            지역 순위
          </button>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-4 py-3 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 border-b border-gray-200">
            <div className="col-span-1 text-center">순위</div>
            <div className="col-span-7">팀</div>
            <div className="col-span-3 text-center">파워 랭킹</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {rankings.map((team) => {
              const rankChange = getRankChange(team.rank, team.previousRank);
              const isMyTeam = team.id === 2;

              return (
                <div
                  key={team.id}
                  className={`px-4 py-3 grid grid-cols-12 gap-2 items-center transition-colors ${
                    isMyTeam ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1 text-center">
                    {team.rank <= 3 ? (
                      <Medal className={getMedalColor(team.rank)} size={24} />
                    ) : (
                      <span className="text-lg font-bold text-gray-700">{team.rank}</span>
                    )}
                  </div>

                  {/* Team */}
                  <div className="col-span-7 flex items-center gap-2">
                    <div className="text-2xl">{team.logo}</div>
                    <div>
                      <p className={`font-semibold text-sm ${isMyTeam ? 'text-red-700' : 'text-gray-900'}`}>
                        {team.name}
                      </p>
                    </div>
                  </div>

                  {/* Power Rating */}
                  <div className="col-span-3 text-center">
                    <span className="text-base font-bold text-red-600">{team.powerRating}</span>
                  </div>

                  {/* Trend */}
                  <div className="col-span-1 flex justify-center">
                    {rankChange === 'up' && (
                      <TrendingUp size={18} className="text-green-500" />
                    )}
                    {rankChange === 'down' && (
                      <TrendingDown size={18} className="text-red-500" />
                    )}
                    {rankChange === 'stable' && (
                      <Minus size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">파워 랭킹 안내</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" />
              <span>순위 상승</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" />
              <span>순위 하락</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus size={16} className="text-gray-400" />
              <span>순위 변동 없음</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * 파워 랭킹은 0-100 사이의 점수로 표시됩니다<br />
            * 경기 결과, 상대 팀 강도, 최근 폼 등을 종합적으로 고려합니다
          </p>
        </div>
      </div>
    </div>
  );
}
