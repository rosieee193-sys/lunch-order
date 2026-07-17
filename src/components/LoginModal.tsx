import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: Props) {
  const { login, loginWithGoogle, googleAuthEnabled, authError, clearAuthError } =
    useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    clearAuthError();
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
    clearAuthError();
    const err = await loginWithGoogle();
    setLoading(false);
    if (err) setError(err);
  };

  const displayError = error || authError;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Đăng nhập</h2>
        <p className="modal-desc">
          Đăng nhập Google bằng tài khoản workspace (@dinogames.gg). Super Admin
          quản lý quỹ / chốt chi phí; thành viên khác vẫn đăng nhập để hiện thông
          tin cá nhân.
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
          {displayError && <p className="form-error">{displayError}</p>}
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
