# ScamCheck — Cybershield

Công cụ web giúp kiểm tra nhanh tin nhắn nghi ngờ lừa đảo (SMS, Zalo, Messenger, email).

## Live site (GitHub Pages)

[https://txlocal17.github.io/ScamCheck-Cybershield-/](https://txlocal17.github.io/ScamCheck-Cybershield-/)

**Cấp hiện tại:** 5 — Đầy đủ 3 nhân vật AI + Thư viện + Thẻ chia sẻ + Luyện tập

> ScamCheck là công cụ giáo dục do nhóm học viên phát triển. Kết quả không thay thế cảnh báo chính thức từ ngân hàng hoặc cơ quan chức năng.

## Tính năng đã hoàn thành

| Cấp | Tính năng |
|-----|-----------|
| 1 | Gọi Gemini, deploy GitHub Pages, footer pháp lý |
| 2 | Thám tử, thẻ rủi ro, tô vàng tin gốc, tin mẫu, lịch sử 10 tin, xử lý lỗi |
| 3 | Cô tâm lý (gọi tuần tự khi Nghi ngờ / Nguy hiểm) |
| 4 | **A** Thư viện 15 kiểu lừa đảo + **D** Thẻ cảnh báo chia sẻ (Canvas + QR) + **C** Luyện tập 10 câu |
| 5 | Người ứng cứu — 4 tình huống khủng hoảng |

## Chạy trên máy (dành cho nhóm dev)

1. Sao chép `config.example.js` thành `config.js`
2. Điền Gemini API key mentor cấp vào `config.js`
3. Mở bằng **Live Server** (không mở file HTML trực tiếp)
4. Dán tin nhắn → bấm **Kiểm tra**

## Triển khai GitHub Pages

### Bước 1 — Thêm Secret
Settings → Secrets → Actions → `GEMINI_API_KEY` = key mentor cấp

### Bước 2 — Đổi nguồn Pages (bắt buộc)
Settings → Pages → Source: **GitHub Actions**

> Không dùng nhánh `gh-pages` — GitHub Push Protection sẽ chặn file chứa API key khi push lên Git.

### Bước 3 — Push code
Mỗi lần push `main`, workflow tự deploy lên GitHub Pages.

Link sản phẩm: `https://txlocal17.github.io/ScamCheck-Cybershield-/`

## Cấu trúc

```
index.html              Giao diện chính (SPA: kiểm tra / lịch sử / thư viện / luyện tập)
style.css               Giao diện (cỡ chữ tối thiểu 18px cho nội dung chính)
script.js               Logic: 3 nhân vật AI, lịch sử, thẻ chia sẻ, quiz
data/scam-types.json    15 kiểu lừa đảo (Cấp 4A)
data/quiz.json          10 câu luyện tập — 5 lừa đảo / 5 tin thật (Cấp 4C)
data/hotlines.json      Số tổng đài chính thống (Cấp 5)
config.js               API key (local only)
config.example.js       Mẫu hướng dẫn
```

## Việc nhóm cần tự làm

- [x] Báo mentor đã chọn tính năng **A + D** cho Cấp 4 (thêm **C** luyện tập)
- [ ] Xác minh lần cuối số tổng đài trong `data/hotlines.json` với mentor
- [ ] Test trên iPhone thật (Safari) — gồm 4 tình huống Người ứng cứu
- [ ] Nộp link lên Sheet tập hợp
- [ ] Slide + video demo (N7)
