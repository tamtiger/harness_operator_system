# 07_CAPABILITY_SPECIFICATION

**Version:** 4.0
**Status:** Final
**Ngôn ngữ:** Tiếng Việt
**Ngày cập nhật:** 2026-07-11

---

## 1. Purpose

Capability là **Executable Asset** — chức năng thực thi mà Execution Runtime có thể invoke trực tiếp.

Capability đóng vai trò là **Extension Point chính** của hệ thống Harness Operator. Mọi hành động tương tác với môi trường bên ngoài (filesystem, git, terminal, AI, v.v.) đều phải thông qua một Capability đã được đăng ký trong Registry.

**Nguyên tắc cốt lõi:**
- Capability là đơn vị thực thi nhỏ nhất, có thể kiểm tra và tái sử dụng độc lập.
- Capability không chứa business logic của Workflow — nó chỉ thực hiện một thao tác cụ thể, xác định.
- Capability được phát hiện, validate và invoke thông qua `CapabilityRegistry`.
- Capability là điểm mở rộng duy nhất: mọi chức năng mới đều được thêm vào hệ thống bằng cách đăng ký một Capability mới.

---

## 2. Responsibilities vs Non-Responsibilities

### ✅ Responsibilities (Capability CÓ trách nhiệm)

| Trách nhiệm | Mô tả |
|---|---|
| Khai báo contract | Expose `CapabilityDefinition` đầy đủ: schema, permissions, timeout, error codes |
| Thực thi thao tác | Thực hiện đúng thao tác được mô tả trong `description` |
| Validate input | Đảm bảo input hợp lệ trước khi thực thi (hỗ trợ Registry validate) |
| Trả về output chuẩn | Output phải conform `outputSchema` đã khai báo |
| Báo cáo lỗi | Trả về `CapabilityErrorCode` chuẩn khi có lỗi |
| Idempotency | Nếu `idempotent: true`, đảm bảo gọi nhiều lần với cùng input cho kết quả như nhau |
| Quản lý resource | Tự dọn dẹp resource (file handles, connections) sau khi thực thi |

### ❌ Non-Responsibilities (Capability KHÔNG có trách nhiệm)

| Không trách nhiệm | Lý do |
|---|---|
| Không điều phối Workflow | Đó là trách nhiệm của Execution Runtime |
| Không gọi Capability khác | Tránh coupling; composition là việc của Workflow |
| Không truy cập Repository trực tiếp | Phải dùng `harness.repo.*` nếu cần, không inject Repository service |
| Không tự inject RuntimeContext | Context được inject bởi Execution, không tự fetch |
| Không lưu trữ state giữa các lần invoke | Capability phải stateless theo thiết kế |
| Không quyết định retry logic | Retry do Execution Runtime xử lý dựa trên `retryable` flag |
| Không biết về Governance/Policy | Governance check xảy ra ở tầng Execution, không trong Capability |

---

## 3. Capability Contract

Mỗi Capability phải expose một `CapabilityDefinition` hoàn chỉnh:

```typescript
interface CapabilityDefinition {
  id: CapabilityId;           // unique identifier, format: {namespace}.{name}
  name: string;               // human-readable name
  description: string;        // mô tả chức năng
  version: SemVer;            // ví dụ: "1.0.0"
  inputSchema: JSONSchema;    // JSON Schema mô tả input
  outputSchema: JSONSchema;   // JSON Schema mô tả output
  errorCodes: CapabilityErrorCode[];  // danh sách mã lỗi có thể xảy ra
  permissions: Permission[];  // permissions cần thiết
  timeout: Duration;          // thời gian tối đa cho phép (ví dụ: "30s", "5m")
  idempotent: boolean;        // true nếu gọi nhiều lần cùng input cho cùng kết quả
}
```

```typescript
interface CapabilityImpl {
  execute(context: RuntimeContext, input: unknown): Promise<unknown>;
}

interface CapabilityResult {
  capabilityId: CapabilityId;
  success: boolean;
  output?: unknown;
  error?: HarnessError;
  durationMs: number;
}
```

### CapabilityId Format

```
CapabilityId ::= {namespace} "." {name}
```

- **namespace:** tên miền logic, ví dụ: `harness.file`, `harness.git`, `myplugin`
- **name:** tên thao tác, ví dụ: `read`, `write`, `commit`
- **Ví dụ hợp lệ:** `harness.file.read`, `harness.git.commit`, `myorg.slack.notify`
- **Quy tắc:** Built-in capabilities dùng prefix `harness.`; plugin KHÔNG được dùng prefix `harness.`

---

## 4. Built-in Capability Catalogue

### 4.1 File Operations

#### `harness.file.read` — Đọc nội dung file

```typescript
// Input Schema
{
  path: string;               // đường dẫn tuyệt đối hoặc tương đối đến file
  encoding?: string;          // mặc định: "utf-8"
  startLine?: number;         // dòng bắt đầu (1-indexed, tùy chọn)
  endLine?: number;           // dòng kết thúc (1-indexed, tùy chọn)
}

// Output Schema
{
  content: string;            // nội dung file
  sizeBytes: number;          // kích thước file tính bằng bytes
  lineCount: number;          // tổng số dòng
  encoding: string;           // encoding thực tế được dùng
}
```

