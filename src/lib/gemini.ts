const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

interface PlayerInput {
  name: string;
  position: string; // GK, DF, MF, FW
  number: number;
  preferredPositions?: string[]; // e.g. ['CAM', 'CM', 'RW']
  desiredQuarters?: string[]; // e.g. ['1Q', '3Q']
}

interface AIRecommendation {
  formation: string;
  lineup: string[]; // player names in position order
  reason: string;
}

export async function recommendFormation(
  players: PlayerInput[],
  format: string,
): Promise<AIRecommendation> {
  const isSmall = format?.includes('8') || format?.includes('6');
  const formations = isSmall ? ['3-3-1'] : ['4-3-3', '4-4-2', '3-4-3'];

  const playerList = players.map(p => {
    let desc = `- ${p.name} (기본포지션: ${p.position}, 등번호 ${p.number})`;
    if (p.preferredPositions && p.preferredPositions.length > 0) {
      desc += ` | 희망포지션: ${p.preferredPositions.map((pos, i) => `${i + 1}순위 ${pos}`).join(', ')}`;
    }
    if (p.desiredQuarters && p.desiredQuarters.length < 4) {
      desc += ` | 희망 쿼터: ${p.desiredQuarters.join(', ')}`;
    }
    return desc;
  }).join('\n');

  const prompt = `당신은 축구 전술 전문가입니다. 아래 선수 명단과 각 선수의 희망 포지션을 고려하여 최적의 포메이션과 라인업을 추천해주세요.

선수 목록:
${playerList}

사용 가능한 포메이션: ${formations.join(', ')}
경기 포맷: ${format || '11v11'}

규칙:
1. 각 선수의 희망 포지션 우선순위를 최대한 반영하세요 (1순위 > 2순위 > 3순위)
2. 희망 포지션이 없는 선수는 기본 포지션 기준으로 배치
3. GK가 있으면 반드시 골키퍼 자리에 배치
4. 선수가 희망한 특정 쿼터에 배치하도록 노력하세요 (예: 1Q,3Q 희망 → 해당 쿼터에 우선 배치)
5. 포메이션의 포지션 수만큼만 선수를 배치 (나머지는 교체 선수)
6. 모든 선수의 희망을 100% 반영할 수 없을 때는 팀 밸런스를 우선
7. 선수가 포메이션 인원보다 적어도 반드시 추천하세요. 빈 자리는 lineup에 포함하지 마세요.

중요: 어떤 상황이든 반드시 아래 JSON 형식으로만 응답하세요. 설명, 사과, 질문 없이 JSON만:
{
  "formation": "선택한 포메이션",
  "lineup": ["GK 자리 선수이름", "DF1 선수이름", "DF2 선수이름", ...],
  "reason": "이 포메이션과 배치를 선택한 이유. 선수 희망을 어떻게 반영했는지 설명 (한국어, 2~3문장)"
}

lineup 배열 순서: GK → DF(왼→오) → MF(왼→오) → FW(왼→오)`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error('API 호출 한도 초과. 잠시 후 다시 시도해주세요.');
    throw new Error(err?.error?.message || 'AI API 호출 실패');
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 응답 파싱 실패');

  return JSON.parse(jsonMatch[0]) as AIRecommendation;
}
