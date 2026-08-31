# Tài liệu Giải thích Logic Tính Toán Thu Nhập Shinhan Life 2026

Tài liệu này mô tả chi tiết logic được triển khai bằng ngôn ngữ Java nhằm phục vụ việc kiểm thử các công thức tính toán thu nhập và phí dịch vụ dựa trên đặc tả hệ thống.

Mã nguồn được chia thành các phần để dễ dàng đọc hiểu và đối chiếu với các chính sách kinh doanh.

---

## 1. Cấu trúc Dữ liệu Đầu vào và Đầu ra

Đầu tiên, chúng ta cần định nghĩa các kiểu dữ liệu để dễ dàng truyền thông tin vào hàm tính toán. 

- `Role`, `AiTOMGrade`, `ShinhanPartner`: Định nghĩa các danh sách cố định (Enum) cho Chức danh, Xếp loại AiTOM và Cấp độ Shinhan Partner.
- `AgentData`: Là đối tượng chứa toàn bộ các tham số đầu vào (như doanh số cá nhân, số tháng hoạt động, tỷ lệ K2, doanh số nhóm...).
- `IncomeResult`: Là đối tượng chứa kết quả trả về, bóc tách rõ ràng từng khoản thu nhập.

```java
public class IncomeCalculator {

    // Các định nghĩa kiểu liệt kê (Enum)
    public enum Role {
        FC, STAR_FC, GSL, SSL, ESL, SM, EM, ERM, IRM
    }

    public enum AiTOMGrade {
        S, A, B, C, D
    }

    public enum ShinhanPartner {
        NONE, G_PARTNER, S_PARTNER, E_PARTNER
    }

    // Lớp chứa dữ liệu đầu vào mô phỏng từ Form nhập liệu
    public static class AgentData {
        public Role role;
        public int activeMonth; // Tháng hoạt động (1, 2, ..., 12, 13+)
        
        // Chỉ số cá nhân
        public double personalFyp; // FYP cá nhân (Đơn vị: triệu VNĐ)
        public double commissionRate = 0.3; // Tỷ lệ hoa hồng (Mặc định 30%)
        public AiTOMGrade aitomGrade; // Xếp loại năng suất
        public double k2Rate; // % K2 thực tế
        
        // Chỉ số xét thưởng quý
        public double quarterlyFyp;
        public double quarterlyFyc;
        public int activeMonthsInQuarter; // Số tháng hoạt động trong quý (1, 2, 3)
        
        public int numContractsMonth1; // Dành riêng cho Star FC
        public ShinhanPartner partnerLevel = ShinhanPartner.NONE;

        // Chỉ số Quản lý (Nhóm/Ban)
        public double directTeamFyp;
        public double directTeamFyc;
        public double indirectTeamFycL1;
        public double indirectTeamFycL2;
        
        public boolean isLateralRecruitment = true; // Tuyển ngang hay Thăng cấp
        public int activeHeadcount = 1; // Số lượt hoạt động (1-5+)
        
        // Dành cho Quản lý Cấp cao (SM+)
        public double targetCompletionRate; // Tỷ lệ hoàn thành chỉ tiêu (%)
        public double targetRevenue; // Chỉ tiêu doanh số (tự động điền theo bảng)
    }

    // Lớp chứa kết quả trả về hiển thị ở cột bên phải
    public static class IncomeResult {
        public double fyc; 
        public double monthlyBonus; 
        public double quarterlyBonus; 
        public double starFcSupport; 
        public double shinhanPartnerBonus; 
        
        public double teamTrainingFee; 
        public double directTeamExploitationFee; 
        public double indirectTeamExploitationFee; 
        
        public double totalIncome;
    }
```

---

## 2. Hàm Tính Toán Chính (Main Calculation Logic)

Hàm `calculate` nhận dữ liệu từ `AgentData`, kiểm tra chức danh (Role) và áp dụng luồng công thức tương ứng. Logic được chia làm 3 nhóm chính theo chính sách.

### Nhóm 1: Tư vấn viên (FC / Star FC)

