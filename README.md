# Học Tiếng Trung – Gấu Trúc Mập 🐼

Ứng dụng học tiếng Trung (HSK 1) **miễn phí** cho người Việt, phong cách học qua trò chơi. Dùng được ngay không cần tài khoản; đăng nhập (Firebase, gói Spark miễn phí) để đồng bộ tiến độ và lên bảng xếp hạng.

Bản chạy thật: https://hoc-tieng-trung-roan.vercel.app/

## Chạy thử

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bản tĩnh trong dist/
npm test         # kiểm thử logic gộp/di chuyển tiến độ (Vitest)
```

## Tính năng

- **Lộ trình học** dạng đường uốn lượn: 15 bài HSK 1 (+2 bài thưởng mở bằng đá quý), 181 từ. Mỗi từ có chữ Hán giản thể, pinyin có dấu thanh, nghĩa tiếng Việt và câu ví dụ (Hán + pinyin + Việt).
- **Bài tập**: nghe chọn từ, chọn nghĩa (từ/câu), ghép cặp, sắp xếp câu, gõ pinyin (chấp nhận dấu, số thanh hoặc không dấu), chọn chữ Hán theo pinyin + nghĩa, luyện nói (nếu trình duyệt hỗ trợ).
- **3 tim** mỗi bài, combo XP, từ sai được lặp lại cuối bài.
- **Ôn tập thông minh** (lặp lại ngắt quãng): Mới → Đang học → Đã thuộc; mục Ôn tập tự gom các từ yếu nhất. Độ khó tự điều chỉnh.
- **Phát âm & viết**: nút loa (Web Speech API, zh-CN), hoạt ảnh thứ tự nét và tập viết theo nét (HanziWriter, dữ liệu nét đóng gói sẵn).
- **Trò chơi hóa**: XP, cấp độ, chuỗi ngày + lịch, mục tiêu XP hằng ngày, đá quý (hồi tim, mở bài thưởng), huy hiệu.
- Tiến độ lưu trong `localStorage`, có **xuất/nhập JSON**.

### Mới trong bản nâng cấp 1

- **Tài khoản + đồng bộ đám mây** (Firebase Auth + Cloud Firestore): đăng ký/đăng nhập bằng email + mật khẩu hoặc Google, quên mật khẩu, đổi tên hiển thị. Lưu toàn bộ tiến độ theo người dùng: bài đã học, XP, chuỗi ngày, đá quý, mức thuộc từng từ, huy hiệu, kết quả kiểm tra, chứng chỉ.
  - Không đăng nhập vẫn học đầy đủ như trước (lưu `localStorage`).
  - Lần đầu đăng nhập: tiến độ trên máy được **gộp** vào tài khoản (giữ XP/chuỗi ngày cao hơn, hợp nhất bài học, từ, huy hiệu, chứng chỉ). Mỗi tài khoản chỉ gộp một lần.
  - Sau khi đăng nhập, đám mây là nguồn dữ liệu chính; mọi thay đổi được đồng bộ (sau ~0,6 giây). Khi mất mạng, thay đổi được lưu vào bản sao theo tài khoản trong `localStorage` và tự gửi lại toàn bộ khi có mạng (hoặc ở lần mở/đăng nhập tiếp theo, gộp với dữ liệu đám mây).
- **Bảng xếp hạng** tuần (thứ Hai–Chủ nhật) và mọi thời đại: top 20 + hạng của bạn. Khách xem ở chế độ chỉ đọc.
- **Kiểm tra cuối phần** (Phần 1, 2, 3): 10 câu (nghe, nghĩa, pinyin, sắp xếp câu), đạt từ 80% nhận **chứng chỉ** (tên, phần, điểm, ngày). Xem, tải PDF (hộp thoại in của trình duyệt), chia sẻ trong mục “Chứng chỉ của tôi” ở Hồ sơ.
- **Chia sẻ thành tích** (chuỗi ngày, mốc XP, chứng chỉ): Web Share API, dự phòng sao chép vào bộ nhớ tạm + nút Facebook/Zalo.
- **PWA**: `manifest.json`, biểu tượng gấu trúc 192/512px, service worker lưu sẵn toàn bộ ứng dụng + dữ liệu bài học + dữ liệu nét chữ để học offline, nút “Cài đặt / Thêm vào màn hình chính”.
- **Nhắc học hằng ngày** (mặc định 19:00, chỉnh trong Hồ sơ): thông báo cục bộ “Đến giờ học tiếng Trung rồi!” nếu hôm đó chưa học (Notification API + service worker, không dùng dịch vụ push trả phí). Nếu thông báo bị chặn, ứng dụng hiện banner nhắc nhở.
  - Lưu ý: không có máy chủ push nên nhắc nhở hiện khi ứng dụng đang mở (hoặc chạy nền); trên Chrome Android khi đã cài PWA, service worker còn dùng Periodic Background Sync (trình duyệt quyết định tần suất).
- **Chân trang bản quyền/liên hệ** trên mọi trang + mục “Giới thiệu / Liên hệ” trong Hồ sơ.

## Cấu hình Firebase

Cấu hình web của dự án `hoc-tieng-trung-6f3e1` nằm sẵn trong `src/lib/firebase.ts` (đây là cấu hình công khai phía trình duyệt, không phải bí mật). Có thể ghi đè bằng biến môi trường Vite (xem `.env.example`):

| Biến | Ví dụ |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `AIza…` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `hoc-tieng-trung-6f3e1.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `hoc-tieng-trung-6f3e1` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `hoc-tieng-trung-6f3e1.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `372532313687` |
| `VITE_FIREBASE_APP_ID` | `1:372532313687:web:…` |

Các bước trong [Firebase Console](https://console.firebase.google.com/) (một lần):

1. **Authentication → Sign-in method**: bật *Email/Password* và *Google*.
2. **Authentication → Settings → Authorized domains**: thêm `hoc-tieng-trung-roan.vercel.app` (và tên miền riêng nếu có). `localhost` đã có sẵn.
3. **Firestore Database**: tạo cơ sở dữ liệu (chế độ production), rồi vào **Rules**, dán nội dung tệp [`firestore.rules`](firestore.rules) và bấm **Publish** (hoặc `firebase deploy --only firestore:rules`).

Cấu trúc dữ liệu:

- `users/{uid}`: `{ displayName, progress, updatedAt, clientId }` — chỉ chủ tài khoản đọc/ghi.
- `leaderboard/{uid}`: `{ displayName, xp, updatedAt }` — tổng XP, ai cũng đọc được, chỉ chủ ghi.
- `weeks/{2026-W47}/entries/{uid}`: `{ displayName, xp, updatedAt }` — XP trong tuần.

## Triển khai lên Vercel

1. Vercel → **Add New → Project** → chọn repo `hoc-tieng-trung`.
2. Framework: **Vite** (Build command `npm run build`, Output `dist`).
3. (Tuỳ chọn) **Settings → Environment Variables**: thêm 6 biến `VITE_FIREBASE_*` ở trên cho Production/Preview. Không thêm thì ứng dụng dùng cấu hình mặc định trong `src/lib/firebase.ts`. Đổi biến xong cần **Redeploy**.
4. Thêm tên miền Vercel vào *Authorized domains* của Firebase (bước 2 ở trên), nếu không đăng nhập Google sẽ báo `auth/unauthorized-domain`.

`vercel.json` đặt `Cache-Control: no-cache` cho `sw.js` và `manifest.json` để bản mới được cập nhật ngay.

## Dữ liệu

Từ vựng được soạn trong `scripts/vocab.txt` và sinh ra `src/data/lessons.json` bằng `node scripts/build-data.mjs` (đồng thời sao chép dữ liệu nét chữ vào `public/hanzi/`). `node scripts/check-pinyin.mjs` đối chiếu pinyin với `pinyin-pro` (các khác biệt còn lại là thanh nhẹ/biến điệu đã được kiểm tra thủ công).

## Triển khai

`vite.config.ts` dùng `base: './'`, nên thư mục `dist/` chạy được trên Vercel, GitHub Pages hoặc bất kỳ host tĩnh nào. Khi build, plugin `sw-precache` ghi danh sách tệp vào `dist/sw.js` để lưu offline.

## Giấy phép & ghi công

© 2026 VH Phước — Học Tiếng Trung, Gấu Trúc Mập. Mọi nội dung thuộc về VH Phước. Liên hệ: VH Phước — 0988474228 · [YouTube @vhphuocmedia](https://www.youtube.com/@vhphuocmedia).


Nội dung, hình gấu trúc và giao diện là nguyên bản. Thư viện [HanziWriter](https://hanziwriter.org) (MIT); dữ liệu nét chữ từ [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (Arphic Public License). Không liên kết với Duolingo.
