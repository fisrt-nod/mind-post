'use client';

import React, { useState, useEffect } from 'react';

type AdviceTone = 'empathy' | 'mentor' | 'cheerup';
type Step = 'form' | 'loading' | 'letter';

export default function Home() {
  const [selectedTone, setSelectedTone] = useState<AdviceTone>('empathy');
  const [step, setStep] = useState<Step>('form');

  // 선물용 마음우체국 입력 상태
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [receiverMbti, setReceiverMbti] = useState('');
  const [story, setStory] = useState('');
  const [mustInclude, setMustInclude] = useState('');

  // 답장 및 UI 상태
  const [letterText, setLetterText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !receiverName.trim()) {
      return alert('보내는 사람과 받는 사람의 이름을 적어주세요!');
    }
    if (!story.trim()) {
      return alert('상대방이 겪고 있는 상황과 마음을 적어주세요!');
    }
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
          tone: selectedTone,
          senderName: senderName.trim(),
          receiverName: receiverName.trim(),
          relationship: relationship.trim(),
          receiverMbti: receiverMbti.trim(),
          story: story.trim(),
          mustInclude: mustInclude.trim(),
        }),
      });

      let data: { letter?: string; error?: string } = {};
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        data = (await response.json()) as { letter?: string; error?: string };
      } else {
        const text = await response.text();
        throw new Error(text || `서버 오류가 발생했습니다. (${response.status})`);
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
        error instanceof Error ? error.message : '답장 생성 중 오류가 발생했습니다.';
      setErrorMessage(message);
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 타이핑 효과 (10ms마다 3글자씩 빠르게 출력)
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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      alert('편지 내용이 클립보드에 복사되었습니다! 💌');
    } catch {
      alert('복사에 실패했습니다. 직접 드래그해서 복사해 주세요.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${receiverName}님을 위해 마음우체국에서 온 답장 📮`,
          text: letterText,
        });
      } catch {
        // 공유 취소 시 무시
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
          소중한 사람에게 다정한 마음을 선물하세요
        </h1>
        <p className="text-sm text-[#7A6E65] mt-2 font-light">
          지혜로운 우체국장이 당신의 마음을 담아 가장 따뜻하고 명쾌한 위로 편지를 써드립니다.
        </p>
      </header>

      {step === 'form' && (
        <div className="w-full max-w-xl bg-white border border-[#EFEAE1] rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* 1. 조언 톤앤매너 선택 */}
          <label className="block text-xs font-bold text-[#7A6E65] mb-2 uppercase tracking-wider">
            1. 어떤 방식의 위로와 조언이 필요한가요?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
            {(
              [
                { id: 'empathy', label: '🌸 따뜻한 공감과 위로', desc: '지친 마음을 보듬어주는 톤' },
                { id: 'mentor', label: '🧭 지혜로운 인생 조언', desc: '명쾌한 방향을 제시하는 톤' },
                { id: 'cheerup', label: '🔥 유쾌한 응원과 용기', desc: '확실하게 기를 살려주는 톤' },
              ] as const
            ).map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setSelectedTone(tone.id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-left transition-all ${
                  selectedTone === tone.id
                    ? 'border-[#E86F51] bg-[#FFF5F2] text-[#E86F51] shadow-sm'
                    : 'border-[#EFEAE1] bg-[#FAF8F5] text-[#7A6E65] hover:bg-white'
                }`}
              >
                <span className="text-sm font-bold mb-0.5">{tone.label}</span>
                <span className="text-[11px] opacity-80">{tone.desc}</span>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 2. 보내는 사람 / 받는 사람 / 관계 / MBTI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  보내는 분 (나)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="예: 진하"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  받는 분 (상대방)
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="예: 지민"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  두 분의 관계
                </label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="예: 10년 지기 친구"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  받는 분 MBTI (선택)
                </label>
                <input
                  type="text"
                  value={receiverMbti}
                  onChange={(e) => setReceiverMbti(e.target.value)}
                  placeholder="예: INFP"
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
                />
              </div>
            </div>

            {/* 3. 상대방이 겪고 있는 상황 및 고민 */}
            <div>
              <label className="block text-xs font-bold text-[#7A6E65] mb-1.5 uppercase tracking-wider">
                2. 상대방이 지금 어떤 상황이나 어려움을 겪고 있나요?
              </label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                rows={5}
                placeholder="예: 요즘 취업 준비로 연이은 탈락에 자존감이 많이 떨어진 상태야. 원래는 밝고 열정적인 친구인데 스스로를 자책하고 있어서 마음이 아파. 따뜻하게 위로하면서도 현실적으로 용기를 줄 수 있는 편지를 보내고 싶어."
                className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white resize-none"
              />
            </div>

            {/* 4. ★ 꼭 포함되었으면 하는 문구 (결제 훅 포인트) */}
            <div>
              <label className="block text-xs font-bold text-[#E86F51] mb-1.5 uppercase tracking-wider">
                3. 꼭 포함되었으면 하는 약속이나 한마디 (선택)
              </label>
              <input
                type="text"
                value={mustInclude}
                onChange={(e) => setMustInclude(e.target.value)}
                placeholder="예: 이번 면접 끝나면 내가 제일 좋아하는 삼겹살 사줄게! 늘 응원해."
                className="w-full p-3 bg-[#FFF5F2]/50 border border-[#F5C6BC] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                💡 작성해주신 한마디는 우체국장이 편지 본문이나 추신(P.S.)에 자연스럽게 녹여냅니다.
              </p>
            </div>

            <div className="bg-[#FFFDF9] border border-[#F3E2CE] rounded-xl p-3.5 text-xs text-[#8A6A4B] leading-relaxed">
              💡 <strong>단돈 900원</strong>으로 세상에 단 하나뿐인 맞춤형 위로 편지를 선물하세요.
              지혜로운 제3자의 시선으로 잊지 못할 감동을 전달해 드립니다.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E86F51] hover:bg-[#D85F41] disabled:bg-[#E86F51]/60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              ✉️ 우표 붙이고 900원에 선물할 편지 받아보기
            </button>
          </form>
        </div>
      )}

      {step === 'loading' && (
        <div className="w-full max-w-xl bg-white border border-[#EFEAE1] rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center my-12">
          <div className="w-16 h-16 border-4 border-[#F3E2CE] border-t-[#E86F51] rounded-full animate-spin mb-6"></div>
          <h3 className="text-lg font-serif font-bold text-[#2A2421] mb-2">
            우체국장이 {receiverName}님을 위한 편지를 쓰는 중입니다...
          </h3>
          <p className="text-xs text-[#7A6E65] font-light animate-pulse">
            {senderName}님의 따뜻한 마음과 상황을 분석해 가장 명쾌하고 다정한 글을 짓고 있어요.
          </p>
        </div>
      )}

      {step === 'letter' && (
        <div className="w-full max-w-xl bg-[#FFFDF9] border border-[#EFEAE1] rounded-2xl p-6 sm:p-10 shadow-lg my-4 relative">
          <div className="border-b border-[#F3E2CE] pb-4 mb-6 flex justify-between items-center">
            <span className="text-xs font-bold text-[#E86F51] bg-[#FFF5F2] px-2.5 py-1 rounded-md">
              📮 {receiverName}님 앞으로 도착한 편지
            </span>
            <span className="text-xs text-[#7A6E65]">의뢰인: {senderName}님</span>
          </div>

          <div className="font-serif text-sm sm:text-base text-[#2A2421] leading-8 tracking-wide whitespace-pre-line min-h-[300px]">
            {displayText}
            {!isTypingComplete && (
              <span className="inline-block w-1.5 h-4 bg-[#E86F51] ml-1 animate-ping"></span>
            )}
          </div>

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
              📤 편지 공유하기
            </button>
            <button
              onClick={() => {
                setStep('form');
                setStory('');
                setMustInclude('');
                setLetterText('');
                setDisplayText('');
                setErrorMessage('');
              }}
              className="flex-1 bg-[#E86F51] text-white text-xs font-bold py-3.5 rounded-xl hover:bg-[#D85F41] transition-all flex items-center justify-center gap-1.5"
            >
              ✉️ 다른 편지 또 쓰기
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-[#7A6E65] my-6 font-light">
        © 마음우체국 1호점 | 당신의 밤이 조금 더 다정해지기를 마음 담아 배달합니다.
      </footer>
    </main>
  );
}