---

#### `harness.file.write` — Ghi nội dung file

```typescript
// Input Schema
{
  path: string;               // đường dẫn đến file
  content: string;            // nội dung cần ghi
  encoding?: string;          // mặc định: "utf-8"
  createDirs?: boolean;       // tạo thư mục cha nếu chưa tồn tại, mặc định: false
  overwrite?: boolean;        // ghi đè nếu file đã tồn tại, mặc định: true
}

// Output Schema
{
  path: string;               // đường dẫn tuyệt đối của file đã ghi
  sizeBytes: number;          // kích thước file sau khi ghi
  created: boolean;           // true nếu file mới được tạo, false nếu ghi đè
}
```

---

#### `harness.file.append` — Thêm nội dung vào cuối file

```typescript
// Input Schema
{
  path: string;               // đường dẫn đến file
  content: string;            // nội dung cần thêm vào
  encoding?: string;          // mặc định: "utf-8"
  createIfNotExists?: boolean; // tạo file nếu chưa tồn tại, mặc định: true
}

// Output Schema
{
  path: string;               // đường dẫn tuyệt đối
  sizeBytes: number;          // kích thước file sau khi append
  bytesAppended: number;      // số bytes đã thêm vào
}
```

---

#### `harness.file.delete` — Xóa file

```typescript
// Input Schema
{
  path: string;               // đường dẫn đến file cần xóa
  mustExist?: boolean;        // báo lỗi nếu file không tồn tại, mặc định: false
}

// Output Schema
{
  path: string;               // đường dẫn tuyệt đối
  deleted: boolean;           // true nếu file đã bị xóa
}
```

---

#### `harness.file.exists` — Kiểm tra tồn tại của file

```typescript
// Input Schema
{
  path: string;               // đường dẫn cần kiểm tra
}

// Output Schema
{
  exists: boolean;            // true nếu file tồn tại
  isFile: boolean;            // true nếu là file (không phải directory)
  sizeBytes?: number;         // kích thước nếu tồn tại
  lastModified?: string;      // ISO 8601 timestamp nếu tồn tại
}
```

---

#### `harness.file.list` — Liệt kê files trong directory

```typescript
// Input Schema
{
  path: string;               // đường dẫn directory
  pattern?: string;           // glob pattern lọc file, ví dụ: "*.ts"
  recursive?: boolean;        // liệt kê đệ quy, mặc định: false
  includeHidden?: boolean;    // bao gồm file ẩn (bắt đầu bằng "."), mặc định: false
}

// Output Schema
{
  files: Array<{
    name: string;             // tên file
    path: string;             // đường dẫn tuyệt đối
    sizeBytes: number;
    lastModified: string;     // ISO 8601
    isDirectory: boolean;
  }>;
  totalCount: number;
}
```

---

#### `harness.file.move` — Di chuyển/đổi tên file

```typescript
// Input Schema
{
  sourcePath: string;         // đường dẫn nguồn
  destinationPath: string;    // đường dẫn đích
  overwrite?: boolean;        // ghi đè nếu đích đã tồn tại, mặc định: false
  createDirs?: boolean;       // tạo thư mục cha của đích nếu chưa tồn tại, mặc định: false
}

// Output Schema
{
  sourcePath: string;
  destinationPath: string;
  moved: boolean;
}
```

---

#### `harness.file.copy` — Sao chép file

```typescript
// Input Schema
{
  sourcePath: string;         // đường dẫn nguồn
  destinationPath: string;    // đường dẫn đích
  overwrite?: boolean;        // ghi đè nếu đích đã tồn tại, mặc định: false
  createDirs?: boolean;       // tạo thư mục cha của đích nếu chưa tồn tại, mặc định: false
}

// Output Schema
{
  sourcePath: string;
  destinationPath: string;
  sizeBytes: number;          // kích thước file đã copy
}
```

---

### 4.2 Directory Operations

#### `harness.dir.create` — Tạo directory

```typescript
// Input Schema
{
  path: string;               // đường dẫn directory cần tạo
  recursive?: boolean;        // tạo tất cả thư mục cha nếu chưa tồn tại, mặc định: true
}

// Output Schema
{
  path: string;               // đường dẫn tuyệt đối đã tạo
  created: boolean;           // true nếu mới tạo, false nếu đã tồn tại
}
```

---

#### `harness.dir.delete` — Xóa directory

```typescript
// Input Schema
{
  path: string;               // đường dẫn directory cần xóa
  recursive?: boolean;        // xóa đệ quy kể cả contents, mặc định: false
  mustExist?: boolean;        // báo lỗi nếu không tồn tại, mặc định: false
}

// Output Schema
{
  path: string;
  deleted: boolean;
}
```

---

#### `harness.dir.list` — Liệt kê nội dung directory

