# Tech Defaults & Coding Standards V2

## 1. Công Nghệ Mặc Định (Stack)
| Công nghệ | Cách dùng |
| :--- | :--- |
| **Tailwind CSS** | CDN script (không build). `dark:` prefix cho mọi màu sắc. |
| **Chart.js** | CDN, vẽ biểu đồ thu nhập theo FYP. |
| **FontAwesome 6** | CDN, icon UI. |
| **Vanilla JS ES6+** | Không dùng React/Vue/Angular. |

## 2. Cấu Trúc File
```
index.html     → Khung UI: iPhone frame, Card, DOM elements
css/style.css  → Class tùy chỉnh, keyframes, Glassmorphism-specific
js/app.js      → State + Logic + DOM update
```

## 3. Naming Conventions (BỔ SUNG V2)
| Loại | Quy tắc | Ví dụ |
| :--- | :--- | :--- |
| JS biến / hàm | `camelCase` | `k2Coef`, `calcMonthBonus()` |
| JS constant | `UPPER_SNAKE_CASE` | `BASE_TARGETS`, `K2_BRACKETS` |
| HTML id | `kebab-case` | `fyp-slider`, `k2-input` |
| HTML class (custom) | `kebab-case` | `card-base`, `role-btn` |
| State key | `camelCase` | `state.fypTeamDirectSm` |

## 4. State Management (Single Source of Truth)
- Tất cả dữ liệu người dùng nhập vào phải lưu trong object `state = {}`.
- **Cấm mutate DOM trực tiếp** mà không cập nhật `state` trước.
- Luồng chuẩn: `User Input → state update → scheduleUpdateUI() → calculateIncome(state) → renderDOM()`.

## 5. Immutability Preference (BỔ SUNG V2)
- Không viết `state.fyp = inputEl.value` — Luôn gọi `state.fyp = parseVNDInput(inputEl.value)`.
- Hàm `calculateIncome()` phải là **pure function**: cùng input → cùng output, không side effects.

## 6. Fail-Fast Input Validation (BỔ SUNG V2)
- Khi người dùng nhập số âm, ký tự không hợp lệ → bỏ qua silently (không crash).
- Khi giá trị vượt ngưỡng hợp lý (vd: K2 > 150%, FYP > 10.000 tỷ) → clamp về giá trị max, không throw Error.
- Format tiền tệ VNĐ luôn được live-format trong lúc gõ (1.000.000 thay vì 1000000).
