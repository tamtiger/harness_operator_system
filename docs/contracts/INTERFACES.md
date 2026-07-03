# Core Domain Interfaces

Tài liệu này định nghĩa các interface (giao diện) cốt lõi của hệ thống. Nó đóng vai trò như bản thiết kế (contract) cho việc trao đổi dữ liệu giữa các Engine và Plugin, đảm bảo tính toàn vẹn của "Clean Architecture" như đã đề cập trong `ADR-001`.

Khi bắt đầu implement codebase, các định nghĩa này sẽ được ánh xạ thành code TypeScript (nằm trong thư mục kiểu như `src/core/contracts/`).

## 1. Task & Context Models

```typescript
/** Đại diện cho một yêu cầu / nhiệm vụ từ user */
interface Task {
  id: string;
  description: string;
  createdAt: Date;
  status: TaskStatus;
}

/** Đại diện cho bối cảnh được Context Engine thu thập đưa cho LLM */
interface ContextPack {
  taskId: string;
  relevantFiles: string[];
  outlines: ClassOutline[];
  snippets: CodeSnippet[];
}
```

## 2. Planning Models

```typescript
/** Kế hoạch thực thi do Planning Engine sinh ra */
interface ExecutionPlan {
  taskId: string;
  steps: ExecutionStep[];
  status: 'pending' | 'approved' | 'rejected';
}

interface ExecutionStep {
  id: string;
  action: 'analyze' | 'generate_file' | 'run_test' | 'run_command';
  target: string; // File path hoặc tên module mục tiêu
  parameters: Record<string, any>;
}
```

## 3. Plugin Extension Interfaces

Được nhắc tới trong `PLUGIN_API.md`, đây là các giao diện bắt buộc các ngôn ngữ / công cụ ngoài khi viết plugin phải implement.

```typescript
interface IPlugin {
  name: string;
  version: string;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

/** Tương tác với Source Code Parser (ví dụ Tree-sitter) */
interface IAnalyzer extends IPlugin {
  parseFile(filePath: string): Promise<ASTResult>;
}

/** Tương tác với các toolchain (ví dụ NUnit, Jest, Go Test) */
interface ITestRunner extends IPlugin {
  runTests(targetFolder: string): Promise<TestResult>;
}
```