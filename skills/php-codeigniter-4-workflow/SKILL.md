---
name: php-codeigniter-4-workflow
description: "CodeIgniter 4 conventions — PSR-4 namespaces, Spark CLI, routing, migrations, entities, and Shield auth. Loaded alongside tdd-workflow or spec-driven-workflow."
metadata:
  version: "1.1"
  updated: "2026-06-18"
  applies_to: ["php"]
  triggers: []
  tier: 2
  keywords: ["codeigniter", "ci4", "spark", "psr-4", "php", "shield", "entities", "migrations", "codeigniter-4"]
---

# CodeIgniter 4 Workflow

## PSR-4 Namespace Structure

```
app/
├── Controllers/          # App\Controllers\
├── Models/               # App\Models\
├── Views/                # View files
├── Database/
│   ├── Migrations/       # DB migrations
│   └── Seeds/            # Seed data
├── Entities/             # App\Entities\
├── Filters/              # App\Filters\
├── Config/               # App\Config\
├── Helpers/              # Custom helpers
└── Language/             # i18n files
```

CI4 uses full PSR-4 namespacing (no prefix-less loading like CI3):

```php
<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

class Users extends BaseController
{
    public function index(): string
    {
        $model = new UserModel();
        $data['users'] = $model->findAll();
        return view('users/index', $data);
    }
}
```

## Spark CLI

```bash
php spark                       # List all commands
php spark serve                 # Built-in dev server (localhost:8080)
php spark migrate               # Run all pending migrations
php spark migrate:rollback      # Rollback last batch
php spark make:controller Users  # Generate controller
php spark make:model User        # Generate model
php spark make:migration CreateUsers  # Generate migration
php spark make:entity User       # Generate entity class
php spark db:seed UserSeeder     # Run seeder
php spark routes                 # Show registered routes
php spark cache:clear            # Clear caches
```

## Routing

```php
// app/Config/Routes.php
use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');
$routes->get('/users', 'Users::index');
$routes->get('/users/(:num)', 'Users::show/$1');
$routes->post('/users', 'Users::create');
$routes->put('/users/(:num)', 'Users::update/$1');
$routes->delete('/users/(:num)', 'Users::delete/$1');
$routes->presenter('products');  // Auto-routes for resource

// Grouped routes
$routes->group('api', static function ($routes) {
    $routes->resource('users');
    $routes->resource('posts');
});

// CLI-only routes
$routes->cli('cron/daily', 'Cron::daily');
```

## Migrations

Migration files in `app/Database/Migrations/`:

```php
<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUsers extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'email'       => ['type' => 'VARCHAR', 'constraint' => 255],
            'password'    => ['type' => 'VARCHAR', 'constraint' => 255],
            'created_at'  => ['type' => 'DATETIME'],
            'updated_at'  => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->createTable('users');
    }

    public function down(): void
    {
        $this->forge->dropTable('users');
    }
}
```

## Entities & Model Factories

### Entity

```php
<?php

declare(strict_types=1);

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class User extends Entity
{
    protected $casts = [
        'id'    => 'integer',
        'email' => 'string',
    ];

    public function setPassword(string $password): void
    {
        $this->attributes['password'] = password_hash($password, PASSWORD_BCRYPT);
    }
}
```

### Model with Entity

```php
<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;
use App\Entities\User;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = User::class;
    protected $useSoftDeletes   = true;
    protected $allowedFields    = ['email', 'password'];
    protected $validationRules  = [
        'email' => 'required|valid_email|is_unique[users.email]',
    ];
}
```

### Factory for Tests

```php
<?php

declare(strict_types=1);

namespace App\Database\Factories;

use Faker\Generator;
use App\Entities\User;

class UserFactory extends \CodeIgniter\Database\Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'email'    => fake()->unique()->safeEmail(),
            'password' => password_hash('secret', PASSWORD_BCRYPT),
        ];
    }
}
```

## Filters (Middleware)

```php
<?php

declare(strict_types=1);

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/login');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
        // No-op
    }
}
```

Register in `app/Config/Filters.php`:

```php
public $aliases = [
    'auth' => \App\Filters\AuthFilter::class,
];

public $globals = [
    'before' => [
        'auth' => ['except' => ['login*', 'register*']],
    ],
];
```

## Shield Auth Integration

CI4 Shield provides ready-made auth:

```bash
composer require codeigniter4/shield
php spark shield:setup
```

Includes:
- Registration / Login / Logout
- Password reset with tokens
- Roles & permissions (`$user->can('users.edit')`)
- Session-based + token-based auth
- Built-in `UserModel`, `User` entity, `Auth` controller

Customize with config:

```php
// app/Config/Auth.php
public $views = [
    'login' => 'App\Views\auth\login',
];

public $allowRegistration = true;

public $validFields = ['email'];
```

## Integration with Harness

```
verify_run(".")     → composer install → vendor/bin/phpunit
skill_load("php-codeigniter-4-workflow")
```