```typescript
// Input Schema
{
  path: string;               // đường dẫn directory
  recursive?: boolean;        // liệt kê đệ quy, mặc định: false
  includeHidden?: boolean;    // bao gồm mục ẩn, mặc định: false
}

// Output Schema
{
  entries: Array<{
    name: string;
    path: string;             // đường dẫn tuyệt đối
    isDirectory: boolean;
    isFile: boolean;
    sizeBytes?: number;       // chỉ có nếu isFile
    lastModified: string;     // ISO 8601
  }>;
  totalCount: number;
}
```

---

#### `harness.dir.exists` — Kiểm tra tồn tại của directory

```typescript
// Input Schema
{
  path: string;
}

// Output Schema
{
  exists: boolean;
  isDirectory: boolean;       // true nếu là directory (không phải file)
}
```

---

### 4.3 Search Operations

#### `harness.search.text` — Tìm kiếm text trong files

```typescript
// Input Schema
{
  query: string;              // chuỗi cần tìm (regex hoặc literal)
  path: string;               // thư mục gốc để tìm kiếm
  filePattern?: string;       // glob pattern để lọc file, ví dụ: "*.ts"
  caseSensitive?: boolean;    // mặc định: false
  isRegex?: boolean;          // query là regex, mặc định: false
  maxResults?: number;        // số kết quả tối đa, mặc định: 100
  contextLines?: number;      // số dòng context xung quanh match, mặc định: 2
}

// Output Schema
{
  matches: Array<{
    file: string;             // đường dẫn tuyệt đối
    line: number;             // số dòng (1-indexed)
    column: number;           // số cột (1-indexed)
    content: string;          // nội dung dòng khớp
    context: {
      before: string[];       // các dòng trước match
      after: string[];        // các dòng sau match
    };
  }>;
  totalMatches: number;
  filesSearched: number;
  truncated: boolean;         // true nếu kết quả bị cắt bớt do maxResults
}
```

---

#### `harness.search.file` — Tìm file theo pattern

```typescript
// Input Schema
{
  pattern: string;            // glob pattern, ví dụ: "**/*.ts", "src/**/index.*"
  path: string;               // thư mục gốc để tìm kiếm
  excludePatterns?: string[]; // patterns để loại trừ, ví dụ: ["node_modules/**"]
  maxResults?: number;        // mặc định: 200
}

// Output Schema
{
  files: Array<{
    path: string;             // đường dẫn tuyệt đối
    relativePath: string;     // đường dẫn tương đối so với input path
    sizeBytes: number;
    lastModified: string;     // ISO 8601
  }>;
  totalCount: number;
  truncated: boolean;
}
```

---

#### `harness.search.symbol` — Tìm kiếm symbol trong code

```typescript
// Input Schema
{
  symbolName: string;         // tên symbol cần tìm
  path: string;               // thư mục gốc
  language?: string;          // ngôn ngữ lập trình, ví dụ: "typescript", "python"
  symbolTypes?: string[];     // loại symbol: ["class", "function", "variable", "interface"]
  fuzzy?: boolean;            // tìm kiếm gần đúng, mặc định: false
  maxResults?: number;        // mặc định: 50
}

// Output Schema
{
  symbols: Array<{
    name: string;
    type: string;             // "class" | "function" | "variable" | "interface" | ...
    file: string;             // đường dẫn tuyệt đối
    line: number;
    column: number;
    signature?: string;       // signature đầy đủ nếu là function/method
    documentation?: string;   // JSDoc/docstring nếu có
  }>;
  totalCount: number;
}
```

---

### 4.4 Git Operations

#### `harness.git.status` — Lấy git status

```typescript
// Input Schema
{
  repoPath: string;           // đường dẫn đến git repository
}

// Output Schema
{
  branch: string;             // branch hiện tại
  ahead: number;              // số commits ahead so với remote
  behind: number;             // số commits behind so với remote
  staged: Array<{
    path: string;
    status: "added" | "modified" | "deleted" | "renamed";
  }>;
  unstaged: Array<{
    path: string;
    status: "modified" | "deleted";
  }>;
  untracked: string[];        // danh sách file untracked
  isClean: boolean;           // true nếu working tree sạch
}
```

---

#### `harness.git.diff` — Lấy diff

```typescript
// Input Schema
{
  repoPath: string;
  staged?: boolean;           // diff staged changes, mặc định: false (unstaged)
  filePath?: string;          // giới hạn diff cho một file cụ thể
  fromRef?: string;           // commit/branch/tag nguồn
  toRef?: string;             // commit/branch/tag đích
  contextLines?: number;      // số dòng context, mặc định: 3
}

// Output Schema
{
  diff: string;               // unified diff format
  filesChanged: number;
  insertions: number;
  deletions: number;
  hunks: Array<{
    file: string;
    oldStart: number;
    newStart: number;
    content: string;
  }>;
}
```

---

#### `harness.git.commit` — Commit changes

