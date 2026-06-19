# Lộ trình tích hợp HarnessX cho harness-os
**Version:** 2.1 · **Bản sửa đổi cuối:** 2026-06-19

---

## Nguyên tắc dẫn đường

Mục tiêu không phải là tái tạo lại HarnessX bên trong harness-os.

- **HarnessX** sở hữu vòng lặp thực thi (execution loop - framework)
- **harness-os** cung cấp các rào cản bảo vệ (guardrails) và hướng dẫn thích ứng thông qua MCP (advisory server - máy chủ tư vấn)

Chỉ những khái niệm phù hợp với kiến trúc tư vấn của MCP mới được áp dụng. Mọi quyết định điều chỉnh phải truy nguyên được từ dữ liệu thẻ điểm (scorecard) — tuyệt đối không dựa trên văn bản nhật ký (log) thô hoặc chỉ dựa vào trực giác của LLM.

**Nhận định kiến trúc cốt lõi:** Agent gọi harness-os thông qua MCP **bản thân nó đã là một LLM**. harness-os không bao giờ cần phải tự thực hiện các cuộc gọi API LLM riêng. Thay vào đó: harness-os trả về bằng chứng có cấu trúc → agent lập luận dựa trên bằng chứng đó → agent gọi lại với các đề xuất (proposals) → harness-os xác thực một cách xác định (deterministic).

---

## Bản đồ phụ thuộc (Dependency Map)

```
Phase 0 (Scorecard + Định danh Variant + Ghi nhận)
    └── Phase 1 (Lớp bảo vệ an toàn — cần schema của scorecard)
            └── Phase 2 (Khả năng quan sát — cần dữ liệu kết quả + số liệu shadow)
                    └── Phase 3 (AEGIS-lite — cần scorecards + lịch sử shadow)
                            └── Phase 4 (Danh mục Harness Portfolio — cần dữ liệu variant)
                                    └── Phase 5 (Tối ưu hóa — cần tín hiệu chất lượng khớp)
```

Mỗi phase là điều kiện tiên quyết bắt buộc cho phase tiếp theo. Không được bỏ qua.

---

## Phase 0 — Nền tảng

> Mục tiêu: Tạo một lớp đo lường được chuẩn hóa trước khi thực hiện bất kỳ logic điều chỉnh nào.
> Nếu không có lớp này, các cổng kiểm soát (gates) sẽ không có gì khách quan để kiểm tra.

### 0-A · Thẻ điểm Harness (Harness Scorecard)

Thêm bảng `scorecards` vào DB SQLite hiện tại. Một dòng cho mỗi tác vụ đã hoàn thành.

**Schema:**

| Trường (Field) | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `id` | TEXT (UUID) | Khóa chính (Primary key) |
| `task_id` | TEXT | Khóa ngoại (FK) → bảng `tasks` |
| `session_id` | TEXT | Khóa ngoại (FK) → bảng `sessions` |
| `task_type` | TEXT | Từ nguồn phân loại taxonomy ở Phase 0-C |
| `variant_id` | TEXT | Từ Phase 0-B; mặc định là `"default"` |
| `verify_pass` | INTEGER (0/1) | Kết quả cuối cùng của `verify_run` |
| `tool_calls` | INTEGER | Tổng số cuộc gọi công cụ MCP trong phiên (session) |
| `retry_count` | INTEGER | Số lần chạy lại `verify_run` |
| `loop_events` | INTEGER | Số lần kích hoạt Loop guard (bảo vệ lặp) |
| `files_touched` | INTEGER | Số lượng file đã chỉnh sửa trong phạm vi (scope) |
| `execution_time_ms` | INTEGER | Thời gian thực thi: `session_start` → `session_end` |
| `instincts_used` | TEXT (JSON) | Mảng chứa các ID instinct đã được tải |
| `skills_used` | TEXT (JSON) | Mảng chứa tên các skill đã được tải |
| `created_at` | TEXT (ISO8601) | |

Tất cả các quyết định phát triển trong tương lai sẽ tiêu thụ các dòng dữ liệu thẻ điểm này. Tuyệt đối không phân tích cú pháp văn bản nhật ký kiểm toán (audit log) thô trực tiếp cho các quyết định điều chỉnh.

**Vị trí DB:** Thêm `CREATE TABLE IF NOT EXISTS scorecards (...)` trong `src/db/client.ts` → `runMigrations()`.

### 0-B · Định danh Variant (Variant Identity)

Giới thiệu `variant_id` như một cấu hình profile được đặt tên. Việc điều hướng (routing) vẫn được thực hiện **thủ công** trong phase này — hiện tại chỉ yêu cầu thu thập dữ liệu.

