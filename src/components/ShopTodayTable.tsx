import type { AppState, ShopTodayEntry } from '../types';
import { SyncedTextInput } from './SyncedTextInput';
import {
  formatCurrency,
  getShopStats,
  discountPerPerson,
  parseNumber,
  findReferenceRestaurant,
} from '../utils/calculations';

function toHref(url: string): string {
  const t = url.trim();
  if (!t) return '#';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

interface Props {
  state: AppState;
  addShopToday: () => void;
  updateShopToday: (id: string, patch: Partial<ShopTodayEntry>) => void;
}

export function ShopTodayTable({
  state,
  addShopToday,
  updateShopToday,
}: Props) {
  const memberNames = state.members.map((m) => m.name);
  const refNames = state.restaurants.map((r) => r.name);

  const handleRestaurantChange = (entryId: string, restaurant: string) => {
    const ref = findReferenceRestaurant(state, restaurant);
    updateShopToday(entryId, {
      restaurant,
      ...(ref ? { orderLink: ref.orderLink } : {}),
    });
  };

  return (
    <section className="shop-today-section">
      <div className="section-header">
        <h3>Các shop hôm nay</h3>
        <button type="button" className="btn-sm btn-add-row" onClick={addShopToday}>
          + Thêm shop
        </button>
      </div>
      <p className="section-hint">
        Mỗi dòng = một người mở shop tại một quán. Chọn quán từ{' '}
        <strong>Quán ăn tham khảo</strong> — link đặt đồ tự điền.{' '}
        <strong>Tổng đơn</strong> và <strong>Tổng tiền</strong> tự tính từ bảng
        đặt món bên dưới. <strong>Giảm giá</strong> = (TT thực tế − Tổng tiền) /
        Tổng đơn.
      </p>
      <div className="table-scroll shop-today-scroll">
        <table className="data-table shop-today-table">
          <thead>
            <tr>
              <th>Người đặt đơn</th>
              <th>Quán</th>
              <th>Link đặt đồ</th>
              <th>Tổng đơn</th>
              <th>Tổng tiền</th>
              <th>Số tiền thanh toán thực tế</th>
              <th>Giảm giá</th>
            </tr>
          </thead>
          <tbody>
            {state.shopTodayEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Chưa có shop nào — bấm &quot;+ Thêm shop&quot; để mở quán
                </td>
              </tr>
            ) : (
              state.shopTodayEntries.map((entry) => {
                const { totalOrders, totalAmount } = getShopStats(
                  state.todayOrders,
                  entry.restaurant,
                );
                const discount = discountPerPerson(
                  entry.actualPayment,
                  totalAmount,
                  totalOrders,
                );
                const refRestaurant = findReferenceRestaurant(
                  state,
                  entry.restaurant,
                );
                const linkFromRef = refRestaurant?.orderLink?.trim() ?? '';
                const showAutoLink = !!refRestaurant;

                return (
                  <tr key={entry.id}>
                    <td>
                      <SyncedTextInput
                        type="text"
                        value={entry.ordererName}
                        list="member-name-list"
                        onCommit={(ordererName) =>
                          updateShopToday(entry.id, { ordererName })
                        }
                        placeholder="Tên người đặt..."
                      />
                    </td>
                    <td className="cell-quan">
                      <select
                        value={entry.restaurant}
                        onChange={(e) =>
                          handleRestaurantChange(entry.id, e.target.value)
                        }
                        disabled={state.restaurants.length === 0}
                        title={
                          state.restaurants.length === 0
                            ? 'Thêm quán ở tab Quán ăn tham khảo trước'
                            : undefined
                        }
                      >
                        <option value="">
                          {state.restaurants.length === 0
                            ? '— Thêm quán tham khảo —'
                            : '— Chọn quán —'}
                        </option>
                        {!refNames.includes(entry.restaurant) &&
                          entry.restaurant.trim() && (
                            <option value={entry.restaurant}>
                              {entry.restaurant}
                            </option>
                          )}
                        {state.restaurants.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="cell-link-wrap">
                      {showAutoLink ? (
                        linkFromRef ? (
                          <>
                            <span
                              className="cell-link-auto"
                              title={linkFromRef}
                            >
                              {linkFromRef}
                            </span>
                            <a
                              href={toHref(linkFromRef)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="order-link"
                            >
                              Mở link ↗
                            </a>
                          </>
                        ) : (
                          <span className="text-muted cell-link-empty">
                            Quán chưa có link tham khảo
                          </span>
                        )
                      ) : (
                        <>
                          <SyncedTextInput
                            type="text"
                            value={entry.orderLink}
                            onCommit={(orderLink) =>
                              updateShopToday(entry.id, { orderLink })
                            }
                            placeholder="Paste link Grab / ShopeeFood..."
                            className="cell-link-input"
                          />
                          {entry.orderLink.trim() && (
                            <a
                              href={toHref(entry.orderLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="order-link"
                              title={entry.orderLink}
                            >
                              Mở link ↗
                            </a>
                          )}
                        </>
                      )}
                    </td>
                    <td className="cell-center cell-calc">{totalOrders}</td>
                    <td className="cell-number cell-calc">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={entry.actualPayment || ''}
                        onChange={(e) =>
                          updateShopToday(entry.id, {
                            actualPayment: parseNumber(e.target.value),
                          })
                        }
                        placeholder="0"
                        className="cell-number"
                      />
                    </td>
                    <td
                      className={`cell-number cell-calc ${
                        discount < 0
                          ? 'discount-negative'
                          : discount > 0
                            ? 'discount-positive'
                            : ''
                      }`}
                    >
                      {totalOrders > 0
                        ? formatCurrency(Math.round(discount))
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <datalist id="member-name-list">
        {memberNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </section>
  );
}
