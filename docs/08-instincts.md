# Instincts (Continuous Learning)

[← Mục lục](./README.md) | [← Skills](./skills.md) | [Cấu trúc file →](./file-structure.md)

---

## Instincts là gì?

Instincts là patterns ngắn gọn mà agent học được từ kinh nghiệm. Chúng nhẹ hơn skills — chỉ là 1 câu mô tả + tags + confidence score.

Từ v1.5.0, Instincts đóng vai trò là lớp lưu trữ tri thức tổng quát và được phân chia thành các loại (`type`):
- `instinct`: Pattern phản xạ nhanh thông thường.
- `lesson`: Bài học kinh nghiệm rút ra từ lỗi sai hoặc thành công.
- `pattern` / `anti_pattern`: Mẫu thiết kế/cách tiếp cận tốt hoặc xấu cần tránh.
- `decision`: Quyết định kiến trúc (ADR) hoặc thiết kế dự án.
- `experiment`: Nhật ký các thử nghiệm (thất bại hoặc thành công) giúp tránh lặp lại thử nghiệm vô ích.

---

## Lifecycle

Vòng đời của một Instinct bao gồm 4 giai đoạn chuyển đổi chặt chẽ nhằm đảm bảo tính an toàn và chất lượng tri thức:

```
Experience ➔ Capture (instinct_add: draft) ➔ Promote (instinct_promote: candidate) ➔ Regression Gate ➔ Shadow ➔ Auto-Promote ➔ Promoted
```

| Giai đoạn | Trạng thái | Ý nghĩa | Hành động kích hoạt |
|---|---|---|---|
| `draft` | Nháp | Bản năng mới được tạo, chưa được xác thực | Gọi `instinct_add` |
| `candidate` | Ứng viên | Gắn cờ để chuẩn bị đánh giá thăng cấp | Gọi `instinct_promote` |
| `shadow` | Chạy bóng | Hoạt động ở chế độ quan sát, đính kèm `shadow: true` | Tự động sau khi vượt qua Regression Gate |
| `promoted` | Thăng cấp | Đã được kiểm chứng đầy đủ, có hiệu lực vĩnh viễn | Tự động khi đáp ứng các điều kiện thoát khỏi chế độ shadow |

### Cổng kiểm soát Regression Gate (Regression Gate)
Khi một Instinct chuyển từ `candidate ➔ shadow` (hoặc kiểm tra định kỳ trước khi thăng cấp hoàn toàn), hệ thống sẽ chạy cổng kiểm soát xác định để đảm bảo:
1. **Tính đầy đủ của Manifest**: Phải có đầy đủ `tags`, `confidence`. Bản năng shadow phải có ít nhất một kết quả trong `instinct_outcomes`.
2. **Ngưỡng độ tin cậy**: Độ tin cậy `confidence >= 0.7` (hoặc $\ge 0.5$ đối với ứng viên ban đầu).
3. **Kiểm tra thụt lùi (Regression Check)**: Bản năng mới không được làm giảm tỷ lệ thành công của các bản năng đã thăng cấp hiện tại có cùng tag chính quá 10% (so sánh trên 20 dòng thẻ điểm gần nhất có chứa các bản năng đó).

### Điều kiện thoát khỏi chế độ Shadow (Shadow Exit Criteria)
Một instinct ở trạng thái `shadow` sẽ tự động chuyển sang `promoted` khi:
- Đã thu thập tối thiểu **10 kết quả** trong bảng `instinct_outcomes`.
- Tỷ lệ thành công trung bình đạt **$\ge 70\%$**.
- Không phát hiện sự thụt lùi của hệ thống (pass Regression Gate).
- Thời gian chạy shadow trải rộng trên ít nhất **5 phiên (sessions) phân biệt**.

*Lưu ý*: Nếu tỷ lệ thành công bị tụt giảm xuống dưới 60% (khi đã thu thập $\ge 5$ kết quả), instinct sẽ tự động bị hạ cấp trở lại `candidate` để chờ xử lý thủ công.

---

## Confidence Scoring

Độ tin cậy (confidence) của instinct được tính toán kết hợp giữa giá trị ban đầu và phân phối xác suất Bayes (Bayesian confidence) dựa trên kết quả thực tế thu nhận qua tool `instinct_record_outcomes` hoặc các reference trong session.

| Sự kiện | Thay đổi confidence |
|---------|---------------------|
| Mới tạo | 0.5 (default) |
| Ghi nhận kết quả (Bayesian) | Công thức Bayes kết hợp: `70% Bayesian + 30% Existing` |
| Không được reference sau N sessions | -0.05 (decay) |
| Dưới 0.2 sau 30 ngày | Candidate cho pruning |
| Được promote | Đặt tối thiểu là 0.7, xóa TTL |

**Công thức Bayesian Confidence:**
```
Bayesian Confidence = (success_count + 1) / (success_count + failure_count + 2)
Blended Confidence = 0.7 * Bayesian Confidence + 0.3 * Existing Confidence
```

---

## Ghi nhận Kết quả (Outcomes)

Khi kết thúc session, kết quả thực tế của session (`success` hoặc `failure`) được ghi nhận thông qua tool `instinct_record_outcomes` hoặc tự động cập nhật thống kê (`success_count`/`failure_count`) của các instincts đã tham chiếu, từ đó tính lại độ tin cậy.

---

## TTL (Time-to-Live)

- `ttl_days: null` → permanent (không bao giờ tự expire)
- `ttl_days: 30` → expire sau 30 ngày nếu không được promote
- Dùng TTL cho instincts chưa chắc chắn, promote khi đã validate

---

## Evolve to Skills

Khi 5+ instincts cùng tag cluster:

```
instinct_evolve({ tag_cluster: "testing" })
→ Sinh SKILL.md draft từ cluster
→ User review + save
→ Prune source instincts (đã captured trong skill)
```

---

## Ví dụ thực tế

```
Session 1: Agent học "phải chạy typecheck trước test"
  → instinct_add("Always run typecheck before test", ["testing", "node"], 0.5)

Session 2: Agent dùng instinct đó, thành công
  → confidence tăng lên 0.6

Session 5: Agent dùng lại, thành công
  → confidence = 0.8

Session 10: Có 6 instincts về testing
  → instinct_evolve("testing") → sinh "testing-patterns" skill draft
```

---

## Best Practices

| Nên | Không nên |
|-----|-----------|
| Capture pattern cụ thể, actionable | Capture advice chung chung ("write good code") |
| Tag chính xác để dễ tìm | Để tags trống |
| Prune định kỳ | Để instincts tích tụ vô hạn |
| Promote instincts đã validate | Giữ mãi ở pending |
| Evolve khi cluster đủ lớn | Tạo skill thủ công khi có thể evolve |

---

## So sánh Instincts vs Skills

| | Instincts | Skills |
|---|-----------|--------|
| **Kích thước** | 1 câu + tags | Full markdown document |
| **Tạo bởi** | Agent (runtime) | Human hoặc evolve từ instincts |
| **Confidence** | Có (0-1, decay/grow) | Không (luôn active) |
| **TTL** | Có thể expire | Permanent |
| **Mục đích** | Quick pattern recall | Comprehensive workflow guide |
