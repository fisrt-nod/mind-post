import { generateLetter } from '@/lib/letter/generate-letter';
import type { BoxType, LetterRequest } from '@/lib/letter/types';
import { NextResponse } from 'next/server';

const VALID_BOX_TYPES: BoxType[] = ['lover', 'friend', 'work', 'future'];

function isBoxType(value: unknown): value is BoxType {
  return (
    typeof value === 'string' &&
    VALID_BOX_TYPES.includes(value as BoxType)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LetterRequest>;

    const nickname = body.nickname?.trim();
    const mbti = body.mbti?.trim();
    const story = body.story?.trim();
    const boxType = body.boxType;

    if (!nickname || !mbti || !story) {
      return NextResponse.json(
        { error: '닉네임, MBTI, 고민 내용을 모두 입력해주세요.' },
        { status: 400 },
      );
    }

    if (!isBoxType(boxType)) {
      return NextResponse.json(
        { error: '올바른 우체통을 선택해주세요.' },
        { status: 400 },
      );
    }

    if (story.length > 3000) {
      return NextResponse.json(
        { error: '고민 내용은 3000자 이내로 작성해주세요.' },
        { status: 400 },
      );
    }

    const letter = await generateLetter({
      nickname,
      mbti,
      boxType,
      story,
    });

    return NextResponse.json({ letter });
  } catch (error) {
    console.error('[letter API]', error);

    const message =
      error instanceof Error
        ? error.message
        : '답장 생성 중 오류가 발생했습니다.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