**Các variant ban đầu (được hardcode, chưa có logic điều hướng):**

| `variant_id` | Mục đích sử dụng |
|---|---|
| `default` | Phương án dự phòng khi không được chỉ định |
| `coding-strict` | Công việc lập trình tính năng mới yêu cầu phải pass qua toàn bộ verify |
| `coding-fast` | Bản sửa lỗi nhanh (hotfix) / các chỉnh sửa có rủi ro thấp |
| `debug` | Các tác vụ chẩn đoán lỗi, dự kiến số cuộc gọi công cụ cao |
| `refactor` | Các thay đổi cấu trúc, chỉnh sửa trên diện rộng (scope-wide) |
| `research` | Không mong đợi chỉnh sửa file |

Agent thiết lập `variant_id` khi gọi `session_start`. Nếu bỏ qua, ghi nhận là `"default"`.

**Các file bị ảnh hưởng:**
- `src/tools/session.ts` — thêm `variant_id` vào interface `SessionStartOptions`
- `src/index.ts` — thêm `variant_id` vào Zod schema của công cụ `session_start`
- `src/db/client.ts` — thêm cột `variant_id TEXT DEFAULT 'default'` vào bảng `sessions` (migration lũy đẳng - idempotent migration)

### 0-C · Nguồn phân loại loại tác vụ (Task Type Taxonomy Seed)

Định nghĩa các loại tác vụ từ sớm để trường `task_type` trong scorecards được nhất quán. Đây **chỉ là định nghĩa schema** — chưa có thuật toán khớp (thuật toán này sẽ có ở Phase 5).

**Danh sách phân loại ban đầu (mở rộng khi cần):**
`feature`, `bugfix`, `refactor`, `test`, `docs`, `config`, `research`, `debug`, `hotfix`

Thêm `task_type` như một trường tùy chọn trong công cụ `task_create`. Nếu bỏ qua, agent có thể tự suy luận từ tiêu đề tác vụ hoặc để trống dưới dạng `"unknown"`.

**Các file bị ảnh hưởng:**
- `src/tools/task.ts` — thêm tham số `task_type` vào `taskCreate()`
- `src/index.ts` — thêm `task_type` vào Zod schema của công cụ `task_create`
- `src/db/client.ts` — thêm cột `task_type TEXT DEFAULT 'unknown'` vào bảng `tasks` (migration lũy đẳng)

> **Tại sao làm ở đây chứ không phải Phase 5:** Việc phân loại phải tồn tại trước khi scorecards có thể ghi nhận các giá trị `task_type` có ý nghĩa. Việc cải thiện chất lượng khớp (Phase 5) đòi hỏi phải có dữ liệu lịch sử với các loại tác vụ nhất quán — quá trình thu thập dữ liệu đó bắt đầu từ bây giờ.

### 0-D · Chuẩn hóa kết quả (Outcome Normalization)

Chuẩn hóa việc ghi nhận thành công/thất bại đối với việc sử dụng instinct. Một dòng cho mỗi cặp `(instinct, task)`.

**Thêm bảng `instinct_outcomes`:**

| Trường (Field) | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `instinct_id` | TEXT | Khóa ngoại (FK) → `instincts` |
| `task_id` | TEXT | Khóa ngoại (FK) → `tasks` |
| `task_type` | TEXT | Phi chuẩn hóa (Denormalized) để truy vấn nhanh hơn |
| `variant_id` | TEXT | Phi chuẩn hóa để truy vấn nhanh hơn |
| `outcome` | TEXT | `success` / `failure` / `partial` |
| `scorecard_id` | TEXT | Khóa ngoại (FK) → `scorecards` |
| `timestamp` | TEXT (ISO8601) | |

**Mối quan hệ với bảng `session_instinct_refs` hiện tại:**
- `session_instinct_refs` vẫn được giữ lại để theo dõi instinct nào được tham chiếu trong một phiên (sử dụng bởi `instinct_get` để cập nhật độ tin cậy Bayes - Bayesian confidence).
- `instinct_outcomes` là bảng **nhiều thông tin hơn** hướng tới quá trình tiến hóa (evolution) — được làm phong phú thêm với `task_type`, `variant_id`, và `scorecard_id` để phân tích chéo.
- Cả hai bảng được ghi dữ liệu vào các thời điểm khác nhau: `session_instinct_refs` tại thời điểm gọi `instinct_get`; `instinct_outcomes` tại thời điểm ghi nhận thẻ điểm (Phase 0-E).
- KHÔNG loại bỏ bảng `session_instinct_refs` — nó phục vụ một mục đích khác.

