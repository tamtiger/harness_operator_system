# Hệ thống Vận hành Harness (Harness Operator System)

**Phiên bản:** 0.0.15 | **Trạng thái:** Đang phát triển tích cực

Harness Operator System là một **Nền tảng Quản lý Tri thức AI-native** được thiết kế để quản lý, phân phối và quản trị tri thức vận hành cho các Công cụ Lập trình AI (Cursor, Claude Code, Gemini CLI, Codex CLI, Kiro, OpenCode và bất kỳ ứng dụng khách nào tương thích với MCP).

Nền tảng cung cấp một **lớp trung gian chuẩn hóa** giữa tổ chức (chủ sở hữu tri thức) và các công cụ AI (bên tiêu thụ tri thức), đảm bảo mọi công cụ AI hoạt động dựa trên tri thức nhất quán, đã được phê duyệt và có thể kiểm tra (audit).

---

## Tổng quan Kiến trúc

Nền tảng được cấu trúc thành **6 domain** trên **4 mặt phẳng (plane) kiến trúc**:

### Các Mặt phẳng & Domain

| Mặt phẳng | Domain | Trách nhiệm |
|-------|--------|----------------|
| **Control Plane** | Platform | Điều phối, quản lý vòng đời, cài đặt/cập nhật/đồng bộ, kiểm tra sức khỏe |
| **Persistence Plane** | Repository | Truy cập hệ thống tệp, tải manifest, tải asset, xây dựng context |
| — | Context | Xây dựng context của repository, lọc, xếp hạng, quản lý ngân sách token |
| **Runtime Plane** | Execution | Điều phối tác vụ không trạng thái, lập lịch các bước, xác minh kết quả |
| — | Capability | Các hàm có thể thực thi, đăng ký capability, 27 capability tích hợp sẵn |
| **Knowledge Plane** | Governance | Quản lý đề xuất (proposal), quy trình đánh giá/phê duyệt, thăng cấp lên Shared |

### Nguyên tắc Thiết kế Cốt lõi

- **Repository First** — Mọi mảnh tri thức đều phải đi qua repository.
- **Immutable Context** — Repository Context được đóng băng sau khi được tạo cho một phiên thực thi.
- **Stateless Runtime** — Runtime thực thi sẽ xóa bỏ toàn bộ trạng thái sau mỗi phiên.
- **Human Approval Gate** — Các thay đổi ảnh hưởng đến Shared Harness bắt buộc phải có sự phê duyệt của con người.
- **Deterministic Merging** — Cùng một đầu vào Shared + Local luôn tạo ra Effective Harness giống nhau.

### Luồng Phụ thuộc

```
Các Adapter (CLI / MCP)
        │
        ▼
     Platform (Control Plane)
     ───┬──────┬──────┬──────┐
        ▼      ▼      ▼      ▼
    Repository  Context  Execution  Governance
        │                │
        ▼                ▼
    Capability     Capability
```

---

## Cấu trúc Dự án

