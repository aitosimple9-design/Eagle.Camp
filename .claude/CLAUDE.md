# BỘ NÃO ĐIỀU HƯỚNG CHÍNH & INDEX DỰ ÁN

## 1. Cấu Trúc Cây Thư Mục Tiêu Chuẩn

```
.claude/
├── CLAUDE.md                 <-- BỘ NÃO ĐIỀU HƯỚNG CHÍNH & INDEX DỰ ÁN
├── CLAUDE.local.md           <-- Ghi chú cá nhân riêng tư
├── settings.json             <-- Cấu hình cấp quyền thao tác file & công cụ
├── settings.local.json       <-- Cài đặt thiết bị cá nhân
├── memory.md                 <-- Bộ nhớ lưu vết trạng thái phiên làm việc
├── rules/                    <-- THƯ MỤC QUY TẮC CHI TIẾT
│   ├── workflow.md           <-- Quy trình làm việc & Martin Fowler Regression Guard
│   ├── design.md             <-- Tiêu chuẩn UI/UX, Glassmorphic, iPhone 15 Pro, Steven Hoober
│   ├── tech-defaults.md      <-- Stack: Single-file/Modular HTML, Tailwind CSS, Chart.js CDN
│   └── business-logic.md     <-- Bảng biểu & Công thức tài chính Shinhan Life 2026 chuẩn xác
├── agents/                   <-- THƯ MỤC SUB-AGENTS CHUYÊN DỤNG
│   ├── researcher.md         <-- Sub-agent BA (Patrick Collison) chuyên phân tích số liệu
│   └── reviewer.md           <-- Sub-agent QA/QC (Kent C. Dodds) chuyên test giao diện
└── skills/                   <-- THƯ MỤC KỊCH BẢN TÁI SỬ DỤNG
    └── calculate-income.md   <-- Skill quy trình tính toán thù lao tự động
```

## 2. Index Liên Kết Chéo (Relative Links)

- [Quy trình & Bảo vệ Hồi quy](rules/workflow.md)
- [Tiêu chuẩn Thiết kế UI/UX](rules/design.md)
- [Công nghệ Mặc định](rules/tech-defaults.md)
- [Công thức Shinhan Life 2026](rules/business-logic.md)

## 3. Hội Đồng Tối Cao 8 Thành Viên
Hội đồng này định hướng mọi quyết định về logic, kỹ thuật, UI/UX và vận hành:

1. **System Architect (Core Lead)**: Quyết định cấu trúc hệ thống, kiến trúc dữ liệu và quy trình tổng thể. Đóng vai trò hạt nhân định hướng.
2. **Product Manager (PM - BA Lead)**: *Đại diện Patrick Collison*. Chịu trách nhiệm về Business Logic, đảm bảo mọi công thức Shinhan Life chuẩn 100%.
3. **UI/UX Lead Designer**: Kiểm soát các quy chuẩn thiết kế Glassmorphism, vùng ngón cái của Steven Hoober.
4. **Front-End Tech Lead**: Chỉ định và chuẩn hóa công nghệ HTML/JS thuần, Tailwind CSS, Chart.js.
5. **QA/QC Engineer (Test Lead)**: *Đại diện Kent C. Dodds*. Kiểm thử tự động, chống vỡ giao diện, đảm bảo hồi quy.
6. **Data Engineer**: Tối ưu hóa cấu trúc dữ liệu, state management trong `app.js`.
7. **Security/DevOps Lead**: Quản lý quyền hệ thống trong `settings.json`, kiểm soát bảo mật và môi trường deploy.
8. **Operations Guard**: Quản lý bộ nhớ (`memory.md`), lưu vết và theo dõi tính liên tục của các phiên làm việc (session state).
