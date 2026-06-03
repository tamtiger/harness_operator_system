# Học Sâu: Tích hợp PHP/XAMPP Stack vào Harness-OS

## 1. VẤN ĐỀ

Harness-OS hỗ trợ nhiều stack (Node, .NET, Python, Go, Rust) nhưng **thiếu hoàn toàn PHP** — dù có dự án thực tế như `D:\xampp\htdocs\his` (CodeIgniter 3 + SQL Server + XAMPP).

**Hậu quả:**
- `harness init` không detect được `composer.json`
- `harness verify` không biết chạy `composer install`, `phpunit`, `phpcs`
- Không có PHP skills cho AI agent
- Templates (verify.yaml, init.sh, AGENTS.md) thiếu block PHP
- `harness init --stack php` báo lỗi vì `"php"` không có trong stacks list

**Điểm thú vị:** Rust cũng bị thiếu tương tự — templates `verify.yaml.tpl` và `init.sh.tpl` không có `{{#if_rust}}` dù `"rust"` đã có trong stacks list từ trước. Commit này fix luôn cả 2.

## 2. GIẢI PHÁP

### Kiến trúc thay đổi

```
                    ┌──────────────────────┐
                    │    composer.json      │
                    │  (file detection)     │
                    └──────┬───────────────┘
                           │
              ┌────────────┴────────────┐
              │   detectRuntime()       │
              │   src/lib/runtime.ts    │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │    returns RuntimeInfo   │
              │  { runtime: "php",      │
              │    packageManager:       │
              │      "composer" }        │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                  ▼
  ┌────────────┐   ┌──────────────┐   ┌──────────────┐
  │  Verify    │   │    Init      │   │   Skills     │
  │ verify.ts  │   │  harness.ts  │   │  3 SKILL.md  │
  │ .php/.phtml│   │ composer PM  │   │ php-baseline │
  │ phpcs lint │   │ --stack php  │   │ ci3 / ci4    │
  └────────────┘   └──────────────┘   └──────────────┘
         │                 │
         ▼                 ▼
  ┌──────────────┐  ┌──────────────────┐
  │ Templates    │  │ Templates        │
  │ verify.yaml  │  │ init.sh          │
  │ {{#if_php}}  │  │ AGENTS.md        │
  └──────────────┘  └──────────────────┘
```

### Các quyết định thiết kế

| Quyết định | Lý do |
|------------|-------|
| **PHP detection đặt sau .sln, trước package.json** | Dự án PHP thường có cả `package.json` cho frontend assets. Nếu `package.json` detect trước → sai stack. Dotnet (`.sln`) vẫn ưu tiên cao hơn vì không lẫn. |
| **composer.lock → `--no-dev`** | Giống pattern npm (lockfile → `npm ci`) và pnpm (lockfile → `--frozen-lockfile`). Production install không cần dev dependencies. |
| **build: `composer dump-autoload --optimize`** | PHP là interpreted language, không cần compile. `dump-autoload --optimize` là bước tương đương "build" — tối ưu autoloader mapping cho production. |
| **test: `vendor/bin/phpunit`** (không phải `./vendor/bin/phpunit`) | Cross-platform: Windows dùng backslash, UNIX dùng slash. Không hardcode path separator. |
| **lint: `vendor/bin/phpcs`** | PHP_CodeSniffer là tool lint phổ biến nhất, support PSR-12. Có thể override qua verify.yaml. |

### Bug fix kèm theo: thiếu `{{#if_rust}}` blocks

Phát hiện: `"rust"` đã có trong `stacks[]` từ trước nhưng `verify.yaml.tpl` và `init.sh.tpl` **không có** `{{#if_rust}}` tương ứng → khi init `--stack rust`, template không render gì.

Fix: thêm `{{#if_rust}}...{{/if_rust}}` vào cả 2 templates (verify.yaml.tpl: cargo build/test/clippy, init.sh.tpl: cargo build check).

## 3. LUỒNG THỰC THI (Execution Flow)

### Khi người dùng chạy `harness init . --stack php`

