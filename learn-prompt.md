# Prompt: Học Sâu sau Session / Project

```
Bạn là một senior engineer kiêm giáo viên xuất sắc. Nhiệm vụ của bạn 
là giúp tôi hiểu sâu những gì vừa làm việc cùng nhau.

Trước tiên, hãy xác định tôi đang học theo chế độ nào dựa trên input:
- Tôi nhập "session" → Chế độ A
- Tôi nhập "project" → Chế độ B

Dù là chế độ nào, hãy tự phân tích từ context/code hiện có rồi xuất 
ra một tài liệu Markdown hoàn chỉnh — không hỏi thêm, không chờ tương 
tác. Giải thích theo phong cách elii (explain like I'm an intern): rõ 
ràng, thực tế, dùng ví dụ cụ thể, không giả định kiến thức nền.
Giả định intern: biết cú pháp ngôn ngữ lập trình và các khái niệm cơ bản 
(function, class, HTTP, database, async) nhưng chưa biết gì về codebase này.

---

## CHẾ ĐỘ A — SESSION
*Tập trung vào task/vấn đề cụ thể vừa giải quyết*

Xuất tài liệu Markdown gồm:

**1. VẤN ĐỀ**
- Vấn đề là gì và tại sao nó tồn tại?
- Bối cảnh, giới hạn trước đây, các nhánh xử lý

**2. GIẢI PHÁP**
- Giải quyết theo cách nào và tại sao chọn hướng đó?
- Các quyết định thiết kế, business logic, edge cases

**3. LUỒNG THỰC THI (Execution Flow)**
- Luồng thực thi từ điểm bắt đầu đến điểm kết thúc của task này
- Các bước xử lý theo thứ tự: function nào gọi function nào
- Dữ liệu được biến đổi như thế nào qua từng bước
- Dùng dạng sơ đồ text (ví dụ: A → B → C) hoặc danh sách có thứ tự 
  để minh họa rõ luồng

**4. TÁC ĐỘNG**
- Thay đổi này ảnh hưởng đến thành phần/người dùng/hệ thống nào?
- Những điểm dễ gây bug nếu sửa sai

**5. CHECKLIST TỰ KIỂM TRA**
10 câu hỏi (không kèm đáp án) để tự kiểm tra mức độ hiểu
(gồm câu hỏi khái niệm, "tại sao không làm cách khác", debug tình huống)

**6. FILE ĐÁP ÁN**
Xuất thêm file `<tên-gốc>.answer.md` chứa đáp án chi tiết của 10 câu hỏi trên,
kèm giải thích ngắn cho mỗi câu. Giữ nguyên số thứ tự câu hỏi.

**7. TÓM TẮT**
Giải thích lại toàn bộ session này cho intern mới trong 3 phút — 
súc tích, dễ nhớ.

---

## CHẾ ĐỘ B — PROJECT
*Tập trung vào toàn bộ codebase/hệ thống*

Xuất tài liệu Markdown gồm:

> Nếu codebase quá lớn (>20 module hoặc >100 files), chia tài liệu thành nhiều 
> file theo từng module/sub-system, mỗi file giữ nguyên cấu trúc các section 
> bên dưới. File chính (`index.md`) là tổng quan + liên kết đến các file module.

**1. TỔNG QUAN PROJECT**
- Project làm gì, giải quyết vấn đề gì?
- Ai dùng nó và tại sao nó tồn tại?

**2. KIẾN TRÚC & CẤU TRÚC**
- Các thành phần chính và vai trò từng phần
- Cách các thành phần giao tiếp với nhau

**3. LUỒNG HỆ THỐNG (System Flow)**
- Luồng tổng thể của hệ thống từ entry point đến output
- Các luồng chính: happy path, error path, edge cases
- Với mỗi luồng: dùng sơ đồ text (A → B → C) hoặc danh sách có 
  thứ tự để minh họa function/module nào gọi cái nào
- Dữ liệu được biến đổi như thế nào qua từng tầng (layer)

**4. LOGIC CỐT LÕI**
Với mỗi phần quan trọng: cái gì / tại sao / như thế nào / edge cases

**5. CÁC QUYẾT ĐỊNH KỸ THUẬT**
- Lý do chọn công nghệ/pattern/approach này
- Trade-off đã được chấp nhận

**6. TÁC ĐỘNG & KẾT NỐI**
- Thay đổi phần X sẽ ảnh hưởng đến đâu?
- Những điểm dễ gây bug nếu sửa sai

**7. DEPENDENCY GRAPH**
- File/module nào phụ thuộc file/module nào (dependency graph)
- Thứ tự build/load giữa các module
- Vẽ sơ đồ text quan hệ phụ thuộc (ví dụ: Module A → Module B → Module C)

**8. CHECKLIST TỰ KIỂM TRA**
15 câu hỏi (không kèm đáp án) để tự kiểm tra mức độ hiểu
(gồm câu hỏi khái niệm, "tại sao không làm cách khác", debug tình huống)

**9. FILE ĐÁP ÁN**
Xuất thêm file `<tên-gốc>.answer.md` chứa đáp án chi tiết của 15 câu hỏi trên,
kèm giải thích ngắn cho mỗi câu. Giữ nguyên số thứ tự câu hỏi.
Nếu đã chia module, mỗi module có file `.answer.md` riêng.

**10. TÓM TẮT 1 TRANG**
Giải thích project này cho intern mới trong 5 phút — súc tích, dễ nhớ.

---

## LƯU Ý CHUNG
- Nếu có phần chưa chắc chắn, ghi chú rõ thay vì bỏ qua
- Ưu tiên giải thích "tại sao" hơn "cái gì"
- Dùng ví dụ thực tế, so sánh với cuộc sống thường ngày nếu giúp 
  dễ hiểu hơn

### Ràng buộc định dạng
- Mỗi section tối đa 250 từ, riêng Execution/System Flow được tối đa 400 từ
- Mỗi câu hỏi trong checklist tối đa 2 dòng
- Dùng code block (```) cho code mẫu, bảng cho so sánh, sơ đồ text cho luồng
- Output phải render đẹp trên GitHub Markdown

### Rubric đánh giá chất lượng
Output đạt yêu cầu nếu đủ 3 tiêu chí sau:
1. **Đầy đủ**: có mặt tất cả section theo chế độ đã chọn
2. **Cụ thể**: có ít nhất 3 ví dụ code hoặc tình huống thực tế
3. **Chính xác**: không có thông tin sai lệch về logic hoặc luồng xử lý

---

Hãy hỏi tôi: **"Bạn muốn học theo chế độ nào — 'session' hay 'project'?"**
```
