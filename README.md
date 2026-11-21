# Học Ngoại Ngữ – Gấu Trúc Xanh 🐼

Ứng dụng học tiếng Trung (HSK 1) **miễn phí** cho người Việt, phong cách học qua trò chơi. Dùng được ngay không cần tài khoản; đăng nhập (Firebase, gói Spark miễn phí) để đồng bộ tiến độ và lên bảng xếp hạng.

Bản chạy thật: https://greenpandavn.github.io/ (GitHub Pages) · Phiên bản hiện tại: **GreenPanda v2.0.0** (`src/lib/version.ts`)

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

### Mới trong bản nâng cấp 2

- **Chọn trình độ khi mở lần đầu** (tự chọn, không có bài kiểm tra xếp lớp): “Chưa biết gì” (học từ bài 1), “Biết sơ sơ” (mở toàn bộ Phần 1, bắt đầu từ Phần 2), “Đã học rồi” (mở mọi bài, tự chọn bài). Đổi lại bất cứ lúc nào trong Hồ sơ → Cài đặt. Lưu trong tiến độ (khách: `localStorage`; tài khoản: Firestore). Người học cũ đã có tiến độ không bị hỏi lại.
- **Giao diện màu + chế độ tối**: 5 bảng màu (mặc định Xanh lá Gấu Trúc, Biển xanh, Tím nho, Hồng anh đào, Cam hoàng hôn) và chế độ tối, áp dụng ngay, lưu theo tài khoản hoặc trên máy với khách.
- **Học không cần đăng nhập** vẫn đầy đủ như cũ; đăng nhập chỉ để đồng bộ, xếp hạng và lưu chứng chỉ lên đám mây.
- **Trang quản trị** (Hồ sơ → “Trang quản trị”, chỉ hiện với tài khoản admin):
  - *Người dùng*: tên, email, cấp, XP, chuỗi ngày, ngày tham gia; khóa/mở khóa (tài khoản bị khóa bị đăng xuất và không đăng nhập được); cấp/thu hồi quyền admin.
  - *Nội dung*: thêm/sửa/xóa bài học và từ vựng bằng biểu mẫu (có thể thêm Phần 4, 5… cho HSK 2). Nội dung lưu ở Firestore (`lessons/{id}`, `units/{số}`); ứng dụng tải nội dung từ Firestore khi có, phần còn lại dùng nội dung gốc đóng gói sẵn (offline vẫn học được). Bài gốc đã sửa/xóa có nút “Khôi phục bản gốc”.
  - *Thống kê*: tổng học viên, hoạt động hôm nay / 7 ngày, lượt hoàn thành bài, 5 bài khó nhất (tỉ lệ đạt thấp nhất = hoàn thành / (hoàn thành + hết tim)). Chỉ tính tài khoản đã đăng nhập.
  - *Kiểm duyệt*: sửa tên hiển thị (tên bắt buộc, người dùng không ghi đè được) hoặc xóa người dùng khỏi bảng xếp hạng; xem và thu hồi/khôi phục chứng chỉ.
  - Quyền lưu ở `roles/{uid}` (`role`, `locked`, `hidden`, `forcedName`, `revoked`), chỉ admin đọc/ghi được (xem `firestore.rules`). `virusphuoc@gmail.com` (đăng nhập Google hoặc email đã xác minh) luôn là admin và tự tạo `roles/{uid}` khi đăng nhập lần đầu. Để cấp admin thủ công: tạo document `roles/{uid}` với `role: "admin"` trong Firebase Console, hoặc dùng nút “Cấp admin”.
- **Liên hệ chỉ qua email**: huuphuocln@gmail.com (đã bỏ số điện thoại).
- **Đồng bộ lại nhanh hơn sau khi có mạng:** gửi lại ngay khi có mạng; nếu sau 2 giây vẫn chưa xong thì tạo lại kết nối Firestore. Đo thực tế: 4–5 giây (trước đây hơn 21 giây).

> ⚠️ Sau khi cập nhật lên bản này, cần **publish lại `firestore.rules`** (bản mới cho phép lưu email/ngày tham gia và thêm quyền admin).

### Phát âm & luyện nói — hãy thử trên điện thoại