```java
    public IncomeResult calculate(AgentData data) {
        IncomeResult result = new IncomeResult();
        
        // 1. Tính toán chung (FC / Star FC)
        if (data.role == Role.FC || data.role == Role.STAR_FC) {
            
            // 1.1 Hoa hồng cơ bản (FYC)
            result.fyc = data.personalFyp * data.commissionRate;
            
            // Tính trước Hệ số K2 vì nó ảnh hưởng đến nhiều khoản thưởng
            double k2Ratio = calculateK2Ratio(data.k2Rate, data.activeMonth);
            
            // 1.2 Thưởng năng suất tháng
            double monthlyBonusRate = calculateMonthlyBonusRate(data.personalFyp, data.aitomGrade);
            result.monthlyBonus = result.fyc * monthlyBonusRate * k2Ratio;
            
            // 1.3 Thưởng năng suất quý
            double quarterlyBonusRate = calculateQuarterlyBonusRate(data.quarterlyFyp);
            double activeRatio = calculateActiveMonthsRatio(data.activeMonthsInQuarter);
            result.quarterlyBonus = data.quarterlyFyc * quarterlyBonusRate * activeRatio * k2Ratio;
            
            // 1.4 Hỗ trợ Star FC (Ví dụ cho Tháng 1)
            if (data.role == Role.STAR_FC && data.activeMonth == 1) {
                if (data.personalFyp >= 25 && data.numContractsMonth1 >= 3) {
                    result.starFcSupport = 4.0;
                } else if (data.personalFyp >= 15 && data.numContractsMonth1 >= 1) {
                    result.starFcSupport = 2.5;
                } else if (data.personalFyp >= 10 && data.numContractsMonth1 >= 1) {
                    result.starFcSupport = 1.0;
                }
            }
            
            // 1.5 Thưởng Shinhan Partner (Điều kiện K2 >= 70%)
            if (data.k2Rate >= 0.7) {
                switch (data.partnerLevel) {
                    case G_PARTNER: result.shinhanPartnerBonus = result.fyc * 0.10; break;
                    case S_PARTNER: result.shinhanPartnerBonus = result.fyc * 0.15; break;
                    case E_PARTNER: result.shinhanPartnerBonus = result.fyc * 0.20; break;
                    default: break;
                }
            }
            
            // Tổng thu nhập Tư vấn viên
            result.totalIncome = result.fyc + result.monthlyBonus + result.quarterlyBonus + 
                                 result.starFcSupport + result.shinhanPartnerBonus;
        } 
```

### Nhóm 2 & 3: Quản lý Kinh doanh

Phần này phân tách logic riêng cho Quản lý cấp trung (GSL, SSL, ESL) và Quản lý cấp cao (SM, EM, ERM, IRM) vì cách tính Phí đào tạo là khác nhau.

