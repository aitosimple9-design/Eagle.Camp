# Business Logic (Shinhan Life 2026) — Phiên Bản AI-Optimized V2

> Tài liệu này được cấu trúc dưới dạng **Decision Tree & Mapping Table** để AI đọc-parse-code mà không cần suy diễn. Tham chiếu gốc: `spec.md`.

---

## MODULE 1A: Hệ Số K2 — FC (`getK2Coefficient_FC`)
> Chính sách: SHL-FCS-2026-0007 | Áp dụng cho: Đại lý bảo hiểm (FC)
> K2 của FC là K2 **cá nhân**, tác động đến Thưởng năng suất Tháng & Quý.

```
INPUT: k2Pct (số %, 0-150), monthMode (string)
OUTPUT: k2Coef (số thực)

IS_M12_PLUS = monthMode IN ['12', '12+', '13+', '12-15', '16+', '14-19', '20+']

IF k2Pct < 50   → return k2Pct / 100        ← bằng % K2 thực đạt
IF k2Pct < 60   → return 0.50
IF k2Pct < 65   → return 0.65
IF k2Pct < 70   → return 0.80
IF k2Pct < 80   → return 1.00
IF k2Pct >= 80  → return IS_M12_PLUS ? 1.20 : 1.00
```

> **Điều kiện đặc biệt:**
> - Thưởng Shinhan Partner (G/S/E-Partner): bắt buộc K2 >= 70%
> - Thưởng MDRT liên tiếp: bắt buộc K2 >= 70%

---

## MODULE 1B: Hệ Số K2 — SL+ (`getK2Coefficient_SL`)
> Chính sách: SHL-FCS-2026-0008 | Áp dụng cho: Quản lý kinh doanh (GSL, SSL, ESL)
> K2 của SL là K2 **Toàn Nhóm**, tác động đến Phí đào tạo & Phí khai thác nhóm (Tháng & Quý).

```
INPUT: k2Pct (số %, 0-150), groupMonthMode (string)
OUTPUT: k2Coef (số thực)

IS_M12_PLUS = groupMonthMode IN ['12', '12+', '13+', '12-15', '16+', '14-19', '20+']

IF k2Pct < 40   → return 0.50
IF k2Pct < 50   → return 0.50
IF k2Pct < 60   → return 0.65
IF k2Pct < 65   → return 0.80
IF k2Pct < 75   → return 1.00
IF k2Pct >= 75  → return IS_M12_PLUS ? 1.20 : 1.00
```

> **Lưu ý:** Tháng hoạt động nhóm < M12 và >= M12 có cùng hệ số, chỉ khác ở mức K2 >= 75%.
> **Quarterly Catch-up:** Cuối quý, nếu đạt chỉ tiêu nhóm nhưng K2 chưa tối đa, xét trả phần trăm theo mốc hệ số tại Bảng 6.

---

## MODULE 1C: Hệ Số K2 — SM+ (`getK2Coefficient_SM`)
> Chính sách: SHL-FCS-2026-0009 | Áp dụng cho: Giám đốc kinh doanh cấp cao (SM, EM, ERM, IRM)
> K2 của SM+ là K2 **Toàn Nhóm**, tác động đến Phí đào tạo (Mục 2.1) & Phí chăm sóc KH (Mục 2.8).

```
INPUT: k2Pct (số %, 0-150), monthMode (string)
OUTPUT: k2Coef (số thực)

IS_M12_PLUS = monthMode IN ['12', '12+', '13+', '12-15', '16+', '14-19', '20+']

IF k2Pct < 35   → return 0.50
IF k2Pct < 45   → return 0.50
IF k2Pct < 50   → return 0.60
IF k2Pct < 60   → return 0.80
IF k2Pct < 70   → return 1.00
IF k2Pct >= 70  → return IS_M12_PLUS ? 1.20 : 1.00
```