### 0-E · Hook ghi nhận Thẻ điểm (Scorecard Recording Hook)

Định nghĩa **khi nào** và **như thế nào** các dòng thẻ điểm được tạo ra. Nếu không có điều này, schema ở Phase 0-A sẽ không có dữ liệu.

**Kích hoạt (Trigger):** Tự động khi gọi `session_handoff()` hoặc `session_end()` trong `src/tools/session.ts`. Nếu phiên làm việc có các tác vụ, một thẻ điểm cho mỗi tác vụ sẽ được tạo ra.

**Nguồn dữ liệu cho mỗi trường:**

| Trường | Nguồn dữ liệu |
|---|---|
| `task_id` | Từ bảng `tasks` (các tác vụ trong phiên này) |
| `session_id` | ID của phiên hiện tại |
| `task_type` | Từ `tasks.task_type` (được thêm ở Phase 0-C) |
| `variant_id` | Từ `sessions.variant_id` (được thêm ở Phase 0-B) |
| `verify_pass` | Từ `sessions.verify_called` + kết quả `verify_run` cuối cùng được lưu trữ trong phiên |
| `tool_calls` | Đếm từ `audit_events WHERE event_type LIKE 'tool_%' AND created_at BETWEEN session.started_at AND session.ended_at` |
| `retry_count` | Đếm từ `audit_events WHERE event_type = 'tool_success' AND payload LIKE '%verify_run%' AND ...` |
| `loop_events` | Đếm từ `audit_events WHERE event_type = 'loop_detected' AND ...` |
| `files_touched` | Đếm từ `audit_events WHERE event_type = 'tool_success' AND payload LIKE '%scope_check%' AND ...` (các đường dẫn file duy nhất) |
| `execution_time_ms` | `session.ended_at - session.started_at` |
| `instincts_used` | Truy vấn `session_instinct_refs WHERE session_id = ?` → mảng JSON chứa các instinct ID |
| `skills_used` | Truy vấn `audit_events WHERE payload LIKE '%skill_load%'` → mảng JSON chứa tên các skill |

**Triển khai:** Thêm hàm `recordScorecard(sessionId)` trong file mới `src/lib/scorecard.ts`. Gọi hàm này từ `sessionHandoff()` và `sessionEnd()` trong `src/tools/session.ts`.

**Kết quả instinct (Instinct outcomes):** Sau khi thẻ điểm được tạo, lặp qua `session_instinct_refs` của phiên này và chèn các dòng tương ứng vào `instinct_outcomes` cùng với `task_type`, `variant_id`, và `scorecard_id` của thẻ điểm đó.

---

## Phase 1 — Lớp bảo vệ an toàn (Safety Layer)

> Mục tiêu: Đảm bảo việc thăng cấp (promotion) instinct an toàn trước khi có tự động hóa.
> Cổng kiểm soát (Gate) phải sẵn sàng trước khi AEGIS-lite có thể tạo ra các đề xuất (Phase 3).

### 1-A · Cổng kiểm soát xác định (Deterministic Gating)

Thêm hàm `checkRegressionGate(instinctId)` trong `src/tools/instinct.ts`. Được gọi bởi cả `instinct_promote` và bất kỳ lộ trình tự động thăng cấp nào trong tương lai.

**Các kiểm tra cổng (tất cả phải vượt qua):**

| Kiểm tra | Logic |
|---|---|
| Tính đầy đủ của Manifest | Các trường bắt buộc: `tags`, `confidence`, ít nhất một dòng `instinct_outcomes` làm bằng chứng |
| Ngưỡng độ tin cậy | `confidence ≥ configurable_threshold` (mặc định: 0.7) |
| Kiểm tra thụt lùi (Regression check) | Bản năng mới không được làm giảm tỷ lệ thành công của các bản năng đã thăng cấp hiện tại có cùng tag chính quá 10% (so sánh 20 dòng thẻ điểm gần nhất của tag đó) |

**Hành vi khi thất bại:** Bản năng giữ nguyên trạng thái hiện tại. Công cụ trả về việc kiểm tra nào bị thất bại và lý do. Không có lỗi bị ẩn (no silent failures).

Cổng kiểm soát này **không thể tắt qua cấu hình**. Không có flag (cờ) nào có thể bỏ qua nó.

### 1-B · Quy trình thăng cấp (Promotion Pipeline)

Thay thế trạng thái nhị phân `pending → promoted` bằng vòng đời gồm 4 giai đoạn:

