# Kế hoạch tích hợp PHP / XAMPP vào Harness-OS

> Generic plan — hỗ trợ mọi PHP project (Composer-based)  
> Updated: 2026-06-03 v2 — bỏ HIS-specific, fix {{#if_rust}} bug, cắt scope

---

## 1. Hiện trạng

| Thành phần | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| `detectRuntime()` — `src/lib/runtime.ts:61` | ❌ | Không phát hiện `composer.json`, `.php` |
| `getPmCommands()` — `src/lib/runtime.ts:34` | ❌ | Chỉ switch `pnpm`/`npm`, không có `composer` |
| `PackageManager` type — `src/lib/runtime.ts:4` | ❌ | Union thiếu `"composer"` |
| `verify.ts` — `LINTABLE_EXTENSIONS` — `:65` | ❌ | Thiếu `.php`, `.phtml` |
| `verify.ts` — `buildChangedOnlyLintCmd` — `:172` | ❌ | Fall-through generic không đúng cho PHPCS/PHPStan/Pint |
| `verify.yaml.tpl` | ❌ | Không có `{{#if_php}}` **và** thiếu `{{#if_rust}}` (bug pre-existing) |
| `init.sh.tpl` | ❌ | Không có `{{#if_php}}` **và** thiếu `{{#if_rust}}` (bug pre-existing) |
| `AGENTS.md.tpl` | ❌ | Không có `{{#if_php}}` (đã có `{{#if_rust}}`) |
| `renderTemplate()` stacks list — `harness.ts:194` | ❌ | Thiếu `"php"` |
| CLI help text — `harness.ts:1052` | ❌ | Thiếu cả `php` **và** `rust` (bug pre-existing) |
| `cmdInit()` PM selection — `harness.ts:70-77` | ❌ | Khi `--stack php` vẫn default `npm` |
| Skills | ❌ | Không có PHP skills |
| `code_search.ts` | ✅ | `.php` đã có trong `SEARCHABLE_EXTENSIONS` |
| Symbol regex | ✅ | Hoạt động với `.php` (class/function) |

---

## 2. Kế hoạch thực hiện

### Phase 1: Core Detection & Verify

#### 1.1 `src/lib/runtime.ts` — Mở rộng cho PHP

**Mở rộng `PackageManager` union (line 4):**
```typescript
export type PackageManager = "npm" | "pnpm" | "composer";
```

**Thêm case `composer` trong `getPmCommands()` (line 34-59):**
```typescript
case "composer":
  return {
    install: repoPath && existsSync(join(repoPath, "composer.lock"))
      ? "composer install --no-dev"
      : "composer install",
    build: "composer dump-autoload --optimize",
    test: "vendor/bin/phpunit",
    lint: "vendor/bin/phpcs",
  };
```

**Thêm PHP detection vào `detectRuntime()` (line 61 — sau `.sln/.csproj`, trước `package.json`):**
```typescript
// Check for PHP (composer.json)
if (existsSync(join(repoPath, "composer.json"))) {
  return {
    runtime: "php",
    packageManager: "composer",
    commands: getPmCommands("composer", repoPath),
  };
}
```

**Thứ tự ưu tiên detection:**
`.sln/.csproj` → `composer.json` → `package.json` → `pyproject.toml/requirements.txt` → `go.mod` → `Cargo.toml`

#### 1.2 `src/tools/verify.ts` — PHP trong verify pipeline

**Thêm extensions (line 65):**
```typescript
const LINTABLE_EXTENSIONS: Record<string, string[]> = {
  // ... existing ...
  php: [".php", ".phtml"],
};
```

**Thêm PHP case vào `buildChangedOnlyLintCmd()` (line 172):**
```typescript
if (runtimeName === "php") {
  return `${originalCmd} ${fileList}`;
}
```

#### 1.3 Tests

**`src/lib/runtime.test.ts` — thêm:**
- `detectRuntime()` với `composer.json` → trả về `php` + `composer`
- `detectRuntime()` với `composer.json` + `package.json` → `php` thắng (ưu tiên composer)
- `detectRuntime()` với `.sln` + `composer.json` → `dotnet` thắng (ưu tiên sln)
- `getPmCommands("composer")` với `composer.lock` → `composer install --no-dev`
- `getPmCommands("composer")` không có lock → `composer install`

**`src/tools/verify.test.ts` — thêm:**
- `filterLintableFiles` với `.php`, `.phtml` → giữ lại
- `buildChangedOnlyLintCmd` cho `php` → command + files

---

### Phase 2: Templates & CLI (+ fix `{{#if_rust}}` bug)

#### 2.1 `templates/verify.yaml.tpl` — Thêm `{{#if_rust}}` + `{{#if_php}}`

```yaml
{{#if_rust}}
runtime: rust
commands:
  install: null
  build: "cargo build"
  test: "cargo test"
  lint: "cargo clippy"
  typecheck: null
timeouts:
  build: 180
  test: 300
{{/if_rust}}
{{#if_php}}
runtime: php
package_manager: composer
commands:
  install: "composer install"
  build: null
  test: "vendor/bin/phpunit"
  lint: "vendor/bin/phpcs"
  typecheck: null
timeouts:
  build: 60
  test: 300
  lint: 120
{{/if_php}}
```

#### 2.2 `templates/init.sh.tpl` — Thêm `{{#if_rust}}` + `{{#if_php}}`

```bash
{{#if_rust}}
if command -v cargo &> /dev/null; then
  cargo build
  echo "✓ Rust project built"
else
  echo "✗ cargo not found"
  echo "  Install: https://rustup.rs"
  exit 1
fi
{{/if_rust}}
{{#if_php}}
if command -v php &> /dev/null; then
  echo "✓ PHP $(php -v | head -1)"
else
  echo "✗ PHP not found"
  echo "  Install XAMPP: https://www.apachefriends.org/"
  echo "  Or PHP CLI:   https://windows.php.net/download/"
  exit 1
fi

if command -v composer &> /dev/null; then
  if [ -f composer.lock ]; then
    composer install --no-dev
  else
    composer install
  fi
  echo "✓ PHP dependencies installed (composer)"
else
  echo "✗ Composer not found"
  echo "  Install: https://getcomposer.org/download/"
  exit 1
fi
{{/if_php}}
```

#### 2.3 `templates/AGENTS.md.tpl` — Thêm `{{#if_php}}`

```markdown
{{#if_php}}
```bash
composer install         # Install dependencies
composer dump-autoload   # Regenerate autoloader
vendor/bin/phpunit       # Run tests
vendor/bin/phpcs         # Lint (PSR-12)
```
{{/if_php}}
```

#### 2.4 `src/cli/harness.ts` — 3 fixes

1. Thêm `"php"` vào stacks array (line 194):
```typescript
const stacks = ["node", "dotnet", "python", "go", "rust", "php"];
```

2. Fix CLI help text (line 1052 — thêm `rust` + `php`):
```
harness init [path] [--stack auto|node|dotnet|python|go|rust|php] [--force]
```

3. Set `packageManager = "composer"` khi `stack === "php"` (line 70-77):
```typescript
} else if (stack === "php") {
  packageManager = "composer";
}
```

---

### Phase 3: PHP Skills (generic)

#### 3.1 `skills/php-baseline/SKILL.md`

Skill nền tảng PHP — áp dụng cho mọi dự án PHP:
- Composer dependency management (PSR-4 autoload, `composer.json`, `composer.lock`)
- PSR-1, PSR-4, PSR-12 coding standards
- `declare(strict_types=1)` convention
- Error handling: exceptions, custom error handlers
- Testing: PHPUnit vs Pest, assertions, fixtures
- Static analysis: PHPStan levels, Psalm
- XAMPP stack overview (Apache + PHP + MySQL/MariaDB)

#### 3.2 `skills/php-codeigniter-3-workflow/SKILL.md`

Generic CI3 conventions (không project-specific):
- HMVC structure (`application/controllers/`, `models/`, `views/`)
- `MX_Controller` base class
- Route conventions (`application/config/routes.php`)
- Database configuration (`application/config/database.php`)
- Migration system (`application/migrations/`)
- Libraries & Helpers loading pattern
- Form validation, session management
- CI3 + XAMPP setup: base_url, .htaccess

#### 3.3 `skills/php-codeigniter-4-workflow/SKILL.md`

Generic CI4 conventions:
- PSR-4 namespaces (`App\Controllers`, `App\Models`)
- Spark CLI (`php spark` commands)
- Routing (`app/Config/Routes.php`)
- Migrations (`php spark migrate`)
- Entities + Model factories
- Filters (middleware-style)
- Shield auth integration

---

### Phase 4: Documentation Sync

| File | Update |
|------|--------|
| `docs/06-cli-reference.md` | Thêm `php` vào stacks |
| `docs/07-skills.md` | 3 skills mới |
| `CHANGELOG.md` | "Add PHP/XAMPP stack support + fix rust template blocks" |

---

## 3. File thay đổi tổng hợp

| File | Loại | Mô tả |
|------|------|-------|
| `src/lib/runtime.ts` | Sửa | `PackageManager` union + `composer` case + PHP detection |
| `src/lib/runtime.test.ts` | Sửa | 5 test cases mới |
| `src/tools/verify.ts` | Sửa | LINTABLE_EXTENSIONS + PHP lint cmd |
| `src/tools/verify.test.ts` | Sửa | 2 test cases mới |
| `templates/verify.yaml.tpl` | Sửa | Thêm `{{#if_rust}}` + `{{#if_php}}` blocks |
| `templates/init.sh.tpl` | Sửa | Thêm `{{#if_rust}}` + `{{#if_php}}` blocks |
| `templates/AGENTS.md.tpl` | Sửa | Thêm `{{#if_php}}` block |
| `src/cli/harness.ts` | Sửa | stacks[], help text, PM selection |
| `skills/php-baseline/SKILL.md` | Tạo mới | Generic PHP skill |
| `skills/php-codeigniter-3-workflow/SKILL.md` | Tạo mới | Generic CI3 skill |
| `skills/php-codeigniter-4-workflow/SKILL.md` | Tạo mới | Generic CI4 skill |
| `docs/06-cli-reference.md` | Sửa | stack list |
| `docs/07-skills.md` | Sửa | 3 skills mới |
| `CHANGELOG.md` | Sửa | Entry mới |

---

## 4. Hậu kiểm

### 4.1 Build & test

```bash
pnpm run build              # TypeScript compile
pnpm test                   # Unit tests — phải có test cases mới cho PHP
pnpm run smoke              # Smoke test MCP server
```

### 4.2 Init thử dự án PHP mẫu

```bash
mkdir -p /tmp/test-php && cd /tmp/test-php
echo '{"name":"test/php-app","require":{"php":">=7.4"}}' > composer.json

harness init .                          # auto-detect → php
harness init . --stack php --force      # explicit

cat .harness/verify.yaml      # Phải có PHP block
cat init.sh                   # Phải có PHP block
cat AGENTS.md                 # Phải có PHP section
```

---

## 5. Lịch trình đề xuất

| Bước | Thời gian | Phụ thuộc |
|------|-----------|-----------|
| Phase 1 (runtime.ts + verify.ts + tests) | 2-3 giờ | — |
| Phase 2 (templates + CLI + rust fix) | 1-1.5 giờ | Phase 1 |
| Phase 3 (3 skills) | 1.5-2 giờ | Phase 1 |
| Phase 4 (docs sync) | 30 phút | Phase 1-3 |
| **Tổng** | **5-7 giờ** | |

**Thứ tự**: Phase 1 → 2 → 3 → 4

---

## Deferred (không trong scope lần này)

- XAMPP service checks (doctor, `xampp.yaml`) — chỉ implement khi cần verify trên XAMPP thật
- CI/CD matrix cho PHP — chỉ cần khi muốn test PHP trong GitHub Actions
- HIS-specific rulebook — tạo riêng (`rulebooks/php/`) khi bắt đầu code trên HIS
