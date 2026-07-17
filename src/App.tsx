import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAppState } from './hooks/useAppState';
import { OrderPage } from './components/OrderPage';
import { RestaurantsPage } from './components/RestaurantsPage';
import { FundPage } from './components/FundPage';
import { HistoryPage } from './components/HistoryPage';
import { LoginModal } from './components/LoginModal';
import './App.css';

type Tab = 'order' | 'restaurants' | 'fund' | 'history';

function AppContent() {
  const [tab, setTab] = useState<Tab>('order');
  const [loginOpen, setLoginOpen] = useState(false);
  const {
    user,
    logout,
    isAdmin,
    isLoggedIn,
    authError,
    clearAuthError,
    loading: authLoading,
  } = useAuth();
  const app = useAppState();

  // Sau Google redirect thất bại → mở modal + hiện lỗi
  useEffect(() => {
    if (!authLoading && authError && !isLoggedIn) {
      setLoginOpen(true);
    }
  }, [authLoading, authError, isLoggedIn]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍱 Lunch Order</h1>
        <nav className="tabs">
          <button
            type="button"
            className={tab === 'order' ? 'active' : ''}
            onClick={() => setTab('order')}
          >
            Đặt món hôm nay
          </button>
          <button
            type="button"
            className={tab === 'restaurants' ? 'active' : ''}
            onClick={() => setTab('restaurants')}
          >
            Quán ăn tham khảo
          </button>
          <button
            type="button"
            className={tab === 'fund' ? 'active' : ''}
            onClick={() => setTab('fund')}
          >
            Quản lý quỹ
          </button>
          <button
            type="button"
            className={tab === 'history' ? 'active' : ''}
            onClick={() => setTab('history')}
          >
            Lịch sử
          </button>
        </nav>

        <div className="header-status">
          <span
            className={`status-dot ${app.connected ? 'online' : 'offline'}`}
            title={app.connected ? 'Đã kết nối' : 'Mất kết nối'}
          />
          <span className="online-count">
            {app.connected ? 'Đồng bộ' : 'Mất kết nối'}
          </span>
        </div>

        <div className="header-auth">
          {isLoggedIn ? (
            <>
              <div className="user-chip" title={user?.email || user?.username}>
                {user?.avatarUrl ? (
                  <img
                    className="user-avatar"
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="user-avatar user-avatar-fallback" aria-hidden>
                    {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="user-meta">
                  <span className="user-name">
                    {user?.name || user?.username}
                  </span>
                  <span className="user-sub">
                    {user?.email || user?.username}
                    {isAdmin
                      ? ' · Super Admin'
                      : user?.auth === 'google'
                        ? ' · Thành viên'
                        : ''}
                  </span>
                </span>
              </div>
              <button type="button" className="btn-header" onClick={logout}>
                Đăng xuất
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-reset"
                  onClick={() => {
                    if (
                      confirm(
                        'Reset XÓA TOÀN BỘ: thành viên, quán, quỹ, đơn hôm nay và lịch sử đã lưu. Bạn chắc chắn?',
                      )
                    ) {
                      app.resetState();
                    }
                  }}
                  title="Xóa toàn bộ dữ liệu (kể cả lịch sử)"
                >
                  Reset
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="btn-header btn-login"
              onClick={() => setLoginOpen(true)}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      {authError && (
        <div className="toast-error" role="alert">
          {authError}
          <button
            type="button"
            className="toast-dismiss"
            onClick={clearAuthError}
          >
            Đóng
          </button>
        </div>
      )}
      {app.error && <div className="toast-error">{app.error}</div>}

      <main className="app-main">
        {tab === 'order' && (
          <OrderPage
            state={app.state}
            isAdmin={isAdmin}
            updateOrder={app.updateOrder}
            updateSummaryExtra={app.updateSummaryExtra}
            finalizeSessionCosts={app.finalizeSessionCosts}
            addShopToday={app.addShopToday}
            updateShopToday={app.updateShopToday}
            addTodayOrder={app.addTodayOrder}
            deleteTodayOrder={app.deleteTodayOrder}
          />
        )}
        {tab === 'restaurants' && (
          <RestaurantsPage
            state={app.state}
            isAdmin={isAdmin}
            addRestaurant={app.addRestaurant}
            updateRestaurant={app.updateRestaurant}
            deleteRestaurant={app.deleteRestaurant}
          />
        )}
        {tab === 'fund' && (
          <FundPage
            state={app.state}
            isAdmin={isAdmin}
            updateFundField={app.updateFundField}
            toggleOrderCheck={app.toggleOrderCheck}
            setDailyCost={app.setDailyCost}
            setContribution={app.setContribution}
            addOrderDate={app.addOrderDate}
            addMember={app.addMember}
            disburseToShopOwner={app.disburseToShopOwner}
          />
        )}
        {tab === 'history' && (
          <HistoryPage
            state={app.state}
            isAdmin={isAdmin}
            closeDay={app.closeDay}
          />
        )}
      </main>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
