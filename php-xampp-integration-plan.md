# Kế hoạch tích hợp PHP / XAMPP vào Harness-OS

> Dựa trên phân tích mẫu tại `D:\xampp\htdocs\his` (CodeIgniter 3 + SQL Server + XAMPP)

---

## 1. Hiện trạng

| Thành phần | Trạng thái |
|-----------|-----------|
| `detectRuntime()` — `src/lib/runtime.ts` | ❌ Không phát hiện `composer.json`, `.php` |
| `verify.ts` — commands | ❌ Không có PHP install/build/test/lint |
| `LINTABLE_EXTENSIONS` | ❌ Thiếu `.php` |
| `verify.yaml.tpl` | ❌ Không có `{{#if_php}}` |
| `init.sh.tpl` | ❌ Không có `{{#if_php}}` |
| `AGENTS.md.tpl` | ❌ Không có `{{#if_php}}` |
| `renderTemplate()` stacks list | ❌ Thiếu `"php"` |
| CLI help text | ❌ Thiếu `php` |
| Skills | ❌ Không có PHP skills |
| `code_search.ts` | ✅ `.php` đã có trong SEARCHABLE_EXTENSIONS |
| Symbol regex | ✅ Hoạt động với `.php` (class/function) |

---

## 2. Kế hoạch thực hiện

### Phase 1: Core Detection & Verify (cốt lõi)

#### 1.1 `src/lib/runtime.ts` — Phát hiện stack PHP

**Thêm type:**
```typescript
export type PackageManager = "npm" | "pnpm" | "composer";
```

**Thêm detect `composer.json` vào `detectRuntime()` — đặt sau `.sln/.csproj`, trước `package.json`:**
```
composer.json tồn tại → runtime: "php", packageManager: "composer"
```

**Commands cho PHP:**
```typescript
{
  runtime: "php",
  packageManager: "composer",
  commands: {
    install: "composer install",
    build: null,              // PHP là interpreted language
    test: "vendor/bin/phpunit",  // fallback, verify.ts kiểm tra tồn tại
    lint: "phpcs",            // hoặc "phpstan analyse" tùy dự án
  }
}
```

**Cân nhắc thứ tự ưu tiên:**
- Đề xuất: `.sln/.csproj` → `composer.json` → `package.json` → `pyproject.toml/requirements.txt` → `go.mod` → `Cargo.toml`
- Lý do: Một số dự án PHP có cả `package.json` (dùng cho frontend assets). Nếu composer.json có trước, ưu tiên PHP. Nếu muốn override, dùng `--stack php` khi init.

#### 1.2 `src/tools/verify.ts` — PHP trong verify pipeline

**Thêm extensions:**
```typescript
const LINTABLE_EXTENSIONS: Record<string, string[]> = {
  // ... existing ...
  php: [".php", ".phtml"],
};
```

**Thêm `buildChangedOnlyLintCmd()` handling cho PHP:**
```typescript
if (runtimeName === "php") {
  return `phpcs ${fileList}`;
}
```

**Cập nhật logic changed-only: không cần thay đổi — PHP đã có trong LINTABLE_EXTENSIONS nên filter sẽ chạy.**

### Phase 2: Templates

#### 2.1 `templates/verify.yaml.tpl` — Thêm block PHP

```yaml
{{#if_php}}
runtime: php
commands:
  install: "composer install"
  build: null
  test: "vendor/bin/phpunit"
  lint: "phpcs"
  typecheck: null
  # security_audit: "composer audit"
  # simplify: null
timeouts:
  build: 60
  test: 300
{{/if_php}}
```

#### 2.2 `templates/init.sh.tpl` — Thêm block PHP

```bash
{{#if_php}}
if command -v php &> /dev/null; then
  echo "✓ PHP $(php -v | head -1)"
else
  echo "✗ PHP not found"
  echo "  Install XAMPP: https://www.apachefriends.org/"
  exit 1
fi

if command -v composer &> /dev/null; then
  composer install
  echo "✓ PHP dependencies installed (composer)"
else
  echo "✗ Composer not found"
  echo "  Install Composer: https://getcomposer.org/"
  exit 1
fi

# Check for XAMPP-specific services
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]]; then
  # Windows - check if XAMPP services are running via tasklist
  if tasklist //FI "IMAGENAME eq httpd.exe" 2>/dev/null | findstr /i "httpd" > /dev/null 2>&1; then
    echo "✓ XAMPP Apache is running"
  else
    echo "⚠ XAMPP Apache may not be running"
    echo "  Start it from XAMPP Control Panel"
  fi
fi
{{/if_php}}
```

#### 2.3 `templates/AGENTS.md.tpl` — Thêm block PHP

```markdown
{{#if_php}}
```bash
composer install        # Install dependencies
vendor/bin/phpunit      # Run tests
phpcs                   # Lint check
```
{{/if_php}}
```

#### 2.4 `src/cli/harness.ts` — Cập nhật `renderTemplate()`

```typescript
const stacks = ["node", "dotnet", "python", "go", "rust", "php"];
```

#### 2.5 `src/cli/harness.ts` — Cập nhật CLI help text

```
harness init [path] [--stack auto|node|dotnet|python|go|php] [--force]
```

### Phase 3: PHP Skills

#### 3.1 `skills/php-baseline/SKILL.md`

Skill hướng dẫn cơ bản cho dự án PHP:
- Cấu trúc project PHP (MVC, CodeIgniter, Laravel, Symfony)
- Composer dependency management
- XAMPP stack (Apache + PHP + MySQL/MariaDB)
- Coding standards (PSR-1, PSR-4, PSR-12)

