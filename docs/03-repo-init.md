# Khởi tạo repo

[← Mục lục](./README.md) | [← Cấu hình IDE](./ide-setup.md) | [Workflow →](./workflow.md)

---

## Lệnh `harness init`

```bash
harness init /path/to/your/repo [--stack auto|node|dotnet|python|go|rust|php] [--force]
```

## Stack detection tự động

Nếu không chỉ định `--stack`, harness tự phát hiện:

| File tìm thấy | Stack detected |
|----------------|----------------|
| `package.json` | node |
| `*.sln` hoặc `*.csproj` | dotnet |
| `pyproject.toml` hoặc `setup.py` | python |
| `go.mod` | go |
| `Cargo.toml` | rust |
| Không tìm thấy | unknown |

## Files được tạo

```
your-repo/
├── AGENTS.md                    # Entry point cho agent (đọc đầu tiên)
└── .harness/
    ├── progress.md              # Log tiến độ (ban đầu trống)
    ├── scope.yaml               # Forbidden paths + allowed paths per task
    ├── verify.yaml              # Lệnh verify theo stack
    ├── repo-summary.md          # Bản đồ cấu trúc thư mục tự sinh khi init (đọc đầu tiên)
    └── repo-summary.meta.json   # Metadata cho bản đồ cấu trúc thư mục
```

## Ví dụ

```bash
# Init repo Node.js
harness init ~/projects/my-api
# Output:
# ✓ harness init — my-api (node)
#   Created:
#     + AGENTS.md
#     + .harness/scope.yaml
#     + .harness/verify.yaml
#     + .harness/progress.md
#     + .harness/repo-summary.md
#     + .harness/repo-summary.meta.json
#   Next: harness install-mcp --ide cursor

# Init repo .NET với force overwrite
harness init ~/projects/my-service --stack dotnet --force
```

## Idempotent

`harness init` KHÔNG overwrite file đã tồn tại (trừ khi dùng `--force`). An toàn để chạy lại.
