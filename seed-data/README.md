# MedVerse Demo Seed Kit

Bộ file này dùng để tạo nhánh demo và seed lại dữ liệu demo ổn định trước khi thuyết trình.

## Tài khoản chính

| Vai trò | Email | Password |
|---|---|---|
| Admin | `admin@medverse.vn` | `Admin@123456` |
| Bác sĩ | `doctor.demo@medverse.vn` | `Doctor@123456` |
| Lễ tân | `receptionist.demo@medverse.vn` | `Receptionist@123456` |
| Bệnh nhân | `patient.demo@medverse.vn` | `Patient@123456` |

## File chính

```text
seed-data/sql/02_ai_medications_from_atc.sql   # import toàn bộ thuốc ATC/AI vào kho
seed-data/sql/01_demo_reset_core.sql           # reset tài khoản + dữ liệu nghiệp vụ demo
seed-data/data/atc_metadata_with_profiles.json # dữ liệu AI gốc
seed-data/data/ATC-clean-final.csv             # dataset AI gốc dạng CSV
```

## Cách tạo nhánh demo local

```bash
git checkout main
git pull
git checkout -b demo/seed-data
mkdir -p seed-data
# copy toàn bộ thư mục seed-data trong kit này vào root project
```

## Cách chạy reset sạch nhất trước demo

Cách chắc chắn nhất là xóa volume database rồi build lại:

```bash
docker compose down -v
docker compose up --build -d
```

Sau khi backend đã migrate xong, chạy seed:

```bash
# Cách 1: nếu đã copy docker-compose.demo-seed.yml vào seed-data
docker compose -f docker-compose.yml -f seed-data/docker-compose.demo-seed.yml run --rm demo-seed
```

Hoặc chạy trực tiếp trong container postgres, chỉnh user/db nếu project dùng tên khác:

```bash
docker compose cp seed-data/sql/02_ai_medications_from_atc.sql postgres:/tmp/02_ai_medications_from_atc.sql
docker compose cp seed-data/sql/01_demo_reset_core.sql postgres:/tmp/01_demo_reset_core.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/02_ai_medications_from_atc.sql
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/01_demo_reset_core.sql
```

## Vì sao import thuốc trước core seed?

`01_demo_reset_core.sql` có tạo sẵn đơn thuốc mẫu và cố gắng liên kết thuốc `N02BE01` và `R05CB01` từ bảng `medications` nếu tìm được. Vì vậy nên chạy import thuốc trước.

## Reset lại trước mỗi lần demo

Không cần build lại code. Chạy lại 2 SQL này là dữ liệu demo trở về trạng thái ban đầu:

```bash
psql -f seed-data/sql/02_ai_medications_from_atc.sql
psql -f seed-data/sql/01_demo_reset_core.sql
```

## Lưu ý quan trọng

- Bộ seed không thay đổi cấu trúc bảng.
- SQL có helper tự kiểm tra bảng/cột tồn tại rồi mới insert để giảm lỗi lệch schema.
- Nếu project của bạn có cột `NOT NULL` mới mà không có default và không có trong seed, PostgreSQL vẫn có thể báo lỗi. Khi đó gửi lỗi cho ChatGPT để bổ sung key vào JSON seed.
- Không commit thẳng lên `main`. Hãy commit trên nhánh `demo/seed-data` trước.

## Thống kê thuốc AI

- Metadata AI: 1306 ATC profiles.
- CSV gốc: 2903 dòng.
- SQL import: 1305 thuốc/kho tương ứng ATC profile.