#### 3.2 `skills/php-codeigniter-workflow/SKILL.md`

Skill chuyên biệt cho CodeIgniter 3/4 (dựa trên mẫu HIS):
- CI3 HMVC structure (controllers/M01..M36 pattern)
- CI3 database configuration (SQL Server qua sqlsrv)
- Migration system (scripts/migrate.php pattern)
- Route conventions (~1000 routes)
- BHYT/BHXH integration patterns
- DevExtreme frontend + jQuery + Bootstrap workflow

### Phase 4: XAMPP Integration — (Optional, Enhancement)

#### 4.1 Verify step: Kiểm tra XAMPP services

Trong verify pipeline, thêm step chạy kiểm tra XAMPP:

```typescript
"xampp_check": "php -m | grep -i sqlsrv"  // Kiểm tra extension
"xampp_db_check": "php -r \"new PDO('sqlsrv:Server=.;Database=his_dev', '', '');\""
```

#### 4.2 Harness `doctor` — Kiểm tra XAMPP

Mở rộng `cmdDoctor()` để kiểm tra:
- PHP CLI có sẵn? (php -v)
- Composer? 
- Extension SQL Server Driver (sqlsrv)?
- Apache đang chạy? (httpd.exe process)
- MySQL/MariaDB đang chạy? (mysqld.exe process)
- Port 80, 3306, 443 có mở?

```typescript
// Logic mẫu cho doctor check XAMPP
function checkXampp(): string[] {
  const issues: string[] = [];
  try {
    execSync("php -v", { stdio: "pipe" });
  } catch {
    issues.push("PHP CLI not found in PATH");
  }
  // ... check composer, sqlsrv extension, apache, mysql ...
  return issues;
}
```

#### 4.3 Init template: Tạo `.harness/xampp.yaml`

File cấu hình XAMPP cho dự án:
```yaml
# .harness/xampp.yaml
xampp:
  php_version: "8.2"
  apache_port: 80
  mysql_port: 3306
  db_driver: sqlsrv
  db_host: "."
  db_database: his_dev
  db_auth: windows  # windows | userpass
  
services:
  apache: required
  mysql: optional
```

---

## 3. File thay đổi chi tiết

| File | Loại | Mô tả |
|------|------|-------|
| `src/lib/runtime.ts` | Sửa | Thêm `PackageManager = "composer"`, thêm `detect composer.json`, thêm PHP commands |
| `src/tools/verify.ts` | Sửa | Thêm `.php` vào `LINTABLE_EXTENSIONS`, thêm PHP case trong `buildChangedOnlyLintCmd` |
| `src/tools/code_search.ts` | ✅ OK | `.php` đã có |
| `templates/verify.yaml.tpl` | Sửa | Thêm `{{#if_php}}` block |
| `templates/init.sh.tpl` | Sửa | Thêm `{{#if_php}}` block |
| `templates/AGENTS.md.tpl` | Sửa | Thêm `{{#if_php}}` block |
| `src/cli/harness.ts` | Sửa | Thêm `"php"` vào `stacks[]`, sửa help text |
| `skills/php-baseline/SKILL.md` | Tạo mới | Skill PHP cơ bản |
| `skills/php-codeigniter-workflow/SKILL.md` | Tạo mới | Skill CI3/CI4 workflow |
| `docs/php-xampp-integration-plan.md` | Tạo mới | File này |
| `scripts/smoke-test.ts` | Sửa | Cập nhật tool count (nếu thêm tools) |

---

## 4. Lưu ý đặc thù cho dự án HIS (D:\xampp\htdocs\his)

### 4.1 PHP version
- `composer.json` yêu cầu `>=5.4`, thực tế dùng PHP 7.3 (theo README)
- XAMPP hiện tại thường dùng PHP 8.x

### 4.2 Database
- SQL Server (sqlsrv driver), không phải MySQL mặc định của XAMPP
- Cần PHP extension `sqlsrv` từ Microsoft (không có sẵn trong XAMPP mặc định)
- **Giải pháp:** Thêm step kiểm tra sqlsrv extension khi verify

### 4.3 Testing
- PHPUnit 4.x/5.x (cũ), chỉ có 1 test file (`tests/test_bhyt_2026_validate.php`)
- **Giải pháp:** verify mặc định `vendor/bin/phpunit`, fallback về null nếu không có phpunit.xml

### 4.4 Build
- PHP là interpreted → `build: null`
- Nếu dùng các công cụ như: `npm run build` cho frontend assets → có thể thêm step riêng

### 4.5 Lint
- Dự án HIS không có PHPCS/PHPStan config hiện tại
- **Giải pháp:** Mặc định `null`, cho phép cấu hình qua `.harness/verify.yaml`

### 4.6 XAMPP Control Panel
- Trên Windows, XAMPP Control Panel là GUI tool
- Các dịch vụ: Apache (httpd.exe), MySQL (mysqld.exe), FileZilla, Mercury, Tomcat
- Dùng `tasklist` để kiểm tra service đang chạy
- Dùng `net start/stop` để quản lý

---

## 5. Hậu kiểm

Sau khi implement, chạy:

```bash
# Build TypeScript
pnpm run build

# Unit tests — kiểm tra detectRuntime với composer.json
pnpm test

# Smoke test — kiểm tra tool count
pnpm run smoke

# Init thử dự án PHP mẫu
mkdir -p /tmp/test-php && cd /tmp/test-php
echo '{"name":"test/php-app","require":{"php":">=7.4"}}' > composer.json
harness init . --stack php
cat .harness/verify.yaml  # Phải có PHP commands
cat init.sh               # Phải có PHP block

# Verify thử
harness verify --repo .
```
