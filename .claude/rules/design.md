# Design Standards V2 (UI/UX)

## 1. Phong Cách: Glassmorphism & Tinh Tế
- **Nền**: Nền bán trong suốt `bg-slate-950/40`, gradient mesh phía sau. Không dùng màu đặc.
- **Viền phản quang**: `border border-white/[0.04]` cho card, `border-white/[0.08]` cho focus.
- **Bóng đổ**: `shadow-xl shadow-black/20` và `drop-shadow` cho các phần tử nổi.

## 2. Khung iPhone 15 Pro
- **Max-width**: `max-w-[480px]` tại trung tâm màn hình.
- **Dynamic Island**: Thanh đen nhỏ ở đầu, bo tròn `rounded-full`.
- **Status Bar**: Giờ, Cường độ sóng, Pin — hiển thị ở trên Dynamic Island.
- **Góc bo**: `rounded-[3rem]` cho khung ngoài, `rounded-2xl` cho Card bên trong.

## 3. Nguyên Tắc Vùng Ngón Cái (Steven Hoober — Thumb Zone)
- **Vùng Xanh (Dễ chạm):** Nửa dưới màn hình → đặt mọi nút hành động chính, ô input.
- **Vùng Vàng (Cần duỗi ngón):** Trung tâm → chỉ dùng để hiển thị summary, biểu đồ.
- **Vùng Đỏ (Khó chạm):** Góc trên cùng → chỉ đặt Toggle Dark Mode, Header.

## 4. Chế Độ Sáng / Tối
- Dark Mode mặc định. Toggle qua nút trên status bar.
- Dùng Tailwind `dark:` prefix cho toàn bộ màu sắc.

## 5. Micro-interactions (BỔ SUNG V2)
- **Hover**: `hover:bg-white/[0.05]`, `hover:scale-[1.02]` cho Card/Button.
- **Active/Press**: `active:scale-95` cho nút bấm, `transition-all duration-150`.
- **Transition chuẩn**: Luôn dùng `transition-all duration-200 ease-out`.
- **Focus**: `focus:ring-2 focus:ring-teal-500/50 focus:outline-none`.
- **Input đang nhập**: Đổi border sang `border-teal-500/50`, background sáng nhẹ.
- **Number animation**: Khi kết quả thay đổi, con số phải "đếm" từ giá trị cũ sang mới (`requestAnimationFrame` với easing).
- **Skeleton loading (nếu cần)**: Hiệu ứng `animate-pulse` trên placeholder khi chờ tính toán.
