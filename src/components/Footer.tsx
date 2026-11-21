export const YOUTUBE_URL = 'https://www.youtube.com/@vhphuocmedia';
export const CONTACT_EMAIL = 'huuphuocln@gmail.com';

export default function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`mx-auto max-w-md px-4 py-5 text-center text-xs font-semibold leading-relaxed text-ink-400 ${className}`} data-testid="footer">
      <p>© 2026 VH Phước — Học Tiếng Trung, Gấu Trúc Mập. Mọi nội dung thuộc về VH Phước.</p>
      <p>
        Liên hệ:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-ink-500 underline">
          {CONTACT_EMAIL}
        </a>
        {' · '}
        <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="font-extrabold text-coral-500 underline">
          YouTube @vhphuocmedia
        </a>
      </p>
    </footer>
  );
}