```typescript
// Input Schema
{
  repoPath: string;
  message: string;            // commit message
  files?: string[];           // danh sách file cần stage, nếu không có thì stage all
  author?: {
    name: string;
    email: string;
  };
  allowEmpty?: boolean;       // cho phép empty commit, mặc định: false
}

// Output Schema
{
  commitHash: string;         // full commit hash
  shortHash: string;          // short hash (7 chars)
  message: string;
  author: { name: string; email: string };
  timestamp: string;          // ISO 8601
  filesChanged: number;
}
```

---

#### `harness.git.log` — Lấy commit log

```typescript
// Input Schema
{
  repoPath: string;
  limit?: number;             // số commit tối đa, mặc định: 20
  branch?: string;            // branch cụ thể, mặc định: current branch
  filePath?: string;          // log cho một file cụ thể
  since?: string;             // ISO 8601 timestamp hoặc git ref
  until?: string;             // ISO 8601 timestamp hoặc git ref
}

// Output Schema
{
  commits: Array<{
    hash: string;
    shortHash: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;        // ISO 8601
    filesChanged?: number;
  }>;
  totalCount: number;
}
```

---

#### `harness.git.branch` — Quản lý branches

```typescript
// Input Schema
{
  repoPath: string;
  action: "list" | "create" | "delete" | "rename";
  branchName?: string;        // tên branch (bắt buộc với create/delete/rename)
  newBranchName?: string;     // tên mới (bắt buộc với rename)
  fromRef?: string;           // base ref khi tạo branch mới
  includeRemote?: boolean;    // bao gồm remote branches khi list, mặc định: false
  force?: boolean;            // force delete, mặc định: false
}

// Output Schema
{
  // Khi action = "list"
  branches?: Array<{
    name: string;
    isCurrent: boolean;
    isRemote: boolean;
    lastCommit: string;       // short hash
    lastCommitMessage: string;
  }>;
  // Khi action = "create" | "delete" | "rename"
  success?: boolean;
  branchName?: string;
}
```

---

#### `harness.git.checkout` — Checkout branch hoặc file

```typescript
// Input Schema
{
  repoPath: string;
  target: string;             // branch name, commit hash, hoặc file path
  type: "branch" | "file" | "commit";
  createBranch?: boolean;     // tạo branch mới nếu chưa tồn tại (type=branch), mặc định: false
  fromRef?: string;           // base ref khi tạo branch mới
}

// Output Schema
{
  success: boolean;
  previousBranch?: string;    // branch trước khi checkout (nếu type=branch)
  currentBranch?: string;     // branch hiện tại sau checkout
  filesRestored?: number;     // số file được restore (nếu type=file)
}
```

---

### 4.5 Terminal Operations

#### `harness.terminal.execute` — Chạy command

```typescript
// Input Schema
{
  command: string;            // command cần chạy
  args?: string[];            // arguments (preferred over inline args)
  workingDir?: string;        // thư mục làm việc
  env?: Record<string, string>; // biến môi trường bổ sung
  timeout?: number;           // timeout tính bằng milliseconds, mặc định: 30000
  shell?: boolean;            // chạy qua shell, mặc định: false
}

// Output Schema
{
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;           // thời gian thực thi tính bằng milliseconds
  timedOut: boolean;
}
```

---

#### `harness.terminal.stream` — Stream command output

```typescript
// Input Schema
{
  command: string;
  args?: string[];
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
  bufferSize?: number;        // kích thước buffer tính bằng bytes, mặc định: 4096
}

// Output Schema
{
  exitCode: number;
  lines: Array<{
    stream: "stdout" | "stderr";
    content: string;
    timestamp: string;        // ISO 8601
  }>;
  duration: number;
  timedOut: boolean;
}
```

---

### 4.6 AI Operations

#### `harness.ai.complete` — Gọi AI completion

```typescript
// Input Schema
{
  prompt: string;             // prompt chính
  systemPrompt?: string;      // system instruction
  model?: string;             // model ID, mặc định theo platform config
  maxTokens?: number;         // mặc định: 4096
  temperature?: number;       // 0.0 - 1.0, mặc định: 0.7
  stopSequences?: string[];   // chuỗi dừng generation
  contextMessages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// Output Schema
{
  completion: string;         // nội dung trả về
  model: string;              // model thực tế được dùng
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "max_tokens" | "stop_sequence";
}
```

---

#### `harness.ai.embed` — Tạo embedding vector

```typescript
// Input Schema
{
  text: string | string[];    // text cần tạo embedding
  model?: string;             // embedding model ID, mặc định theo platform config
}

// Output Schema
{
  embeddings: number[][];     // mảng vector (một vector per input text)
  model: string;
  dimensions: number;         // số chiều của vector
  usage: {
    totalTokens: number;
  };
}
```

---

### 4.7 Repository Operations

#### `harness.repo.read_asset` — Đọc asset qua Repository domain

```typescript
// Input Schema
{
  assetId: string;            // ID của asset cần đọc
  version?: string;           // version cụ thể, mặc định: latest
  projection?: string[];      // chỉ lấy các field cụ thể
}

// Output Schema
{
  assetId: string;
  assetType: string;
  version: string;
  content: any;               // nội dung asset theo schema của asset type đó
  metadata: {
    createdAt: string;        // ISO 8601
    updatedAt: string;        // ISO 8601
    author: string;
    tags: string[];
  };
}
```

