# AI Coding Harness Framework — Bản Thiết kế & Kế hoạch Triển khai (Căn cứ theo Foundation & Decisions)

> [!NOTE]
> Tài liệu này đóng vai trò là bản đề xuất thiết kế và kế hoạch triển khai MVP, được biên soạn lại để tuân thủ nguyên tắc tối cao từ **00_Architecture Foundation.md** và các quyết định cụ thể tại **01_Architecture Decisions.md**. Mọi quyết định thiết kế dưới đây đều truy xuất nguồn gốc (traceability) từ các Yêu cầu (Pain Points) và Architecture Decision Records (ADR).

## 4. Đề xuất Thiết kế (Design Proposal)

Dựa vào các ràng buộc khắt khe: Không Database, Không Cloud, Local First và Lightweight Overlay, hệ thống bao gồm Luồng thực thi và các module sau:

### 4.1. Luồng Thực thi (Runtime Flow)
Mọi xử lý của Harness bắt buộc phải đi qua pipeline 9 bước sau:
1. **User Request**: Tiếp nhận yêu cầu từ lập trình viên.
2. **Task Analyzer**: Phân loại độ phức tạp (Simple vs Complex) để xác định workflow.
3. **Planner (Planning)**: Lập kế hoạch (chỉ kích hoạt nếu Task Analyzer đánh giá là Complex). Đợi người dùng duyệt (Review).
4. **Context Loader**: Thu thập dữ liệu từ Repository Index, Rules (`.mdc`), và Memory.
5. **Prompt Builder**: Lắp ráp context thành một prompt tối ưu, đúng chuẩn cho Agent.
6. **AI Agent**: (LLM bên dưới) Phân tích, suy luận và đưa ra quyết định gọi Tool.
7. **Tool Provider**: Trừu tượng hóa để gọi Native Tool (đọc/ghi file, bash) hoặc qua MCP.
8. **Verification**: Bắt buộc chạy Test/Lint/Build để kiểm chứng thay đổi.
9. **Memory Update**: Cập nhật Markdown Memory Bank sau khi Verification thành công -> Hoàn thành tác vụ.

### 4.2. Kiến trúc Lõi dựa trên ADR (Bao gồm Roadmap)

Dựa trên tài liệu `01_Architecture Decisions.md`, kiến trúc được phân tách rõ ràng giữa MVP và Tương lai:

| ADR | Quyết định Kiến trúc | Triển khai MVP | Tương lai (Future) |
|-----|-----------------------|-----------------|---------------------|
| **ADR-001** | Overlay Architecture | **CLI Overlay** (Node.js/Python) | IDE Integration |
| **ADR-002** | Repository Index | **Tree-sitter AST Map** | LSP / SCIP / Semantic Index |
| **ADR-003** | Persistent Memory | **Markdown Memory Bank** (`.harness/memory/`) | SQLite / Remote Store |
| **ADR-004** | Workflow Orchestration| **Rule-based Workflow** (Simple -> Execute; Complex -> Plan -> Review) | Configurable Workflow |
| **ADR-005** | Verification-first | **Build/Test/Lint hooks cơ bản** | Custom Verification Pipeline |
| **ADR-006** | Tool Provider | **Native Tools (Bash/File) + MCP** | Additional Providers (REST/SDK) |

---

## 5. Hiện thực hóa Non-Goals (Những gì KHÔNG làm trong MVP)

Tuân thủ nghiêm ngặt phần Non-Goals của Foundation:
- **KHÔNG xây dựng Agent mới**: Harness chỉ điều phối (Orchestrate) qua quy chuẩn prompt/rules cho các Agent hiện có.
- **KHÔNG dùng Vector DB / Database**: Bám sát MVP Markdown và Tree-sitter.
- **KHÔNG đưa lên Cloud**: Chạy 100% offline-first.
- **KHÔNG Multi-agent Collaboration**: Mỗi tác vụ do 1 agent xử lý trong vòng lặp của nó để giữ sự đơn giản.

---

## 6. Phân tích Đánh đổi (Trade-off Analysis)

