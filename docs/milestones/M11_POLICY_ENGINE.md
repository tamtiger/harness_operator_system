# Milestone M11 — Policy Engine

## 1. Goal

Đảm bảo mọi quyết định (Plan) và mã nguồn (Generation/Runtime) đều tuân thủ các quy tắc quản trị (Governance Rules), ràng buộc kiến trúc và giới hạn rủi ro trước khi được thực thi.

*Lưu ý: Trong Phase 1 (MVP), Policy Engine chủ yếu đóng vai trò là một module nội bộ hỗ trợ cho Planning Engine và Verification Engine. Ở các Phase sau, nó sẽ được tách thành một service độc lập.*

---

## 2. Responsibilities

Policy Engine chịu trách nhiệm:
- **Risk Evaluation:** Đánh giá mức độ rủi ro của một Plan dựa trên các file bị ảnh hưởng (ví dụ: sửa file core sẽ có rủi ro cao hơn file test).
- **Auto-approve Thresholds:** Tự động phê duyệt các tác vụ rủi ro thấp, yêu cầu con người phê duyệt cho tác vụ rủi ro cao.
- **Governance Policies:** Áp dụng các quy tắc của tổ chức (ví dụ: không được bypass security checks, không dùng thư viện cấm).
- **Protected Regions Validation:** Đảm bảo AI không được phép chỉnh sửa các khu vực mã nguồn được đánh dấu là "Protected" (ví dụ: cấu hình kết nối DB).

Policy Engine KHÔNG chịu trách nhiệm:
- Đọc hiểu ngôn ngữ lập trình (đó là việc của Code Index/Plugin).
- Trực tiếp chặn quá trình ghi file ở mức OS.

---

## 3. High-Level Architecture

```text
Planning Engine
      │
      ▼ (Gửi Plan)
Policy Engine
      │
      ├─► Đánh giá Rủi ro (Risk Assessor)
      ├─► Đối chiếu Chính sách (Governance Rules)
      └─► Kiểm tra Vùng cấm (Protected Regions)
      │
      ▼
Kết quả (Approve / Reject / Require Human)
```

---

## 4. Deliverables

1. **Policy Validator:** Module kiểm tra tính hợp lệ của Plan so với rule set.
2. **Risk Assessor:** Module chấm điểm rủi ro (Risk Score) cho các Task.
3. **Approval Workflow Engine:** Module xử lý luồng duyệt (Auto vs Manual).
4. **Policy Definition Schema:** Cấu trúc file YAML để định nghĩa policy.

---

## 5. Acceptance Criteria

- Hệ thống từ chối các Plan cố tình sửa đổi các "Protected Regions".
- Các thay đổi cấu hình hạ tầng (Infrastructure) tự động bị flag "High Risk" và yêu cầu User Approval.
- Các thay đổi nhỏ (như refactor tên biến cục bộ, viết thêm unit test) được Auto-approve nếu thỏa mãn ngưỡng an toàn.
- Báo cáo rõ ràng lý do một Plan bị từ chối dựa trên điều khoản Policy nào.

---

## 6. Exit Criteria

- Policy Engine được tích hợp thành công vào bước kiểm duyệt của Planning Engine.
- Tách biệt được logic định nghĩa Policy (YAML) và logic thực thi (Code).
- Passes toàn bộ Integration Tests mô phỏng các kịch bản vi phạm policy.

---

## 7. Risks & Mitigations

- **Rủi ro:** Cấu hình Policy quá khắt khe khiến AI không thể hoàn thành bất kỳ task nào (False Positives).
  - **Mitigation:** Ở Phase 1, chỉ bật các Policy mang tính bảo vệ cấu trúc lõi, tắt các Policy liên quan đến coding style (nhường cho Linter).
- **Rủi ro:** Hardcode logic đánh giá rủi ro.
  - **Mitigation:** Mọi ngưỡng đánh giá (thresholds) phải được nạp từ cấu hình dự án (`harness.yaml`).

---

## 8. Out of Scope (Phase 1)

- Chấm điểm rủi ro bằng AI (AI-based Risk Prediction). Hiện tại chỉ dùng rule-based.
- Quản lý Policy tập trung (Distributed Policy Management) cho toàn bộ công ty.
- Tự động sinh Policy từ mã nguồn cũ.
