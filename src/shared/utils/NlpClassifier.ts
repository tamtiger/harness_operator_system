export interface ClassificationResult {
  taskType: string;
  tags: string[];
  intent: string;
  score: number;
}

function strip(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const MIN_CONFIDENCE = 0.6;

const TRAINING_DATA: Array<{ intent: string; utterances: string[] }> = [
  {
    intent: 'general',
    utterances: [
      'hello world',
      'hello',
      'hi there',
      'good morning',
      'good afternoon',
      'how are you',
      'what time is it',
      'thank you',
      'thanks',
      'you are welcome',
      'goodbye',
      'see you later',
      'what can you do',
      'help me',
      'show commands',
      'list features',
      'what is harness',
      'how does this work',
      'tell me about yourself',
      'what version',
      'xin chào',
      'cảm ơn',
      'tạm biệt',
      'mấy giờ rồi',
      'bạn khỏe không',
      'bạn làm được gì',
      'giúp tôi',
      'chỉ đường',
      'có gì mới',
      'testing',
      'random text here',
      'blah blah',
      'test test',
      'foo bar baz',
      'abc xyz',
      'just trying',
      'xem thử',
      'thử nghiệm',
      'linh tinh',
      'không biết',
      'chưa rõ',
      'gì đó',
      'tôi cần hỗ trợ',
      'cho tôi hỏi',
      'làm ơn giúp',
      'hướng dẫn tôi',
      'tìm hiểu về dự án',
      'tổng quan hệ thống',
      'xem status',
      'kiểm tra trạng thái',
      'báo cáo tiến độ',
      'list tasks',
    ],
  },
  {
    intent: 'feature-dev',
    utterances: [
      'add user login',
      'implement payment gateway',
      'build new dashboard',
      'create api endpoint',
      'develop notification system',
      'write registration module',
      'add new feature',
      'implement search functionality',
      'build user profile page',
      'create data export tool',
      'develop reporting module',
      'write integration tests for api',
      'add authentication middleware',
      'implement file upload feature',
      'build real-time notification system',
      'thêm chức năng đăng nhập',
      'xây dựng trang dashboard',
      'tạo API mới',
      'phát triển module thanh toán',
      'tích hợp cổng thanh toán',
      'nâng cấp hệ thống xác thực',
      'thêm tính năng tìm kiếm',
      'xây dựng module báo cáo',
      'tạo chức năng xuất dữ liệu',
      'phát triển trang cá nhân',
      'tích hợp API bên thứ ba',
      'thêm middleware xác thực',
      'xây dựng hệ thống thông báo',
      'thiết kế giao diện người dùng',
      'nâng cấp module thanh toán',
      'thêm chức năng tải file',
    ],
  },
  {
    intent: 'bug-fix',
    utterances: [
      'fix login bug',
      'resolve authentication error',
      'patch security vulnerability',
      'correct data processing issue',
      'fix crashing on startup',
      'repair broken api endpoint',
      'hotfix production issue',
      'fix memory leak',
      'resolve timeout error',
      'patch xss vulnerability',
      'correct calculation bug',
      'fix database connection issue',
      'repair broken migration',
      'sửa lỗi đăng nhập',
      'vá lỗi bảo mật',
      'sửa sai sót trong module thanh toán',
      'fix crash khi khởi động',
      'sửa lỗi kết nối database',
      'vá lỗi XSS',
      'sửa lỗi hiển thị giao diện',
      'fix bug không tải được file',
      'sửa lỗi timeout',
      'vá lỗi rò rỉ bộ nhớ',
      'sửa lỗi tính toán sai',
      'hotfix lỗi production',
      'sửa lỗi API không hoạt động',
      'fix lỗi migrate database',
    ],
  },
  {
    intent: 'refactor',
    utterances: [
      'refactor user service',
      'restructure database layer',
      'cleanup legacy code',
      'optimize query performance',
      'refactor authentication module',
      'restructure project layout',
      'clean up dead code',
      'improve code architecture',
      'modernize legacy module',
      'extract shared utility',
      'reduce technical debt',
      'tái cấu trúc module xác thực',
      'dọn dẹp code cũ',
      'tối ưu hiệu năng truy vấn',
      'cải tiến kiến trúc module',
      'tái cấu trúc service layer',
      'dọn dẹp dead code',
      'tối ưu database query',
      'cải tiến hiệu suất API',
      'tách shared utility',
      'giảm nợ kỹ thuật',
      'tổ chức lại cấu trúc thư mục',
    ],
  },
  {
    intent: 'code-review',
    utterances: [
      'review pull request',
      'inspect code changes in auth module',
      'code review for payment feature',
      'review merge request',
      'audit code quality',
      'check coding standards',
      'review implementation',
      'kiểm tra code pull request',
      'duyệt thay đổi trong module đăng nhập',
      'đánh giá chất lượng code',
      'review tính năng thanh toán',
      'kiểm tra coding standards',
      'duyệt merge request',
      'soát lại implementation',
    ],
  },
  {
    intent: 'audit',
    utterances: [
      'audit security compliance',
      'run conformance suite',
      'check license compliance',
      'perform security audit',
      'verify accessibility standards',
      'audit dependency vulnerabilities',
      'check data privacy compliance',
      'kiểm toán bảo mật hệ thống',
      'đánh giá tuân thủ',
      'kiểm tra bảo mật',
      'chạy conformance suite',
      'kiểm tra license compliance',
      'kiểm toán dependency',
      'đánh giá accessibility',
      'kiểm tra data privacy',
    ],
  },
  {
    intent: 'docs',
    utterances: [
      'write API documentation',
      'update README',
      'document deployment process',
      'write user guide',
      'create architecture diagram',
      'document setup instructions',
      'write changelog',
      'viết tài liệu API',
      'cập nhật hướng dẫn sử dụng',
      'soạn thảo tài liệu kiến trúc',
      'viết README',
      'cập nhật tài liệu triển khai',
      'tạo hướng dẫn cài đặt',
      'viết changelog',
      'vẽ sơ đồ kiến trúc',
    ],
  },
];

export class NlpClassifier {
  private ready = false;
  private nlp: any = null;
  private trainPromise: Promise<void> | null = null;

  async ensureTrained(): Promise<void> {
    if (this.ready) return;
    if (this.trainPromise) return this.trainPromise;

    this.trainPromise = this.train();
    await this.trainPromise;
  }

  private async train(): Promise<void> {
    const { containerBootstrap } = await import('@nlpjs/core');
    const { Nlp } = await import('@nlpjs/nlp');
    const { LangEn } = await import('@nlpjs/lang-en');

    const container = await containerBootstrap();
    container.use(Nlp);
    container.use(LangEn);
    this.nlp = container.get('nlp');
    this.nlp.settings.autoSave = false;
    this.nlp.addLanguage('en');

    for (const entry of TRAINING_DATA) {
      for (const utterance of entry.utterances) {
        const normalized = strip(utterance);
        this.nlp.addDocument('en', normalized, entry.intent);
      }
    }

    await this.nlp.train();
    this.ready = true;
  }

  async classify(description: string): Promise<ClassificationResult> {
    await this.ensureTrained();
    const normalized = strip(description);
    const response = await this.nlp.process('en', normalized);

    const classifications: Array<{ intent: string; score: number }> =
      response.classifications || [];
    const top = classifications.length > 0 ? classifications[0] : null;

    const validClassifications = classifications.filter(c => c.score >= MIN_CONFIDENCE && c.intent !== 'None');
    const topValid = validClassifications.length > 0 ? validClassifications[0] : null;

    const intent = topValid ? topValid.intent : 'general';
    const tags = validClassifications.length > 0
      ? validClassifications.map(c => c.intent)
      : ['general'];

    return {
      taskType: intent,
      tags,
      intent,
      score: top ? top.score : 0,
    };
  }
}

let defaultInstance: NlpClassifier | null = null;

export async function classifyTask(description: string): Promise<ClassificationResult> {
  if (!defaultInstance) {
    defaultInstance = new NlpClassifier();
  }
  return defaultInstance.classify(description);
}
