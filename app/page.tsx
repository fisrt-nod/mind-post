'use client';

import React, { useState, useEffect } from 'react';
import type { BoxType } from '@/lib/letter/types';

type Step = 'form' | 'loading' | 'letter';

export default function Home() {
  const [selectedBox, setSelectedBox] = useState<BoxType>('future');
  const [step, setStep] = useState<Step>('form');

  const [nickname, setNickname] = useState('');
  const [mbti, setMbti] = useState('');
  const [partnerMbti, setPartnerMbti] = useState('');
  const [story, setStory] = useState('');

  const [letterText, setLetterText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story.trim()) return alert('고민 내용을 적어주세요!');
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setStep('loading');
    setLetterText('');
    setDisplayText('');

    try {
      const response = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          mbti: mbti.trim(),
          partnerMbti: partnerMbti.trim(),
          boxType: selectedBox,
          story: story.trim(),
        }),
      });

      let data: { letter?: string; error?: string } = {};
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        data = (await response.json()) as { letter?: string; error?: string };
      } else {
        const text = await response.text();
        throw new Error(
          text || `서버 오류가 발생했습니다. (${response.status})`,
        );
      }

      if (!response.ok) {
        throw new Error(data.error ?? '답장 생성에 실패했습니다.');
      }

      if (!data.letter?.trim()) {
        throw new Error('답장을 받지 못했습니다.');
      }

      setLetterText(data.letter);
      setStep('letter');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '답장 생성 중 오류가 발생했습니다.';
      setErrorMessage(message);
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ★ 1. 타이핑 속도 10배 개선: 10ms마다 3글자씩 시원하고 빠르게 출력
  useEffect(() => {
    if (step !== 'letter' || !letterText) return;

    let index = 0;
    setDisplayText('');
    setIsTypingComplete(false);

    const timer = setInterval(() => {
      if (index < letterText.length) {
        const nextChars = letterText.slice(index, index + 3);
        setDisplayText((prev) => prev + nextChars);
        index += 3;
      } else {
        clearInterval(timer);
        setIsTypingComplete(true);
      }
    }, 10);

    return () => clearInterval(timer);
  }, [step, letterText]);

  // ★ 2. 텍스트 복사 기능
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      alert('편지 내용이 클립보드에 복사되었습니다! 💌');
    } catch {
      alert('복사에 실패했습니다. 직접 드래그해서 복사해 주세요.');
    }
  };

  // ★ 3. 웹 공유 기능 (모바일/지원 브라우저에선 네이티브 공유창, 비지원 시 복사)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '마음우체국 1호점에서 온 답장 📮',
          text: letterText,
        });
      } catch {
        // 사용자가 공유 창을 취소한 경우 조용히 넘김
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#332C27] flex flex-col items-center justify-between p-4 sm:p-8 font-sans">
      <header className="w-full max-w-xl text-center my-6">
        <div className="inline-block bg-[#E86F51] text-white text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm">
          📮 마음우체국 1호점
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A2421] tracking-tight">
          당신의 고민에 다정한 답장을 드립니다
        </h1>
        <p className="text-sm text-[#7A6E65] mt-2 font-light">
          말하지 못한 진심, 100% 익명으로 안전하게 마음의 길을 찾아보세요.
        </p>
      </header>

      {step === 'form' && (
        <div className="w-full max-w-xl bg-white border border-[#EFEAE1] rounded-2xl p-6 sm:p-8 shadow-sm">
          <label className="block text-xs font-bold text-[#7A6E65] mb-2 uppercase tracking-wider">
            1. 고민에 맞는 우체통을 골라주세요
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {(
              [
                { id: 'lover', label: '연인 우체통', icon: '📮' },
                { id: 'friend', label: '친구 우체통', icon: '📬' },
                { id: 'work', label: '일터 우체통', icon: '💼' },
                { id: 'future', label: '미래 우체통', icon: '🧭' },
              ] as const
            ).map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => setSelectedBox(box.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                  selectedBox === box.id
                    ? 'border-[#E86F51] bg-[#FFF5F2] text-[#E86F51] shadow-sm'
                    : 'border-[#EFEAE1] bg-[#FAF8F5] text-[#7A6E65] hover:bg-white'
                }`}
              >
                <span className="text-xl mb-1">{box.icon}</span>
                {box.label}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-[#F5C6BC] bg-[#FFF5F2] px-4 py-3 text-sm text-[#B42318]"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 닉네임, 나의 MBTI, 상대방 MBTI 입력 영역 */}
            <div
              className={`grid grid-cols-1 ${
                selectedBox === 'future' ? 'md:grid-cols-2' : 'md:grid-cols-3'
              } gap-4 my-6 transition-all`}
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  닉네임 (당신이 불릴 이름)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 민서"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  나의 MBTI
                </label>
                <input
                  type="text"
                  value={mbti}
                  onChange={(e) => setMbti(e.target.value)}
                  placeholder="예: ENFP"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors"
                />
              </div>

              {selectedBox !== 'future' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    상대방의 MBTI (선택)
                  </label>
                  <input
                    type="text"
                    value={partnerMbti}
                    onChange={(e) => setPartnerMbti(e.target.value)}
                    placeholder="예: ISTJ"
                    className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    💡 짐작 가는 성향을 적어주시면 두 분의 성격 차이를 더 깊이
                    분석해 드려요.
                  </p>
                </div>
              )}
            </div>

            {/* 고민 작성 (Textarea) 영역 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                밤새 당신을 잠 못 들게 한 고민을 적어주세요
              </label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                rows={6}
                placeholder="현재 상황이나 마음을 아프게 한 이유, 주고받은 말이나 행동을 최대한 구체적이고 자세히 적어주실수록, 우체국장이 당신의 마음에 딱 맞는 깊이 있고 다정한 답장을 써드릴 수 있어요."
                className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors resize-none"
              />
            </div>

            <div className="bg-[#FFFDF9] border border-[#F3E2CE] rounded-xl p-3.5 text-xs text-[#8A6A4B] leading-relaxed">
              💡 <strong>우표 한 장 값인 단돈 900원</strong>으로 마음의 길을
              찾아보세요. 작성해주신 소중한 사연은 즉시 익명 처리되어 안전하게
              분석됩니다.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E86F51] hover:bg-[#D85F41] disabled:bg-[#E86F51]/60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              ✉️ 우표 붙이고 900원에 답장 바로 열어보기
            </button>
          </form>
        </div>
      )}

      {step === 'loading' && (
        <div className="w-full max-w-xl bg-white border border-[#EFEAE1] rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center my-12">
          <div className="w-16 h-16 border-4 border-[#F3E2CE] border-t-[#E86F51] rounded-full animate-spin mb-6"></div>
          <h3 className="text-lg font-serif font-bold text-[#2A2421] mb-2">
            우체국장이 당신의 마음을 읽는 중입니다...
          </h3>
          <p className="text-xs text-[#7A6E65] font-light animate-pulse">
            사연에 담긴 진심을 분석해 다정한 답장을 작성하고 있어요. 잠시만
            기다려주세요.
          </p>
        </div>
      )}

      {step === 'letter' && (
        <div className="w-full max-w-xl bg-[#FFFDF9] border border-[#EFEAE1] rounded-2xl p-6 sm:p-10 shadow-lg my-4 relative">
          <div className="border-b border-[#F3E2CE] pb-4 mb-6 flex justify-between items-center">
            <span className="text-xs font-bold text-[#E86F51] bg-[#FFF5F2] px-2.5 py-1 rounded-md">
              📮 마음우체국 답장 도착
            </span>
            <span className="text-xs text-[#7A6E65]">익명 영구 파기 보장</span>
          </div>

          {/* ★ 4. 폰트 변경: font-serif, tracking-wide, leading-8 을 적용해 품격 있는 서체 표현 */}
          <div className="font-serif text-sm sm:text-base text-[#2A2421] leading-8 tracking-wide whitespace-pre-line min-h-[300px]">
            {displayText}
            {!isTypingComplete && (
              <span className="inline-block w-1.5 h-4 bg-[#E86F51] ml-1 animate-ping"></span>
            )}
          </div>

          {/* ★ 5. 버튼 구성 변경: 복사하기 + 공유하기 + 다시 작성하기 */}
          <div className="mt-8 pt-6 border-t border-[#F3E2CE] flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleCopyText}
              className="flex-1 bg-[#FAF8F5] border border-[#EFEAE1] hover:bg-[#EFEAE1] text-[#332C27] text-xs font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              📋 텍스트 복사하기
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-[#FAF8F5] border border-[#EFEAE1] hover:bg-[#EFEAE1] text-[#332C27] text-xs font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              📤 답장 공유하기
            </button>
            <button
              onClick={() => {
                setStep('form');
                setStory('');
                setLetterText('');
                setDisplayText('');
                setErrorMessage('');
              }}
              className="flex-1 bg-[#E86F51] text-white text-xs font-bold py-3.5 rounded-xl hover:bg-[#D85F41] transition-all flex items-center justify-center gap-1.5"
            >
              ✉️ 다른 사연 보내기
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-[#7A6E65] my-6 font-light">
        © 마음우체국 1호점 | 당신의 밤이 조금 더 다정해지기를 마음 담아
        배달합니다.
      </footer>
    </main>
  );
}