```java
        // 2. Đối với Quản lý Kinh doanh (GSL, SSL, ESL)
        else if (data.role == Role.GSL || data.role == Role.SSL || data.role == Role.ESL) {
            
            // 2.1 Phí dịch vụ đào tạo đội ngũ (Tuyển ngang mới nhận phí và xét số lượt HĐ)
            double baseFee = 0;
            if (data.isLateralRecruitment) {
                int reqHeadcount = (data.role == Role.GSL) ? 2 : (data.role == Role.SSL) ? 3 : 4;
                if (data.activeHeadcount >= reqHeadcount) {
                    if (data.role == Role.GSL) baseFee = 8.0;
                    else if (data.role == Role.SSL) baseFee = 10.0;
                    else if (data.role == Role.ESL) baseFee = 12.0;
                }
            }
            double teamK2Ratio = calculateK2Ratio(data.k2Rate, data.activeMonth); 
            result.teamTrainingFee = baseFee * teamK2Ratio;
            
            // 2.2 Phí khai thác trực tiếp tháng
            double serviceFeeRate = calculateSlServiceFeeRate(data.role, data.directTeamFyp);
            result.directTeamExploitationFee = data.directTeamFyc * serviceFeeRate;
            
            // 2.3 Phí khai thác gián tiếp (Lớp 1: 5%, Lớp 2: 2.5%)
            result.indirectTeamExploitationFee = (data.indirectTeamFycL1 * 0.05) + 
                                                 (data.indirectTeamFycL2 * 0.025);
            
            result.totalIncome = result.teamTrainingFee + result.directTeamExploitationFee + 
                                 result.indirectTeamExploitationFee;
        }
        
        // 3. Đối với Quản lý Cấp cao (SM, EM, ERM, IRM)
        else {
            
            // 3.1 Phí đào tạo đội ngũ (40tr/60tr/80tr/110tr)
            double baseFee = 0;
            if (data.role == Role.SM) baseFee = 40.0;
            else if (data.role == Role.EM) baseFee = 60.0;
            else if (data.role == Role.ERM) baseFee = 80.0;
            else if (data.role == Role.IRM) baseFee = 110.0;
            
            double teamK2Ratio = calculateK2Ratio(data.k2Rate, data.activeMonth);
            
            // Phí thực nhận phụ thuộc 75% phí chuẩn, tỷ lệ hoàn thành chỉ tiêu và số lượt hoạt động
            result.teamTrainingFee = 0.75 * baseFee * data.targetCompletionRate * teamK2Ratio * data.activeHeadcount;
            
            // 3.2 Phí khai thác trực tiếp tháng (phụ thuộc Tỷ lệ hoàn thành chỉ tiêu)
            double serviceFeeRate = 0;
            if (data.targetCompletionRate < 0.8) serviceFeeRate = 0.06;
            else if (data.targetCompletionRate < 1.0) serviceFeeRate = 0.10;
            else serviceFeeRate = 0.12;
            
            result.directTeamExploitationFee = data.directTeamFyc * serviceFeeRate;
            
            result.totalIncome = result.teamTrainingFee + result.directTeamExploitationFee;
        }
        
        return result;
    }
```

---

## 3. Các Hàm Tiện ích (Helper Methods)

Các hàm này chứa các bảng tra cứu % tỷ lệ từ đặc tả. Việc tách các hàm này ra giúp mã nguồn gọn gàng và dễ dàng điều chỉnh khi chính sách thay đổi.

```java
    // Tính Hệ số K2 dựa trên tỷ lệ thực tế và số tháng hoạt động
    private double calculateK2Ratio(double k2Rate, int activeMonth) {
        if (k2Rate < 0.5) return k2Rate;
        if (k2Rate < 0.6) return 0.5;
        if (k2Rate < 0.65) return 0.65;
        if (k2Rate < 0.7) return 0.8;
        if (k2Rate < 0.8) return 1.0;
        return activeMonth < 12 ? 1.0 : 1.2;
    }

    // Tính tỷ lệ % Thưởng năng suất tháng (Bảng 2)
    private double calculateMonthlyBonusRate(double fyp, AiTOMGrade grade) {
        if (fyp < 10) return 0;
        
        boolean isHighGrade = (grade == AiTOMGrade.S || grade == AiTOMGrade.A);
        
        if (fyp < 25) return 0.10;
        if (fyp < 45) return isHighGrade ? 0.18 : 0.15;
        if (fyp < 70) return isHighGrade ? 0.23 : 0.20;
        if (fyp < 100) return isHighGrade ? 0.28 : 0.25;
        return isHighGrade ? 0.33 : 0.30;
    }

    // Tính tỷ lệ % Thưởng năng suất quý (Bảng 4)
    private double calculateQuarterlyBonusRate(double quarterlyFyp) {
        if (quarterlyFyp < 75) return 0;
        if (quarterlyFyp < 135) return 0.06;
        if (quarterlyFyp < 210) return 0.08;
        if (quarterlyFyp < 300) return 0.10;
        return 0.12;
    }

    // Tính hệ số hoạt động quý
    private double calculateActiveMonthsRatio(int activeMonths) {
        if (activeMonths == 1) return 0.8;
        if (activeMonths == 2) return 1.0;
        if (activeMonths == 3) return 1.2;
        return 0; 
    }
    
    // Tính tỷ lệ % Phí dịch vụ cho SL (GSL, SSL, ESL)
    private double calculateSlServiceFeeRate(Role role, double directTeamFyp) {
        if (role == Role.GSL) {
            if (directTeamFyp < 30) return 0.03;
            if (directTeamFyp < 60) return 0.10;
            if (directTeamFyp < 90) return 0.15;
            return 0.20;
        } else if (role == Role.SSL) {
            if (directTeamFyp < 30) return 0.04;
            if (directTeamFyp < 60) return 0.15;
            if (directTeamFyp < 90) return 0.20;
            return 0.25;
        } else if (role == Role.ESL) {
            if (directTeamFyp < 30) return 0.05;
            if (directTeamFyp < 60) return 0.20;
            if (directTeamFyp < 90) return 0.25;
            return 0.30;
        }
        return 0;
    }
```

