'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // ★ Supabase DB 클라이언트 연결

function EnvelopeContent() {
  const searchParams = useSearchParams();
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [letterText, setLetterText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setError(true);
      setIsLoading(false);
      return;
    }

    const fetchLetterFromDB = async () => {
      try {
        // ★ Supabase letters 테이블에서 id가 일치하는 편지 단 1건 조회
        const { data, error } = await supabase
          .from('letters')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          throw new Error('편지를 찾을 수 없습니다.');
        }

        setSenderName(data.sender_name || '소중한 사람');
        setReceiverName(data.receiver_name || '당신');
        setLetterText(data.letter_text || '');
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLetterFromDB();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 border-4 border-[#F3E2CE] border-t-[#E86F51] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-serif text-[#7A6E65]">
          우체함에서 편지 봉투를 꺼내는 중입니다...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="text-4xl mb-4">📮</div>
        <h2 className="text-lg font-serif font-bold text-[#2A2421] mb-2">
          편지 봉투를 찾을 수 없거나 손상되었습니다.
        </h2>
        <p className="text-xs text-[#7A6E65] mb-6">
          링크 주소가 바르게 입력되었는지 다시 한 번 확인해 주세요.
        </p>
        <Link
          href="/"
          className="bg-[#E86F51] text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-[#D85F41] transition-all"
        >
          마음우체국 1호점 바로가기
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#332C27] flex flex-col items-center justify-center p-4 sm:p-8 font-sans overflow-hidden">
      <div className="w-full max-w-xl flex flex-col items-center">
        {!isOpen ? (
          <div className="w-full max-w-md bg-[#FFF9ED] border-2 border-[#E6DFD5] rounded-3xl p-8 sm:p-12 shadow-xl text-center flex flex-col items-center justify-center transition-all duration-500 transform hover:scale-[1.01] relative overflow-hidden my-6">
            <div className="w-14 h-14 bg-[#E86F51] text-white rounded-full flex items-center justify-center text-2xl shadow-md mb-6 animate-bounce">
              📮
            </div>
            <span className="text-xs font-bold text-[#E86F51] bg-[#FFF5F2] border border-[#F5C6BC] px-3 py-1 rounded-full mb-3">
              마음우체국 1호점 특급 우편
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A2421] mt-2 mb-1">
              {receiverName}님 앞으로
            </h1>
            <h2 className="text-lg font-serif text-[#7A6E65] font-medium mb-8">
              도착한 소중한 편지입니다.
            </h2>
            <div className="text-xs text-[#8A6A4B] bg-[#FFFDF9] border border-[#F3E2CE] px-4 py-2.5 rounded-xl mb-8">
              의뢰인 <strong>{senderName}님</strong>이 우체국장에게 특별히 부탁한 진심이 담겨 있어요.
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="w-full bg-[#E86F51] hover:bg-[#D85F41] text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              💌 씰을 뜯고 봉투 열어보기
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xl bg-[#FFFDF9] border border-[#EFEAE1] rounded-2xl p-6 sm:p-10 shadow-2xl my-6 animate-fade-in relative">
            <div className="border-b border-[#F3E2CE] pb-4 mb-6 flex justify-between items-center">
              <span className="text-xs font-bold text-[#E86F51] bg-[#FFF5F2] px-2.5 py-1 rounded-md">
                📮 {receiverName}님 앞으로 도착한 편지
              </span>
              <span className="text-xs text-[#7A6E65]">의뢰인: {senderName}님</span>
            </div>

            <div className="font-serif text-sm sm:text-base text-[#2A2421] leading-8 tracking-wide whitespace-pre-line min-h-[300px]">
              {letterText}
            </div>

            <div className="mt-10 pt-6 border-t border-[#F3E2CE] flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-[#2A2421]">
                  혹시 당신도 마음을 전하고 싶은 소중한 사람이 있나요?
                </p>
                <p className="text-[11px] text-[#7A6E65] mt-0.5">
                  단돈 900원으로 평생 잊지 못할 감동을 선물해 보세요.
                </p>
              </div>

              <Link
                href="/"
                className="w-full bg-[#2A2421] hover:bg-black text-white text-xs font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                📮 나도 소중한 사람에게 900원에 편지 선물하기
              </Link>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-[#7A6E65] my-6 font-light">
        © 마음우체국 1호점 | 당신의 밤이 조금 더 다정해지기를 마음 담아 배달합니다.
      </footer>
    </main>
  );
}

export default function LetterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-serif text-sm text-[#7A6E65]">
          📮 편지 봉투를 뜯는 중입니다...
        </div>
      }
    >
      <EnvelopeContent />
    </Suspense>
  );
}