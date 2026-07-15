# Bật đăng nhập Google (Supabase Auth)

## 1. Lấy anon key
Supabase → **Project Settings** → **API**:
- Project URL → `VITE_SUPABASE_URL` + `SUPABASE_URL`
- `anon` `public` → `VITE_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (chỉ server)

## 2. Bật Google provider
1. **Authentication** → **Providers** → **Google** → Enable
2. Tạo OAuth Client trên [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Type: **Web application**
   - Authorized redirect URIs: copy URI hiện trong trang Google provider của Supabase  
     (dạng `https://<project-ref>.supabase.co/auth/v1/callback`)
3. Dán **Client ID** + **Client Secret** vào Supabase Google provider → Save

## 3. Redirect URL app
**Authentication** → **URL Configuration**:
- Site URL: `http://localhost:5173`
- Redirect URLs: thêm `http://localhost:5173` (và domain production nếu có)

## 4. Super Admin
Trong `.env`:

```env
SUPER_ADMIN_EMAILS=linhptn@dinogames.gg
```

Chỉ các email trong list được cấp quyền Admin sau khi đăng nhập Google.

## 5. Restart
```bash
npm run dev:all
```