```
draft → candidate → shadow → promoted
```

| Giai đoạn | Ý nghĩa | Ai thiết lập |
|---|---|---|
| `draft` | Được tạo, chưa được xác thực | `instinct_add` |
| `candidate` | Được gắn cờ thủ công để đánh giá | Agent / con người thông qua `instinct_promote` |
| `shadow` | Chạy ở chế độ quan sát | Tự động sau khi vượt qua cổng kiểm soát |
| `promoted` | Môi trường sản xuất, ảnh hưởng đến các đề xuất | Sau khi đáp ứng điều kiện thoát khỏi chế độ shadow |

**Migration DB — bảng `instincts`:**
- Thêm cột: `status TEXT DEFAULT 'draft'` (câu lệnh `ALTER TABLE` lũy đẳng trong `runMigrations()`)
- **Khả năng tương thích ngược:** Tất cả các dòng instinct hiện có sẽ có trạng thái `status = 'promoted'` (chúng đã hoạt động trước khi migration). Truy vấn migration: `UPDATE instincts SET status = 'promoted' WHERE status IS NULL OR status = 'draft'` — chạy một lần sau khi thêm cột.

**Thay đổi đột ngột (Breaking change) đối với `instinct_promote`:**
- Hành vi hiện tại: `SET ttl_days = NULL, confidence = MAX(confidence, 0.7)` → thăng cấp ngay lập tức.
- Hành vi mới: `instinct_promote(id)` chuyển instinct sang `candidate` → chạy kiểm tra cổng kiểm soát → nếu pass, chuyển sang `shadow`.
- Việc loại bỏ TTL + tăng độ tin cậy vẫn diễn ra, nhưng chỉ khi chuyển đổi cuối cùng từ `shadow → promoted`.
- Các agent gọi `instinct_promote` sẽ thấy hành vi khác đi: instinct sẽ không hiển thị ngay lập tức là "được thăng cấp hoàn toàn".

### 1-C · Thăng cấp Shadow (Shadow Promotion)

Các instinct thuộc nhóm `candidate` vượt qua cổng kiểm soát xác định sẽ chuyển sang chế độ `shadow` thay vì đi thẳng đến `promoted`.

**Trong chế độ shadow:**
- Instinct VẪN được bao gồm trong kết quả trả về của `instinct_get` nhưng được đánh dấu bằng `"shadow": true`.
- Agent có thể chọn sử dụng nó — kết quả được ghi lại trong bảng `instinct_outcomes`.
- Chế độ shadow KHÔNG ảnh hưởng đến việc tính điểm/xếp hạng của các instinct đã được thăng cấp (`promoted`).

**Điều kiện thoát (rõ ràng — không mở rộng vô hạn):**

Một instinct ở chế độ shadow tự động thăng cấp lên `promoted` khi đáp ứng ĐẦY ĐỦ các điều kiện sau:
- Ghi nhận tối thiểu **10 dòng kết quả** trong bảng `instinct_outcomes` đối với instinct này.
- Tỷ lệ thành công **≥ 70%** trên các kết quả đó.
- Không phát hiện thấy sự thụt lùi (regression) trong các instinct đã thăng cấp có cùng tag (chạy lại kiểm tra cổng kiểm soát 1-A).
- Thời gian shadow **≥ 5 phiên (sessions) phân biệt** (ngăn chặn việc gian lận bằng cách chạy các tác vụ nhỏ liên tục trong thời gian ngắn — dựa trên phiên thay vì thời gian thực tế, vì hoạt động phát triển của dev thường diễn ra theo từng đợt ngắt quãng).

Nếu tỷ lệ thành công giảm xuống dưới 60% tại bất kỳ thời điểm nào trong quá trình shadow (khi đã có ≥ 5 kết quả): tự động hạ cấp xuống lại `candidate`, đánh dấu để con người xem xét.

**Trình kích hoạt kiểm tra thoát shadow (Shadow exit check trigger):** Chạy tự động trong quá trình ghi nhận thẻ điểm (Phase 0-E) — khi một dòng `instinct_outcomes` mới được chèn cho một instinct shadow, kiểm tra xem các điều kiện thoát đã được đáp ứng chưa.

---

## Phase 2 — Khả năng quan sát (Observability)

> Mục tiêu: Phát hiện các vấn đề trong các hoạt động hiện tại trước khi cố gắng cải thiện chúng.

### 2-A · Bộ phân tích dấu vết (Trace Analyzer)

Thêm `src/lib/trace-analyzer.ts`. Đọc dữ liệu từ bảng `scorecards` + `instinct_outcomes`.

