import type { Dispatch, SetStateAction } from 'react';
import { Plus, X, Trophy } from 'lucide-react';

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
}

interface GoalEntry { scorer_id: string; assister_id: string; minute: string; }

interface Props {
  homeLabel: string;
  awayLabel: string;
  homeScore: string;
  awayScore: string;
  setHomeScore: (v: string) => void;
  setAwayScore: (v: string) => void;
  goalEntries: GoalEntry[];
  setGoalEntries: Dispatch<SetStateAction<GoalEntry[]>>;
  allPlayers: PlayerInfo[];
  isTeamCreator: boolean;
  resultSaving: boolean;
  matchCompleted: boolean;
  handleSaveResult: () => void;
}

export default function LineupResult({
  homeLabel, awayLabel, homeScore, awayScore, setHomeScore, setAwayScore,
  goalEntries, setGoalEntries, allPlayers, isTeamCreator,
  resultSaving, matchCompleted, handleSaveResult,
}: Props) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* 스코어 입력 */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
        <p className="text-xs font-bold text-[#CCC] mb-3">스코어</p>
        <div className="flex items-center gap-4 justify-center">
          <div className="text-center">
            <p className="text-[10px] text-[#888] mb-1">{homeLabel}</p>
            <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)}
              disabled={!isTeamCreator}
              className="w-16 text-center text-3xl font-black bg-[#F0EEE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-lg py-2 text-[#111] outline-none disabled:opacity-50" />
          </div>
          <span className="text-[#CCC] font-bold text-2xl mt-5">:</span>
          <div className="text-center">
            <p className="text-[10px] text-[#888] mb-1">{awayLabel}</p>
            <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)}
              disabled={!isTeamCreator}
              className="w-16 text-center text-3xl font-black bg-[#F0EEE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-lg py-2 text-[#111] outline-none disabled:opacity-50" />
          </div>
        </div>
      </div>

      {/* 골 / 어시스트 기록 */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
        <p className="text-xs font-bold text-[#CCC] mb-3">골 · 어시스트 기록</p>
        {goalEntries.map((entry, idx) => (
          <div key={idx} className="mb-3 bg-[#F0EEE9] rounded-lg p-3 relative">
            {isTeamCreator && (
              <button onClick={() => setGoalEntries(prev => prev.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 text-[#CCC] hover:text-red-400"><X size={14} /></button>
            )}
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-[#888] mb-1">득점자</p>
                <select value={entry.scorer_id} onChange={e => {
                  const v = e.target.value;
                  setGoalEntries(prev => prev.map((g, i) => i === idx ? { ...g, scorer_id: v } : g));
                }} disabled={!isTeamCreator}
                  className="w-full bg-[#F0EEE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-lg px-3 py-2 text-sm text-[#111] outline-none appearance-none disabled:opacity-50">
                  <option value="" className="bg-white text-[#111]">선택</option>
                  {allPlayers.map(p => (
                    <option key={p.id} value={p.id} className="bg-white text-[#111]">{p.name} ({p.number})</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-[#888] mb-1">어시스트</p>
                <select value={entry.assister_id} onChange={e => {
                  const v = e.target.value;
                  setGoalEntries(prev => prev.map((g, i) => i === idx ? { ...g, assister_id: v } : g));
                }} disabled={!isTeamCreator}
                  className="w-full bg-[#F0EEE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-lg px-3 py-2 text-sm text-[#111] outline-none appearance-none disabled:opacity-50">
                  <option value="" className="bg-white text-[#111]">없음</option>
                  {allPlayers.filter(p => p.id !== entry.scorer_id).map(p => (
                    <option key={p.id} value={p.id} className="bg-white text-[#111]">{p.name} ({p.number})</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-[#888] mb-1">시간 (분)</p>
                <input type="number" value={entry.minute} onChange={e => {
                  const v = e.target.value;
                  setGoalEntries(prev => prev.map((g, i) => i === idx ? { ...g, minute: v } : g));
                }} disabled={!isTeamCreator} placeholder="예: 32"
                  className="w-20 bg-[#F0EEE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-lg px-3 py-2 text-sm text-[#111] outline-none text-center disabled:opacity-50" />
              </div>
            </div>
          </div>
        ))}

        {isTeamCreator && (
          <button onClick={() => setGoalEntries(prev => [...prev, { scorer_id: '', assister_id: '', minute: '' }])}
            className="w-full py-2.5 rounded-lg border border-dashed border-[#E5E2DC] text-[#888] text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform">
            <Plus size={14} /> 골 추가
          </button>
        )}

        {goalEntries.length === 0 && !isTeamCreator && (
          <p className="text-center text-[#CCC] text-xs py-4">기록된 골이 없습니다</p>
        )}
      </div>

      {/* 저장 버튼 */}
      {isTeamCreator && (
        <button onClick={handleSaveResult} disabled={resultSaving}
          className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
          <Trophy size={16} />
          {resultSaving ? '저장 중...' : '경기 결과 저장'}
        </button>
      )}

      {/* 저장된 결과 요약 */}
      {matchCompleted && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
          <p className="text-emerald-400 text-sm font-bold">경기 결과 저장됨</p>
        </div>
      )}
    </div>
  );
}