---

#### `harness.repo.write_asset` — Ghi asset qua Repository domain

```typescript
// Input Schema
{
  assetId: string;            // ID của asset (tạo mới nếu chưa tồn tại)
  assetType: string;          // loại asset
  content: any;               // nội dung asset
  message?: string;           // mô tả thay đổi
  overwrite?: boolean;        // ghi đè nếu đã tồn tại, mặc định: true
}

// Output Schema
{
  assetId: string;
  version: string;            // version mới sau khi ghi
  created: boolean;           // true nếu asset mới được tạo
  updatedAt: string;          // ISO 8601
}
```

---

#### `harness.repo.create_proposal` — Tạo proposal mới

```typescript
// Input Schema
{
  proposalType: string;       // loại proposal
  title: string;
  description: string;
  payload: any;               // nội dung chi tiết của proposal
  priority?: "low" | "normal" | "high" | "critical"; // mặc định: "normal"
  tags?: string[];
}

// Output Schema
{
  proposalId: string;         // ID của proposal đã tạo
  status: "pending" | "draft";
  createdAt: string;          // ISO 8601
  proposalType: string;
  title: string;
}
```

---


## 5. Capability Registry

Registry là thành phần trung tâm quản lý toàn bộ vòng đời của Capabilities.

```typescript
interface CapabilityRegistry {
  /**
   * Đăng ký một Capability mới vào Registry.
   * Báo lỗi CAP_008 nếu id đã tồn tại và overwrite không được phép.
   */
  register(def: CapabilityDefinition, impl: CapabilityImpl): void;

  /**
   * Hủy đăng ký một Capability.
   * Không báo lỗi nếu id không tồn tại.
   */
  unregister(id: CapabilityId): void;

  /**
   * Tìm kiếm và trả về CapabilityImpl sẵn sàng để invoke.
   * Báo lỗi CAP_001 nếu không tìm thấy.
   */
  resolve(id: CapabilityId): CapabilityImpl;

  /**
   * Trả về CapabilityDefinition đã đăng ký cho id.
   */
  getDefinition(id: CapabilityId): CapabilityDefinition;

  /**
   * Invoke một Capability theo id.
   * Thực hiện đầy đủ Invocation Protocol (xem §6).
   * Trả về CapabilityResult (success hoặc error).
   */
  invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>;

  /**
   * Trả về danh sách tất cả CapabilityDefinition đã đăng ký.
   */
  list(): CapabilityDefinition[];

  /**
   * Kiểm tra xem một Capability có được đăng ký không.
   */
  isRegistered(id: CapabilityId): boolean;
}
```

### Triển khai Registry

- Registry được khởi tạo bởi Platform trong quá trình startup.
- Built-in capabilities được đăng ký tự động trước khi bất kỳ Workflow nào được thực thi.
- Plugin capabilities được đăng ký sau built-in, trong giai đoạn plugin loading.
- Registry là singleton trong phạm vi một Platform instance.
- Registry thread-safe: `register` và `unregister` có thể được gọi concurrent.

---

## 6. Invocation Protocol

Mô tả chi tiết các bước Registry thực hiện khi `invoke()` được gọi:

```
Execution Runtime
      │
      │  invoke(capId, context, input)
      ▼
┌─────────────────────────────────────┐
│         CapabilityRegistry          │
│                                     │
│  Step 1: resolve(capId)             │
│    └─ Tìm CapabilityInstance        │
│    └─ Nếu không có → CAP_001        │
│                                     │
│  Step 2: Kiểm tra registration      │
│    └─ Verify Capability available   │
│    └─ Nếu unavailable → CAP_007     │
│                                     │
│  Step 3: Validate input             │
│    └─ JSON Schema validation        │
│    └─ Nếu invalid → CAP_002         │
│                                     │
│  Step 4: Kiểm tra Permissions       │
│    └─ Verify context có permissions │
│    └─ Nếu thiếu → CAP_004           │
│                                     │
│  Step 5: Inject RuntimeContext      │
│    └─ Bind context vào impl         │
│                                     │
│  Step 6: Execute với timeout        │
│    └─ impl.execute(context, input)  │
│    └─ Nếu timeout → CAP_005         │
│    └─ Nếu lỗi tạm thời → CAP_006   │
│                                     │
│  Step 7: Validate output            │
│    └─ JSON Schema validation        │
│    └─ Nếu invalid → CAP_003         │
│                                     │
│  Step 8: Trả về CapabilityResult    │
└─────────────────────────────────────┘
      │
      │  CapabilityResult { success, output | error }
      ▼
Execution Runtime
```

### Chi tiết từng bước

**Step 1 — Resolve:**
Registry tra cứu trong internal map theo `capId`. Nếu không tìm thấy, trả về `CapabilityResult` với `error.code = CAP_001` ngay lập tức.