**Phát hiện (dựa trên quy tắc - rule-based, không phải dựa trên LLM):**

| Tín hiệu | Logic phát hiện |
|---|---|
| Thất bại liên tục | Sự kết hợp giữa cùng một `task_type` + cùng một `instinct_id` thất bại ≥ 3 lần liên tiếp |
| Các mẫu lặp | `loop_events > 0` trong thẻ điểm; `retry_count > 3` mà không có sự thay đổi trạng thái thành công của `verify_pass` |
| Sử dụng instinct giá trị thấp | Instinct được sử dụng ≥ 5 lần, tỷ lệ thành công duy trì ở mức < 40% |
| Khám phá dưới mức | Cùng một instinct được sử dụng cho > 80% số tác vụ trong một nhóm `task_type` trong số 30 thẻ điểm gần nhất |
| Vi phạm quy trình | Có sự kiện sửa file trong `audit_events` nhưng không có cuộc gọi thành công `verify_run` trước khi `session_handoff` hoặc `session_end` |
| Bỏ qua tải skill | Có gợi ý skill trong task_create có score ≥ 1.5 nhưng không có cuộc gọi skill_load cho bất kỳ skill nào |

Tất cả các phát hiện đều mang tính xác định. Kết quả được lưu trữ dưới dạng các dòng dữ liệu trong bảng `analysis_events`, không tự động hành động.

### 2-B · Kiểm tra tính toàn vẹn của việc Xác thực & Cưỡng chế quy trình

Phát hiện các trường hợp mà `verify_run`, việc nạp skill, hoặc quy trình session bị bỏ qua, tránh việc agent cố tình đi tắt.

**Đánh dấu cờ khi:**
- `verify_pass = 1` nhưng số lượng `tool_calls` thấp một cách bất thường (< 3 cho một tác vụ có `files_touched > 0`)
- `retry_count = 0` và `loop_events > 2` (agent bị kẹt nhưng việc verify lại báo "passed" — đáng ngờ)
- `verify_run` không được gọi một lần nào trong một phiên có chỉnh sửa các file -> Ghi nhận sự kiện này là **Vi phạm quy trình nghiêm trọng (Critical Workflow Violation)** vào bảng `analysis_events`.
- Phát hiện agent bỏ qua tải skill được đề xuất (score ≥ 1.5) nhưng tiến hành thực thi sửa đổi code -> Ghi nhận là **Cảnh báo thiếu tải skill (Skipped Skill Warning)** vào bảng `analysis_events`.

Đây là **phát hiện bất thường về tính toàn vẹn (integrity anomaly detection)**, không phải là cơ chế ngăn chặn gian lận phần thưởng hoàn toàn (reward-hacking prevention). Khi phát hiện vi phạm quy trình nghiêm trọng hoặc cảnh báo thiếu tải skill liên tiếp, hệ thống sẽ từ chối tự động thăng cấp bất kỳ instinct nào được tạo ra trong phiên đó, đồng thời hạ cấp độ tin cậy (confidence) của các đề xuất từ agent vi phạm.

### 2-C · Phát hiện sự lãng quên (Forgetting Detection)

So sánh tỷ lệ thành công của các nhóm `(task_type, variant_id)` trước và sau mỗi sự kiện thăng cấp.

**Điều kiện tiên quyết — bắt buộc kiểm tra trước khi chạy:**
Yêu cầu ít nhất một `variant_id` có ≥ 10 thẻ điểm bao phủ ít nhất 2 giá trị `task_type` khác nhau, với khoảng phân bổ thời gian đủ rộng để chia ranh giới trước/sau một sự kiện thăng cấp. Nếu không đáp ứng, trả về `"insufficient_data"` — không tiến hành phát hiện.

**Logic phát hiện:**
- Tại mỗi sự kiện thăng cấp, chụp nhanh (snapshot) tỷ lệ thành công hiện tại theo cặp `(task_type, variant_id)` vào bảng `promotion_snapshots`.
- 7 ngày sau khi thăng cấp, so sánh tỷ lệ thực tế đang hoạt động (live) với bản chụp nhanh đó.
- Đánh dấu cờ bất kỳ nhóm nào bị giảm > 15 điểm phần trăm.

---

## Phase 3 — Thích ứng (Adaptation)

> Mục tiêu: Tạo ra các đề xuất cải tiến dựa trên bằng chứng thu thập được.
> Không bao giờ tự động thăng cấp. Không bao giờ bỏ qua cổng kiểm soát ở Phase 1.

