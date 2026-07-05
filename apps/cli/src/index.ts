#!/usr/bin/env node
import { Command } from 'commander';
import { Task } from '@harness/contracts';
import { 
  ApplicationHost, 
  StructuredLogger, 
  LayeredConfiguration, 
  LocalEventBus, 
  WorkspaceManager, 
  CapabilityRegistry,
  SQLiteKnowledgeStore,
  KnowledgeEngine,
  CodeIndexer,
  PlanningEngine,
  RuntimeEngine,
  VerificationEngine
} from '@harness/core';
import { PhysicalFileSystem, SystemClock, NanoidGenerator } from '@harness/shared';

const program = new Command();

program
  .name('harness')
  .description('Universal Coding Harness CLI')
  .version('1.0.0');

function registerCoreServices(host: ApplicationHost) {
  const fs = new PhysicalFileSystem();
  
  host.registerServiceInstance('FileSystem', fs);
  host.registerServiceInstance('Clock', new SystemClock());
  host.registerServiceSingleton('IdGen', NanoidGenerator);
  
  // Cấu hình rỗng để tự động nhận mặc định global ~/.harness/
  host.registerServiceInstance('Configuration', new LayeredConfiguration(fs, {}));
  
  host.registerServiceSingleton('Logger', StructuredLogger);
  host.registerServiceSingleton('Workspace', WorkspaceManager, ['FileSystem', 'Configuration']);
  host.registerServiceSingleton('EventBus', LocalEventBus, ['Clock']);
  host.registerServiceSingleton('CapabilityRegistry', CapabilityRegistry);
  host.registerServiceSingleton('KnowledgeStore', SQLiteKnowledgeStore, ['Workspace']);
  
  // Đăng ký các Engine dịch vụ
  host.registerServiceSingleton('KnowledgeEngine', KnowledgeEngine, ['KnowledgeStore', 'FileSystem', 'Workspace']);
  host.registerServiceSingleton('CodeIndex', CodeIndexer, ['Workspace']);
  host.registerServiceSingleton('PlanningEngine', PlanningEngine, ['Workspace', 'CodeIndex']);
  host.registerServiceSingleton('RuntimeEngine', RuntimeEngine, ['Workspace', 'EventBus', 'Logger']);
  host.registerServiceSingleton('VerificationEngine', VerificationEngine, ['Workspace', 'CapabilityRegistry', 'Configuration', 'Logger']);
}