### Phí Chăm Sóc Khách Hàng SM+ (Mục 2.8 — Bảng 18)
> Tỷ lệ phí dịch vụ phụ thuộc trực tiếp vào K2 Toàn Nhóm (độc lập với IS_M12_PLUS).

```
INPUT: k2Pct (số %)
OUTPUT: pctChamSocKH (số thực)

IF k2Pct < 50   → return 0.00    ← 0%
IF k2Pct < 60   → return 0.04    ← 4%
IF k2Pct < 70   → return 0.08    ← 8%
IF k2Pct >= 70  → return 0.16    ← 16%
```

---

## ĐỊNH NGHĨA CHUNG K2
- **Công thức tính K2:** `K2 = [APE phát hành từ (T-26) đến (T-14) còn hiệu lực tại T] / [APE phát hành từ (T-26) đến (T-14) tại thời điểm phát hành]`
- **Mặc định đạt K2** nếu chưa có HĐBH nào phát sinh trong giai đoạn xét.

---

## MODULE 2: Hoa Hồng FYC (`calcFYC`)

```
INPUT: fyp (triệu), fycRate (%)
OUTPUT: fyc (triệu)

fyc = fyp * (fycRate / 100)
```
> Mức fycRate phổ biến nhất: **30%** (Sống An Vui ≥15 năm, An Thịnh), **15%** (Credit Care, Bổ trợ).

---

## MODULE 3: Thưởng Năng Suất Tháng FC (`calcMonthBonus`)

```
INPUT: fyp (triệu), fyc (triệu), aitom ('S'|'A'|'B'|'C'|'D'), k2Coef
OUTPUT: bonusMonth (triệu)

IS_HIGH = aitom IN ['S', 'A']

rate = 0
IF fyp < 10   → rate = 0
IF fyp < 25   → rate = 0.10
IF fyp < 45   → rate = IS_HIGH ? 0.18 : 0.15
IF fyp < 70   → rate = IS_HIGH ? 0.23 : 0.20
IF fyp < 100  → rate = IS_HIGH ? 0.28 : 0.25
ELSE          → rate = IS_HIGH ? 0.33 : 0.30

bonusMonth = fyc * rate * k2Coef
```

---

## MODULE 4: Thưởng Năng Suất Quý FC (`calcQuarterBonus`)

```
INPUT: fypQ (triệu), fycQ (triệu), activeMonths (1|2|3), k2Coef
OUTPUT: bonusQuarter (triệu/tháng, chia 3)

rateQ = 0
IF fypQ < 75   → rateQ = 0
IF fypQ < 135  → rateQ = 0.06
IF fypQ < 210  → rateQ = 0.08
IF fypQ < 300  → rateQ = 0.10
ELSE           → rateQ = 0.12

hsHD = {1: 0.8, 2: 1.0, 3: 1.2}[activeMonths]

bonusQuarter = (fycQ * rateQ * hsHD * k2Coef) / 3
```

---

## MODULE 5: Thưởng Star FC (`calcStarFcBonus`)

**Giai đoạn M1 (Bảng 1 & 2):**
| Điều kiện | Hỗ trợ |
| :--- | :---: |
| 1 HĐ, FYP ≥ 10tr, AiTOM ≥ B | 1.0 triệu |
| 1 HĐ, FYP ≥ 15tr, AiTOM ≥ B | 2.5 triệu |
| 3 HĐ, FYP ≥ 25tr, AiTOM ≥ A | 4.0 triệu |

**Giai đoạn M2-M7 (Bảng 3, nhân K2):**
| AiTOM | ≥20-<40tr | ≥40-<60tr | ≥60-<80tr | ≥80tr |
| :---: | :---: | :---: | :---: | :---: |
| S/A | 1.8 | 4.0 | 6.5 | 9.0 |
| B | 1.4 | 3.0 | 5.0 | 7.0 |
| C | 1.0 | 2.2 | 3.5 | 5.0 |

