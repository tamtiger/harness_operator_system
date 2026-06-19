# Thuật ngữ (Glossary)

[← Mục lục](./README.md)

---

## Các thuật ngữ cốt lõi của Harness-OS

| Thuật ngữ (Term) | Định nghĩa (Definition) |
|------|-----------|
| **harness-os** | MCP server chạy cục bộ (local) cung cấp các rào chắn quy trình có cấu trúc cho AI coding agents |
| **MCP** | Model Context Protocol — Giao thức giao tiếp giữa agent và công cụ (tool) sử dụng JSON-RPC qua stdio |
| **Session** | Phiên làm việc — Một đơn vị công việc tính từ lúc gọi `session_start` cho đến khi `session_end/handoff` |
| **Task** | Tác vụ — Một đầu việc được theo dõi gồm có tiêu đề (title), phạm vi (scope), và trạng thái (status) |
| **Handoff** | Bàn giao — Tài liệu truyền tải ngữ cảnh giữa các phiên làm việc (tóm tắt, việc chưa xong, các bước tiếp theo) |
| **Scope** | Phạm vi — Các đường dẫn tệp tin được phép hoặc bị cấm chỉnh sửa đối với một tác vụ hoặc kho lưu trữ (repo) |
| **Verification** | Xác thực — Đường ống (pipeline) tự động chạy install/build/test/lint để chứng minh công việc là chính xác |
| **Evidence** | Bằng chứng — Kết quả xác thực được lưu lại theo từng tác vụ trong thư mục `.harness/evidence/` |
| **Skill** | Kỹ năng — Tài liệu hướng dẫn có cấu trúc (SKILL.md) mà các agent sẽ đọc để làm việc đúng quy trình |
| **Instinct** | Bản năng — Một mẫu hành vi (pattern) có thể tái sử dụng được đúc kết từ kinh nghiệm, kèm theo điểm tin cậy |
| **Progress Log** | Nhật ký tiến độ — Nhật ký ghi chép tuần tự (append-only) các công việc đã làm (`.harness/progress.md`) |
| **Feature List** | Danh sách tính năng — Tệp tin JSON theo dõi các tính năng và ranh giới phạm vi của chúng |
| **Repo Summary** | Tóm tắt Repo — Tổng quan tự động tạo ra về cấu trúc thư mục, stack công nghệ và các tệp tin chính trong repo |
| **Loop Guard** | Bảo vệ vòng lặp — Cơ chế phát hiện các cuộc gọi lặp đi lặp lại cùng một công cụ (>5 lần trong 60 giây) |
| **Audit Log** | Nhật ký kiểm toán — Chuỗi sự kiện được lưu trữ song song trong SQLite + JSONL phục vụ khả năng quan sát |
| **Aegis / AEGIS-lite** | Phân hệ thích ứng của Harness-OS cung cấp các MCP tools (`aegis_analyze`, `aegis_propose`) để phân tích lỗi trace và đề xuất tối ưu hóa tri thức |
| **Proposal** | Đề xuất — Đề xuất tối ưu hóa tri thức (merge, prune, evolve, penalize) đang chờ xem xét hoặc phê duyệt |
| **Regression Gate** | Cổng kiểm soát hồi quy — Cổng chất lượng đảm bảo việc thay đổi/thăng cấp tri thức không làm suy giảm hiệu năng trên các loại tác vụ lịch sử |
| **Variant** | Biến thể — Hồ sơ cấu hình hành vi của Agent (ví dụ: `coding-strict`, `coding-fast`) được giám sát để đánh giá hiệu suất |
| **Trace Analyzer** | Bộ phân tích Trace — Công cụ phân tích ngoại tuyến phát hiện lỗi lặp, không tuân thủ quy trình, và suy giảm tri thức (lãng quên) |

---

## Các khái niệm về Rulebook

### Lớp Rulebook (Rulebook Layer)