**Step 2 — Kiểm tra registration:**
Xác minh Capability instance không bị đánh dấu `unavailable` (ví dụ: do plugin đang reload). Nếu unavailable, trả về `CAP_007`.

**Step 3 — Validate input:**
Chạy JSON Schema validation trên `input` với `def.inputSchema`. Nếu validation thất bại, trả về `CAP_002` kèm chi tiết lỗi validation.

**Step 4 — Kiểm tra Permissions:**
So sánh `def.permissions` với permissions có trong `RuntimeContext`. Nếu thiếu bất kỳ permission nào, trả về `CAP_004`.

**Step 5 — Inject RuntimeContext:**
Bind `context` vào execution scope của `impl`. Capability không cần tự fetch context.

**Step 6 — Execute:**
Gọi `impl.execute(context, input)` với deadline = `now + def.timeout`. Nếu hết timeout, cancel execution và trả về `CAP_005`. Nếu impl throw transient error, trả về `CAP_006`.

**Step 7 — Validate output:**
Nếu `success = true`, chạy JSON Schema validation trên `output` với `def.outputSchema`. Nếu output không conform schema, trả về `CAP_003` (đây là lỗi của Capability implementation, không phải caller).

**Step 8 — Return:**
Trả về `CapabilityResult` cho Execution Runtime. Execution Runtime xử lý retry, error propagation theo Governance rules.

---

## 7. Plugin Model

Plugin Model cho phép mở rộng hệ thống với các Capabilities tùy chỉnh mà không cần sửa đổi core.

### Định nghĩa Plugin

Một Plugin là một module implement `CapabilityImpl` và khai báo `CapabilityDefinition`:

```typescript
// Ví dụ plugin: myorg.slack.notify
const slackNotifyDefinition: CapabilityDefinition = {
  id: "myorg.slack.notify",
  name: "Slack Notify",
  description: "Gửi thông báo tới Slack channel",
  version: "1.0.0",
  inputSchema: {
    type: "object",
    required: ["channel", "message"],
    properties: {
      channel: { type: "string" },
      message: { type: "string" }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      messageId: { type: "string" },
      timestamp: { type: "string" }
    }
  },
  errorCodes: ["CAP_005", "CAP_006"],
  permissions: ["network.outbound"],
  timeout: "10s",
  idempotent: false
};

const slackNotifyImpl: CapabilityImpl = {
  async execute(context: RuntimeContext, input: any): Promise<CapabilityResult> {
    // implementation...
  }
};
```

### Quy tắc Plugin

| Quy tắc | Mô tả |
|---|---|
| **Namespace** | Plugin KHÔNG được dùng prefix `harness.` — reserved cho built-in |
| **Khai báo** | Plugin phải được khai báo trong `harness.yaml` trước khi Platform load |
| **Interface** | Plugin phải implement `CapabilityImpl` interface đầy đủ |
| **Loading** | Platform load plugin trong giai đoạn startup, sau built-in capabilities |
| **Isolation** | Plugin không được import hoặc gọi Plugin khác trực tiếp |
| **Error handling** | Plugin phải throw `CapabilityError` với đúng error code |

### Loại Plugin

```yaml
# harness.yaml — khai báo plugins

capabilities:
  # Shared Capability: dùng chung toàn bộ Harness, định nghĩa trong Shared Harness
  - type: shared
    module: "@myorg/harness-shared"
    capabilities:
      - myorg.slack.notify
      - myorg.jira.create_ticket

  # Local Capability: chỉ dùng trong Local Harness này
  - type: local
    module: "./capabilities/my-custom-check"
    capabilities:
      - myproject.custom.lint_check

  # External Capability: npm package độc lập
  - type: external
    package: "harness-cap-aws-s3@1.2.3"
    capabilities:
      - aws.s3.upload
      - aws.s3.download
```

**Shared Capability:** Định nghĩa trong Shared Harness, được dùng lại bởi nhiều Local Harness. Phù hợp cho các capabilities dùng chung trong organization.

**Local Capability:** Chỉ tồn tại trong một Local Harness. Phù hợp cho các capabilities đặc thù của một project.

**External Capability:** Được đóng gói như npm package (hoặc tương đương). Phù hợp cho capabilities tái sử dụng giữa các tổ chức hoặc publish lên registry.

---

## 8. Capability Lifecycle

```
    ┌─────────┐
    │ CREATE  │  ← Developer viết CapabilityDefinition + CapabilityImpl
    └────┬────┘
         │
         ▼
    ┌──────────┐
    │ REGISTER │  ← Platform gọi Registry.register(def, impl) lúc startup
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │ VALIDATE │  ← Registry kiểm tra def hợp lệ: schema, id format, permissions
    └────┬─────┘
         │  Validation pass
         ▼
    ┌───────────┐
    │ AVAILABLE │  ← Capability sẵn sàng để invoke
    └────┬──────┘
         │
         ▼
    ┌────────┐
    │ INVOKE │  ← Execution Runtime gọi Registry.invoke(id, context, input)
    └────┬───┘
         │  (có thể invoke nhiều lần)
         ▼
    ┌────────┐
    │ UPDATE │  ← Plugin reload hoặc version upgrade (không downtime nếu có thể)
    └────┬───┘
         │
         ▼
    ┌────────────┐
    │ UNREGISTER │  ← Platform gọi Registry.unregister(id) khi shutdown hoặc plugin removed
    └────────────┘
```