---

## 4. Kiểm thử (Test Cases)

Hàm `main` được sử dụng để giả lập nhập liệu và chạy ra kết quả thực tế trên Terminal. Bằng cách thay đổi dữ liệu trong `AgentData`, bạn có thể kiểm tra xem công thức tính toán có bị lệch so với bảng Excel thực tế hay không.

```java
    public static void main(String[] args) {
        IncomeCalculator calculator = new IncomeCalculator();
        
        // ---------------------------------------------
        // Kịch bản 1: Tư vấn viên (FC) chạy tốt
        // ---------------------------------------------
        AgentData fcData = new AgentData();
        fcData.role = Role.FC;
        fcData.activeMonth = 5;
        fcData.personalFyp = 50.0;
        fcData.commissionRate = 0.3;
        fcData.aitomGrade = AiTOMGrade.A; // Xếp loại tốt => Hệ số cao
        fcData.k2Rate = 0.75; // K2 75% => Hệ số K2 = 1.0
        fcData.quarterlyFyp = 150.0;
        fcData.quarterlyFyc = 45.0;
        fcData.activeMonthsInQuarter = 3;
        fcData.partnerLevel = ShinhanPartner.S_PARTNER;
        
        IncomeResult fcResult = calculator.calculate(fcData);
        System.out.println("--- KẾT QUẢ TÍNH TOÁN FC ---");
        System.out.println("Hoa hồng cơ bản (FYC): " + fcResult.fyc + " triệu");
        System.out.println("Thưởng năng suất tháng: " + fcResult.monthlyBonus + " triệu");
        System.out.println("Thưởng năng suất quý: " + fcResult.quarterlyBonus + " triệu");
        System.out.println("Thưởng Shinhan Partner: " + fcResult.shinhanPartnerBonus + " triệu");
        System.out.println("Tổng thu nhập: " + fcResult.totalIncome + " triệu\n");
        
        // ---------------------------------------------
        // Kịch bản 2: Quản lý cấp trung (GSL)
        // ---------------------------------------------
        AgentData gslData = new AgentData();
        gslData.role = Role.GSL;
        gslData.activeMonth = 15;
        gslData.isLateralRecruitment = true;
        gslData.activeHeadcount = 3; // Đạt chỉ tiêu hoạt động
        gslData.k2Rate = 0.85; // Trên 80% và active >= 12 tháng => K2 = 1.2
        gslData.directTeamFyp = 70.0;
        gslData.directTeamFyc = 21.0;
        gslData.indirectTeamFycL1 = 10.0;
        
        IncomeResult gslResult = calculator.calculate(gslData);
        System.out.println("--- KẾT QUẢ TÍNH TOÁN GSL ---");
        System.out.println("Phí đào tạo đội ngũ: " + gslResult.teamTrainingFee + " triệu");
        System.out.println("Phí khai thác trực tiếp: " + gslResult.directTeamExploitationFee + " triệu");
        System.out.println("Phí khai thác gián tiếp: " + gslResult.indirectTeamExploitationFee + " triệu");
        System.out.println("Tổng thu nhập: " + gslResult.totalIncome + " triệu");
    }
}
```