**Giai đoạn M8-M13 (Bảng 4, nhân K2):**
| AiTOM | ≥30-<50tr | ≥50-<70tr | ≥70-<100tr | ≥100tr |
| :---: | :---: | :---: | :---: | :---: |
| S | 4.0 | 8.0 | 13.0 | 20.0 |
| A | 3.4 | 6.0 | 9.0 | 18.0 |
| B | 2.3 | 4.0 | 6.0 | 15.0 |

**Giai đoạn M14-M19 (Bảng 5, nhân K2):**
Trục X = FYP cá nhân, Trục Y = FYP từ ĐLBH giới thiệu.
| FYP Giới thiệu | ≥40-<60tr | ≥60-<80tr | ≥80-<100tr | ≥100tr |
| :---: | :---: | :---: | :---: | :---: |
| ≥60tr | 5.0 | 10.0 | 15.0 | 20.0 |
| ≥40-<60tr | 4.5 | 7.0 | 10.0 | 18.0 |
| ≥20-<40tr | 3.0 | 5.0 | 7.0 | 15.0 |

---

## MODULE 6: Quản Lý Kinh Doanh SL+ (`calcSL`)

**Phí Đào tạo (Điều kiện: trong tháng hỗ trợ & đủ Active):**
```
GSL: monthMode IN ['1-9']          → 8tr  (nếu activeHC >= 1)
SSL: monthMode IN ['1-11', '12']   → 10tr (nếu activeHC >= 2)
ESL: monthMode IN ['1-11','12-15'] → 12tr (nếu activeHC >= 1)
phiDaoTao = phiChuan * k2Coef
```

**Phí Khai thác Nhóm TT (Bảng 8, theo FYP Nhóm):**
```
pctTT:
  fypTT < 30   → GSL:3%  SSL:4%  ESL:5%
  fypTT < 60   → GSL:10% SSL:15% ESL:20%
  fypTT < 90   → GSL:15% SSL:20% ESL:25%
  fypTT >= 90  → GSL:20% SSL:25% ESL:30%

mgmtDirect = fycTT * pctTT * k2Coef
mgmtIndirect = (fycL1 * 0.05 + fycL2 * 0.025) * k2Coef
```

**Phí Khai thác Quý (Bảng 10, theo FYP Quý):**
```
fypQ < 100  → 0%
fypQ < 300  → GSL:5%  SSL:8%  ESL:10%
fypQ >= 300 → GSL:8%  SSL:10% ESL:12%
```

---

## MODULE 7: Giám Đốc Kinh Doanh SM+ (`calcSM`)

**Chỉ tiêu năm:** SM=3200M | EM=8000M | ERM=16000M | IRM=28000M

**Phân bổ tháng:**
```
M1=4% | M2=5% | M3=6% | M4-12=9.45% | M13+=8.33%
targetMonth = targetYear * pctMonth
```

**Hệ số FYP hoàn thành (Bảng 5):**
```
completionRate = totalFYP / targetMonth
IF rate < 0.35   → hsFYP = 0
IF rate < 0.50   → hsFYP = rate (thực tế)
IF rate < 0.80   → hsFYP = 0.50
IF rate < 1.15   → hsFYP = 1.00
ELSE             → hsFYP = 1.20

phiChuan = {SM:40, EM:60, ERM:80, IRM:110}[role]
hsHC     = activeHC >= 1 ? 1.0 : 0.0
phiDaoTao = phiChuan * (0.75*hsFYP + 0.25*hsHC) * k2Coef
```

**Phí Khai thác (Bảng 8 & 9, theo % hoàn thành):**
```
pctTT:
  rate < 0.80   → 6.0%
  rate < 1.00   → 10.0%
  rate >= 1.00  → 12.0%

pctIndirect theo cấp & HT (Bảng 9):
  EM:  <80%=2.4%  | 80-<100%=4.0%  | >=100%=4.8%
  ERM: <80%=1.8%  | 80-<100%=3.0%  | >=100%=3.6%
  IRM: <80%=1.2%  | 80-<100%=2.0%  | >=100%=2.4%
```
