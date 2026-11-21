import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Certificate } from '../types';
import Panda from './Panda';
import ShareButton from './ShareButton';
import { shareText } from '../lib/share';

const fmt = (d: string) => d.split('-').reverse().join('/');
const HSK_ZH = ['', '一', '二', '三', '四', '五', '六'];
/** Course line of the certificate, derived from its id (hsk2-part21, en-part1…). */
const courseLine = (id: string) => {
  const m = id.match(/^hsk(\d)/);
  if (m) return `汉语水平${HSK_ZH[Number(m[1])] ?? m[1]}级 · HSK ${m[1]}`;
  return 'English · Beginner (A1)';
};

export default function CertificateView({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  useEffect(() => () => document.body.classList.remove('print-cert'), []);
  const print = () => {
    document.body.classList.add('print-cert');
    const done = () => {
      document.body.classList.remove('print-cert');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };
  return createPortal(
    <div className="cert-portal fixed inset-0 z-[65] overflow-y-auto bg-black/50 p-3" onClick={onClose}>
      <div className="mx-auto max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="cert-sheet relative rounded-3xl border-[6px] border-double border-sun-500 bg-[#fffdf3] px-5 py-6 text-center" data-testid="certificate">
          <div className="absolute inset-2 rounded-2xl border-2 border-sun-400/60" aria-hidden />
          <Panda size={72} mood="cheer" className="mx-auto" />
          <div className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-sun-600">Chứng chỉ hoàn thành</div>
          <div className="mt-1 font-han text-lg font-bold text-coral-500">{courseLine(cert.id)}</div>
          <p className="mt-3 text-sm font-semibold text-ink-500">Chứng nhận học viên</p>
          <p className="my-1 text-2xl font-black text-ink-700" data-testid="cert-name">{cert.name}</p>
          <p className="text-sm font-semibold text-ink-500">đã vượt qua bài kiểm tra</p>
          <p className="mt-1 text-lg font-black text-leaf-600">{cert.part}</p>
          <div className="mx-auto mt-4 grid max-w-[260px] grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white p-2">
              <div className="font-bold text-ink-400">Điểm</div>
              <div className="text-xl font-black text-ink-700">{cert.score}%</div>
            </div>
            <div className="rounded-xl bg-white p-2">
              <div className="font-bold text-ink-400">Ngày cấp</div>
              <div className="text-xl font-black text-ink-700">{fmt(cert.date)}</div>
            </div>
          </div>
          <p className="mt-4 text-xs font-bold text-ink-400">Học Ngoại Ngữ – Gấu Trúc Xanh · VH Phước</p>
          <p className="text-[10px] font-semibold text-ink-300">Mã: {cert.id.toUpperCase()}-{cert.date.replace(/-/g, '')}</p>
        </div>
        <div className="no-print mt-3 flex flex-col gap-2 rounded-3xl bg-white p-4">
          <button type="button" className="btn-blue" onClick={print} data-testid="cert-print">
            Tải xuống (PDF)
          </button>
          <div className="flex justify-center">
            <ShareButton text={shareText.cert(cert.part, cert.score)} label="Chia sẻ chứng chỉ" />
          </div>
          <button type="button" className="btn-white" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