### 3-A · AEGIS-lite — Các công cụ Đề xuất & Bằng chứng

Thêm `src/tools/aegis-lite.ts`. Cung cấp **2 công cụ MCP** tuân theo mô hình tư vấn: harness-os cung cấp dữ liệu có cấu trúc, agent gọi (đã là một LLM) sẽ lập luận trên đó và đề xuất thay đổi.

**Không thực hiện cuộc gọi API LLM bên ngoài.** Không thêm dependency (thư viện phụ thuộc) mới.

**Công cụ 1: `aegis_analyze(repo_path)`**

Trả về các tín hiệu có cấu trúc từ Bộ phân tích dấu vết (Phase 2-A). Agent đọc bằng chứng này và quyết định xem có đề xuất thay đổi nào hay không.

```
Đầu vào:  { repo_path: string }
Đầu ra: {
  signals: [
    { type: "repeated_failure", instinct_id: "...", task_type: "...", consecutive_failures: 5, evidence: {...} },
    { type: "low_value", instinct_id: "...", usage_count: 12, success_rate: 0.25, evidence: {...} },
    { type: "workflow_non_compliance", session_id: "...", task_id: "...", files_changed: 5, verify_called: false, evidence: {...} },
    { type: "skipped_skill_loading", session_id: "...", task_id: "...", suggested_skills: ["tdd-workflow"], evidence: {...} },
    ...
  ],
  summary: { total_scorecards: 47, signals_found: 5, last_analyzed: "..." }
}
```

Agent đọc các tín hiệu, lập luận về nguyên nhân gốc rễ và có thể gọi `aegis_propose` kèm theo một đề xuất cụ thể. Hoặc nó có thể quyết định không cần hành động gì — harness-os không ép buộc.

**Công cụ 2: `aegis_propose(repo_path, proposal)`**

Agent gửi một đề xuất. harness-os xác thực đề xuất đó một cách xác định và lưu trữ lại.

```
Đầu vào:  {
  repo_path: string,
  type: "merge" | "prune" | "evolve",
  instinct_ids: string[],
  rationale: string,         // Giải thích do Agent tạo ra
  suggested_change: string   // Nội dung thay đổi mà agent đề xuất
}
Đầu ra: {
  proposal_id: string,
  status: "pending_review",
  gate_pre_check: { passed: boolean, failed_checks: string[] }  // Cảnh báo sớm
}
```

**Phân chia vai trò:**

| Bộ phận | Bên thực hiện | Cơ chế |
|---|---|---|
| Phát hiện tín hiệu | harness-os | Dựa trên quy tắc (Bộ phân tích dấu vết Phase 2-A) |
| Trình bày bằng chứng | harness-os | JSON có cấu trúc qua `aegis_analyze` |
| Lập luận & tạo đề xuất | Agent gọi (LLM) | Agent đọc bằng chứng, quyết định, gọi `aegis_propose` |
| Xác thực & lưu trữ đề xuất | harness-os | Cổng kiểm soát dựa trên quy tắc (Phase 1-A) |
| Phê duyệt cuối cùng | Con người | `harness proposals --approve <id>` |

**Các loại đề xuất:**

| Loại | Điều kiện kích hoạt | Đầu ra mong đợi |
|---|---|---|
| `merge` | Có 2+ instinct cùng chung tag, tỷ lệ trùng lặp sử dụng cao, cả hai đều có tỷ lệ thành công > 80% | Đề xuất gộp chúng lại thành một instinct mạnh mẽ hơn |
| `prune` | Instinct được sử dụng ≥ 5 lần, tỷ lệ thành công < 40% kéo dài liên tục trên 14 ngày | Đề xuất loại bỏ |
| `evolve` | Tỷ lệ thành công của instinct giảm liên tục trong 3 tuần liên tiếp | Đề xuất sửa đổi nội dung |
| `penalize` | Agent vi phạm quy trình ≥ 3 lần trong lịch sử thẻ điểm gần đây | Đề xuất cảnh cáo nghiêm khắc, hoặc hạ cấp độ tin cậy của các instinct do agent này đóng góp |

**Tất cả các đề xuất:**
- Được lưu trữ trong bảng `proposals` với trạng thái `status: "pending_review"`.
- Không bao giờ được tự động áp dụng.
- Yêu cầu con người phê duyệt thủ công thông qua CLI `harness proposals --approve <id>`.
- Khi được phê duyệt: được định tuyến qua cổng kiểm soát Phase 1 trước khi có bất kỳ thay đổi trạng thái nào.

### 3-B · Quy trình phê duyệt của con người (Human Review Workflow)

