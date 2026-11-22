import { useEffect, useState, type ReactNode } from 'react';
import { courseLoaded, getCourse, loadCourse, loadUnits, unitsReady, useContentVersion } from '../data';

/** Shows its children once the words of the given parts ('all' = the whole course) are downloaded. */
export default function DataGate({ units, children }: { units: number[] | 'all'; children: ReactNode }) {
  useContentVersion();
  const [failed, setFailed] = useState(false);
  const course = getCourse();
  const ready = units === 'all' ? courseLoaded() : unitsReady(units);
  const key = units === 'all' ? 'all' : units.join(',');
  useEffect(() => {
    if (ready || failed) return;
    let live = true;
    (units === 'all' ? loadCourse(course) : loadUnits(units, course)).catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `units`
  }, [ready, failed, key, course]);
  if (ready) return <>{children}</>;
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center" data-testid="course-loading">
      {failed ? (
        <>
          <p className="font-bold text-ink-500">Không tải được dữ liệu bài học. Hãy kiểm tra kết nối mạng rồi thử lại.</p>
          <button className="btn-primary" onClick={() => setFailed(false)}>
            Thử lại
          </button>
        </>
      ) : (
        <>
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-cloud border-t-leaf-500" aria-hidden />
          <p className="font-bold text-ink-400">Đang tải bài học…</p>
        </>
      )}
    </div>
  );
}
