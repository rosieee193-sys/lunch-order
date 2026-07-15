import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAppState } from './hooks/useAppState';
import { OrderPage } from './components/OrderPage';
import { RestaurantsPage } from './components/RestaurantsPage';
import { FundPage } from './components/FundPage';
import { LoginModal } from './components/LoginModal';
import './App.css';

type Tab = 'order' | 'restaurants' | 'fund';

function AppContent() {
  const [tab, setTab] = useState<Tab>('order');
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, logout, isAdmin, isLoggedIn } = useAuth();
  const app = useAppState();

  const roleLabel = isAdmin ? 'Admin' : null;

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
        </nav>

        <div className="header-status">
          <span
            className={`status-dot ${app.connected ? 'online' : 'offline'}`}
            title={app.connected ? 'Đã kết nối' : 'Mất kết nối'}
          />
          <span className="online-count">{app.online} online</span>
        </div>

        <div className="header-auth">
          {isLoggedIn ? (
            <>
              <span className="admin-badge admin-role">
                {roleLabel}: {user?.username}
              </span>
              <button type="button" className="btn-header" onClick={logout}>
                Đăng xuất
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-reset"
                  onClick={() => {
                    if (confirm('Reset toàn bộ dữ liệu về mặc định?')) {
                      app.resetState();
                    }
                  }}
                  title="Reset dữ liệu"
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
