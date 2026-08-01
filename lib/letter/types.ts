export type BoxType = 'lover' | 'friend' | 'work' | 'future';

export interface LetterRequest {
  nickname: string;
  mbti: string;
  partnerMbti?: string; // 선택 사항 (없을 수도 있으므로 '?' 필수)
  boxType: BoxType;
  story: string;
}

export type AiProvider = 'openai' | 'gemini';