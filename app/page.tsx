'use client';

import React, { useState, useEffect } from 'react';
import LZString from 'lz-string'; // ★ 문자열 압축 라이브러리 추가

type AdviceTone = 'empathy' | 'mentor' | 'cheerup';
type Step = 'form' | 'loading' | 'letter';

export default function Home() {
  const [selectedTone, setSelectedTone] = useState<AdviceTone>('empathy');
  const [step, setStep] = useState<Step>('form');

  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [receiverMbti, setReceiverMbti] = useState('');
  const [story, setStory] = useState('');
  const [mustInclude, setMustInclude] = useState('');

  const [letterText, setLetterText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

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
    setIsEditing(false);
    setShowShareModal(false);

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

      // ★ [핵심 추가] 정규식(.replace)을 사용해 문장 속 모든 ** 기호를 즉시 삭제!
      const cleanLetter = data.letter.replace(/\*\*/g, '');

      setLetterText(cleanLetter);
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

  useEffect(() => {
    if (step !== 'letter' || !letterText || isEditing) return;

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
  }, [step, letterText, isEditing]);

  // ★ [핵심 변경] LZString을 사용하여 한글 텍스트를 고압축 URL로 변환
  const handleProceedToGift = () => {
    try {
      const payload = {
        s: senderName.trim(),
        r: receiverName.trim(),
        t: letterText,
      };
      // 텍스트를 URL 안전 형식으로 강력하게 압축
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      const fullUrl = `${window.location.origin}/letter?data=${compressed}`;
      setShareUrl(fullUrl);
      setShowShareModal(true);
    } catch {
      alert('공유 링크 생성 중 오류가 발생했습니다.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('💌 압축된 시크릿 링크가 복사되었습니다!\n카카오톡으로 선물해 보세요.');
    } catch {
      alert('복사에 실패했습니다. 아래 주소를 직접 복사해 주세요.');
    }
  };

  const handleKakaoShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `📮 [마음우체국] ${receiverName}님 앞으로 도착한 편지`,
          text: `${senderName}님이 당신을 위해 보낸 다정한 마음이 담긴 봉투입니다. 열어보시겠어요?`,
          url: shareUrl,
        });
      } catch {
        // 공유 취소 시 무시
      }
    } else {
      handleCopyLink();
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
          <div className="bg-[#FFF5F2] border border-[#F5C6BC] rounded-xl p-3.5 mb-6 text-xs text-[#E86F51] font-medium leading-relaxed">
            💡 <strong>우체국장의 초안이 완성되었습니다!</strong> <br />
            내용을 확인해보시고, 수정이 필요한 단어나 우리 둘만의 표현이 있다면{' '}
            <strong>[✍️ 편지 내용 직접 수정하기]</strong>를 눌러 진심을 다듬어주세요.
          </div>

          <div className="border-b border-[#F3E2CE] pb-4 mb-6 flex justify-between items-center">
            <span className="text-xs font-bold text-[#E86F51] bg-[#FFF5F2] px-2.5 py-1 rounded-md">
              📮 {receiverName}님 앞으로 도착한 편지 (검토 중)
            </span>
            <span className="text-xs text-[#7A6E65]">의뢰인: {senderName}님</span>
          </div>

          {!isEditing ? (
            <div className="font-serif text-sm sm:text-base text-[#2A2421] leading-8 tracking-wide whitespace-pre-line min-h-[300px]">
              {displayText}
              {!isTypingComplete && (
                <span className="inline-block w-1.5 h-4 bg-[#E86F51] ml-1 animate-ping"></span>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#E86F51] block">
                ✍️ 자유롭게 문장을 수정하거나 추가해 보세요:
              </span>
              <textarea
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                rows={15}
                className="w-full font-serif text-sm sm:text-base text-[#2A2421] leading-8 tracking-wide p-4 bg-white border-2 border-[#E86F51] rounded-xl focus:outline-none shadow-inner"
              />
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[#F3E2CE] flex flex-col gap-2.5">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full bg-white border-2 border-[#E86F51] text-[#E86F51] hover:bg-[#FFF5F2] text-xs font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                ✍️ 편지 내용 직접 수정하기 (단어/표현 다듬기)
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDisplayText(letterText);
                  setIsTypingComplete(true);
                }}
                className="w-full bg-[#2A2421] text-white hover:bg-black text-xs font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                ✅ 수정 완료 (최종 미리보기로 돌아가기)
              </button>
            )}

            <button
              onClick={handleProceedToGift}
              className="w-full bg-[#E86F51] hover:bg-[#D85F41] text-white text-sm font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              💌 이대로 봉투에 담아 선물 링크 만들기 (카카오톡 전송)
            </button>

            <button
              onClick={() => {
                setStep('form');
                setStory('');
                setMustInclude('');
                setLetterText('');
                setDisplayText('');
                setErrorMessage('');
                setIsEditing(false);
              }}
              className="w-full bg-transparent hover:bg-[#FAF8F5] text-[#7A6E65] text-xs font-medium py-2.5 rounded-xl transition-all text-center mt-1"
            >
              🔄 처음부터 다시 작성하기
            </button>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#EFEAE1]">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📮</div>
              <h3 className="text-lg font-serif font-bold text-[#2A2421]">
                {receiverName}님만의 시크릿 편지 봉투 생성 완료!
              </h3>
              <p className="text-xs text-[#7A6E65] mt-1">
                아래 링크를 복사해서 카카오톡이나 메신저로 선물해보세요.
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-[#EFEAE1] rounded-xl p-3 mb-5 text-xs text-gray-600 break-all select-all font-mono max-h-24 overflow-y-auto">
              {shareUrl}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleKakaoShare}
                className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                💬 카카오톡 / 메신저로 바로 공유하기
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full bg-[#E86F51] hover:bg-[#D85F41] text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                📋 링크 복사하기
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl text-xs transition-all mt-1"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-[#7A6E65] my-6 font-light">
        © 마음우체국 1호점 | 당신의 밤이 조금 더 다정해지기를 마음 담아 배달합니다.
      </footer>
    </main>
  );
}