# 141. Milestone M5 — Code Index

## Goal

Code Index xây dựng một biểu diễn có cấu trúc của source code để phục vụ:

- Context Engine
- Planning Engine
- Verification Engine
- Future Refactoring
- Impact Analysis

Code Index không thay thế Repository Analyzer.

Repository Analyzer hiểu repository.

Code Index hiểu source code.

---

# 142. Responsibilities

Code Index chịu trách nhiệm:

- Parse source code
- Build symbol graph
- Build reference graph
- Track declarations
- Track usages
- Incremental indexing

Không chịu trách nhiệm:

- semantic search
- planning
- verification
- code generation

---

# 143. Why Separate from Repository Analyzer?

Repository Analyzer chạy:

```
Ít

↓

Khi init

↓

Khi refresh
```

Code Index chạy:

```
Liên tục

↓

Incremental

↓

Theo file thay đổi
```

Hai workload hoàn toàn khác nhau.

---

# 144. Architecture

```
Repository

↓

Parser

↓

AST

↓

Symbols

↓

References

↓

Code Graph

↓

Index Store
```

---

# 145. Parsing Strategy

Phase 1 sử dụng:

```
Tree-sitter
```

Lý do:

- đa ngôn ngữ
- nhanh
- incremental
- mature

Không tự viết parser.

---

# 146. Index Pipeline

```
Changed File

↓

Parse

↓

AST

↓

Extract Symbols

↓

Extract References

↓

Update Graph

↓

Persist
```

---

# 147. Symbol Types

Phase 1 hỗ trợ:

- Namespace
- Class
- Interface
- Struct
- Enum
- Method
- Property
- Field

Không index local variable.

---

# 148. Relationship Types

Theo dõi:

- inherits
- implements
- calls
- references
- imports
- contains

Không phân tích runtime dispatch.

---

# 149. Symbol Identity

Mỗi Symbol có:

```typescript
interface SymbolId {

    id: string

    language: string

    namespace: string

    name: string

    kind: string

}
```

Không dùng line number làm identity.

---

# 150. Symbol Metadata

Mỗi Symbol lưu:

- file
- range
- visibility
- modifiers
- hash
- documentation

---

# 151. Reference Graph

Reference Graph phải trả lời được:

Ví dụ:

```
Ai gọi UserService?

↓

Controller A

↓

Controller B

↓

Job C
```

Đây là nền tảng cho Impact Analysis.

---

# 152. Dependency Graph

Code Index xây dựng:

```
Symbol

↓

File

↓

Module

↓

Project
```

Graph này khác Dependency Graph của Repository Analyzer.

---

# 153. Index Store

Store gồm:

```
symbols.db

references.db

graph.db
```

Không nhúng vào project.db.

---

# 154. Incremental Update

Khi file thay đổi:

```
Old Symbols

↓

Remove

↓

Parse

↓

Insert

↓

Reconnect Graph
```

Không rebuild toàn bộ.

---

# 155. Consistency Rules

Index phải luôn:

- deterministic
- rebuildable
- idempotent

Nếu nghi ngờ corruption.

↓

Full rebuild.

---

# 156. Public APIs

Phase 1:

```
FindSymbol()

FindReferences()

FindImplementations()

FindDerivedTypes()

FindFileSymbols()

FindModuleSymbols()
```

---

# 157. Future APIs

Phase 2:

```
Rename

Move

Safe Delete

Extract Interface

Extract Method
```

Chưa implement.

---

# 158. Performance Targets

| Operation | Target |
|-----------|---------|
| Parse File | < 100 ms |
| Incremental Update | < 200 ms |
| Find Symbol | < 20 ms |
| Find References | < 50 ms |
| Full Rebuild | < 30 s (100k files) |

---

# 159. Storage Strategy

SQLite.

Không cần Graph Database.

Graph được biểu diễn bằng bảng quan hệ.

Điều này đơn giản hơn và đủ cho Phase 1.

---

# 160. Testing

Unit Test:

- parser
- symbol extraction
- reference extraction

Integration Test:

- ABP sample
- ASP.NET sample

Golden Test:

- symbol snapshot
- reference snapshot

---

# 161. Acceptance Criteria

Hoàn thành khi:

- Parse đúng.
- Symbol đúng.
- Reference đúng.
- Incremental đúng.
- Rebuild đúng.
- API ổn định.

---

# 162. Out of Scope

Không implement:

- semantic model
- control flow graph
- data flow analysis
- call graph optimization

---

# 163. Risks

Sai lầm phổ biến:

Muốn Code Index hiểu toàn bộ compiler.

Không cần.

Code Index chỉ cần:

```
Structural Understanding
```

Compiler vẫn là source of truth.

---

# 164. Exit Criteria

Sau M5.

Harness có thể trả lời:

```
Class này ở đâu?

↓

Ai dùng?

↓

Implement ở đâu?

↓

Ảnh hưởng tới file nào?
```

mà không cần AI.

Đây sẽ là đầu vào quan trọng cho Planning Engine và Verification Engine.

---

# 165. Architectural Refinement

## Tách Code Graph khỏi Symbol Store

Kiến trúc đề xuất:

```
Parser

↓

Symbol Extractor

↓

Reference Extractor

↓

Symbol Store

↓

Graph Builder

↓

Graph Store
```

Lợi ích:

- Có thể rebuild Graph mà không parse lại source code.
- Hỗ trợ thêm các loại graph mới (Dependency Graph, Call Graph, Module Graph) mà không thay đổi Symbol Store.
- Chuẩn bị tốt hơn cho các tính năng Refactoring và Impact Analysis ở Phase 2.

Điều này giúp Code Index giữ nguyên nguyên tắc:

- Extract một lần.
- Xây nhiều góc nhìn từ cùng một dữ liệu.

---
