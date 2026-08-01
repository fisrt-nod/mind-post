import { buildLetterPrompt } from './prompts';
import type { AiProvider, LetterRequest } from './types';

// 안정적으로 작동하는 공식 Gemini 모델 목록으로 수정
const GEMINI_FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
] as const;

function getProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'gemini') return 'gemini';
  return 'openai';
}

function parseProviderError(
  provider: 'openai' | 'gemini',
  status: number,
  body: string,
): string {
  let apiMessage: string | undefined;

  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string };
    };
    apiMessage = parsed.error?.message;
  } catch {
    // non-JSON error body
  }

  if (status === 429) {
    return 'AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나, Google AI Studio에서 할당량을 확인해주세요.';
  }

  if (status === 401 || status === 403) {
    return `${provider === 'gemini' ? 'GEMINI' : 'OPENAI'}_API_KEY가 유효하지 않습니다. .env.local 설정을 확인해주세요.`;
  }

  if (status === 404) {
    return '설정된 AI 모델을 찾을 수 없습니다. GEMINI_MODEL 또는 OPENAI_MODEL 값을 확인해주세요.';
  }

  if (apiMessage) {
    return apiMessage.split('\n')[0] ?? apiMessage;
  }

  return `${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API 오류 (${status})`;
}

// 429(할당량 초과)뿐만 아니라 404(모델명 없음) 오류 시에도 백업 모델을 시도하도록 수정
function isRetryableError(status: number, body: string): boolean {
  if (status === 404) return true; // 모델명이 잘못된 경우 다음 모델 시도
  if (status !== 429) return false;

  return (
    body.includes('RESOURCE_EXHAUSTED') ||
    body.includes('quota') ||
    body.includes('Quota exceeded')
  );
}

async function generateWithOpenAI(
  system: string,
  user: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.',
    );
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      parseProviderError('openai', response.status, errorBody),
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const letter = data.choices?.[0]?.message?.content?.trim();
  if (!letter) {
    throw new Error('OpenAI가 빈 답장을 반환했습니다.');
  }

  return letter;
}

async function callGeminiModel(
  model: string,
  apiKey: string,
  system: string,
  user: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.8,
      },
    }),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    const error = new Error(
      parseProviderError('gemini', response.status, responseBody),
    );
    (error as Error & { status?: number; body?: string }).status =
      response.status;
    (error as Error & { status?: number; body?: string }).body = responseBody;
    throw error;
  }

  const data = JSON.parse(responseBody) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const letter = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!letter) {
    throw new Error('Gemini가 빈 답장을 반환했습니다.');
  }

  return letter;
}

async function generateWithGemini(
  system: string,
  user: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.',
    );
  }

  // 기본 모델을 안정적인 gemini-1.5-flash로 설정
  const primaryModel = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const models = [
    primaryModel,
    ...GEMINI_FALLBACK_MODELS.filter((model) => model !== primaryModel),
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await callGeminiModel(model, apiKey, system, user);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      lastError = error;

      const status = (error as Error & { status?: number }).status;
      const body = (error as Error & { body?: string }).body ?? '';

      // 404나 429 에러 발생 시 로그를 남기고 다음 모델로 넘어감
      if (isRetryableError(status ?? 0, body)) {
        console.warn(`[letter] ${model} error (${status}), trying fallback model...`);
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError ??
    new Error(
      '사용 가능한 Gemini 모델 호출에 실패했습니다. 잠시 후 다시 시도해주세요.',
    )
  );
}

export async function generateLetter(request: LetterRequest): Promise<string> {
  const { system, user } = buildLetterPrompt(request);
  const provider = getProvider();

  if (provider === 'gemini') {
    return generateWithGemini(system, user);
  }

  return generateWithOpenAI(system, user);
}