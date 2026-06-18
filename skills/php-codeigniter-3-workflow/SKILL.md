---
name: php-codeigniter-3-workflow
description: "CodeIgniter 3 conventions — HMVC, routing, database config, migrations, form validation, and XAMPP setup. Loaded alongside tdd-workflow or spec-driven-workflow."
metadata:
  version: "1.1"
  updated: "2026-06-18"
  applies_to: ["php"]
  triggers: []
  tier: 2
  keywords: ["codeigniter", "ci3", "hmvc", "mx_controller", "php", "xampp", "codeigniter-3"]
---

# CodeIgniter 3 Workflow

## HMVC Structure

CI3 + HMVC (wiredesignz HMVC module):

```
application/
├── controllers/          # Base controllers
├── models/               # Database models
├── views/                # View templates
├── libraries/            # Custom libraries
├── helpers/              # Custom helpers
├── config/               # App configuration
├── migrations/           # DB migrations
├── modules/              # HMVC modules
│   └── blog/
│       ├── controllers/
│       ├── models/
│       └── views/
└── third_party/
    └── MX/               # MX_Controller, MX_Loader
```

## MX_Controller Base Class

```php
defined('BASEPATH') OR exit('No direct script access allowed');

class Dashboard extends MX_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('dashboard_model');
    }

    public function index(): void
    {
        $data['title'] = 'Dashboard';
        $data['stats'] = $this->dashboard_model->getStats();
        $this->load->view('dashboard/index', $data);
    }
}
```

- Every controller extends `MX_Controller` (not `CI_Controller`)
- Module controllers go in `application/modules/<module>/controllers/`
- Module views are loaded relative to the module directory

## Route Conventions

```php
// application/config/routes.php
$route['default_controller'] = 'home';
$route['404_override'] = 'errors/not_found';
$route['translate_uri_dashes'] = TRUE;

// Module routing
$route['blog/(:any)'] = 'blog/index/$1';
$route['api/users'] = 'api/users/list';
```

## Database Configuration

```php
// application/config/database.php
$active_group = 'default';
$query_builder = TRUE;

$db['default'] = [
    'dsn'          => '',
    'hostname'     => 'localhost',
    'username'     => 'root',
    'password'     => '',
    'database'     => 'my_app',
    'dbdriver'     => 'mysqli',
    'dbprefix'     => '',
    'pconnect'     => FALSE,
    'db_debug'     => (ENVIRONMENT !== 'production'),
    'cache_on'     => FALSE,
    'cachedir'     => '',
    'char_set'     => 'utf8',
    'dbcollat'     => 'utf8_general_ci',
];
```

## Migration System

```php
// application/config/migration.php
$config['migration_version'] = 1;
$config['migration_enabled'] = TRUE;
$config['migration_type'] = 'sequential';
```

Migration files in `application/migrations/` named `001_create_users.php`:

```php
defined('BASEPATH') OR exit('No direct script access allowed');

class Migration_Create_users extends CI_Migration
{
    public function up(): void
    {
        $this->dbforge->add_field([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => TRUE, 'auto_increment' => TRUE],
            'email' => ['type' => 'VARCHAR', 'constraint' => 255],
            'password' => ['type' => 'VARCHAR', 'constraint' => 255],
            'created_at' => ['type' => 'DATETIME'],
        ]);
        $this->dbforge->add_key('id', TRUE);
        $this->dbforge->create_table('users');
    }

    public function down(): void
    {
        $this->dbforge->drop_table('users');
    }
}
```

## Libraries & Helpers Loading

```php
// Auto-load via config/autoload.php
$autoload['libraries'] = ['database', 'session', 'form_validation'];
$autoload['helpers'] = ['url', 'form', 'html'];

// Manual load in controller
$this->load->library('encryption');
$this->load->helper('date');
```

## Form Validation

```php
public function create(): void
{
    $this->load->library('form_validation');

    $this->form_validation->set_rules('email', 'Email', 'required|valid_email|is_unique[users.email]');
    $this->form_validation->set_rules('password', 'Password', 'required|min_length[8]');

    if ($this->form_validation->run() === FALSE) {
        $this->load->view('users/create');
    } else {
        $this->user_model->insert($this->input->post());
        redirect('users');
    }
}
```

## Session Management

```php
$this->session->set_userdata('user_id', $user->id);
$this->session->set_flashdata('success', 'User created!');
$this->session->userdata('user_id');
$this->session->unset_userdata('user_id');
$this->session->sess_destroy();
```

## CI3 + XAMPP Setup

1. Place project in `C:\xampp\htdocs\my-app\`
2. Set `base_url` in `config/config.php`:
   ```php
   $config['base_url'] = 'http://localhost/my-app/';
   ```
3. `.htaccess` for clean URLs:
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ index.php/$1 [L]
   ```
4. XAMPP Apache must have `mod_rewrite` enabled

## Integration with Harness

```
verify_run(".")     → composer install → vendor/bin/phpunit
skill_load("php-codeigniter-3-workflow")
```
