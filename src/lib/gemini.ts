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

  const playerNames = players.map(p => p.name);

  const prompt = `축구 전술 전문가로서 최적의 포메이션과 라인업을 추천하세요.

선수 목록:
${playerList}

가능한 포메이션: ${formations.join(', ')}
경기 포맷: ${format || '11v11'}
총 선수 수: ${players.length}명

규칙:
1. 반드시 각 선수의 기본 포지션(GK/DF/MF/FW)에 맞는 슬롯에 배치
2. 희망 포지션이 있으면 우선 반영 (1순위 > 2순위 > 3순위)
3. GK 선수 → GK 슬롯, DF 선수 → DF 슬롯, MF 선수 → MF 슬롯, FW 선수 → FW 슬롯
4. 해당 포지션 슬롯이 꽉 차면 인접 포지션에 배치
5. 포메이션 슬롯 수만큼만 lineup에 포함 (나머지는 교체)
6. 선수가 슬롯보다 적으면 있는 만큼만 배치하고 나머지는 빈 문자열("")

[중요] lineup 배열의 선수 이름은 반드시 아래 목록에서 정확히 복사하세요. 한 글자도 변경하지 마세요:
${JSON.stringify(playerNames)}

JSON만 응답 (설명/질문 금지):
{
  "formation": "포메이션",
  "lineup": ["GK선수이름", "DF1이름", "DF2이름", ..., "MF1이름", ..., "FW1이름", ...],
  "reason": "추천 이유 (한국어 2~3문장)"
}

lineup 순서: GK → DF(왼→오) → MF(왼→오) → FW(왼→오)`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
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
