# Việc bạn bắt buộc làm tay (dashboard)

Code trong repo đã sẵn sàng cho Vercel + Supabase. Chỉ còn các bước dưới đây — làm **đúng thứ tự**.

Domain production hiện tại: `https://h-order-eta.vercel.app`

---

## 1. Supabase — chạy SQL (1 lần)

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → project của bạn
2. **SQL Editor** → New query
3. Copy toàn bộ file `supabase/schema.sql` trong repo → **Run**
4. Kiểm tra **Table Editor** có bảng `app_state`

Nếu trước đó đã chạy schema cũ: chạy lại cũng được (script an toàn / idempotent).

---

## 2. Supabase — lấy API keys

**Project Settings → API**:

| Key | Dùng ở đâu |
|---|---|
| Project URL | `SUPABASE_URL` + `VITE_SUPABASE_URL` |
| `anon` `public` | `VITE_SUPABASE_ANON_KEY` |
| `service_role` | `SUPABASE_SERVICE_ROLE_KEY` (**bí mật**, chỉ server/Vercel) |

---

## 3. Google OAuth (đăng nhập Google)

### 3a. Google Cloud Console

1. [APIs & Credentials](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. **Authorized redirect URIs** — thêm đúng URI từ Supabase (bước 3b):
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   (`project-ref` là phần subdomain trong Project URL, ví dụ `abcdefgh.supabase.co`)
4. Copy **Client ID** và **Client Secret**

### 3b. Supabase Google provider

1. **Authentication → Providers → Google** → Enable
2. Dán Client ID + Client Secret → Save
3. Copy **Callback URL** hiện trên trang này → dán vào Google Cloud (3a) nếu chưa khớp

### 3c. Supabase URL Configuration

**Authentication → URL Configuration**:

| Field | Giá trị |
|---|---|
| **Site URL** | `https://h-order-eta.vercel.app` |
| **Redirect URLs** | thêm cả 2 dòng: |
| | `https://h-order-eta.vercel.app` |
| | `https://h-order-eta.vercel.app/**` |
| | (local) `http://localhost:5173` |
| | `http://localhost:5173/**` |

---

## 4. Vercel — env vars + deploy

1. [Vercel](https://vercel.com) → Import repo `lunch-order` (GitHub) nếu chưa gắn
2. **Settings → Environment Variables** — thêm cho **Production** (và Preview nếu muốn):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<mật-khẩu-mạnh>
JWT_SECRET=<chuỗi-ngẫu-nhiên-dài>
SUPER_ADMIN_EMAILS=linhptn@dinogames.gg
ALLOWED_GOOGLE_DOMAINS=dinogames.gg

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role>

VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_public>
```

3. **Deployments → … → Redeploy** (bắt buộc sau khi thêm `VITE_*` — vì Vite bake vào lúc build)

> `VITE_*` phải có lúc **build**. Đổi anon key → Redeploy lại.

### Nếu vẫn hiện “Chưa bật Google”

1. Vercel → **Settings → Environment Variables** → xóa filter search, xác nhận có **cả hai**:
   - `VITE_SUPABASE_URL` **hoặc** `SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` **hoặc** `SUPABASE_ANON_KEY`
2. Mở đúng domain trong **Vercel → Settings → Domains** (không phải URL `*-projects.vercel.app` bị chặn Auth).
3. **Deployments → Redeploy** với **uncheck** “Use existing Build Cache”.
4. Hard refresh trình duyệt (`Ctrl+Shift+R`).

`https://h-order-eta.vercel.app` nếu 404 → domain chưa gắn project; dùng domain trong tab Domains.

---

## 5. Kiểm tra nhanh

1. Mở `https://h-order-eta.vercel.app`
2. Chấm xanh “Đã kết nối” trên header
3. Đăng nhập Google bằng `linhptn@dinogames.gg` → phải vào được Admin
4. Sửa 1 ô món → refresh trang / mở tab khác → data còn

API health (nếu cần): `https://h-order-eta.vercel.app/api/health`  
Expect: `"storage":"supabase"`, `"ok":true`

---

## Không cần làm tay

- Cấu hình HTTP API / Realtime trong code
- `vercel.json`, rewrite SPA
- Logic Super Admin từ `SUPER_ADMIN_EMAILS`
- Schema + policy đọc `app_state` (chỉ cần **Run** SQL ở bước 1)
