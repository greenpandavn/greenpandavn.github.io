# Học Tiếng Trung – Gấu Trúc Mập 🐼

Ứng dụng học tiếng Trung (HSK 1) **miễn phí** cho người Việt, phong cách học qua trò chơi. Không cần tài khoản, không backend, không API trả phí.

## Chạy thử

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bản tĩnh trong dist/
```

## Tính năng

- **Lộ trình học** dạng đường uốn lượn: 15 bài HSK 1 (+2 bài thưởng mở bằng đá quý), 181 từ. Mỗi từ có chữ Hán giản thể, pinyin có dấu thanh, nghĩa tiếng Việt và câu ví dụ (Hán + pinyin + Việt).
- **Bài tập**: nghe chọn từ, chọn nghĩa (từ/câu), ghép cặp, sắp xếp câu, gõ pinyin (chấp nhận dấu, số thanh hoặc không dấu), chọn chữ Hán theo pinyin + nghĩa, luyện nói (nếu trình duyệt hỗ trợ).
- **3 tim** mỗi bài, combo XP, từ sai được lặp lại cuối bài.
- **Ôn tập thông minh** (lặp lại ngắt quãng): Mới → Đang học → Đã thuộc; mục Ôn tập tự gom các từ yếu nhất. Độ khó tự điều chỉnh.
- **Phát âm & viết**: nút loa (Web Speech API, zh-CN), hoạt ảnh thứ tự nét và tập viết theo nét (HanziWriter, dữ liệu nét đóng gói sẵn).
- **Trò chơi hóa**: XP, cấp độ, chuỗi ngày + lịch, mục tiêu XP hằng ngày, đá quý (hồi tim, mở bài thưởng), huy hiệu.
- Tiến độ lưu trong `localStorage`, có **xuất/nhập JSON**.

## Dữ liệu

Từ vựng được soạn trong `scripts/vocab.txt` và sinh ra `src/data/lessons.json` bằng `node scripts/build-data.mjs` (đồng thời sao chép dữ liệu nét chữ vào `public/hanzi/`). `node scripts/check-pinyin.mjs` đối chiếu pinyin với `pinyin-pro` (các khác biệt còn lại là thanh nhẹ/biến điệu đã được kiểm tra thủ công).

## Triển khai

`vite.config.ts` dùng `base: './'`, nên thư mục `dist/` chạy được trên Vercel, GitHub Pages hoặc bất kỳ host tĩnh nào.

## Giấy phép & ghi công

Nội dung, hình gấu trúc và giao diện là nguyên bản. Thư viện [HanziWriter](https://hanziwriter.org) (MIT); dữ liệu nét chữ từ [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (Arphic Public License). Không liên kết với Duolingo.
