# Lunch Order 🍱

Web app quản lý đặt đồ ăn trưa nhóm — quỹ chung, đồng bộ realtime.

## Lưu trữ dữ liệu (Supabase hoặc file)

| Chế độ | Khi nào | Ghi chú |
|---|---|---|
| **Supabase** | Có `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` trong `.env` | Data cloud, sống khi đổi máy |
| **File** | Thiếu biến Supabase | `server/data/state.json` (local) |

### Setup Supabase (1 lần)

1. Tạo project tại [supabase.com](https://supabase.com)
2. **SQL Editor** → chạy file [`supabase/schema.sql`](supabase/schema.sql)
3. **Project Settings → API** copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` key (secret) → `SUPABASE_SERVICE_ROLE_KEY`
4. Thêm vào `.env` (xem `.env.example`)
5. `npm run dev:all` — log server sẽ hiện `Storage: supabase`

> Dùng **service_role** chỉ trên server, không đưa vào frontend.

Data lưu: thành viên, quán tham khảo, quỹ, đơn hôm nay, lịch sử đặt món.

## Phân quyền

| Thao tác | Khách | Admin |
|---|---|---|
| Điền món, shop, tick đã đặt | ✅ | ✅ |
| Chốt chi phí / giải ngân / quỹ | ❌ | ✅ |
| Quán tham khảo CRUD | ❌ | ✅ |
| Lưu ngày & sang ngày mới | ❌ | ✅ |

## Tài khoản mặc định

| Username | Password |
|---|---|
| `admin` | `admin123` |

## Quy trình

1. Admin ghi đóng quỹ  
2. Mọi người đặt món; chủ shop nhập TT thực tế  
3. Admin chốt chi phí → giải ngân  
4. Cuối ngày: tab **Lịch sử** → **Lưu & sang ngày mới**

## Chạy app

```bash
npm install
copy .env.example .env
# điền SUPABASE_* nếu dùng cloud
npm run dev:all
```

- App: http://localhost:5173  
- API health: http://localhost:3001/api/health (`storage`: `supabase` | `file`)

## Production

```bash
npm run build
npm start
```
