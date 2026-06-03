---
name: php-baseline
description: "PHP baseline conventions — Composer, PSR standards, strict_types, PHPUnit, PHPStan, and XAMPP stack overview."
metadata:
  version: "1.0"
  updated: "2026-06-03"
  applies_to: ["php"]
  triggers: ["session_start", "task_create"]
  tier: 1
  keywords: ["php", "composer", "psr", "phpunit", "phpstan", "xampp", "strict_types", "psr-4", "psr-12", "phpcs"]
---

# PHP Baseline

## Composer Dependency Management

- `composer.json` defines dependencies and PSR-4 autoloading
- `composer.lock` pins exact versions — commit it
- `composer install` — install from lock (slower, accurate)
- `composer install --no-dev` — production install (skip dev deps)
- `composer update` — update all deps and regenerate lock
- `composer dump-autoload --optimize` — regenerate optimized autoloader
- PSR-4 autoload entry:
  ```json
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
  ```

## Coding Standards

- **PSR-1:** Basic coding standard (PHP tags, side effects, class naming)
- **PSR-4:** Autoloading (namespace → directory mapping)
- **PSR-12:** Extended coding style (braces, spacing, imports)
- Always start files with `declare(strict_types=1);`
- One class per file (PSR-1)
- Namespace matches directory path

### PHP_CodeSniffer (phpcs)

```bash
vendor/bin/phpcs --standard=PSR12 src/
vendor/bin/phpcbf --standard=PSR12 src/   # Auto-fix
```

### PHP-CS-Fixer (Pint for Laravel)

```bash
vendor/bin/php-cs-fixer fix src/ --rules=@PSR12
```

## Error Handling

- Use typed exceptions for domain errors
- `set_error_handler()` for PHP global errors
- `set_exception_handler()` for uncaught exceptions
- Log errors with context (never `echo` in production)
- Use try/catch around I/O operations

```php
declare(strict_types=1);

namespace App\Service;

use App\Exception\DomainException;

class UserService
{
    public function findById(int $id): User
    {
        $user = User::find($id);
        if (!$user) {
            throw new DomainException("User not found: {$id}");
        }
        return $user;
    }
}
```

## Testing

### PHPUnit

```bash
vendor/bin/phpunit                              # Run all tests
vendor/bin/phpunit tests/Unit/UserTest.php      # Single file
vendor/bin/phpunit --coverage-html coverage/     # HTML coverage
vendor/bin/phpunit --filter testCreateUser       # Filter by name
```

### Pest (alternative)

```bash
vendor/bin/pest
```

- **Test naming:** `*Test.php` suffix, class matches file name
- **Assertions:** `assertTrue`, `assertEquals`, `assertInstanceOf` etc.
- **Fixtures:** `setUp()`/`tearDown()` for state, factories for entities
- **Mocks:** PHPUnit mocks or Mockery for external dependencies

### phpunit.xml structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="vendor/autoload.php"
         colors="true"
         verbose="true">
  <testsuites>
    <testsuite name="Unit">
      <directory>tests/Unit</directory>
    </testsuite>
  </testsuites>
  <coverage>
    <include>
      <directory>src</directory>
    </include>
  </coverage>
</phpunit>
```

## Static Analysis

### PHPStan

```bash
vendor/bin/phpstan analyse src/ --level=max
```

- Levels 0-9 (9 is strictest)
- Configure in `phpstan.neon` or `phpstan.dist.neon`

### Psalm

```bash
vendor/bin/psalm --show-info=true
```

## XAMPP Stack Overview

| Component | Description | Default Path |
|-----------|-------------|--------------|
| Apache | HTTP server | `C:\xampp\apache\` |
| PHP | PHP interpreter | `C:\xampp\php\` |
| MySQL/MariaDB | Database | `C:\xampp\mysql\` |
| phpMyAdmin | DB admin UI | `http://localhost/phpmyadmin` |

- XAMPP Control Panel starts/stops services
- `C:\xampp\htdocs\` is the default web root
- `http://localhost/` → Apache homepage
- XAMPP PHP includes MySQL/PostgreSQL/SQLite extensions

## Integration with Harness

```
verify_run(".")     → composer install → vendor/bin/phpunit → vendor/bin/phpcs
skill_load          → php-baseline, php-codeigniter-3-workflow, php-codeigniter-4-workflow
```

## Tool-Specific Config Files

```
phpstan.neon        # PHPStan level and paths
phpunit.xml         # PHPUnit bootstrap, suites, coverage
.php-cs-fixer.php   # Coding style rules
phpmd.xml           # PHPMD rules (optional)
```
