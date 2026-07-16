# Bật đăng nhập Google (Supabase Auth)

Chi tiết đầy đủ (kèm Vercel): xem [`MANUAL_SETUP.md`](../MANUAL_SETUP.md).

Tóm tắt:

1. **Settings → API**: lấy URL + `anon` → `VITE_SUPABASE_*`; `service_role` → server only
2. **Authentication → Providers → Google**: bật + Client ID/Secret từ Google Cloud  
   Redirect URI Google: `https://<project-ref>.supabase.co/auth/v1/callback`
3. **URL Configuration**: Site URL + Redirect URLs = domain Vercel + `http://localhost:5173`
4. `.env` / Vercel: `SUPER_ADMIN_EMAILS=linhptn@dinogames.gg`
5. Redeploy Vercel sau khi thêm `VITE_*`