```
agent gọi aegis_analyze → đọc các tín hiệu
    → agent gọi aegis_propose (kèm giải thích logic - rationale)
        → đề xuất được lưu dưới dạng pending_review
        → có thể xem qua lệnh: harness proposals --list
        → phê duyệt qua lệnh: harness proposals --approve <id>
        → chạy cổng kiểm soát Phase 1-A
            → nếu pass: instinct chuyển sang chế độ shadow (Phase 1-C)
            → nếu fail: đề xuất bị từ chối, lý do được ghi lại trong nhật ký
```

Không có đường tắt. Không có cờ `--force`.

---

## Phase 4 — Danh mục Harness (Harness Portfolio)

> Mục tiêu: Chính thức hóa việc quản lý variant sau khi đã có đủ dữ liệu.
> **Không bắt đầu cho đến khi:** Có ít nhất 3 variant, mỗi variant có ít nhất 30 thẻ điểm (~1-2 tháng sử dụng bình thường với tần suất 1-3 phiên/ngày).

### 4-A · Đánh giá Variant (Variant Benchmarking)

Thêm lệnh CLI `harness variants --benchmark`. Kết xuất các dữ liệu tổng hợp của từng variant từ bảng `scorecards`:

- Tỷ lệ thành công (tỷ lệ `verify_pass`)
- Tỷ lệ xác thực (% số phiên có gọi `verify_run`)
- Trung bình số cuộc gọi công cụ
- Trung bình số lần chạy lại (retry count)
- Thời gian thực thi trung bình

### 4-B · Phân lập Variant (Variant Isolation)

Theo dõi hiệu suất của instinct/skill theo cặp `(instinct_id, variant_id)` ngoài các giá trị tổng thể. Việc này giúp làm nổi bật các instinct hoạt động tốt cho một variant này nhưng lại kém hiệu quả ở một variant khác.

### 4-C · Tự động điều hướng (Auto Routing)

**Chỉ kích hoạt khi tất cả các điều kiện sau được đáp ứng:**
- Có ít nhất 3 variant được định nghĩa với các mục đích sử dụng phân biệt rõ ràng.
- Mỗi variant có tối thiểu 30 thẻ điểm.
- Đánh giá (Phase 4-A) cho thấy sự khác biệt có ý nghĩa thống kê giữa các variant (khoảng cách tỷ lệ thành công > 10% giữa variant tốt nhất và tệ nhất cho cùng một loại tác vụ `task_type`).

Tự động điều hướng sẽ ánh xạ `task_type` → `variant_id` được đề xuất dựa trên dữ liệu thẻ điểm lịch sử. Vẫn cho phép agent ghi đè thủ công tại thời điểm gọi `session_start`.

---

## Phase 5 — Tối ưu hóa (Optimization)

> Mục tiêu: Cải thiện chất lượng khớp nếu bằng chứng từ thẻ điểm cho thấy đây là một nút thắt cổ chai.
> **Chỉ áp dụng nếu** Bộ phân tích dấu vết Phase 2-A phát hiện tín hiệu khám phá dưới mức (under-exploration) một cách nhất quán trên ít nhất 2 loại tác vụ khác nhau.

### 5-A · Khớp Kích thước (Dimension Matching) cho Skills/Instincts

Sử dụng 4 kích thước (dimensions) làm tín hiệu xếp hạng thứ cấp trong `skill_suggest` and `instinct_get`. Không thay thế việc khớp từ khóa (keyword matching) — thêm khớp kích thước như một tín hiệu bổ sung.

**Các kích thước (Dimensions):**

| Kích thước | Bao phủ |
|---|---|
| `safety` | Các ràng buộc về phạm vi, các mẫu phân quyền file |
| `verification` | Các mẫu build/test/lint |
| `memory` | Chuyển giao phiên (session handoff), các mẫu theo dõi tiến độ |
| `tool-usage` | Các mẫu cuộc gọi công cụ MCP |

### 5-B · Thuật toán khớp cải tiến

Trong file `src/lib/skill-matcher.ts`:

```
final_score = (keyword_score × 0.6) + (dimension_score × 0.4)
```

Điểm kích thước (dimension score) sử dụng nguồn phân loại từ Phase 0-C. Cả hai tín hiệu được cộng dồn, không phải thay thế cho nhau.

### 5-C · Xuất vết thực thi (Trajectory Export)

Thêm tùy chọn CLI `harness instincts --export --format jsonl`.

