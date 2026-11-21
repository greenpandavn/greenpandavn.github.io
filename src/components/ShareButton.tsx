import { useState } from 'react';
import { copyText, facebookUrl, nativeShare, zaloUrl, APP_URL } from '../lib/share';

const ShareGlyph = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" />
  </svg>
);

export default function ShareButton({ text, label = 'Chia sẻ', className = '' }: { text: string; label?: string; className?: string }) {
  const [sheet, setSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const full = `${text} ${APP_URL}`;
  const onClick = async () => {
    const r = await nativeShare(text);
    if (r === 'unsupported') {
      setCopied(await copyText(full));
      setSheet(true);
    }
  };
  return (
    <>
      <button type="button" onClick={onClick} className={`chip inline-flex items-center gap-1.5 !text-sky-600 ${className}`} data-testid="share-button">
        <ShareGlyph /> {label}
      </button>
      {sheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40" onClick={() => setSheet(false)}>
          <div role="dialog" aria-label="Chia sẻ" className="w-full max-w-md animate-slideUp rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()} data-testid="share-sheet">
            <h3 className="mb-2 text-lg font-black">Chia sẻ thành tích</h3>
            <p className="mb-3 rounded-2xl bg-mist p-3 text-sm font-semibold text-ink-700">{full}</p>
            {copied && <p className="mb-3 text-sm font-bold text-leaf-600">Đã sao chép nội dung vào bộ nhớ tạm!</p>}
            <div className="grid grid-cols-3 gap-2">
              <a href={facebookUrl(text)} target="_blank" rel="noopener noreferrer" className="btn !bg-[#1877f2] !text-white !shadow-[0_4px_0_#0f5bbd]">
                Facebook
              </a>
              <a href={zaloUrl()} target="_blank" rel="noopener noreferrer" className="btn !bg-[#0068ff] !text-white !shadow-[0_4px_0_#0050c4]">
                Zalo
              </a>
              <button type="button" className="btn-white" onClick={async () => setCopied(await copyText(full))}>
                Sao chép
              </button>
            </div>
            <button type="button" className="mt-3 w-full py-2 font-extrabold text-ink-400" onClick={() => setSheet(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