program
  .command('init')
  .description('Initialize Harness in the current project')
  .action(async () => {
    const host = new ApplicationHost();
    registerCoreServices(host);
    
    try {
      await host.start();
      
      const fs = await import('fs');
      const path = await import('path');
      const agentsPath = path.join(process.cwd(), 'AGENTS.md');
      
      const agentsContent = `# AGENTS.md

# Universal Coding Harness - AI Agent Integration Guide

## Introduction
Chào mừng bạn (AI Agent) đến làm việc trên dự án này. 

Dự án này sử dụng hệ thống điều phối phát triển tự động **Universal Coding Harness**. Hệ thống này chịu trách nhiệm giám sát, đảm bảo chất lượng, quản lý các checkpoint mã nguồn (qua Git), và tự động xác thực sự tuân thủ các quy tắc kiến trúc của dự án.

Là một AI Agent, bạn **bắt buộc** phải tuân thủ và phối hợp chặt chẽ với Harness theo quy trình được định nghĩa dưới đây.

---

## 1. Quy trình làm việc bắt buộc (Workflow)
Trước khi bắt đầu code bất kỳ chức năng nào, bạn cần tuân thủ tuyệt đối quy trình 5 bước sau:

\`\`\`
Đọc tài liệu dự án (ADR, Specs)
        ↓
Khởi tạo Harness (harness init)
        ↓
Tạo Plan thực thi & Đệ trình kiểm chứng (harness run "...")
        ↓
Thực hiện thay đổi code (Chỉ sửa các file đã đăng ký)
        ↓
Chạy pipeline xác thực (Verify) để hoàn thành
\`\`\`

---

## 2. Chi tiết các bước thực hiện

### Bước 1: Khởi tạo Harness
Chạy lệnh sau tại thư mục gốc của dự án để khởi tạo không gian làm việc cục bộ của Harness:
\`\`\`bash
harness init
\`\`\`
Lệnh này sẽ tự động dựng cấu trúc dữ liệu SQLite toàn cục và đồng bộ bối cảnh dự án hiện tại.

### Bước 2: Đăng ký Kế hoạch thực thi (Execution Plan)
Trước khi chỉnh sửa bất kỳ tệp tin nào, bạn phải lên một kế hoạch chi tiết (Plan) mô tả:
- Tóm tắt công việc.
- Các bước thực thi (hành động, mục tiêu).
- Chiến lược test và phương án khôi phục (rollback).
- **Danh sách các file sẽ bị sửa đổi**.

Đệ trình kế hoạch và kích hoạt trạng thái giám sát bằng lệnh:
\`\`\`bash
harness run "Mô tả công việc cần làm (Ví dụ: Triển khai API đăng ký người dùng mới)"
\`\`\`
Lệnh này sẽ:
1. Tạo một nhánh Git cô lập tự động cho task dạng: \`harness/task-\${taskId}\`.
2. Lưu checkpoint commit đầu tiên của nhánh để sẵn sàng rollback nếu xảy ra lỗi.
3. Kích hoạt giám sát phạm vi thay đổi (Scope Enforcement).

### Bước 3: Thực hiện chỉnh sửa mã nguồn (Code)
Trong quá trình code, bạn **chỉ được phép chỉnh sửa hoặc thêm mới các tệp tin đã khai báo trong Execution Plan**.
- **LƯU Ý QUAN TRỌNG**: Nếu bạn chỉnh sửa bất kỳ tệp tin nào ngoài danh sách đã khai báo trong kế hoạch, Harness sẽ phát hiện khi kết thúc step, đánh dấu step là \`FAILED\` và thực hiện **tự động Rollback** toàn bộ mã nguồn của bạn về checkpoint ban đầu (sử dụng \`git reset --hard\`).

### Bước 4: Tự động Xác thực (Verification Pipeline)
Sau khi chỉnh sửa code xong, bạn cần chạy chuỗi kiểm chứng để đảm bảo không vi phạm bất cứ tiêu chuẩn nào của dự án.
Harness sẽ chạy pipeline 4 tầng:
- **L1 (Syntax/Build Check)**: Kiểm tra biên dịch code.
- **L2 (Lint Check)**: Quét lỗi định dạng và cú pháp.
- **L3 (Unit Test Check)**: Chạy toàn bộ các ca kiểm thử tự động của dự án.
- **L4 (Architecture Rules Check)**: Phân tích cơ sở dữ liệu đồ thị symbol của dự án để phát hiện các liên kết gọi hàm vi phạm kiến trúc (Ví dụ: Class thuộc tầng Domain gọi trực tiếp Class thuộc tầng Infrastructure).

---

## 3. Các Quy tắc cốt lõi dành cho AI Agent
1. **Không tự ý bỏ qua các cảnh báo**: Nếu Harness báo lỗi build, lint hoặc test, bạn phải sửa cho tới khi pass.
2. **Không tự ý bypass cấu trúc**: Không import chéo các package vi phạm quy tắc kiến trúc L4.
3. **Quy tắc Rollback**: Khi xảy ra rollback, tuyệt đối không cố gắng ghi đè lại file cũ mà hãy xem xét lại kế hoạch, sửa lại danh sách file trong Execution Plan cho đúng và đủ trước khi chạy lại.
`;

      fs.writeFileSync(agentsPath, agentsContent, 'utf8');
      
      console.log('Harness initialized successfully!');
      console.log(`- Created local guide file: ${agentsPath}`);
      console.log(`- Registered repository mapping in global database (~/.harness/database/harness.db)`);
      
      await host.stop();
    } catch (err) {
      console.error('Initialization failed:', err);
      process.exit(1);
    }
  });

program
  .command('run <task>')
  .description('Run a development task')
  .action(async (taskDesc) => {
    const host = new ApplicationHost();
    registerCoreServices(host);
    
    try {
      await host.start();
      const task: Task = {
        id: 'task_' + Date.now(),
        description: taskDesc,
        createdAt: new Date(),
        status: 'IDLE'
      };
      console.log(`Starting task: ${task.description} (${task.id})`);
      await host.stop();
    } catch (err) {
      console.error('Task execution failed:', err);
      process.exit(1);
    }
  });

program.parse();