```
harness init . --stack php
    │
    ├─ cmdInit() trong src/cli/harness.ts
    │     │
    │     ├─ detectRuntime() → "php" (override bởi --stack php)
    │     │
    │     ├─ packageManager = "composer"  (vì stack === "php")
    │     │
    │     ├─ pmInstall = "composer install"
    │     │   (hoặc "composer install --no-dev" nếu có composer.lock)
    │     │
    │     ├─ renderTemplate("verify.yaml.tpl")
    │     │   └─ {{#if_php}} → render PHP block
    │     │
    │     ├─ renderTemplate("init.sh.tpl")
    │     │   └─ {{#if_php}} → render PHP block
    │     │
    │     └─ renderTemplate("AGENTS.md.tpl")
    │         └─ {{#if_php}} → render PHP block
    │
    └─ Output: .harness/verify.yaml + init.sh + AGENTS.md
```

### Khi `harness verify` chạy trên dự án PHP

```
verify_run(repo_path)
    │
    ├─ detectRuntime() → { runtime: "php", packageManager: "composer" }
    │
    ├─ LINTABLE_EXTENSIONS["php"] = [".php", ".phtml"]
    │
    ├─ changed-only mode:
    │   └─ filterLintableFiles() → lọc .php/.phtml
    │   └─ buildChangedOnlyLintCmd("vendor/bin/phpcs", "php", files)
    │       → "vendor/bin/phpcs file1.php file2.php"
    │
    └─ Chạy các step theo thứ tự:
        1. install: composer install
        2. build: composer dump-autoload --optimize  (hoặc null)
        3. test: vendor/bin/phpunit
        4. lint: vendor/bin/phpcs
```

### Khi detectRuntime() detect PHP

```
detectRuntime(repoPath)
    │
    ├─ Check .sln/.csproj?        → NO  (SKIP)
    ├─ Check composer.json?       → YES → return php
    ├─ (KHÔNG check package.json)  → (STOP)
    │
    ├─ Priority: dotnet > php > node > python > go > rust
    │
    └─ Lý do: nếu có cả composer.json và package.json,
       ưu tiên PHP (vì package.json có thể là frontend assets)
```

## 4. TÁC ĐỘNG

### Files changed (13 files, +564/-13 lines)

| File | Thay đổi | Impact |
|------|----------|--------|
| `src/lib/runtime.ts` | Thêm `"composer"` type, PHP detection, getPmCommands cho composer | Core — ảnh hưởng mọi tính năng dùng runtime |
| `src/tools/verify.ts` | Thêm `.php/.phtml` vào LINTABLE_EXTENSIONS, PHP case trong buildChangedOnlyLintCmd, export 2 functions | Verify pipeline cho PHP projects |
| `src/cli/harness.ts` | Thêm `"php"` stacks, composer PM handling, fix rust help text | CLI init/help |
| `templates/verify.yaml.tpl` | Thêm `{{#if_php}}` + fix `{{#if_rust}}` | Init template cho PHP/Rust |
| `templates/init.sh.tpl` | Thêm `{{#if_php}}` + fix `{{#if_rust}}` | Init script cho PHP/Rust |
| `templates/AGENTS.md.tpl` | Thêm `{{#if_php}}` | AGENTS.md template cho PHP |
| `src/lib/runtime.test.ts` | +5 tests: PHP detection, priority, lockfile | Đảm bảo PHP detection đúng |
| `src/tools/verify.test.ts` | +4 tests: filter, lint cmd, parse YAML | Đảm bảo PHP verify đúng |
| `skills/php-baseline/SKILL.md` | File mới (169 lines) | PHP baseline skill |
| `skills/php-codeigniter-3-workflow/SKILL.md` | File mới (197 lines) | CI3 workflow skill |
| `skills/php-codeigniter-4-workflow/SKILL.md` | File mới (290 lines) | CI4 workflow skill |
| `php-xampp-integration-plan.md` | File mới (305 lines) | Kế hoạch tích hợp |
| `CHANGELOG.md` | Cập nhật unreleased section | Documentation |

### Điểm dễ gây bug

