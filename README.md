# Universal Coding Harness (Harness)

> **Lớp orchestration độc lập với AI dành cho AI Coding Agents.**
>
> Harness chuẩn hóa và tự động hóa toàn bộ vòng đời phát triển phần mềm khi sử dụng AI Coding Agents — từ chuẩn bị context, phân tích tác động, lập kế hoạch, đến thực thi, xác minh và phục hồi lỗi.

---

## 1. Tổng quan & Vòng lặp cốt lõi (Core Loop)

Harness hoạt động như một giám sát viên nghiêm ngặt giữa Lập trình viên và các AI Coding Agent (như Claude Code, Cursor, Codex). AI Agent chỉ chịu trách nhiệm tạo mã nguồn, trong khi Harness đảm bảo chúng thực hiện điều đó một cách chính xác bằng cách bao bọc chúng trong **Core Loop**:

```
    Developer Request
          │
          ▼
    ┌───────────────────────────────────┐
    │       HARNESS CORE LOOP           │
    │                                   │
    │  Context → Plan → Execute → Verify│
    │     ▲                        │    │
    │     │        Learn ◄─────────┘    │
    │     │          │                  │
    │     └──────────┘                  │
    │                                   │
    └───────────────────────────────────┘
          │
          ▼
    Better AI Output Over Time
```

1.  **Context (Ngữ cảnh)**: Tổng hợp các coding conventions, kiến trúc hệ thống, sơ đồ repository và tài liệu phòng ngừa lỗi đã biết.
2.  **Plan (Kế hoạch)**: Tạo ra một kế hoạch thực thi có cấu trúc và chạy kiểm tra tính hợp lệ tĩnh (static validation).
3.  **Execute (Thực thi)**: Thực hiện sinh code theo từng bước nhỏ với cơ chế sao lưu snapshot độc lập phục vụ cho rollback.
4.  **Verify (Xác minh)**: Chạy các lớp kiểm tra tự động từ L1-L4 tùy thuộc vào mức độ rủi ro của task.
5.  **Learn (Học hỏi)**: Thu thập lỗi, phân tích pattern và tự động đề xuất tài liệu phòng ngừa lỗi cho các task sau (Phase 2).

---

## 2. Cấu trúc thư mục dự án

Harness duy trì sự tách biệt rõ ràng giữa source code của repository (chứa cấu trúc kiến trúc và cấu hình metadata) với trạng thái thực thi local:

### Cấu trúc Repository (Lưu trữ Tri thức)
```
repo/
├── docs/
│   ├── architecture/        ← Kiến trúc tổng thể & quy tắc phụ thuộc giữa các tầng
│   ├── adr/                 ← Architecture Decision Records (Quyết định kiến trúc)
│   ├── conventions/         ← Coding conventions và coding patterns của dự án
│   ├── glossary.md          ← Định nghĩa thuật ngữ nghiệp vụ (domain glossary)
│   ├── repo-map.yaml        ← Sơ đồ cấu trúc vật lý của dự án
│   └── concept-map.yaml     ← Bản đồ liên kết khái niệm nghiệp vụ với source code
│
├── project.yaml             ← File cấu hình cốt lõi của Harness
└── AGENTS.md                ← Hướng dẫn & quy tắc bắt buộc dành cho AI Coding Agents
```

### Trạng thái Local Workspace (Nằm ngoài Git repo)
Tất cả dữ liệu runtime, cache, log, kế hoạch và các file snapshot được lưu trữ tại `~/.harness/`:
```
~/.harness/
└── repositories/
    └── {namespace}/
        ├── cache/           ← Bộ nhớ đệm index BM25 & vector
        ├── index/           ← File SQLite symbols.db lưu code symbols (tree-sitter)
        ├── sessions/        ← Trạng thái session của task hiện tại
        ├── snapshots/       ← Bản sao lưu snapshot phục vụ cho cơ chế Rollback
        └── logs/            ← Log kiểm toán append-only audit.jsonl và metrics.jsonl
```

---

## 3. Khởi hành nhanh (Quick Start cho Phase 1)

Harness được phát triển bằng TypeScript và vận hành trên môi trường Node.js 20 LTS.

### 1. Yêu cầu hệ thống
- **Node.js** >= 20.x LTS
- **pnpm** >= 9.x
- **SQLite** (tích hợp sẵn qua thư viện zero-config `better-sqlite3`)

### 2. Cài đặt phát triển
Clone repository và cài đặt các dependencies monorepo:
```bash
pnpm install
pnpm build
```

### 3. Khởi tạo một dự án mới
Di chuyển terminal đến thư mục gốc của repository bạn muốn quản lý và chạy:
```bash
node /path/to/harness/dist/cli.js init
```
Lệnh này sẽ tạo cấu trúc file cấu hình mẫu `project.yaml` và các thư mục tài liệu nền tảng trong `docs/`.

### 4. Kiểm tra môi trường
Xác minh xem môi trường local đã đáp ứng đầy đủ các điều kiện cần thiết chưa:
```bash
node /path/to/harness/dist/cli.js doctor
```

---

## 4. Danh mục câu lệnh CLI (Phase 1)

Mọi thao tác quản lý quy trình được thực hiện thông qua CLI chính:

*   `harness doctor`: Kiểm tra tính hợp lệ của môi trường (Node, SQLite, Git, MCP SDK).
*   `harness init`: Khởi tạo cấu hình và cấu trúc thư mục tài liệu `docs/` trong repo.
*   `harness index`: Quét mã nguồn bằng `tree-sitter`, lập chỉ mục symbols vào SQLite `symbols.db` và build index BM25.
*   `harness task "[mô tả]"`: Bắt đầu một task mới, build context và yêu cầu AI sinh bản nháp kế hoạch thực thi.
*   `harness plan review`: Xem chi tiết kế hoạch thực thi đang chờ duyệt, danh sách file bị sửa và risk level.
*   `harness plan approve`: Phê duyệt kế hoạch thực thi, cấp quyền cho AI bắt đầu sửa code.
*   `harness plan reject "[lý do]"`: Từ chối kế hoạch hiện tại và gửi phản hồi yêu cầu AI tái tạo kế hoạch mới.
*   `harness verify`: Kích hoạt chạy thủ công luồng kiểm tra tự động (L1 Syntax -> L4 Architecture).
*   `harness cost`: Hiển thị thống kê số lượng token sử dụng và chi phí ước tính ($) của task hoặc session hiện tại.

---

## 5. Quy định phát triển (Development Guidelines)

- **Plan First**: Tuyệt đối không viết mã nguồn thực thi trực tiếp trước. Luôn viết các interface TypeScript và các định nghĩa kiểu dữ liệu (types) bên trong thư mục `packages/core/src/types/` trước.
- **Linting & Formatting**: Biome được sử dụng làm chuẩn code style. Chạy kiểm tra trước khi tạo PR:
  ```bash
  pnpm lint
  ```
- **Viết kiểm thử (Testing)**: Chạy test thông qua Vitest. Đảm bảo mọi thay đổi code trong package `core` duy trì unit test coverage trên 70%:
  ```bash
  pnpm test
  ```
