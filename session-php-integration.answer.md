# Đáp Án: Tích hợp PHP/XAMPP Stack vào Harness-OS

> File này đi kèm với `session-php-integration.md`, chứa đáp án chi tiết cho phần CHECKLIST TỰ KIỂM TRA.

---

## Câu 1: Tại sao PHP detection được đặt sau `.sln` nhưng trước `package.json`? Điều gì xảy ra nếu đảo ngược?

**Đáp án:** Vì dự án PHP thường có cả `package.json` cho frontend assets (Bootstrap, jQuery, Webpack). Nếu `package.json` detect trước → runtime bị detect là "node" thay vì "php". Dotnet (`.sln`) đặt trước PHP vì không có trường hợp nhầm lẫn — `.sln` là format riêng của .NET, không dự án PHP nào có.

Nếu đảo ngược (PHP > .NET), dự án .NET có `composer.json` (dùng cho PHP tools) sẽ bị detect sai thành PHP.

## Câu 2: `composer install --no-dev` vs `composer install` — khác nhau thế nào? Khi nào dùng cái nào?

**Đáp án:** `--no-dev` bỏ qua dev dependencies (require-dev trong composer.json) — chỉ install những package cần cho production. Dùng `--no-dev` khi có `composer.lock` (đã định hình môi trường production). Dùng plain `composer install` khi chưa có lockfile (dev environment lần đầu).

## Câu 3: Trong template `verify.yaml.tpl`, `{{#if_php}}` hoạt động như thế nào? Cơ chế render là gì?

**Đáp án:** `renderTemplate()` trong `src/cli/harness.ts` dùng regex `\{\{#if_(\w+)\}\}([\s\S]*?)\{\{/if_\1\}\}` để match block. Nếu stack hiện tại === tên block, giữ lại nội dung bên trong. Nếu không, xoá toàn bộ block. `{{#if_php}}...{{/if_php}}` chỉ render khi `stack === "php"`.

## Câu 4: Tại sao cần export `filterLintableFiles` và `buildChangedOnlyLintCmd` trong `verify.ts`? Trước đây chúng là internal.

**Đáp án:** Để viết unit test. Trước đây 2 function này là private, không thể test trực tiếp. Export chúng cho phép test PHP-specific behavior (lọc .php/.phtml, build lệnh phpcs với changed files) mà không cần chạy toàn bộ verify pipeline.

## Câu 5: `build: "composer dump-autoload --optimize"` — tại sao lại coi đây là "build" step? Có dự án PHP nào thực sự cần compile không?

**Đáp án:** PHP là interpreted language, không cần compile bytecode. `composer dump-autoload --optimize` là bước "build" tương đương — nó generate classmap tối ưu thay vì scan filesystem mỗi request. Một số dự án PHP có compile step thật: (1) Laravel + Vite cho frontend assets, (2) extension C cho PHP (pecl), (3) ReactPHP/Swoole extension. Những trường hợp này cần custom verify.yaml.

## Câu 6: Nếu một dự án có cả `composer.json` và `package.json` (PHP + Node frontend), làm sao để harness biết chạy cả `composer install` và `npm install`? Hiện tại có hỗ trợ không?

**Đáp án:** Hiện tại không. Harness chỉ chọn 1 runtime. Nếu detect là PHP → chỉ chạy `composer install`, không chạy `npm install`. Giải pháp: override verify.yaml thủ công, thêm step `npm install` vào commands list (nếu verify hỗ trợ custom steps). Đây là limitation hiện tại của thiết kế single-runtime.

## Câu 7: Bug `{{#if_rust}}` thiếu trong template — tại sao không ai phát hiện sớm hơn? Có test nào kiểm tra việc render template không?

**Đáp án:** Không có unit test nào kiểm tra `renderTemplate()`. Cách phát hiện duy nhất là chạy `harness init --stack rust` và kiểm tra output thủ công. Smoke test cũng không test init template. Bug này là systemic — thiếu test coverage cho template rendering.

## Câu 8: Dòng `{ path: "init.sh", template: "init.sh.tpl" }` bị xóa — tại sao? Có phải là bug không?

**Đáp án:** Cần kiểm tra thêm. Có thể là chủ ý (init.sh được generate theo cách khác, hoặc đã deprecated) hoặc bug (vô tình xóa). Hậu quả: init.sh không còn được tạo khi chạy `harness init`. Nếu là bug, cần thêm lại dòng này.

## Câu 9: 3 PHP skills được tạo (baseline, ci3, ci4). Làm sao để AI agent biết nên dùng skill nào khi gặp dự án PHP?

**Đáp án:** Skill matcher dùng keywords và tier. `php-baseline` tier 1 (keywords: php, composer) — suggest cho mọi dự án PHP. `ci3` và `ci4` tier 2 — chỉ suggest khi task keywords match "codeigniter", "ci3", "ci4". AI agent cũng có thể dùng `skill_list --stack php` để xem tất cả PHP skills, hoặc `skill_suggest` với task title để được gợi ý.

## Câu 10: Nếu thêm stack mới (ví dụ: Java/Maven), cần sửa những file nào? Liệt kê tối thiểu 5 file.

**Đáp án:** Tối thiểu 6 file:
1. `src/lib/runtime.ts` — Thêm `"maven"` vào PackageManager, detection (pom.xml), getPmCommands
2. `src/tools/verify.ts` — Thêm extension `.java` vào LINTABLE_EXTENSIONS
3. `src/cli/harness.ts` — Thêm `"java"` vào stacks list + help text
4. `templates/verify.yaml.tpl` — Thêm `{{#if_java}}` block
5. `templates/init.sh.tpl` — Thêm `{{#if_java}}` block
6. `templates/AGENTS.md.tpl` — Thêm `{{#if_java}}` block
7. (Optional) Skills: `skills/java-baseline/SKILL.md`
8. (Best practice) Tests: `src/lib/runtime.test.ts` + `src/tools/verify.test.ts`
