import { useMemo, useState } from 'react';
import type { AppState, OrderEntry } from '../types';
import { ShopTodayTable } from './ShopTodayTable';
import { SyncedTextInput } from './SyncedTextInput';
import {
  getOrderLineTotal,
  getOrderDiscount,
  summarizeByRestaurant,
  formatCurrency,
  parseNumber,
  getSession,
  sessionPaymentTotal,
  pendingDisbursement,
  getShopOwnersToday,
  hasShopOwnersToday,
  shopTodayAdvanceTotal,
  getShopStats,
  pickersNeededForRestaurant,
  parsePickupNames,
  SERVINGS_PER_PICKER,
  getRestaurantPayment,
} from '../utils/calculations';

interface Props {
  state: AppState;
  isAdmin: boolean;
  updateOrder: (id: string, patch: Partial<OrderEntry>) => void;
  updateSummaryExtra: (
    restaurant: string,
    field: 'reward' | 'payment',
    value: number,
  ) => void;
  finalizeSessionCosts: () => void;
  addShopToday: () => void;
  updateShopToday: (
    id: string,
    patch: Partial<import('../types').ShopTodayEntry>,
  ) => void;
  addTodayOrder: () => void;
  deleteTodayOrder: (id: string) => void;
}

export function OrderPage({
  state,
  isAdmin,
  updateOrder,
  updateSummaryExtra,
  finalizeSessionCosts,
  addShopToday,
  updateShopToday,
  addTodayOrder,
  deleteTodayOrder,
}: Props) {
  const [filterRestaurant, setFilterRestaurant] = useState('');

  const session = getSession(state);
  const shopOwners = getShopOwnersToday(state);
  const advanceTotal = shopTodayAdvanceTotal(state);
  const paymentTotal = sessionPaymentTotal(state);
  const pending = pendingDisbursement(session);

  const summary = useMemo(
    () => summarizeByRestaurant(state),
    [state],
  );

  const shopRestaurants = useMemo(() => {
    const names = state.shopTodayEntries
      .map((e) => e.restaurant.trim())
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [state.shopTodayEntries]);

  const filteredOrders = filterRestaurant
    ? state.todayOrders.filter((o) =>
        o.restaurant.toLowerCase().includes(filterRestaurant.toLowerCase()),
      )
    : state.todayOrders;

  const orderedCount = state.todayOrders.filter((o) => o.ordered).length;
  const totalWithOrder = state.todayOrders.filter(
    (o) => o.restaurant.trim() && o.unitPrice > 0,
  ).length;

  return (
    <div className="order-layout">
      <div className="order-main">
        <div className="panel-header">
          <h2>Đặt món — {state.sessionDate}</h2>
          <div className="header-actions">
            <input
              type="text"
              placeholder="Lọc theo quán..."
              value={filterRestaurant}
              onChange={(e) => setFilterRestaurant(e.target.value)}
              className="filter-input"
            />
            <span className="badge">
              Đã đặt: {orderedCount}/{totalWithOrder}
            </span>
          </div>
        </div>

        <div className="guest-banner">
          Điền món và giá bên dưới — chọn quán từ danh sách shop đã mở ở bảng
          trên.
        </div>

        <ShopTodayTable
          state={state}
          addShopToday={addShopToday}
          updateShopToday={updateShopToday}
        />

        <div className="section-header orders-section-header">
          <h3>Chi tiết đặt món</h3>
          <button
            type="button"
            className="btn-sm btn-add-row"
            onClick={addTodayOrder}
          >
            + Thêm người đặt
          </button>
        </div>
        <p className="section-hint orders-hint">
          Chỉ thêm dòng khi bạn đặt cơm — gõ tên để chọn từ danh sách quỹ.
        </p>

        <div className="table-scroll orders-scroll">
          <table className="data-table order-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Tên món</th>
                <th>Quán</th>
                <th>Đơn giá</th>
                <th>Note</th>
                <th>Đã đặt</th>
                <th>Giảm giá</th>
                <th>Thành tiền</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    Chưa có ai đặt — bấm &quot;+ Thêm người đặt&quot;
                  </td>
                </tr>
              ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className={o.ordered ? 'row-ordered' : ''}>
                  <td className="cell-name-input">
                    <SyncedTextInput
                      type="text"
                      value={o.ordererName}
                      list="fund-member-names"
                      onCommit={(ordererName) =>
                        updateOrder(o.id, { ordererName })
                      }
                      placeholder="Tên của bạn..."
                    />
                  </td>
                  <td>
                    <SyncedTextInput
                      type="text"
                      value={o.dishName}
                      onCommit={(dishName) => updateOrder(o.id, { dishName })}
                      placeholder="Tên món..."
                    />
                  </td>
                  <td className="cell-quan-select">
                    <select
                      value={o.restaurant}
                      onChange={(e) =>
                        updateOrder(o.id, { restaurant: e.target.value })
                      }
                      disabled={shopRestaurants.length === 0}
                      title={
                        shopRestaurants.length === 0
                          ? 'Thêm shop ở bảng Các shop hôm nay trước'
                          : undefined
                      }
                    >
                      <option value="">
                        {shopRestaurants.length === 0
                          ? '— Thêm shop ở trên —'
                          : '— Chọn quán —'}
                      </option>
                      {!shopRestaurants.includes(o.restaurant) &&
                        o.restaurant.trim() && (
                          <option value={o.restaurant}>{o.restaurant}</option>
                        )}
                      {shopRestaurants.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={o.unitPrice || ''}
                      onChange={(e) =>
                        updateOrder(o.id, {
                          unitPrice: parseNumber(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="cell-number"
                    />
                  </td>
                  <td>
                    <SyncedTextInput
                      type="text"
                      value={o.note}
                      onCommit={(note) => updateOrder(o.id, { note })}
                      placeholder="Ghi chú..."
                    />
                  </td>
                  <td className="cell-center">
                    <input
                      type="checkbox"
                      checked={o.ordered}
                      onChange={(e) =>
                        updateOrder(o.id, { ordered: e.target.checked })
                      }
                      title="Đánh dấu đã đặt trên app giao hàng"
                    />
                  </td>
                  <td className="cell-number cell-calc">
                    {o.unitPrice > 0 && o.restaurant.trim()
                      ? formatCurrency(getOrderDiscount(o, state))
                      : '—'}
                  </td>
                  <td className="cell-total">
                    {formatCurrency(getOrderLineTotal(o, state))}
                  </td>
                  <td className="cell-center">
                    <button
                      type="button"
                      className="btn-delete-sm"
                      onClick={() => deleteTodayOrder(o.id)}
                      title="Xóa dòng"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
          <datalist id="fund-member-names">
            {state.members.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </div>
      </div>

      <aside className="order-sidebar">
        <section className="sidebar-panel session-panel">
          <h3>Chủ shop hôm nay</h3>
          <p className="sidebar-hint">Người đặt đơn từ bảng Các shop hôm nay</p>
          {shopOwners.length > 0 ? (
            <ul className="shop-owner-list">
              {shopOwners.map((o) => (
                <li key={o.id}>
                  <strong>{o.ordererName}</strong>
                  {o.restaurant ? (
                    <span className="shop-owner-quan"> — {o.restaurant}</span>
                  ) : null}
                  {o.actualPayment > 0 ? (
                    <span className="shop-owner-pay">
                      {' '}
                      ({formatCurrency(o.actualPayment)} đ)
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              Chưa có — thêm người đặt đơn ở bảng Các shop hôm nay
            </p>
          )}

          {advanceTotal > 0 && (
            <p className="session-advance-total">
              Tổng thanh toán thực tế:{' '}
              <strong>{formatCurrency(advanceTotal)} đ</strong>
            </p>
          )}

          <h4 className="sidebar-subtitle">Người đi lấy đơn</h4>
          <p className="sidebar-hint">
            Tự chọn: ~{SERVINGS_PER_PICKER} suất/người — chỉ người đặt món cùng
            quán, người đặt shop không đi lấy
          </p>
          {state.shopTodayEntries.length === 0 ? (
            <p className="text-muted">Chưa có shop nào hôm nay</p>
          ) : (
            <ul className="pickup-list">
              {state.shopTodayEntries.map((entry) => {
                const { totalOrders } = getShopStats(
                  state.todayOrders,
                  entry.restaurant,
                );
                const needed = pickersNeededForRestaurant(
                  state.todayOrders,
                  entry.restaurant,
                );
                const pickers = parsePickupNames(entry.pickupPersonName ?? '');
                return (
                  <li key={entry.id}>
                    <span className="pickup-quan">
                      {entry.restaurant.trim() || '— Quán —'}
                    </span>
                    <span className="pickup-meta">
                      {totalOrders} suất → {needed} người
                    </span>
                    {pickers.length > 0 ? (
                      <span className="pickup-names">{pickers.join(', ')}</span>
                    ) : (
                      <span className="text-muted pickup-names">
                        {totalOrders > 0 ? 'Chưa đủ người' : 'Chưa có suất'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {isAdmin && (
            <div className="session-form">
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={() => {
                  if (
                    confirm(
                      'Chốt chi phí hôm nay vào quỹ từng thành viên?',
                    )
                  ) {
                    finalizeSessionCosts();
                  }
                }}
                disabled={!hasShopOwnersToday(state) || session.costsFinalized}
              >
                {session.costsFinalized
                  ? '✓ Đã chốt chi phí'
                  : 'Chốt chi phí hôm nay'}
              </button>
            </div>
          )}

          {hasShopOwnersToday(state) && (
            <div className="session-status">
              {session.costsFinalized ? (
                <span className="status-tag done">Đã chốt chi phí</span>
              ) : (
                <span className="status-tag pending">Chưa chốt chi phí</span>
              )}
              {pending > 0 ? (
                <span className="status-tag warn">
                  Chờ giải ngân: {formatCurrency(pending)} đ
                </span>
              ) : session.disbursedAmount > 0 ? (
                <span className="status-tag done">
                  ✓ Đã giải ngân {formatCurrency(session.disbursedAmount)} đ
                </span>
              ) : null}
            </div>
          )}
        </section>

        <section className="sidebar-panel">
          <h3>Thực đơn hôm nay</h3>
          <table className="data-table summary-table">
            <thead>
              <tr>
                <th>Tên Quán</th>
                <th>Tổng đơn</th>
                <th>Thành tiền</th>
                <th>Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    Chưa có đơn nào
                  </td>
                </tr>
              ) : (
                summary.map((s) => {
                  const payment = getRestaurantPayment(
                    state,
                    s.restaurant,
                    s.totalAmount,
                  );
                  const extras = state.summaryExtras[s.restaurant];
                  const hasManualPayment =
                    extras?.payment != null && extras.payment > 0;
                  return (
                    <tr key={s.restaurant}>
                      <td className="cell-name">{s.restaurant}</td>
                      <td className="cell-center">{s.totalOrders}</td>
                      <td className="cell-total">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td>
                        {isAdmin ? (
                          <input
                            type="number"
                            min={0}
                            value={
                              hasManualPayment
                                ? extras.payment
                                : payment || ''
                            }
                            onChange={(e) =>
                              updateSummaryExtra(
                                s.restaurant,
                                'payment',
                                parseNumber(e.target.value),
                              )
                            }
                            className="cell-number cell-sm"
                            placeholder={String(payment)}
                          />
                        ) : (
                          formatCurrency(payment)
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {summary.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className="cell-name">
                    Tổng thanh toán
                  </td>
                  <td className="cell-total">
                    {formatCurrency(paymentTotal)} đ
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        <section className="sidebar-panel guide-panel">
          <h3>Quy trình quỹ chung</h3>
          <ol>
            <li>
              Mọi người chọn quán từ tab <strong>Quán ăn tham khảo</strong>, điền
              món và giá.
            </li>
            <li>
              Mọi người <strong>chuyển tiền vào quỹ chung</strong> — Admin ghi
              nhận ở tab Quản lý quỹ.
            </li>
            <li>
              <strong>Chủ shop</strong> đặt trên app giao hàng, nhập thanh toán
              thực tế ở bảng shop.
            </li>
            <li>
              Mọi người tick <strong>đã đặt</strong> khi chủ shop đặt xong trên
              app.
            </li>
            <li>
              <strong>Admin</strong> chốt chi phí, giải ngân hoàn tiền cho chủ
              shop từ quỹ chung.
            </li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
