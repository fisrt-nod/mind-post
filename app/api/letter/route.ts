import { NextResponse } from 'next/server';

interface GiftLetterRequest {
  tone: 'empathy' | 'mentor' | 'cheerup';
  senderName: string;
  receiverName: string;
  relationship: string;
  receiverMbti?: string;
  story: string;
  mustInclude?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GiftLetterRequest;
    const {
      tone,
      senderName,
      receiverName,
      relationship,
      receiverMbti,
      story,
      mustInclude,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인해주세요.' },
        { status: 500 }
      );
    }

    // 톤앤매너 설정
    let toneInstruction = '따뜻하고 깊은 공감과 위로를 중심으로 마음을 보듬어주는 어조';
    if (tone === 'mentor') {
      toneInstruction = '지혜롭고 통찰력 있는 인생 선배로서 명쾌한 방향과 조언을 제시하는 어조';
    } else if (tone === 'cheerup') {
      toneInstruction = '유쾌하고 당차게 기를 살려주며 확실한 자신감과 용기를 불어넣는 어조';
    }

    // 시스템 프롬프트 (우체국장 페르소나 및 작성 원칙)
    const systemPrompt = `
당신은 '마음우체국 1호점'의 지혜롭고 통찰력 있는 '우체국장'이자, 사람들의 심리와 삶을 깊이 이해하는 제3자의 인생 조언자입니다.
의뢰인(${senderName}님)이 소중한 사람(${receiverName}님)을 위해 특별히 부탁한 사연을 바탕으로, 받는 분에게 깊은 감동과 위로, 명쾌한 조언이 되는 편지를 작성하세요.

[작성 원칙]
1. 톤앤매너: ${toneInstruction}로 작성하세요.
2. 제3자 조언자의 위치: 편지의 시작에서 "${senderName}님의 간절한 의뢰를 받아 이 편지를 씁니다"라는 맥락을 자연스럽게 드러내고, 두 사람의 관계(${relationship})를 소중히 여기는 시선을 담으세요.
3. 맞춤형 통찰: 상대방의 MBTI(${receiverMbti || '알 수 없음'}) 성향과 현재 겪고 있는 상황(${story})을 입체적으로 분석하여, 뻔한 위로가 아닌 실질적이고 깊이 있는 조언을 선물하세요.
4. 편지 형식: 문단 구분을 깔끔하게 하고, 정중하면서도 품격 있는 서식으로 작성하세요.
5. P.S.(추신) 작성 규칙: 만약 의뢰인이 꼭 포함해 달라고 한 문구/약속(${mustInclude || '없음'})이 있다면, 편지 본문이 모두 끝난 뒤 맨 아래에 구분선(---)을 긋고 [💌 P.S. ${senderName}님이 꼭 전해달라고 맡긴 진심:] 항목을 만들어 해당 내용을 다정하게 강조해 주세요.
`;

    const userPrompt = `
[의뢰 정보]
- 보내는 사람 (의뢰인): ${senderName}
- 받는 사람 (수신자): ${receiverName}
- 두 사람의 관계: ${relationship}
- 받는 사람의 MBTI: ${receiverMbti || '기재되지 않음'}
- 현재 받는 사람이 겪고 있는 상황 및 사연:
"${story}"
- 꼭 포함되었으면 하는 문구/약속 (P.S. 반영용):
"${mustInclude || '없음'}"

위 정보를 바탕으로 ${receiverName}님에게 평생 소장하고 싶을 만큼 감동적이고 지혜로운 답장을 작성해주세요.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Gemini API 호출에 실패했습니다.');
    }

    const letter = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ letter });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}