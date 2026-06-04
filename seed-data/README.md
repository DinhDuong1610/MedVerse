# MedVerse Rich Demo Seed Kit

Bộ seed này dùng cho nhánh demo/local. Không cần chỉnh GitHub trực tiếp.

## Nội dung đã được nâng cấp

- Giữ 4 tài khoản chính: Admin, bác sĩ, lễ tân, bệnh nhân.
- Thêm 4 bệnh nhân phụ để bảng lịch khám, ca khám, bệnh án và đơn thuốc có dữ liệu sinh động.
- Thêm nhiều slot làm việc: còn trống, đã đặt, đã hủy, hôm nay, ngày mai, quá khứ.
- Thêm nhiều appointment request: pending, approved, rejected, cancelled.
- Thêm nhiều appointment: scheduled, confirmed/đang chờ khám, completed, cancelled, no-show.
- Thêm bệnh án: draft, completed, cancelled.
- Thêm đơn thuốc: draft, finalized, có cảnh báo an toàn mức LOW/MEDIUM/HIGH.
- Import toàn bộ thuốc ATC/AI và tăng tồn kho tối thiểu lên khoảng 1500+ để bác sĩ kê đơn thoải mái.

## Tài khoản chính

| Vai trò | Email | Password |
|---|---|---|
| Admin | `admin@medverse.vn` | `Admin@123456` |
| Bác sĩ | `doctor.demo@medverse.vn` | `Doctor@123456` |
| Lễ tân | `receptionist.demo@medverse.vn` | `Receptionist@123456` |
| Bệnh nhân chính | `patient.demo@medverse.vn` | `Patient@123456` |

## Bệnh nhân phụ

Các tài khoản này dùng để dữ liệu bác sĩ/lễ tân đa dạng hơn. Nếu cần đăng nhập thử, dùng cùng mật khẩu `Patient@123456`.

| Bệnh nhân | Email | Nội dung demo |
|---|---|---|
| Nguyễn Thị Mai | `patient.mai@medverse.vn` | Viêm mũi dị ứng, đơn nháp |
| Phạm Anh Khoa | `patient.khoa@medverse.vn` | Tăng huyết áp, đơn đã hoàn tất |
| Trần Minh Đức | `patient.duc@medverse.vn` | Ca sắp khám/chưa khám |
| Hoàng Bảo Ngọc | `patient.ngoc@medverse.vn` | Hen nhẹ, lịch đã hủy, dị ứng Penicillin |

## Thứ tự SQL

```text
seed-data/sql/02_ai_medications_from_atc.sql      # import thuốc AI + tăng tồn kho
seed-data/sql/01_demo_reset_core.sql              # reset tài khoản chính + dữ liệu lõi
seed-data/sql/03_rich_demo_clinical_data.sql      # thêm dữ liệu lâm sàng dồi dào
```

## Chạy reset trước demo

Cách sạch nhất:

```bash
docker compose down -v
docker compose up --build -d
```

Sau khi backend migrate xong:

```bash
docker compose -f docker-compose.yml -f seed-data/docker-compose.demo-seed.yml run --rm demo-seed
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File seed-data/scripts/reset-demo-seed.ps1
```

Linux/macOS/Git Bash:

```bash
bash seed-data/scripts/reset-demo-seed.sh
```

## Màn hình sẽ có dữ liệu ngay

- `/dashboard/receptionist/requests`: có nhiều yêu cầu chờ duyệt, đã duyệt, bị từ chối, đã hủy.
- `/dashboard/receptionist/appointments`: có ca confirmed, scheduled, completed, cancelled, no-show.
- `/dashboard/doctor/work-slots`: có slot hôm nay/ngày mai, available/booked/cancelled.
- `/dashboard/doctor/cases`: mặc định hôm nay có ca đang chờ khám, ca đang khám, ca hoàn tất, ca hủy, no-show.
- `/dashboard/doctor/medical-records`: có bệnh án nháp, hoàn tất, hủy.
- `/dashboard/doctor/prescriptions`: có đơn nháp, đơn hoàn tất, đơn có cảnh báo an toàn.
- `/dashboard/patient`: tài khoản `patient.demo@medverse.vn` có request, appointment, bệnh án và đơn thuốc.

## Lưu ý

- Bộ seed không thay đổi cấu trúc bảng.
- SQL dùng helper tự kiểm tra bảng/cột tồn tại rồi mới insert.
- Nếu schema thực tế có thêm cột `NOT NULL` không có default, PostgreSQL có thể báo lỗi. Khi đó gửi lỗi cho mình để bổ sung field đúng schema.
- Vì dùng Docker volume, muốn reset sạch tuyệt đối trước buổi demo thì dùng `docker compose down -v` rồi seed lại.
