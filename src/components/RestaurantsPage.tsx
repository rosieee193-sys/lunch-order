import { useState } from 'react';
import type { AppState, Restaurant } from '../types';
import { SyncedTextInput } from './SyncedTextInput';

function toHref(url: string): string {
  const t = url.trim();
  if (!t) return '#';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function RestaurantStars({ rating }: { rating: number | null }) {
  if (rating == null) {
    return (
      <span className="restaurant-rating restaurant-rating-empty">
        Chưa có đánh giá
      </span>
    );
  }
  const stars = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <span className="restaurant-rating" title={`${stars}/5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= stars ? 'star filled' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}

interface Props {
  state: AppState;
  isAdmin: boolean;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => void;
  updateRestaurant: (id: string, patch: Partial<Omit<Restaurant, 'id'>>) => void;
  deleteRestaurant: (id: string) => void;
}

export function RestaurantsPage({
  state,
  isAdmin,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
}: Props) {
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newNote, setNewNote] = useState('');

  const filtered = search.trim()
    ? state.restaurants.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.note.toLowerCase().includes(q) ||
          r.orderLink.toLowerCase().includes(q)
        );
      })
    : state.restaurants;

  const canAdd =
    newName.trim().length > 0 &&
    newLink.trim().length > 0 &&
    newNote.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    addRestaurant({
      name: newName.trim(),
      orderLink: newLink.trim(),
      note: newNote.trim(),
      rating: null,
    });
    setNewName('');
    setNewLink('');
    setNewNote('');
  };

  return (
    <div className="restaurants-page">
      <div className="panel-header">
        <h2>Quán ăn tham khảo</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Tìm quán..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />
          <span className="badge">{filtered.length} quán</span>
        </div>
      </div>

      {!isAdmin && (
        <p className="readonly-notice">
          Danh sách quán gợi ý khi đặt món. Đăng nhập <strong>Admin</strong> để
          thêm, sửa hoặc xóa quán.
        </p>
      )}

      <div className="table-scroll restaurants-table-scroll">
        <table className="data-table restaurants-table">
          <thead>
            <tr>
              <th>Tên quán</th>
              <th>Link đặt đơn</th>
              <th>Ghi chú</th>
              <th>Chấm điểm</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="empty-cell">
                  Không tìm thấy quán nào
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="cell-name">
                    {isAdmin ? (
                      <SyncedTextInput
                        type="text"
                        value={r.name}
                        onCommit={(name) => updateRestaurant(r.id, { name })}
                        className="restaurant-table-input restaurant-table-name"
                      />
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="cell-link-wrap">
                    {isAdmin ? (
                      <>
                        <SyncedTextInput
                          type="text"
                          value={r.orderLink}
                          onCommit={(orderLink) =>
                            updateRestaurant(r.id, { orderLink })
                          }
                          placeholder="https://..."
                          className="restaurant-table-input cell-link-input"
                        />
                        {r.orderLink.trim() && (
                          <a
                            href={toHref(r.orderLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="order-link"
                          >
                            Mở link ↗
                          </a>
                        )}
                      </>
                    ) : r.orderLink.trim() ? (
                      <a
                        href={toHref(r.orderLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="order-link"
                      >
                        {r.orderLink}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {isAdmin ? (
                      <SyncedTextInput
                        type="text"
                        value={r.note}
                        onCommit={(note) => updateRestaurant(r.id, { note })}
                        placeholder="Ghi chú..."
                        className="restaurant-table-input"
                      />
                    ) : (
                      r.note || <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <RestaurantStars rating={r.rating} />
                  </td>
                  {isAdmin && (
                    <td className="cell-center">
                      <button
                        type="button"
                        className="btn-delete-row"
                        onClick={() => {
                          if (confirm(`Xóa quán "${r.name}"?`)) {
                            deleteRestaurant(r.id);
                          }
                        }}
                        title="Xóa quán"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <section className="restaurant-add-panel">
          <h3>Thêm quán mới</h3>
          <p className="section-hint">
            Cần đủ tên quán, link đặt đơn và ghi chú. Điểm đánh giá sẽ do hệ
            thống tự điền sau.
          </p>
          <div className="restaurant-add-form">
            <input
              type="text"
              placeholder="Tên quán *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="text"
              placeholder="Link đặt đơn *"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="text"
              placeholder="Ghi chú *"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleAdd}
              disabled={!canAdd}
            >
              + Thêm quán
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