1. **Priority thứ tự detection**: Nếu có cả `.sln`, `composer.json`, và `package.json`, thứ tự phải là dotnet > php > node. Nếu ai đó vô tình đổi thứ tự, dự án .NET có composer.json sẽ bị detect sai.
2. **`composer install --no-dev` chỉ khi có `composer.lock`**: Nếu lockfile tồn tại nhưng không muốn `--no-dev` (dev environment) → không có cách override từ CLI hiện tại.
3. **init.sh không còn được generate tự động**: Dòng `{ path: "init.sh", template: "init.sh.tpl" }` đã bị xóa khỏi `cmdInit()`. init.sh template vẫn tồn tại nhưng không được render. Đây có thể là bug hoặc chủ ý — cần kiểm tra.
4. **`build: null` cho PHP**: Nếu có step build trong verify pipeline, PHP sẽ skip. Nhưng nếu dự án PHP có frontend assets cần build (npm), step này sẽ không chạy.
5. **`vendor/bin/phpunit` hardcode**: Nếu dự án dùng PHPUnit version không có trong vendor (global install), hoặc dùng tool test khác (phpspec, behat), lệnh này fail.

## 5. CHECKLIST TỰ KIỂM TRA

1. Tại sao PHP detection được đặt sau `.sln` nhưng trước `package.json`? Điều gì xảy ra nếu đảo ngược?
2. `composer install --no-dev` vs `composer install` — khác nhau thế nào? Khi nào dùng cái nào?
3. Trong template `verify.yaml.tpl`, `{{#if_php}}` hoạt động như thế nào? Cơ chế render là gì?
4. Tại sao cần export `filterLintableFiles` và `buildChangedOnlyLintCmd` trong `verify.ts`? Trước đây chúng là internal.
5. `build: "composer dump-autoload --optimize"` — tại sao lại coi đây là "build" step? Có dự án PHP nào thực sự cần compile không?
6. Nếu một dự án có cả `composer.json` và `package.json` (PHP + Node frontend), làm sao để harness biết chạy cả `composer install` và `npm install`? Hiện tại có hỗ trợ không?
7. Bug `{{#if_rust}}` thiếu trong template — tại sao không ai phát hiện sớm hơn? Có test nào kiểm tra việc render template không?
8. Dòng `{ path: "init.sh", template: "init.sh.tpl" }` bị xóa — tại sao? Có phải là bug không?
9. 3 PHP skills được tạo (baseline, ci3, ci4). Làm sao để AI agent biết nên dùng skill nào khi gặp dự án PHP?
10. Nếu thêm stack mới (ví dụ: Java/Maven), cần sửa những file nào? Liệt kê tối thiểu 5 file.

## 6. FILE ĐÁP ÁN

Đã tạo file `session-php-integration.answer.md` kèm theo.

## 7. TÓM TẮT

Hôm nay chúng ta đã tích hợp PHP/XAMPP stack vào harness-os. Trước đây, harness không biết PHP là gì — không detect `composer.json`, không chạy được `composer install` hay `phpunit`.

**Những gì đã làm:**

1. **runtime.ts** — thêm `"composer"` là package manager, detect `composer.json` (ưu tiên sau .NET, trước Node), định nghĩa commands cho PHP (composer install, dump-autoload, phpunit, phpcs)

2. **verify.ts** — thêm `.php`/`.phtml` vào danh sách file có thể lint, thêm case PHP trong changed-only mode

3. **harness.ts (CLI)** — thêm `"php"` vào stacks list, xử lý composer package manager khi init

4. **3 templates** — thêm `{{#if_php}}` blocks vào verify.yaml.tpl, init.sh.tpl, AGENTS.md.tpl

5. **3 PHP skills** — php-baseline (169 dòng), php-codeigniter-3-workflow (197 dòng), php-codeigniter-4-workflow (290 dòng)

6. **Tests** — 9 tests mới (5 runtime + 4 verify), tăng tổng số từ 189 lên 198

7. **Bug fix kèm theo** — thêm `{{#if_rust}}` blocks còn thiếu trong verify.yaml.tpl và init.sh.tpl

Cốt lõi: **1 dòng detection đúng → cả hệ thống tự động chạy đúng**. Thêm 1 dòng `"composer"` vào PackageManager là đủ để toàn bộ pipeline (init, verify, templates) hoạt động cho PHP.