```
harness-operator-system/
├── src/
│   ├── shared/                  # Các kiểu dữ liệu cốt lõi, contract, lỗi, tiện ích
│   │   ├── types/               # Định nghĩa kiểu TypeScript cho tất cả các domain
│   │   ├── errors/              # Lớp cơ sở HarnessError + 71 factory định kiểu lỗi
│   │   ├── contracts/           # Interface dịch vụ (Repository, Context, Execution, v.v.)
│   │   ├── utils/               # Tiện ích về đường dẫn, ID, ngày tháng, semver
│   │   └── templates/           # Template cho AGENTS.md
│   ├── repository/              # Persistence plane
│   │   ├── discovery/           # Tìm kiếm ngược lên thư mục gốc repository
│   │   ├── manifest/            # Schema manifest dựa trên Zod, loader, validator
│   │   ├── assets/              # FrontMatterParser, AssetLoader, AssetValidator
│   │   ├── resolution/          # ResolutionEngine (Hợp nhất Shared + Local)
│   │   ├── context/             # Bộ dựng RepositoryContext
│   │   ├── persistence/         # FileSystemPersistence (ghi file nguyên tử - atomic write)
│   │   └── validation/          # Xác thực cấu trúc repository
│   ├── context/                 # Context domain
│   │   ├── builder/             # Đường ống lắp ráp Context
│   │   ├── filter/              # Bộ lọc theo phạm vi (scope)/tag/deprecated
│   │   ├── ranking/             # Tính điểm độ mới/độ ưu tiên/độ liên quan
│   │   ├── budget/              # Phân bổ & cắt giảm ngân sách token
│   │   └── cache/               # Bộ nhớ đệm context LRU
│   ├── execution/               # Runtime plane
│   │   ├── runtime/             # ExecutionRuntime + TaskStateManager
│   │   ├── scheduler/           # Lập lịch bước theo cấu trúc topo (topological)
│   │   ├── verifier/            # Xác minh kết quả (fail_fast / collect_all)
│   │   └── retry/               # Quản lý thử lại với số mũ lùi (exponential backoff)
│   ├── capability/              # Capability domain
│   │   ├── registry/            # Đăng ký giao thức gọi 6 bước
│   │   ├── builtin/             # 27 capability tích hợp (file, git, search, AI, v.v.)
│   │   ├── loader/              # Bộ tải capability tùy chỉnh bằng YAML
│   │   └── validation/          # Xác thực contract của capability
│   ├── governance/              # Knowledge plane
│   │   ├── proposal/            # Quản lý đề xuất markdown bền vững
│   │   ├── review/              # Cơ chế khóa đánh giá với thời gian hết hạn 30 phút
│   │   ├── approval/            # Công cụ phê duyệt nghiêm ngặt bởi con người
│   │   ├── promotion/           # Công cụ thăng cấp từ Local sang Shared
│   │   └── audit/               # Ghi nhật ký kiểm toán JSONL append-only
│   ├── platform/                # Control plane
│   │   ├── orchestration/       # Điều phối Platform (kết nối tất cả các domain)
│   │   ├── install/             # Bộ cài đặt Shared Harness
│   │   ├── update/              # Bộ cập nhật nguyên tử có hỗ trợ rollback
│   │   ├── sync/                # Trình quản lý đồng bộ hóa
│   │   ├── publish/             # Bộ xuất bản asset
│   │   └── doctor/              # Công cụ chẩn đoán
│   └── adapters/                # Các điểm đầu vào (entry points)
│       ├── cli/                 # CLI adapter (tất cả các lệnh)
│       │   ├── commands/        # init, validate, status, context, run, v.v.
│       │   └── formatter/       # OutputFormatter, ErrorFormatter
│       └── mcp/                 # MCP server adapter
├── knowledge_base/              # Tài liệu đặc tả toàn diện
│   ├── 00_ARCHITECTURE.md       # Cơ sở kiến trúc (SST)
│   ├── 01_HARNESS_MODEL.md      # Mô hình Harness Repository, Shared, Local, Effective
│   ├── 02_ASSET_MODEL.md        # Phân loại asset, siêu dữ liệu, phân giải
│   ├── 03_SYSTEM_ARCHITECTURE.md # Kiến trúc domain & các quy tắc phụ thuộc
│   ├── 04-10_*_SPECIFICATION.md  # Các đặc tả chi tiết của từng domain
│   ├── 11_DATA_MODELS.md        # Tất cả kiểu dữ liệu, DTO, enum (SST)
│   ├── 14_ERROR_MODEL.md        # Hệ thống phân cấp lỗi
│   └── 20_AGENT_SPECIFICATION.md # Đặc tả hành vi của Agent
├── implementation_plan/          # Kế hoạch thực hiện theo từng Milestone (M0–M11)
├── tests/                        # Bộ kiểm thử Vitest cho tất cả các domain
├── .harness/                     # Metadata nội bộ Harness & các quy tắc chia sẻ
├── AGENTS.md                     # Hợp đồng vận hành dành cho các AI agent
├── CHANGELOG.md                  # Nhật ký thay đổi phiên bản
├── package.json
└── tsconfig.json
```

---

## Các tính năng chính theo Milestone

| Milestone | Tính năng | Trạng thái |
|-----------|---------|--------|
| **M0** | Nền tảng — các kiểu cốt lõi, mô hình lỗi, tiện ích, contract | ✅ |
| **M1** | Khám phá Repository — tìm kiếm thư mục gốc, xác thực manifest | ✅ |
| **M2** | Tải Asset — phân tích cú pháp front-matter, xác thực, phân giải, lưu trữ | ✅ |
| **M3** | Bộ dựng Context — lọc, xếp hạng, ngân sách token, bộ nhớ đệm LRU | ✅ |
| **M4** | Đăng ký Capability — giao thức gọi 6 bước, 27 capability tích hợp sẵn | ✅ |
| **M5** | Runtime Thực thi — điều phối tác vụ, lập lịch, thử lại, xác minh | ✅ |
| **M6** | Platform — điều phối, cài đặt, cập nhật, đồng bộ, xuất bản, chẩn đoán | ✅ |
| **M7** | CLI — tất cả các lệnh, định dạng đầu ra/lỗi, cấu hình môi trường | ✅ |
| **M8** | Quản trị (Governance) — đề xuất, đánh giá, phê duyệt, thăng cấp, kiểm toán | ✅ |
| **M9** | MCP Server — Adapter Model Context Protocol với 4 công cụ | ✅ |
| **M10** | Bộ tuân thủ (Conformance Suite) — 30 trường hợp thử nghiệm, tuân thủ Cấp độ 3 | ✅ |
| **M11** | Tối ưu hóa, khôi phục lỗi, sẵn sàng cho môi trường sản xuất | ✅ |

---

## Các lệnh CLI

Sau khi cài đặt CLI dưới dạng global, bạn có thể sử dụng trực tiếp lệnh `harness` từ bất kỳ thư mục nào:

