import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: Props) {
  const { login, loginWithGoogle, googleAuthEnabled } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(username, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setUsername('');
    setPassword('');
    onClose();
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const err = await loginWithGoogle();
    setLoading(false);
    if (err) setError(err);
    // Nếu OK, trình duyệt sẽ redirect sang Google
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Đăng nhập</h2>
        <p className="modal-desc">
          Đăng nhập Google bằng tài khoản Super Admin để quản lý quỹ, chốt chi
          phí, giải ngân và sửa danh sách quán.
        </p>

        {googleAuthEnabled && (
          <>
            <button
              type="button"
              className="btn-google"
              onClick={handleGoogle}
              disabled={loading}
            >
              <span className="btn-google-icon" aria-hidden>
                G
              </span>
              {loading ? 'Đang chuyển...' : 'Đăng nhập với Google'}
            </button>
            <div className="login-divider">
              <span>hoặc tài khoản Admin mặc định</span>
            </div>
          </>
        )}

        {!googleAuthEnabled && (
          <p className="form-error" style={{ marginBottom: 12 }}>
            Chưa bật Google: trên Vercel cần có VITE_SUPABASE_URL +
            VITE_SUPABASE_ANON_KEY (hoặc SUPABASE_URL + SUPABASE_ANON_KEY từ
            integration), rồi Redeploy. Local: thêm vào .env và restart{' '}
            <code>npm run dev</code>.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            Tên đăng nhập
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus={!googleAuthEnabled}
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