| Ràng buộc Foundation | Quyết định Thiết kế | Đánh đổi (Trade-off) |
|----------------------|----------------------|-----------------------|
| **Không Database** | Bộ nhớ bằng Markdown (ADR-003) | **Ưu**: Versionable qua Git, dễ inspect. **Nhược**: Tốn token LLM khi nạp context vào Prompt Builder. |
| **Local Overlay** | Thực thi trực tiếp OS (ADR-001) | **Ưu**: Portability, Lightweight, tận dụng môi trường dev. **Nhược**: Ít an toàn. Phải bù đắp bằng xác nhận (Human-in-the-loop). |
| **Deterministic Flow** | Bắt buộc Verification (ADR-005)| **Ưu**: Code đáng tin cậy. **Nhược**: Mất thời gian chạy test. Cần bypass cho các đổi tên/format file. |

---

## 7. Quản trị Rủi ro (Risk Mitigation)

Mỗi rủi ro kỹ thuật được xử lý theo chu trình Detection/Prevention/Recovery:

> [!WARNING]
> **Rủi ro: Prompt Drift & Stale Memory ở Phase `Memory Update`**
> - *Detection*: Kiểm tra Git diff hiển thị các file memory bị cập nhật sai lệch.
> - *Prevention*: Phân tách bộ nhớ thành các file nhỏ (`tasks.md`, `architecture.md`) thay vì cục lớn. Chỉ Update khi Verification PASS.
> - *Recovery*: Lệnh CLI `harness revert-memory` để quay lui lịch sử Git của `.harness/memory/`.

---

## 8. Chiến lược Đánh giá (Success Metrics)

- **Technical Metrics**: 
  - *Verification Pass Rate*: Đảm bảo module Verification (Bước 8) luôn lọc được code hỏng.
  - *Token Consumption*: Tối ưu ở module Prompt Builder (Bước 5) nhờ Context Loader thông minh.
- **Developer Experience (DX)**: 
  - *Workflow Consistency*: Toàn bộ 9 bước của Runtime Flow được chạy đúng thứ tự, không skip.

---

## 9. Kế hoạch Triển khai MVP (MVP Implementation Plan)

> [!IMPORTANT]
> **User Review Required**: Vui lòng review Kế hoạch Triển khai bên dưới. Các phase đã được ánh xạ trực tiếp tới luồng Runtime Flow 9 bước và các ADR MVP.

### Giai đoạn 1: Engine Lõi & Trừu tượng hóa Công cụ (Tuần 1)
- [ ] Khởi tạo dự án CLI cục bộ (ADR-001).
- [ ] Triển khai Module **Tool Provider** (ADR-006): Read/Write/Patch, chạy Bash với Human-in-the-loop, và kết nối MCP cơ bản.

### Giai đoạn 2: Thu thập Dữ liệu & Indexing (Tuần 2)
- [ ] Triển khai Module **Context Loader** & **Repository Index** (ADR-002): Nhúng Tree-sitter tạo AST map.
- [ ] Triển khai Module quản lý **Memory Update** (ADR-003): Tạo/đọc/ghi thư mục `.harness/memory/*.md`.
- [ ] Triển khai **Prompt Builder**: Lắp ráp rules, map, memory thành system prompt.

### Giai đoạn 3: Phân tích, Điều phối & Xác minh (Tuần 3)
- [ ] Triển khai Module **Task Analyzer** & **Planner** (ADR-004): Viết rule-based logic chặn ép Planning Mode nếu task lớn.
- [ ] Triển khai Module **Verification** (ADR-005): Hook chạy command tự động sau khi agent sửa code.
- [ ] Tích hợp 9 bước lại thành chuỗi Runtime Flow hoàn chỉnh.

### Giai đoạn 4: Đánh giá & Phát hành (Tuần 4)
- [ ] Đóng gói CLI và chạy thử nghiệm.
- [ ] Đánh giá qua các Success Metrics (Verification Pass Rate, Token Consumption).

## Câu hỏi thiết kế mở
- Kế hoạch triển khai đã phủ kín toàn bộ 9 bước của Runtime Flow và định tuyến rõ ràng MVP/Future theo `01_Architecture Decisions.md`. Bạn có muốn điều chỉnh thêm về ngôn ngữ sử dụng (Node.js/Python) cho giai đoạn 1 không?