Một **lớp rulebook** là một cấp độ trong hệ thống phân cấp hướng dẫn. harness-os sử dụng ba lớp với thứ tự ưu tiên rõ ràng:

```
Stack Rulebook (chung) → Project Rulebook (cụ thể) → AGENTS.md (cấp độ repo)
```

Quy tắc có tính cụ thể cao hơn sẽ chiến thắng khi xảy ra xung đột.

### Stack Rulebook

Một **stack rulebook** định nghĩa các quy ước cho một stack công nghệ (ví dụ: Node.js, .NET, Python). Nó bao gồm:

- Các mẫu kiến trúc (kiến trúc phân lớp, ranh giới mô-đun)
- Quy ước đặt tên (naming conventions)
- Tiêu chuẩn kiểm thử (testing standards)
- Yêu cầu xây dựng và CI (build/CI requirements)
- Các quy tắc quản lý thư viện phụ thuộc (dependency management)

Stack rulebook nằm trong khung mã nguồn của harness (ví dụ: `c#/README.md`). Chúng áp dụng cho TẤT CẢ các dự án sử dụng stack công nghệ đó.

### Project Rulebook

Một **project rulebook** định nghĩa các quy ước cụ thể cho một sản phẩm hoặc dịch vụ. Nó bao gồm:

- Lựa chọn công nghệ cơ sở dữ liệu
- Các mẫu truyền tin/sự kiện (messaging/event patterns)
- Yêu cầu bảo mật
- Các bộ chuyển đổi dịch vụ bên ngoài (external service adapters)
- Các máy trạng thái (state machines)
- Quy trình vận hành (operational procedures)

Project rulebook nằm ở đường dẫn `c#/projects/{ProjectName}/README.md` (hoặc tương đương ở các stack công nghệ khác).

---

## Quy tắc ưu tiên (Precedence Rules)

Khi các chỉ dẫn xung đột với nhau, hãy áp dụng thứ tự ưu tiên sau (cao nhất xếp đầu tiên):

1. **Project Rulebook** — Các quyết định cụ thể cho sản phẩm sẽ ghi đè các mẫu thiết kế chung
2. **Stack Rulebook** — Các quy ước công nghệ sẽ áp dụng trừ khi project rulebook ghi đè
3. **AGENTS.md** — Hướng dẫn cấp độ repo cho cơ sở mã nguồn cụ thể
4. **Skills** — Hướng dẫn quy trình làm việc (repo-specific > global > built-in)
5. **Instincts** — Các mẫu hành vi đúc kết được (mang tính tư vấn, không chặn quy trình)

### Giải quyết xung đột (Conflict Resolution)

- Nếu project rulebook yêu cầu "sử dụng MongoDB" nhưng stack rulebook khuyến nghị "ưu tiên PostgreSQL" → project thắng.
- Nếu stack rulebook yêu cầu "sử dụng kiến trúc phân lớp" và project rulebook không ghi đè → stack thắng.
- Nếu AGENTS.md quy định "không bao giờ chỉnh sửa thư mục migrations/" → ranh giới đó bắt buộc áp dụng bất kể các rulebook khác ghi gì.
- Ranh giới kiến trúc từ stack rulebook bắt buộc áp dụng trừ khi project rulebook ghi đè một cách rõ ràng.

---

## Vị trí các tệp tin quan trọng (File Locations)

| Khái niệm | Vị trí |
|---------|----------|
| Trạng thái của từng Repo (Per-repo state) | Thư mục `.harness/` trong mỗi repo |
| Trạng thái toàn cục (Global state) | Thư mục `~/.harness/` (SQLite, audit, global skills) |
| Kỹ năng tích hợp sẵn (Built-in skills) | Thư mục `harness-os/skills/` |
| Các mẫu tài liệu (Templates) | Thư mục `harness-os/templates/` |
| Bộ chuyển đổi IDE (IDE adapters) | Thư mục `harness-os/ide-adapters/` |
