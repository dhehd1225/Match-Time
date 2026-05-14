import { UserPlus, X } from 'lucide-react';

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
  position: string;
  status: 'attending' | 'not-attending' | null;
  preferredPositions?: string[];
  desiredQuarters?: string[];
}

const posColors: Record<string, string> = { GK: 'text-yellow-500', DF: 'text-blue-400', MF: 'text-emerald-400', FW: 'text-red-400' };

interface Props {
  players: PlayerInfo[];
  allPlayers: PlayerInfo[];
  isTeamCreator: boolean;
  onRemovePlayer: (playerId: string) => void;
  onShowAddModal: () => void;
}

export default function LineupMembers({ players, allPlayers, isTeamCreator, onRemovePlayer, onShowAddModal }: Props) {
  const attendingPlayers = players.filter(p => p.status === 'attending');
  const notAttendingPlayers = players.filter(p => p.status === 'not-attending');
  const pendingPlayers = players.filter(p => p.status === null);
  const tempPlayers = allPlayers.filter(p => p.id.startsWith('temp-'));

  return (
    <div className="px-4 py-4 space-y-4">
      {[
        { title: '참여', players: attendingPlayers, dot: 'bg-emerald-500', label: () => <span className="text-emerald-400 text-[11px]">참여</span> },
        { title: '불참', players: notAttendingPlayers, dot: 'bg-[#7B2D3B]', label: () => <span className="text-red-400 text-[11px]">불참</span> },
        { title: '미응답', players: pendingPlayers, dot: 'bg-gray-600', label: () => <span className="text-[#CCC] text-[11px]">미응답</span> },
      ].filter(g => g.players.length > 0).map(group => (
        <div key={group.title}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
            <span className="text-xs font-semibold text-[#CCC]">{group.title} ({group.players.length})</span>
          </div>
          <div className="space-y-1">
            {group.players.map(player => (
              <div key={player.id} className="bg-white p-3 rounded-xl border border-[#E5E2DC]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#888] w-5 text-center">{player.number}</span>
                    <span className="text-sm text-[#111]">{player.name}</span>
                    <span className={`text-[10px] font-bold ${posColors[player.position]}`}>{player.position}</span>
                  </div>
                  {group.label()}
                </div>
                {player.status === 'attending' && player.preferredPositions && player.preferredPositions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-7">
                    {player.preferredPositions.map((pos, i) => {
                      const labels: Record<string, string> = { FW: 'FW', MF: 'MF', DF: 'DF', GK: 'GK' };
                      return (
                        <span key={pos} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium">
                          {i + 1}순위 {labels[pos] || pos}
                        </span>
                      );
                    })}
                    {player.desiredQuarters && player.desiredQuarters.length < 4 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                        {player.desiredQuarters.join('·')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {tempPlayers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-[#CCC]">추가 선수 ({tempPlayers.length})</span>
          </div>
          <div className="space-y-1">
            {tempPlayers.map(player => (
              <div key={player.id} className="bg-white p-3 rounded-xl border border-[#E5E2DC]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#888] w-5 text-center">{player.number}</span>
                    <span className="text-sm text-[#111]">{player.name}</span>
                    <span className={`text-[10px] font-bold ${posColors[player.position]}`}>{player.position}</span>
                  </div>
                  {isTeamCreator && (
                    <button onClick={() => onRemovePlayer(player.id)}
                      className="text-[#CCC] hover:text-red-400 p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isTeamCreator && (
        <button onClick={onShowAddModal}
          className="w-full py-3 rounded-xl border border-dashed border-[#E5E2DC] text-sm text-[#CCC] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <UserPlus size={16} /> 선수 추가
        </button>
      )}

      {players.length === 0 && tempPlayers.length === 0 && (
        <p className="text-center text-[#CCC] py-8 text-sm">팀원 정보가 없습니다</p>
      )}
    </div>
  );
}