### Mô tả các trạng thái

| Trạng thái | Mô tả |
|---|---|
| **CREATE** | Developer tạo `CapabilityDefinition` và `CapabilityImpl`. Chưa có trong Registry. |
| **REGISTER** | Platform gọi `registry.register()`. Capability được thêm vào internal map. |
| **VALIDATE** | Registry kiểm tra: id format, schema hợp lệ, không trùng id (trừ khi overwrite). |
| **AVAILABLE** | Capability đã được validate và sẵn sàng để `resolve()` và `invoke()`. |
| **INVOKE** | Capability đang được thực thi. Có thể xảy ra đồng thời nhiều invocation. |
| **UPDATE** | Capability đang được cập nhật (reload). Tạm thời ở trạng thái `unavailable` (CAP_007). |
| **UNREGISTER** | Capability bị xóa khỏi Registry. Các invocation đang chạy được hoàn thành trước khi xóa. |

---

## 9. Compile-time Dependencies

Capability module chỉ được phép import từ:

| Được phép | Mô tả |
|---|---|
| `shared` | Shared types, utilities, và interfaces của Harness |

Capability module **KHÔNG được** import từ:

| Không được phép | Lý do |
|---|---|
| `repository` | Capability không tự truy cập Repository; dùng `harness.repo.*` nếu cần |
| `context` | Context được inject, không import module context |
| `execution` | Tránh circular dependency; Execution gọi Capability, không ngược lại |
| `governance` | Governance check là trách nhiệm của Execution, không của Capability |
| `platform` | Capability không phụ thuộc Platform internals |

```typescript
// ✅ Hợp lệ
import { CapabilityImpl, CapabilityResult, RuntimeContext } from "@harness/shared";

// ❌ Không hợp lệ
import { Repository } from "@harness/repository";
import { ExecutionEngine } from "@harness/execution";
import { GovernancePolicy } from "@harness/governance";
```

---

## 10. Runtime Context Injection

`RuntimeContext` cung cấp thông tin về môi trường đang thực thi cho Capability.

```typescript
interface RuntimeContext {
  workspaceRoot: string;      // đường dẫn tuyệt đối đến workspace root
  sessionId: string;          // ID của execution session hiện tại
  agentId: string;            // ID của agent đang invoke
  permissions: Permission[];  // danh sách permissions được cấp
  logger: Logger;             // logger scope theo capability
  config: Record<string, any>; // config từ harness.yaml cho capability này
  metadata: Record<string, string>; // metadata tùy chỉnh từ Execution
}
```

### Quy tắc sử dụng Context

| Quy tắc | Mô tả |
|---|---|
| **Inject, không fetch** | `RuntimeContext` được Execution inject vào `execute()`, Capability không tự fetch |
| **Read-only** | Capability chỉ được đọc thông tin từ context, không được modify bất kỳ field nào |
| **Không lưu trữ** | Capability không được cache context ngoài scope của một `execute()` call |
| **Không truyền đi** | Capability không được truyền context sang module khác hoặc service ngoài |
| **Logger dùng được** | `context.logger` là cách duy nhất và được phép để ghi log từ Capability |

```typescript
// ✅ Đúng: dùng context để lấy info và log
async execute(context: RuntimeContext, input: any): Promise<CapabilityResult> {
  context.logger.info(`Reading file: ${input.path}`);
  const absolutePath = path.resolve(context.workspaceRoot, input.path);
  // ...
}

// ❌ Sai: tự fetch context
async execute(_context: RuntimeContext, input: any): Promise<CapabilityResult> {
  const context = GlobalContextService.get(); // KHÔNG được làm vậy
  // ...
}

// ❌ Sai: modify context
async execute(context: RuntimeContext, input: any): Promise<CapabilityResult> {
  context.metadata["myKey"] = "value"; // KHÔNG được làm vậy
  // ...
}
```

---

## 11. Error Model

### Bảng mã lỗi

| Code | Description | Retryable | Mô tả chi tiết |
|------|-------------|-----------|----------------|
| `CAP_001` | Capability not found | No | `CapabilityId` không tồn tại trong Registry |
| `CAP_002` | Input validation failed | No | Input không conform `inputSchema` |
| `CAP_003` | Output validation failed | No | Output của impl không conform `outputSchema` — lỗi trong Capability implementation |
| `CAP_004` | Permission denied | No | RuntimeContext không có đủ permissions theo `def.permissions` |
| `CAP_005` | Execution timeout | Yes | Thực thi vượt quá `def.timeout` |
| `CAP_006` | Transient error | Yes | Lỗi tạm thời (network flap, resource lock, v.v.) |
| `CAP_007` | Capability unavailable | Yes | Capability tồn tại nhưng tạm thời không sẵn sàng (đang reload) |
| `CAP_008` | Registration failed | No | Không thể đăng ký Capability (id conflict, schema invalid, v.v.) |