**Schema đầu ra (ổn định, có phiên bản):**
```jsonl
{"schema_version":"1.0","instinct_id":"...","task_type":"...","variant_id":"...","outcome":"success","scorecard_id":"...","timestamp":"..."}
```

Tăng `schema_version` khi có bất kỳ thay đổi phá vỡ (breaking change) nào đối với các trường dữ liệu. Mục đích sử dụng: phân tích ngoại tuyến (offline analysis), tạo bộ benchmark, hoặc cung cấp cho các quy trình đào tạo mô hình trong tương lai (nếu có triển khai).

---

## Những phần KHÔNG thực hiện (What We Are Not Doing)

| Hạng mục | Lý do |
|---|---|
| Trừu tượng hóa bộ xử lý (Processor abstraction - hook + pipeline) | harness-os không sở hữu vòng lặp thực thi (execution loop) |
| Đồng tiến hóa mô hình Harness (Harness-Model Co-Evolution - GRPO) | Đòi hỏi phải tinh chỉnh mô hình (fine-tuning) — ngoài phạm vi dự án |
| Lưu trữ toàn bộ vết lập luận (Full trace store - model reasoning) | Giao thức MCP chỉ tiếp lộ cuộc gọi công cụ, không tiếp lộ nội bộ của mô hình |
| Python SDK / `hx` CLI | Xung đột công nghệ (TypeScript so với Python) |
| IM Gateway | Ngoài phạm vi dự án |
| Giao diện Lab UI (React) | CLI `harness status` / `harness report` là đã đủ đáp ứng nhu cầu |
| Phân loại HarnessX 9 kích thước đầy đủ | Việc chọn mô hình, cầu nối đào tạo, môi trường thực thi đều vô nghĩa đối với máy chủ tư vấn MCP |
| Gọi trực tiếp API LLM từ harness-os | Agent gọi bản thân nó ĐÃ LÀ một LLM — harness-os chỉ trả về bằng chứng có cấu trúc, agent lập luận, harness-os xác thực một cách xác định |

---

## Bảng tổng hợp

| Phase | Sản phẩm bàn giao | Độ ưu tiên | Mức độ nỗ lực | Điều kiện tiên quyết bắt buộc |
|---|---|---|---|---|
| 0-A | Thẻ điểm Harness (Schema DB) | P0 | Thấp | Không có |
| 0-B | Định danh Variant (cột `sessions.variant_id` + tham số session_start) | P0 | Thấp | Không có |
| 0-C | Phân loại loại tác vụ (cột `tasks.task_type` + tham số task_create) | P0 | Rất thấp | Không có |
| 0-D | Chuẩn hóa kết quả (bảng `instinct_outcomes`) | P0 | Thấp | 0-A |
| 0-E | Hook ghi nhận Thẻ điểm (hàm `recordScorecard()` trong vòng đời phiên) | P0 | Trung bình | 0-A, 0-B, 0-C, 0-D |
| 1-A | Cổng kiểm soát xác định (hàm `checkRegressionGate()`) | P0 | Thấp | 0-D |
| 1-B | Quy trình thăng cấp (vòng đời 4 giai đoạn + migration DB) | P0 | Trung bình | 1-A |
| 1-C | Thăng cấp Shadow (điều kiện thoát dựa trên phiên) | P1 | Trung bình | 1-B |
| 2-A | Bộ phân tích dấu vết (dựa trên quy tắc, 4 tín hiệu) | P1 | Trung bình | 0-A, 0-D |
| 2-B | Kiểm tra tính toàn vẹn của việc Xác thực | P1 | Thấp | 0-A |
| 2-C | Phát hiện sự lãng quên | P1 | Trung bình | 0-D, 0-B |
| 3-A | AEGIS-lite (các công cụ MCP `aegis_analyze` + `aegis_propose`, không gọi LLM trực tiếp) | P1 | Trung bình | 1-A, 2-A |
| 3-B | Quy trình phê duyệt của con người (CLI `harness proposals`) | P1 | Thấp | 3-A |
| 4-A | CLI đánh giá Variant | P2 | Thấp | 0-A, 0-B + 30 thẻ điểm |
| 4-B | Theo dõi Phân lập Variant | P2 | Thấp | 4-A |
| 4-C | Tự động điều hướng | P2 | Trung bình | 4-A, 4-B |
| 5-A | Phân loại kích thước để khớp | P2 | Thấp | 0-C + bằng chứng khám phá dưới mức |
| 5-B | Thuật toán khớp Skill/Instinct cải tiến | P2 | Trung bình | 5-A |
| 5-C | Xuất vết thực thi (JSONL) | P2 | Rất thấp | 0-D |
