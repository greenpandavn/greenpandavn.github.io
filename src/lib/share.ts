export const APP_URL = 'https://hoc-tieng-trung-roan.vercel.app/';
export const APP_NAME = 'Học Ngoại Ngữ – Gấu Trúc Xanh';

export const shareText = {
  streak: (n: number) => `Tôi đã học tiếng Trung được ${n} ngày liên tiếp trên ${APP_NAME}! 🔥`,
  xp: (xp: number) => `Tôi đã đạt ${xp} XP khi học tiếng Trung trên ${APP_NAME}! ⚡`,
  cert: (part: string, score: number) => `Tôi vừa nhận chứng chỉ "${part}" với điểm ${score}% trên ${APP_NAME}! 🏆`,
};

export const facebookUrl = (text: string) =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}&quote=${encodeURIComponent(text)}`;
export const zaloUrl = () => `https://zalo.me/share?url=${encodeURIComponent(APP_URL)}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Try the native share sheet. Returns 'shared' | 'cancelled' | 'unsupported'. */
export async function nativeShare(text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const data = { title: APP_NAME, text, url: APP_URL };
  if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) return 'unsupported';
  try {
    await navigator.share(data);
    return 'shared';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}