```bash
# Khởi tạo một repository mới
harness init [directory] [--force]

# Xác thực cấu trúc repository
harness validate [directory]

# Kiểm tra trạng thái asset
harness status [--json]

# Kiểm tra context trong quá trình runtime
harness context --task "mô tả tác vụ"

# Thực thi một tác vụ
harness run "mô tả tác vụ"

# Liệt kê các capability đã đăng ký
harness capability list

# Cài đặt shared Harness
harness install [--source <url>]

# Cập nhật shared Harness
harness update [--version <semver>]

# Chạy chẩn đoán hệ thống
harness doctor

# Đồng bộ hóa các capability
harness sync

# Xuất bản các asset
harness publish

# Đề xuất quản trị (Governance proposals)
harness proposal list
harness proposal submit [--file <path>]
harness proposal approve <proposal-id>

# Khởi động MCP server (kết nối stdio)
harness mcp-server

# Chạy bộ thử nghiệm tuân thủ (conformance suite)
harness conformance run
```

---

## Tích hợp MCP (Model Context Protocol)

MCP server cung cấp 4 công cụ cho các MCP client:
- `harness_run` — Thực thi một tác vụ
- `harness_validate` — Xác thực cấu trúc repository
- `harness_proposal_list` — Liệt kê các đề xuất quản trị
- `harness_proposal_submit` — Gửi một đề xuất mới

Các hành động phê duyệt (approval) được loại bỏ khỏi MCP một cách có chủ đích nhằm duy trì cổng bảo mật xác thực bởi con người.

---

## Phát triển và Thiết lập

### Yêu cầu tiên quyết
- Node.js 20+
- npm

### Thiết lập môi trường phát triển (Development Setup)

1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

2. Biên dịch code TypeScript sang JavaScript:
```bash
npm run build
```

3. Liên kết công cụ CLI thành global (để sử dụng lệnh `harness` toàn cục trong quá trình phát triển):
```bash
npm link
```
*(Nếu bạn muốn cài đặt trực tiếp gói package hiện tại làm global CLI, có thể sử dụng lệnh: `npm install -g .`)*

### Xác thực và Kiểm thử

```bash
npm run build      # Biên dịch TypeScript (kiểm tra lỗi tsc)
npm run test       # Chạy các bộ thử nghiệm bằng Vitest
npm run lint       # Kiểm tra chất lượng mã nguồn bằng ESLint
```

### Các Bộ thử nghiệm (Test Suites)

Các tệp thử nghiệm trong thư mục `tests/` bao gồm kiểm thử đơn vị (unit test) và kiểm thử tích hợp (integration test) cho mọi domain:
- `utils.test.ts`, `errors.test.ts` — Nền tảng
- `repository.test.ts`, `assets.test.ts` — Mặt phẳng Repository
- `context.test.ts` — Domain Context
- `capability.test.ts` — Domain Capability
- `execution.test.ts` — Runtime thực thi
- `platform.test.ts` — Điều phối Platform
- `governance.test.ts` — Quy trình Quản trị
- `cli.test.ts` — Các lệnh CLI
- `mcp.test.ts` — Adapter MCP
- `conformance.test.ts` — Bộ thử nghiệm tuân thủ (30 test case, Cấp độ 3)

---

## Vòng đời Quản trị & Tri thức

```
TẠO → ĐÁNH GIÁ → PHÊ DUYỆT → ĐÁNH PHIÊN BẢN → XUẤT BẢN → TÁI SỬ DỤNG → CẢI TIẾN → THĂNG CẤP
```

- **Đề xuất (Proposals)**: Các tệp markdown bền vững được lưu tại `.harness/proposals/`
- **Đánh giá (Reviews)**: Cơ chế khóa với thời gian hết hạn là 30 phút
- **Phê duyệt (Approvals)**: Cổng kiểm soát nghiêm ngặt bởi con người (không phê duyệt tự động)
- **Kiểm toán (Audit)**: Log ghi nhật ký append-only ở định dạng JSONL tại `.harness/logs/audit.jsonl`
- **Thăng cấp (Promotion)**: Chuyển từ Local sang Shared thông qua `PromotionEngine`

---

## Tài liệu đọc thêm

- [Cơ sở Kiến trúc](knowledge_base/00_ARCHITECTURE.md) — Tầm nhìn, nguyên tắc, khái niệm cốt lõi
- [Kiến trúc Hệ thống](knowledge_base/03_SYSTEM_ARCHITECTURE.md) — Kiến trúc domain, quy tắc phụ thuộc, contract
- [Mô hình Harness](knowledge_base/01_HARNESS_MODEL.md) — Repository, Shared, Local, Effective Harness
- [Mô hình Asset](knowledge_base/02_ASSET_MODEL.md) — Phân loại asset và siêu dữ liệu
- [Mô hình Dữ liệu](knowledge_base/11_DATA_MODELS.md) — Tất cả kiểu dữ liệu, DTO, enum
- [Mô hình Lỗi](knowledge_base/14_ERROR_MODEL.md) — Phân cấp lỗi và mã lỗi
- [Đặc tả Agent](knowledge_base/20_AGENT_SPECIFICATION.md) — Hợp đồng hành vi của Agent
- [AGENTS.md](./AGENTS.md) — Hợp đồng vận hành dành cho các AI agent
- [Kế hoạch thực hiện](implementation_plan/) — Chi tiết theo từng Milestone
