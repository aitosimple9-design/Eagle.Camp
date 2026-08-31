# Memory — Lưu Vết Phiên Làm Việc

Template theo dõi trạng thái dự án. Mỗi lần AI hoàn thành một tác vụ lớn, hãy ghi log vào đây.

## Format Log

```
## [YYYY-MM-DD HH:MM] — <Tên tác vụ>
- **Hành động**: Mô tả ngắn gọn những gì đã làm.
- **File thay đổi**: Danh sách file bị edit/tạo mới.
- **Kết quả**: Thành công / Lỗi còn tồn đọng.
- **Ghi chú**: Những điều cần nhớ cho phiên làm việc kế tiếp.
```

---

## [2026-07-28 20:41] — Khởi tạo hệ thống `.claude/`
- **Hành động**: Xây dựng toàn bộ cây thư mục `.claude/` theo tiêu chuẩn Anthropic.
- **File thay đổi**: `CLAUDE.md`, `settings.json`, `memory.md`, `rules/business-logic.md`, `rules/workflow.md`, `rules/design.md`, `rules/tech-defaults.md`, `agents/researcher.md`, `agents/reviewer.md`, `skills/calculate-income.md`, `skills.json`.
- **Kết quả**: Thành công. Phiên bản V2 đã nâng cấp toàn bộ Rules với Decision Tree, Naming Conventions, Micro-interactions và Fail-Fast.
- **Ghi chú**: `spec.md` gốc vẫn giữ nguyên làm tài liệu đối chiếu. Các file HTML/JS chính (`index.html`, `js/app.js`) cần review lại để đảm bảo layout sau các thay đổi K2 trước đó.
