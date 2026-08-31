# Skill: Tính toán thu nhập tự động (calculate-income)

**Mô tả**:
Kịch bản kỹ năng tái sử dụng để tính toán thu nhập tự động cho các cấp bậc (FC, SL+, SM+).

**Inputs (Trạng thái - State)**:
- `role`: Chức danh (FC, StarFC, GSL, SSL, ESL, SM, EM, ERM, IRM)
- `monthMode`: Tháng hoạt động (vd: '1', '13+', '12+', '1-9'...)
- `fyp`: FYP cá nhân
- `fycRate`: Tỷ lệ hoa hồng FYC
- `k2Pct`: % Hệ số duy trì K2 thực đạt (0 - 150%)
- Các chỉ số bổ sung theo Role (SL Active Headcount, FYP nhóm TT, FYP Gián tiếp L1/L2/L3...)

**Quy trình (Workflow)**:
1. **Bước 1**: Đọc Input và Map Hệ số K2 (dựa trên `k2Pct` và `monthMode`).
2. **Bước 2**: Tính toán Personal FYC = `fyp` x `fycRate`.
3. **Bước 3**: Tính các khoản thưởng cá nhân (Thưởng tháng, thưởng quý, Star FC).
4. **Bước 4**: (Đối với SL+ / SM+) Tính phí Quản lý TT, phí Đào tạo, phí Gián tiếp L1/L2/L3 theo bậc thang lũy tiến.
5. **Bước 5**: (Đối với SM+) Xét hệ số chốt tỷ lệ hoàn thành mục tiêu FYP so với Kế hoạch.
6. **Bước 6**: Tổng hợp toàn bộ các khoản và trả về `total` và chi tiết `breakdown`.

**Ràng buộc**:
Luôn tuân thủ tuyệt đối Business Logic trong `rules/business-logic.md`. Không được tự ý nội suy nếu thông tin mâu thuẫn.
