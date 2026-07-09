# 06. ADOPTION GUIDE

> **Version:** 1.0
> **Status:** Draft

---

# 1. Purpose

Tài liệu này hướng dẫn cách áp dụng Harness vào một Repository.

Mục tiêu là giúp một Repository có thể sử dụng Harness một cách nhất quán mà không phụ thuộc vào AI Platform hoặc Harness Toolkit.

---

# 2. Adoption Lifecycle

Một Repository thường trải qua các giai đoạn sau.

```text
New Repository
      │
      ▼
Bootstrap
      │
      ▼
Repository Scan
      │
      ▼
Human Review
      │
      ▼
Ready
      │
      ▼
Daily Execution
      │
      ▼
Continuous Improvement
```

Bootstrap chỉ thực hiện một lần.

Các bước còn lại được lặp lại trong suốt vòng đời của Repository.

---

# 3. Bootstrap

Bootstrap là quá trình chuẩn bị Repository để sử dụng Harness.

Bootstrap bao gồm các bước sau:

1. Thêm `AGENTS.md`.
2. Tạo thư mục `.harness`.
3. Phân tích Repository hiện có.
4. Tạo Repository Map ban đầu.
5. Sinh Repository Rules ở trạng thái Draft.
6. Chuẩn bị Repository sẵn sàng cho AI.

Bootstrap không thay đổi Source Code của Repository.

---

# 4. Initial Repository Scan

Sau khi Bootstrap, AI thực hiện lần quét đầu tiên.

Mục tiêu của Repository Scan là hiểu Repository hiện tại.

Ví dụ:

* cấu trúc thư mục
* module
* dependency
* coding pattern
* kiến trúc
* công nghệ đang sử dụng

Kết quả của bước này là Repository Map và các Repository Rules dạng Draft.

---

# 5. Human Review

Repository Knowledge ban đầu cần được Human xem xét.

Human có thể:

* chấp thuận
* chỉnh sửa
* từ chối
* bổ sung

Chỉ những nội dung được phê duyệt mới trở thành Repository Knowledge chính thức.

---

# 6. Daily Workflow

Sau khi Bootstrap hoàn thành, Repository sẵn sàng cho AI.

Mỗi Task đều tuân theo cùng một quy trình.

```text
Read Repository Knowledge
          │
          ▼
Execute Task
          │
          ▼
Verify Result
          │
          ▼
AI Review
          │
          ▼
Generate Proposal (nếu có)
          │
          ▼
Complete Task
```

Repository Knowledge luôn được đọc trước khi AI bắt đầu làm việc.

---

# 7. Continuous Improvement

Sau mỗi Task, AI có thể đề xuất cải tiến Repository Knowledge.

Ví dụ:

* Rule mới
* cập nhật Rule
* Knowledge mới
* cập nhật Knowledge
* ADR mới

AI không được cập nhật Repository Knowledge trực tiếp.

Mọi thay đổi đều phải thông qua Governance Model.

---

# 8. Repository Maintenance

Repository Knowledge cần được bảo trì định kỳ.

Ví dụ:

* loại bỏ thông tin lỗi thời
* cập nhật Rule
* bổ sung Knowledge
* rà soát Proposal chưa xử lý

Repository Knowledge nên phản ánh trạng thái hiện tại của Repository.

---

# 9. Toolkit Upgrade

Harness Toolkit có thể được nâng cấp độc lập với Repository.

Việc nâng cấp Toolkit không được làm thay đổi Repository Knowledge nếu không có sự đồng ý của người dùng.

Khi Specification thay đổi, Toolkit có thể hỗ trợ quá trình nâng cấp Repository theo phiên bản mới.

---

# 10. Best Practices

Để sử dụng Harness hiệu quả, nên tuân thủ các nguyên tắc sau.

* Giữ `AGENTS.md` ngắn gọn và ổn định.
* Chỉ lưu tri thức có giá trị lâu dài trong `.harness`.
* Thường xuyên rà soát Proposal.
* Ưu tiên Evidence hơn giả định.
* Không lưu trạng thái tạm thời vào Repository Knowledge.
* Luôn Human Review trước khi cập nhật Repository Knowledge.

---

# 11. Adoption Roadmap

Harness nên được áp dụng theo từng bước.

| Phase   | Goal                                    |
| ------- | --------------------------------------- |
| Phase 1 | Bootstrap và Repository Scan            |
| Phase 2 | Sử dụng Harness trong Daily Development |
| Phase 3 | Continuous Improvement                  |
| Phase 4 | Chuẩn hóa trên nhiều Repository         |

Không nên triển khai toàn bộ khả năng của Harness ngay từ đầu.

Áp dụng theo từng giai đoạn sẽ giúp Repository phát triển ổn định hơn.

---

# 12. Relationship to Other Specifications

Adoption Guide là tài liệu hướng dẫn sử dụng Harness.

| Document               | Responsibility                |
| ---------------------- | ----------------------------- |
| 01. CORE ARCHITECTURE  | Kiến trúc tổng thể            |
| 02. REPOSITORY MODEL   | Dữ liệu của Repository        |
| 03. EXECUTION MODEL    | Quy trình AI thực hiện Task   |
| 04. GOVERNANCE MODEL   | Quản trị Repository Knowledge |
| 05. PLATFORM & TOOLKIT | Cách Harness được triển khai  |

---

# 13. Compatibility

Harness Specification, Harness Toolkit và Repository cần tương thích với nhau.

Để đảm bảo khả năng nâng cấp lâu dài, mỗi thành phần có vòng đời riêng.

```text
Harness Specification
          │
          ▼
Harness Toolkit
          │
          ▼
Repository
```

Nguyên tắc tương thích:

* Repository không phụ thuộc vào AI Platform.
* Toolkit phải tuân thủ Specification.
* Repository được tạo bởi phiên bản cũ vẫn phải có khả năng sử dụng với Toolkit mới nếu Specification tương thích.
* Mọi thay đổi phá vỡ khả năng tương thích phải được công bố rõ ràng trong Specification.

Specification là nguồn định nghĩa chuẩn.

Toolkit là hiện thực của Specification.

Repository chỉ lưu dữ liệu của dự án.

---

# 14. Evolution Strategy

Harness được phát triển theo hướng tiến hóa dần (Evolutionary Architecture).

Không cố gắng thiết kế đầy đủ mọi khả năng ngay từ đầu.

Khi phát hiện nhu cầu mới:

1. Áp dụng giải pháp đơn giản nhất.
2. Thu thập phản hồi từ quá trình sử dụng thực tế.
3. Chỉ chuẩn hóa khi một giải pháp đã được kiểm chứng trên nhiều Repository.

Nguyên tắc này áp dụng cho:

* Repository Structure
* Repository Knowledge
* Workflow
* Toolkit
* Governance
* AI Platform Integration

Mọi thay đổi nên ưu tiên:

* Đơn giản.
* Tương thích ngược.
* Dễ triển khai.
* Dễ bảo trì.

Harness ưu tiên tính ổn định hơn việc bổ sung nhiều tính năng.

