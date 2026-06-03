# Đáp Án: Tổng Quan Harness-OS

> File này đi kèm với `project-harness-os-overview.md`, chứa đáp án chi tiết cho phần CHECKLIST TỰ KIỂM TRA.

---

## Câu 1: `wrapTool()` kiểm tra hooks, circuit breaker, loop guard theo thứ tự nào? Tại sao thứ tự đó quan trọng?

**Đáp án:** Thứ tự: (1) Pre-tool hooks → (2) Circuit breaker → (3) Loop guard → (4) Execute handler. Quan trọng vì: hooks là user-defined rules (nhanh, nhẹ) → kiểm tra trước. Circuit breaker kiểm tra repo-scoped failures (state in-memory). Loop guard kiểm tra session-scoped repetition (cũng in-memory). Cả 3 đều fail-fast trước khi chạm đến thực thi thật.

## Câu 2: `detectRuntime()` có thứ tự ưu tiên: dotnet > php > node > python > go > rust. Tại sao dotnet được ưu tiên nhất?

**Đáp án:** `.sln` và `.csproj` là format đặc thù của .NET — không project nào khác dùng. Trong khi `composer.json` và `package.json` có thể cùng tồn tại (PHP + Node frontend). Dotnet không có nguy cơ false positive, nên ưu tiên cao nhất.

## Câu 3: Skill có 3 search directories. Nếu có skill trùng tên ở cả 3 nơi, cái nào được dùng?

**Đáp án:** First-found wins: repo-specific → global → built-in. Sau khi tìm thấy skill ở directory đầu tiên, nó được added vào `seen` set → các directory sau bỏ qua (`if (seen.has(skillName)) continue`). Cho phép user override built-in skills.

## Câu 4: `verify.yaml` timeout ghi bằng seconds nhưng code chuyển thành ms (*1000). Điều gì xảy ra nếu quên convert?

**Đáp án:** execSync timeout sẽ là 120 giây thay vì 120000ms (vì DEFAULT_TIMEOUT = 120_000ms). Nếu YAML ghi `test: 300`, timeout thực tế là 300ms thay vì 5 phút → test luôn fail vì timeout quá ngắn.

## Câu 5: Tại sao `console.log` bị cấm? Làm sao để debug nếu không được dùng stdout?

**Đáp án:** MCP transport dùng stdin/stdout cho JSON-RPC messages. `console.log` viết text thường ra stdout → MCP client parse fail → crash connection. Debug bằng: (1) `log()` từ logger.ts → ghi stderr (chỉ hiện khi HARNESS_DEBUG=1), (2) `process.stderr.write()`, hoặc (3) auditLog() → ghi SQLite.

## Câu 6: `sessionHandoff()` và `sessionEnd()` đều close session. Khác nhau gì? Khi nào dùng cái nào?

**Đáp án:** `sessionHandoff()` = close + handoffWrite() + progressLog(). `sessionEnd()` = chỉ close. Dùng handoff khi muốn truyền context cho session tiếp theo (next steps, unfinished). Dùng end khi session kết thúc bình thường, không cần handoff (ví dụ: task nhỏ, không cần follow-up).

## Câu 7: `skillCreateFromSession()` cần ít nhất 5 audit events. Tại sao lại là 5?

**Đáp án:** Threshold tối thiểu để có đủ patterns đáng tin cậy. 1-2 events không đủ để phát hiện workflow. 5 events cho thấy có ít nhất vài tool calls khác nhau, đủ để trích xuất pattern. Nếu <5, draft thông báo "Not enough data".

## Câu 8: Bayesian confidence formula là `(success + 1) / (total + 2)`. Tại sao có +1 và +2?

**Đáp án:** Add-1 smoothing (Laplace smoothing) — tránh confidence = 0 khi chưa có success hoặc confidence = 1 khi chưa có failure. Với 0 success / 0 total: (0+1)/(0+2) = 0.5 (mặc định). Với 10 success / 0 failure: (10+1)/(10+2) ≈ 0.92 (không phải 1.0). Phản ánh độ tin cậy thực tế hơn.

## Câu 9: `filterLintableFiles()` sanitize filename với regex `/^[a-zA-Z0-9_\-\.\/\\]+$/`. File tiếng Việt có dấu có bị loại không?

**Đáp án:** Có. Regex chỉ cho phép ASCII alphanumeric, underscore, dash, dot, slash. File như `src/Controller/BảoHiểm.php` có chữ "ả", "ể" → bị loại. Đây là bug tiềm năng cho dự án tiếng Việt. Cần thêm Unicode support (dùng `/^\p{L}\p{N}_\-\.\/\\]+$/u` với flag 'u').

## Câu 10: `sessionStart()` detect orphan sessions bằng query `WHERE status = 'active'`. Nếu server restart, tất cả sessions đều thành orphan — đúng không? Hậu quả?

**Đáp án:** Đúng. Mỗi lần start session mới, tất cả active sessions của repo đó đều bị set thành 'orphaned'. Hậu quả: mất tracking duration của session cũ (ended_at bị set sai), progressLog ghi orphan warning. Tuy nhiên, vì mỗi agent session chỉ có 1 session active tại 1 thời điểm, nên behavior này đúng — nếu có orphan, IDE thực sự đã crash.

## Câu 11: Template engine dùng regex `\{\{#if_(\w+)\}\}([\s\S]*?)\{\{/if_\1\}\}`. Tại sao dùng `[\s\S]` thay vì `.`?

**Đáp án:** `.` trong regex không match newline (trừ khi có flag `s`). `[\s\S]` match mọi ký tự bao gồm newline — cần thiết vì block content có thể nhiều dòng. Nếu dùng `.`, regex sẽ không match các block spanning multiple lines.

## Câu 12: `instinct_evolve()` cần 5+ instincts. Tại sao không phải 3 hay 10?

**Đáp án:** 3 quá ít để tạo thành pattern đáng tin cậy. 10 là threshold cao — user có thể không đạt được. 5 là con số cân bằng: đủ để thấy pattern, không quá khó để đạt được. Đây là heuristic, có thể config trong tương lai.

## Câu 13: `codeSearchGrep` và `codeSearchSymbols` đều dùng `scopeGet()` để lọc forbidden paths. Scope config ở đâu?

**Đáp án:** File `.harness/scope.yaml` trong repo. Config gồm `forbidden_paths` (global) và `allowed_per_task` (per-task). `scopeGet()` parse file này và trả về patterns. Nếu không có file, mặc định permissive (cho phép tất cả).

## Câu 14: Subagent worker spawn detached process (`child.unref()`). Làm sao để biết worker đã hoàn thành?

**Đáp án:** Worker viết kết quả vào file `<baseName>_result.json` khi hoàn thành. Agent có thể đọc file này để kiểm tra. Ngoài ra, worker được track trong SQLite (workers table) với status 'running'/'finished'/'failed'. Có thể dùng `workers --list` CLI để kiểm tra. Worker cũng có timeout (registerWorker với timeout_at).

## Câu 15: `harness init` đã xóa dòng `{ path: "init.sh", template: "init.sh.tpl" }` khỏi danh sách generate. Có phải bug không? Ảnh hưởng gì?

**Đáp án:** Có thể là bug. `init.sh.tpl` vẫn tồn tại với đầy đủ `{{#if_php}}` và `{{#if_rust}}` blocks, nhưng không còn được render khi init. Hậu quả: `harness init` không tạo file init.sh nữa. User mới init repo sẽ không có script init tự động. Cần kiểm tra lại commit history để xác nhận đây là chủ ý hay vô tình xóa.
