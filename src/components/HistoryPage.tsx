import { useMemo, useState } from 'react';
import type { AppState, DayHistory } from '../types';
import {
  formatCurrency,
  formatDate,
  getOrderLineTotal,
} from '../utils/calculations';

interface Props {
  state: AppState;
  isAdmin: boolean;
  closeDay: (nextDate?: string) => void;
}

function dayHasOrders(h: DayHistory) {
  return h.orders.some((o) => o.restaurant.trim() && o.unitPrice > 0);
}

export function HistoryPage({ state, isAdmin, closeDay }: Props) {
  const historyDates = useMemo(
    () =>
      Object.keys(state.orderHistory ?? {}).sort((a, b) => b.localeCompare(a)),
    [state.orderHistory],
  );

  const [selected, setSelected] = useState(
    () => historyDates[0] ?? '',
  );
  const [nextDate, setNextDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const activeDate =
    selected && state.orderHistory?.[selected]
      ? selected
      : historyDates[0] ?? '';
  const day = activeDate ? state.orderHistory[activeDate] : null;

  const handleCloseDay = () => {
    const msg =
      nextDate === state.sessionDate
        ? `Lưu lịch sử ngày ${state.sessionDate} và xóa bảng đặt món hôm nay (cùng ngày)?`
        : `Lưu lịch sử ngày ${state.sessionDate} và chuyển sang ${nextDate}?`;
    if (!confirm(msg)) return;
    closeDay(nextDate);
  };

  return (
    <div className="history-page">
      <div className="panel-header">
        <h2>Lịch sử đặt món</h2>
        <div className="header-actions">
          <span className="badge">{historyDates.length} ngày đã lưu</span>
        </div>
      </div>

      {isAdmin && (
        <section className="history-close-panel">
          <h3>Lưu ngày hiện tại &amp; sang ngày mới</h3>
          <p className="section-hint">
            Lưu shop + chi tiết đặt món của{' '}
            <strong>{state.sessionDate}</strong> vào lịch sử. Thành viên, quán
            tham khảo và quỹ <strong>không</strong> bị xóa. Chỉ Admin được
            thao tác.
          </p>
          <div className="history-close-form">
            <label>
              Ngày mới
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCloseDay}
            >
              Lưu &amp; sang ngày mới
            </button>
          </div>
          <p className="section-hint">
            Đang có {state.todayOrders.length} dòng đặt món /{' '}
            {state.shopTodayEntries.length} shop hôm nay.
          </p>
        </section>
      )}

      {!isAdmin && (
        <p className="readonly-notice">
          Xem lịch sử các ngày đã lưu. Admin dùng nút trên để chốt ngày và chuyển
          sang ngày mới.
        </p>
      )}

      {historyDates.length === 0 ? (
        <p className="empty-state history-empty">
          Chưa có lịch sử. Admin bấm &quot;Lưu &amp; sang ngày mới&quot; sau mỗi
          ngày đặt món.
        </p>
      ) : (
        <div className="history-layout">
          <aside className="history-dates">
            <h3>Ngày đã lưu</h3>
            <ul>
              {historyDates.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    className={d === activeDate ? 'active' : ''}
                    onClick={() => setSelected(d)}
                  >
                    {formatDate(d)}
                    <span className="history-date-iso">{d}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {day && (
            <div className="history-detail">
              <h3>
                Chi tiết — {formatDate(day.date)}{' '}
                <span className="text-muted">({day.date})</span>
              </h3>
              <p className="section-hint">
                Lưu lúc {new Date(day.closedAt).toLocaleString('vi-VN')}
                {day.session.costsFinalized ? ' · Đã chốt chi phí' : ''}
                {day.session.disbursedAmount > 0
                  ? ` · Đã giải ngân ${formatCurrency(day.session.disbursedAmount)} đ`
                  : ''}
              </p>

              <h4>Các shop</h4>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Người đặt</th>
                      <th>Quán</th>
                      <th>Link</th>
                      <th>TT thực tế</th>
                      <th>Người lấy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.shops.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          Không có shop
                        </td>
                      </tr>
                    ) : (
                      day.shops.map((s) => (
                        <tr key={s.id}>
                          <td>{s.ordererName || '—'}</td>
                          <td>{s.restaurant || '—'}</td>
                          <td className="cell-link">
                            {s.orderLink ? (
                              <a
                                href={
                                  /^https?:\/\//i.test(s.orderLink)
                                    ? s.orderLink
                                    : `https://${s.orderLink}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="order-link"
                              >
                                Mở link ↗
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="cell-number">
                            {formatCurrency(s.actualPayment)}
                          </td>
                          <td>{s.pickupPersonName || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h4>Chi tiết đặt món</h4>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>Món</th>
                      <th>Quán</th>
                      <th>Đơn giá</th>
                      <th>Note</th>
                      <th>Đã đặt</th>
                      <th>Thành tiền*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!dayHasOrders(day) ? (
                      <tr>
                        <td colSpan={7} className="empty-cell">
                          Không có đơn
                        </td>
                      </tr>
                    ) : (
                      day.orders
                        .filter((o) => o.restaurant.trim() || o.unitPrice > 0)
                        .map((o) => (
                          <tr key={o.id}>
                            <td>{o.ordererName || '—'}</td>
                            <td>{o.dishName || '—'}</td>
                            <td>{o.restaurant || '—'}</td>
                            <td className="cell-number">
                              {formatCurrency(o.unitPrice)}
                            </td>
                            <td>{o.note || '—'}</td>
                            <td className="cell-center">
                              {o.ordered ? '✓' : '—'}
                            </td>
                            <td className="cell-total">
                              {formatCurrency(
                                getOrderLineTotal(o, {
                                  ...state,
                                  todayOrders: day.orders,
                                  shopTodayEntries: day.shops,
                                  summaryExtras: day.summaryExtras,
                                }),
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="section-hint">
                * Thành tiền tính lại từ đơn giá + giảm giá theo TT thực tế đã
                lưu của ngày đó.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
