# Lunch Order 🍱

Web app quản lý đặt đồ ăn trưa nhóm — quỹ chung, đồng bộ realtime.

## Phân quyền

| Thao tác | Khách (không đăng nhập) | Admin |
|---|---|---|
| Điền món, quán, giá, ghi chú | ✅ | ✅ |
| Thêm shop, nhập thanh toán thực tế | ✅ | ✅ |
| Tick **Đã đặt** | ✅ | ✅ |
| Chốt chi phí | ❌ | ✅ |
| Ghi **Đóng quỹ**, thêm thành viên | ❌ | ✅ |
| Sửa danh sách quán tham khảo | ❌ | ✅ |
| **Giải ngân** cho chủ shop | ❌ | ✅ |
| Xem quỹ / số dư | ✅ | ✅ |

## Tài khoản mặc định

| Loại | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |

## Quy trình

1. Thành viên chuyển tiền → **Admin** ghi đóng quỹ
2. Mọi người đặt món; chủ shop (người đặt đơn) nhập thanh toán thực tế
3. Mọi người tick **đã đặt** khi chủ shop đặt xong; **Admin** **Chốt chi phí** → trừ số dư từng người
4. **Admin** giải ngân hoàn tiền cho chủ shop

## Giao diện

- **Đặt món hôm nay** — bảng đặt món, chủ shop, tổng hợp theo quán
- **Quán ăn tham khảo** — danh sách quán gợi ý (Admin thêm/sửa/xóa)
- **Quản lý quỹ** — đóng quỹ, số dư, giải ngân

## Chạy app

```bash
npm install
copy .env.example .env
npm run dev:all
```

- App: http://localhost:5173
- Server: http://localhost:3001

## Production

```bash
npm run build
npm start
```
