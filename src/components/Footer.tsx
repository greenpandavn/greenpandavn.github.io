export const YOUTUBE_URL = 'https://www.youtube.com/@vhphuocmedia';
export const CONTACT = 'VH Phước — 0988474228';

export default function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`mx-auto max-w-md px-4 py-5 text-center text-xs font-semibold leading-relaxed text-ink-400 ${className}`} data-testid="footer">
      <p>© 2026 VH Phước — Học Tiếng Trung, Gấu Trúc Mập. Mọi nội dung thuộc về VH Phước.</p>
      <p>
        Liên hệ: <a href="tel:0988474228" className="font-extrabold text-ink-500 underline">{CONTACT}</a>
        {' · '}
        <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="font-extrabold text-coral-500 underline">
          YouTube @vhphuocmedia
        </a>
      </p>
    </footer>
  );
}