### Cấu trúc Error

```typescript
interface CapabilityError {
  code: CapabilityErrorCode;  // một trong các code ở trên
  message: string;            // mô tả lỗi dễ đọc
  capabilityId: CapabilityId; // capability nào gây ra lỗi
  details?: any;              // thông tin bổ sung (validation errors, stack trace, v.v.)
  retryable: boolean;         // lấy từ bảng trên
  timestamp: string;          // ISO 8601
}
```

### Retry Policy (do Execution Runtime xử lý)

```typescript
// Execution Runtime quyết định retry dựa trên retryable flag
if (result.error?.retryable) {
  // Execution có thể retry theo backoff strategy của nó
  // Capability KHÔNG tự retry
}
```

---

## 12. Design Rules

Các quy tắc thiết kế bắt buộc khi tạo hoặc sửa đổi Capability:

**DR-1: Single Responsibility**
Mỗi Capability thực hiện đúng một thao tác. Không gom nhiều thao tác vào một Capability.

**DR-2: Stateless**
Capability không lưu trữ state giữa các lần invoke. Mọi thông tin cần thiết phải đến từ `input` hoặc `context`.

**DR-3: Schema-first**
Khai báo `inputSchema` và `outputSchema` đầy đủ trước khi viết implementation. Schema là contract, không phải documentation.

**DR-4: Explicit Permissions**
Khai báo tất cả permissions cần thiết trong `def.permissions`. Không giả định permissions.

**DR-5: Appropriate Timeout**
Đặt `timeout` phù hợp với thao tác. File operations: 10s. Git operations: 30s. Terminal: tùy. AI: 120s. Không đặt timeout vô hạn.

**DR-6: Idempotency Declaration**
Khai báo `idempotent: true` chỉ khi thực sự đảm bảo gọi nhiều lần với cùng input cho cùng kết quả. Không khai báo sai.

**DR-7: No Side-channel Communication**
Capability không giao tiếp với components khác ngoài `input`/`output` và `context.logger`. Không emit events, không gọi HTTP, không write to shared state.

**DR-8: Error Code Precision**
Dùng đúng error code theo bảng §11. Không dùng `CAP_006` (transient) cho lỗi xác định.

**DR-9: Plugin Namespace Isolation**
Plugin không dùng prefix `harness.`. Namespace phải là tên organization hoặc project (`myorg.`, `myproject.`).

**DR-10: Versioning**
Khi thay đổi `inputSchema` hoặc `outputSchema` theo cách không backward-compatible, tăng major version và tạo Capability mới với id mới (hoặc version suffix).

---

## 13. Cross References

| Tài liệu | Liên quan |
|---|---|
| `18_GLOSSARY.md` | Định nghĩa: Capability, CapabilityId, CapabilityRegistry, RuntimeContext, CapabilityResult |
| `00_ARCHITECTURE.md` | Vị trí Capability trong kiến trúc tổng thể hệ thống |
| `11_DATA_MODELS.md` | Các shared types được Capability sử dụng: `SemVer`, `Permission`, `Duration`, `JSONSchema` |
| `04_REPOSITORY_SPECIFICATION.md` | Repository domain; `harness.repo.*` capabilities tương tác với Repository |
| `05_CONTEXT_SPECIFICATION.md` | Context domain; `RuntimeContext` interface được inject vào Capability |
| `06_EXECUTION_SPECIFICATION.md` | Execution Runtime: orchestrates Capability invocation, xử lý retry và error propagation |
| `08_GOVERNANCE_SPECIFICATION.md` | Governance checks xảy ra tại tầng Execution trước khi invoke Capability |
| `09_PLATFORM_SPECIFICATION.md` | Platform: khởi tạo Registry, load plugins, manage Capability lifecycle |
| `10_HARNESS_YAML_SPECIFICATION.md` | Cú pháp khai báo plugins trong `harness.yaml` |

---

## 14. Out of Scope

Các vấn đề sau đây **không** thuộc phạm vi của Capability Specification:

| Ngoài phạm vi | Thuộc về |
|---|---|
| Workflow orchestration logic | `06_EXECUTION_SPECIFICATION.md` |
| Asset storage và versioning | `04_REPOSITORY_SPECIFICATION.md` |
| Governance và policy enforcement | `08_GOVERNANCE_SPECIFICATION.md` |
| Platform bootstrap và plugin discovery | `09_PLATFORM_SPECIFICATION.md` |
| Agent decision-making | Agent/Execution layer |
| Authentication và session management | `05_CONTEXT_SPECIFICATION.md` |
| Harness configuration file format | `10_HARNESS_YAML_SPECIFICATION.md` |
| Network security và TLS | Infrastructure layer |
| Capability monitoring và observability | Platform/Ops concern |
| Distributed tracing | Platform/Ops concern |

---

*Tài liệu này là Final. Mọi thay đổi phải qua review process và cập nhật version.*
