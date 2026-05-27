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

| Sự kiện | Thay đổi confidence |
|---------|---------------------|
| Mới tạo | 0.5 (default) |
| Được reference và thành công | +0.1 (max 1.0) |
| Không được reference sau N sessions | -0.05 (decay) |
| Dưới 0.2 sau 30 ngày | Candidate cho pruning |
| Được promote | Set to 0.9, xóa TTL |

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
