import { useMemo, useState } from 'react';
import type { AppState } from '../types';
import {
  fundBalance,
  totalOrdersChecked,
  formatCurrency,
  formatDate,
  parseNumber,
  commonFundPool,
  totalContributions,
  getSession,
  pendingDisbursement,
  getShopOwnersToday,
  hasShopOwnersToday,
  isMemberShopOwnerToday,
} from '../utils/calculations';

interface Props {
  state: AppState;
  isAdmin: boolean;
  updateFundField: (
    memberId: string,
    field: keyof import('../types').FundEntry,
    value: import('../types').FundEntry[keyof import('../types').FundEntry],
  ) => void;
  toggleOrderCheck: (memberId: string, date: string) => void;
  setDailyCost: (memberId: string, date: string, cost: number) => void;
  setContribution: (memberId: string, index: 0 | 1 | 2, value: number) => void;
  addOrderDate: (date: string) => void;
  addMember: (name: string) => void;
  disburseToShopOwner: () => void;
}

export function FundPage({
  state,
  isAdmin,
  updateFundField,
  toggleOrderCheck,
  setDailyCost,
  setContribution,
  addOrderDate,
  addMember,
  disburseToShopOwner,
}: Props) {
  const [newDate, setNewDate] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [search, setSearch] = useState('');

  const memberMap = useMemo(
    () => new Map(state.members.map((m) => [m.id, m.name])),
    [state.members],
  );

  const session = getSession(state);
  const shopOwners = getShopOwnersToday(state);
  const pending = pendingDisbursement(session);
  const pool = commonFundPool(state.fundEntries);
  const totalContrib = totalContributions(state.fundEntries);

  const entries = useMemo(() => {
    const list = state.fundEntries.map((f) => ({
      ...f,
      name: memberMap.get(f.memberId) ?? '',
      balance: fundBalance(f),
      totalChecked: totalOrdersChecked(f),
    }));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((e) => e.name.toLowerCase().includes(q));
  }, [state.fundEntries, memberMap, search]);

  const handleAddDate = () => {
    if (newDate && isAdmin) {
      addOrderDate(newDate);
      setNewDate('');
    }
  };

  const handleAddMember = () => {
    if (newMemberName.trim() && isAdmin) {
      addMember(newMemberName.trim());
      setNewMemberName('');
    }
  };

  const handleDisburse = () => {
    const names = shopOwners.map((o) => o.ordererName).join(', ');
    if (
      confirm(
        `Giải ngân ${formatCurrency(pending)} đ cho chủ shop (${names}) từ quỹ chung?`,
      )
    ) {
      disburseToShopOwner();
    }
  };

  return (
    <div className="fund-page">
      <div className="panel-header">
        <h2>Quản lý quỹ ăn trưa</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Tìm tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="fund-overview">
        <div className="fund-card primary">
          <span className="fund-card-label">Quỹ chung hiện có</span>
          <span className="fund-card-value">{formatCurrency(pool)} đ</span>
          <span className="fund-card-hint">= tổng số dư tất cả thành viên</span>
        </div>
        <div className="fund-card">
          <span className="fund-card-label">Tổng đóng quỹ (kỳ này)</span>
          <span className="fund-card-value">{formatCurrency(totalContrib)} đ</span>
        </div>
        {hasShopOwnersToday(state) && (
          <div className="fund-card highlight">
            <span className="fund-card-label">
              Chủ shop — {shopOwners.map((o) => o.ordererName).join(', ')}
            </span>
            <span className="fund-card-value">
              Ứng: {formatCurrency(session.advanceAmount)} đ
            </span>
            {pending > 0 ? (
              <button
                type="button"
                className="btn-disburse"
                onClick={handleDisburse}
                disabled={!isAdmin || !session.costsFinalized}
              >
                {isAdmin
                  ? `Giải ngân ${formatCurrency(pending)} đ`
                  : `Chờ giải ngân ${formatCurrency(pending)} đ`}
              </button>
            ) : session.disbursedAmount > 0 ? (
              <span className="fund-card-hint done-hint">
                ✓ Đã giải ngân đủ
              </span>
            ) : (
              <span className="fund-card-hint">
                Chờ chủ shop chốt chi phí
              </span>
            )}
          </div>
        )}
      </div>

      {!isAdmin && (
        <p className="readonly-notice">
          Xem số dư quỹ. Đăng nhập <strong>Admin</strong> để ghi đóng quỹ, thêm
          thành viên và giải ngân.
        </p>
      )}

      {isAdmin && (
        <div className="fund-toolbar">
          <div className="toolbar-group">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <button type="button" onClick={handleAddDate}>
              + Thêm ngày
            </button>
          </div>
          <div className="toolbar-group">
            <input
              type="text"
              placeholder="Tên thành viên mới..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
            />
            <button type="button" onClick={handleAddMember}>
              + Thêm thành viên
            </button>
          </div>
        </div>
      )}

      <div className="table-scroll fund-scroll">
        <table className="data-table fund-table">
          <thead>
            <tr>
              <th className="sticky-col">Tên</th>
              <th>Số dư tháng trước</th>
              <th colSpan={3}>Đóng quỹ (chuyển vào quỹ chung)</th>
              <th colSpan={state.orderDates.length}>Đã đặt đồ</th>
              <th>Tổng đơn</th>
              <th className="sticky-balance">Số dư</th>
              {state.orderDates.map((d) => (
                <th key={d} className="date-col">
                  {formatDate(d)}
                </th>
              ))}
            </tr>
            <tr className="sub-header">
              <th className="sticky-col"></th>
              <th></th>
              <th>Đợt 1</th>
              <th>Đợt 2</th>
              <th>Đợt 3</th>
              {state.orderDates.map((d) => (
                <th key={d}></th>
              ))}
              <th></th>
              <th className="sticky-balance"></th>
              {state.orderDates.map((d) => (
                <th key={`c-${d}`}></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.memberId}>
                <td className="cell-name sticky-col">
                  {e.name}
                  {isMemberShopOwnerToday(e.name, state) && (
                    <span className="shop-owner-tag">chủ shop</span>
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <input
                      type="number"
                      value={e.prevBalance || ''}
                      onChange={(ev) =>
                        updateFundField(
                          e.memberId,
                          'prevBalance',
                          parseNumber(ev.target.value),
                        )
                      }
                      className="cell-number cell-sm"
                    />
                  ) : (
                    formatCurrency(e.prevBalance)
                  )}
                </td>
                {([0, 1, 2] as const).map((i) => (
                  <td key={i}>
                    {isAdmin ? (
                      <input
                        type="number"
                        min={0}
                        value={e.contributions[i] || ''}
                        onChange={(ev) =>
                          setContribution(
                            e.memberId,
                            i,
                            parseNumber(ev.target.value),
                          )
                        }
                        className="cell-number cell-sm"
                      />
                    ) : (
                      formatCurrency(e.contributions[i])
                    )}
                  </td>
                ))}
                {state.orderDates.map((d) => (
                  <td key={d} className="cell-center">
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={e.orderChecks[d] ?? false}
                        onChange={() => toggleOrderCheck(e.memberId, d)}
                      />
                    ) : e.orderChecks[d] ? (
                      '✓'
                    ) : (
                      ''
                    )}
                  </td>
                ))}
                <td className="cell-center">{e.totalChecked}</td>
                <td
                  className={`cell-balance sticky-balance ${
                    e.balance >= 0 ? 'balance-positive' : 'balance-negative'
                  }`}
                >
                  {formatCurrency(e.balance)}
                </td>
                {state.orderDates.map((d) => (
                  <td key={`cost-${d}`}>
                    {isAdmin ? (
                      <input
                        type="number"
                        min={0}
                        value={e.dailyCosts[d] || ''}
                        onChange={(ev) =>
                          setDailyCost(
                            e.memberId,
                            d,
                            parseNumber(ev.target.value),
                          )
                        }
                        className="cell-number cell-sm"
                        placeholder="0"
                      />
                    ) : (
                      formatCurrency(e.dailyCosts[d] || 0)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fund-legend">
        <span className="legend-item">
          <span className="dot positive"></span> Số dư dương (còn tiền trong quỹ)
        </span>
        <span className="legend-item">
          <span className="dot negative"></span> Số dư âm (nợ quỹ — cần đóng thêm)
        </span>
        <span className="legend-formula">
          Số dư = Số dư TT + Đóng quỹ − Chi phí các bữa
        </span>
      </div>
    </div>
  );
}