Máy kiểm thử không có giọng đọc tiếng Trung và micro nên phần này được kiểm tra bằng đọc mã, chưa nghe/nói thật:
- Đọc: `src/lib/speech.ts` dùng `speechSynthesis` với `lang = 'zh-CN'`, chọn giọng `zh-CN` tốt nhất (ưu tiên Google, Xiaoxiao, Yunxi, Tingting), cập nhật khi có sự kiện `voiceschanged`; nếu thiết bị không có giọng tiếng Trung, ứng dụng hiện thông báo hướng dẫn cài giọng “Chinese (China)”.
- Luyện nói: `src/lib/speech.ts` dùng `SpeechRecognition`/`webkitSpeechRecognition` với `lang = 'zh-CN'`, `src/components/SpeakCheck.tsx` so khớp kết quả với chữ Hán cần đọc; trình duyệt không hỗ trợ thì không có bài nói, và luôn có nút “Bỏ qua”.
- Nên thử: Chrome Android, Safari iOS (cho phép micro khi được hỏi).

## Cấu hình Firebase

Cấu hình Firebase **chỉ** được đọc từ biến môi trường Vite, không có giá trị viết cứng trong mã nguồn (`src/lib/firebaseConfig.ts`). Cần đủ 6 biến sau (lấy trong Firebase Console → Project settings → Your apps → Web app → *SDK setup and configuration*):

| Biến | Bắt buộc | Ví dụ |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | ✔ | `AIza…` |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✔ | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✔ | `<project-id>` |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✔ | `<project-id>.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✔ | `1234567890` |
| `VITE_FIREBASE_APP_ID` | ✔ | `1:1234567890:web:abc123` |

- **Chạy trên máy**: sao chép `.env.example` thành `.env.local` (đã nằm trong `.gitignore`, không commit) rồi điền giá trị.
- **Vercel**: khai báo trong *Settings → Environment Variables* (xem phần Triển khai).
- Thiếu biến: ứng dụng vẫn chạy đầy đủ ở chế độ khách (lưu `localStorage`); màn hình tài khoản, Hồ sơ và Bảng xếp hạng hiện thông báo “Chưa cấu hình Firebase”.

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
3. **Settings → Environment Variables** (bắt buộc để có tài khoản/đồng bộ/xếp hạng): thêm đủ 6 biến `VITE_FIREBASE_*` ở trên cho Production và Preview. Biến được nhúng lúc build, nên đổi biến xong cần **Redeploy**.
4. Thêm tên miền Vercel vào *Authorized domains* của Firebase (bước 2 ở trên), nếu không đăng nhập Google sẽ báo `auth/unauthorized-domain`.

`vercel.json` đặt `Cache-Control: no-cache` cho `sw.js` và `manifest.json` để bản mới được cập nhật ngay.

## Dữ liệu

Từ vựng được soạn trong `scripts/vocab.txt` và sinh ra `src/data/lessons.json` bằng `node scripts/build-data.mjs` (đồng thời sao chép dữ liệu nét chữ vào `public/hanzi/`). `node scripts/check-pinyin.mjs` đối chiếu pinyin với `pinyin-pro` (các khác biệt còn lại là thanh nhẹ/biến điệu đã được kiểm tra thủ công).

## Triển khai

`vite.config.ts` dùng `base: './'`, nên thư mục `dist/` chạy được trên Vercel, GitHub Pages hoặc bất kỳ host tĩnh nào. Khi build, plugin `sw-precache` ghi danh sách tệp vào `dist/sw.js` để lưu offline.

## Bản quyền / License

Ứng dụng được dùng **miễn phí** tại <https://greenpandavn.github.io/>. Tuy nhiên, toàn bộ mã nguồn và nội dung học tập (bài học, dữ liệu từ vựng, đề thi thử, hình ảnh và thiết kế) là tài sản của **VH Phước**. Không được sao chép, phân phối, chỉnh sửa hay sử dụng lại bất kỳ phần nào khi chưa có sự cho phép bằng văn bản của chủ sở hữu. Xem tệp [LICENSE](LICENSE).

## Ghi công

© 2026 VH Phước — Học Ngoại Ngữ, Gấu Trúc Xanh. Mọi nội dung thuộc về VH Phước. Liên hệ: [huuphuocln@gmail.com](mailto:huuphuocln@gmail.com) · [YouTube @vhphuocmedia](https://www.youtube.com/@vhphuocmedia).


Nội dung, hình gấu trúc và giao diện là nguyên bản. Thư viện [HanziWriter](https://hanziwriter.org) (MIT); dữ liệu nét chữ từ [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (Arphic Public License). Không liên kết với Duolingo.
