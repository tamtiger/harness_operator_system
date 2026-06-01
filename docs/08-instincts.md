# Instincts (Continuous Learning)

[← Mục lục](./README.md) | [← Skills](./skills.md) | [Cấu trúc file →](./file-structure.md)

---

## Instincts là gì?

Instincts là patterns ngắn gọn mà agent học được từ kinh nghiệm. Chúng nhẹ hơn skills — chỉ là 1 câu mô tả + tags + confidence score.

---

## Lifecycle

```
Experience → Capture (instinct_add) → Validate (confidence grows) → Evolve (instinct_evolve → skill)
```

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
