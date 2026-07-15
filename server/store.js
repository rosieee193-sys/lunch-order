import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDefaultState, emptySession } from './defaultState.js';
import {
  applyPickupAssignments,
  PICKUP_TRIGGER_ACTIONS,
} from './pickupAssign.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

const ADMIN_ACTIONS = new Set([
  'UPDATE_FUND_FIELD',
  'TOGGLE_ORDER_CHECK',
  'SET_DAILY_COST',
  'SET_CONTRIBUTION',
  'ADD_ORDER_DATE',
  'ADD_MEMBER',
  'ADD_RESTAURANT',
  'UPDATE_RESTAURANT',
  'DELETE_RESTAURANT',
  'UPDATE_SUMMARY_EXTRA',
  'SET_SHOP_OWNER',
  'SET_SESSION_ADVANCE',
  'FINALIZE_SESSION_COSTS',
  'DISBURSE_TO_SHOP_OWNER',
  'RESET',
]);

let state = loadState();

function orderTotal(o) {
  return Math.max(0, o.unitPrice - o.discount);
}

function getShopStatsForOrders(orders, restaurant) {
  const key = restaurant.trim().toLowerCase();
  if (!key) return { totalOrders: 0, totalAmount: 0 };
  const matched = orders.filter(
    (o) => o.restaurant.trim().toLowerCase() === key && o.unitPrice > 0,
  );
  return {
    totalOrders: matched.length,
    totalAmount: matched.reduce((s, o) => s + o.unitPrice, 0),
  };
}

function getActualPaymentForShop(shopEntries, restaurant) {
  const key = restaurant.trim().toLowerCase();
  if (!key) return 0;
  return (shopEntries ?? [])
    .filter((e) => e.restaurant.trim().toLowerCase() === key)
    .reduce((s, e) => s + (e.actualPayment || 0), 0);
}

function splitInteger(total, count, index) {
  if (count <= 0 || index < 0 || index >= count) return 0;
  const base = Math.trunc(total / count);
  const remainder = total - base * count;
  const absRem = Math.abs(remainder);
  const sign = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
  return base + (index < absRem ? sign : 0);
}

function ordersAtRestaurant(orders, restaurant) {
  const key = restaurant.trim().toLowerCase();
  return orders.filter(
    (o) => o.restaurant.trim().toLowerCase() === key && o.unitPrice > 0,
  );
}

function discountPerPerson(actualPayment, totalAmount, totalOrders) {
  if (totalOrders <= 0) return 0;
  return (actualPayment - totalAmount) / totalOrders;
}

function getOrderLineCost(order, orders, shopEntries) {
  if (!order || order.unitPrice <= 0) return 0;
  const restaurantOrders = ordersAtRestaurant(orders, order.restaurant);
  const totalOrders = restaurantOrders.length;
  if (totalOrders <= 0) return 0;
  const { totalAmount } = getShopStatsForOrders(orders, order.restaurant);
  const actualPayment = getActualPaymentForShop(shopEntries, order.restaurant);
  const totalDiscount = actualPayment - totalAmount;
  const index = restaurantOrders.findIndex((o) => o.id === order.id);
  if (index < 0) return order.unitPrice;
  return order.unitPrice + splitInteger(totalDiscount, totalOrders, index);
}

function fundBalance(entry) {
  const contribSum = entry.contributions.reduce((s, v) => s + v, 0);
  const costSum = Object.values(entry.dailyCosts).reduce((s, v) => s + v, 0);
  return entry.prevBalance + contribSum - costSum;
}

function commonFundPool(fundEntries) {
  return fundEntries.reduce((s, f) => s + fundBalance(f), 0);
}

function shopTodayAdvanceTotal(state) {
  return (state.shopTodayEntries ?? []).reduce(
    (s, e) => s + (e.actualPayment || 0),
    0,
  );
}

function hasShopOwnersToday(state) {
  return (state.shopTodayEntries ?? []).some((e) => e.ordererName?.trim());
}

function syncSessionAdvance(current, date) {
  const advance = shopTodayAdvanceTotal(current);
  const session = getSession(current, date);
  const advanceChanged = advance !== session.advanceAmount;
  return setSession(current, date, {
    advanceAmount: advance,
    ...(advanceChanged ? { costsFinalized: false, disbursedAmount: 0 } : {}),
  });
}

function getSession(current, date) {
  return current.sessions?.[date] ?? emptySession();
}

function setSession(current, date, patch) {
  const existing = getSession(current, date);
  return {
    ...current,
    sessions: {
      ...current.sessions,
      [date]: { ...existing, ...patch },
    },
  };
}

function migrateState(parsed) {
  if (!parsed.summaryExtras) parsed.summaryExtras = {};
  if (!parsed.sessions) parsed.sessions = {};
  if (!parsed.sessions[parsed.sessionDate]) {
    parsed.sessions[parsed.sessionDate] = emptySession();
  }
  if (!parsed.shopTodayEntries) parsed.shopTodayEntries = [];
  parsed.shopTodayEntries = parsed.shopTodayEntries.map((e) => ({
    ...e,
    pickupPersonName: e.pickupPersonName ?? '',
  }));
  parsed.todayOrders = (parsed.todayOrders ?? []).map((o) => {
    const member = (parsed.members ?? []).find((m) => m.id === o.memberId);
    return {
      ...o,
      ordererName: o.ordererName ?? member?.name ?? '',
    };
  });
  parsed.fundEntries = (parsed.fundEntries ?? []).map((f) => {
    const { disbursement, ...rest } = f;
    return rest;
  });
  parsed.restaurants = (parsed.restaurants ?? []).map((r) => ({
    ...r,
    orderLink: r.orderLink ?? '',
    note: r.note ?? '',
    rating: typeof r.rating === 'number' ? r.rating : null,
  }));
  const advance = shopTodayAdvanceTotal(parsed);
  const session = parsed.sessions[parsed.sessionDate];
  if (session && advance > 0 && session.advanceAmount !== advance) {
    parsed.sessions[parsed.sessionDate] = {
      ...session,
      advanceAmount: advance,
    };
  }
  if (!parsed.pickupRotations) parsed.pickupRotations = {};
  return applyPickupAssignments(parsed);
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return migrateState(JSON.parse(raw));
    }
  } catch {
    /* ignore */
  }
  const initial = createDefaultState();
  saveState(initial);
  return initial;
}

function saveState(next) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), 'utf-8');
}

function applyActionCore(current, action) {
  switch (action.type) {
    case 'UPDATE_ORDER': {
      const { id, patch } = action.payload;
      return {
        ...current,
        todayOrders: current.todayOrders.map((o) => {
          if (o.id !== id) return o;
          const next = { ...o, ...patch };
          if ('ordererName' in patch) {
            const name = (patch.ordererName ?? '').trim();
            const member = current.members.find((m) => m.name === name);
            next.ordererName = name;
            next.memberId = member?.id ?? '';
          }
          return next;
        }),
      };
    }
    case 'ADD_TODAY_ORDER': {
      return {
        ...current,
        todayOrders: [
          ...current.todayOrders,
          {
            id: `o${Date.now()}`,
            memberId: '',
            ordererName: '',
            dishName: '',
            restaurant: '',
            unitPrice: 0,
            note: '',
            ordered: false,
            discount: 0,
          },
        ],
      };
    }
    case 'DELETE_TODAY_ORDER': {
      const { id } = action.payload;
      return {
        ...current,
        todayOrders: current.todayOrders.filter((o) => o.id !== id),
      };
    }
    case 'UPDATE_FUND_FIELD': {
      const { memberId, field, value } = action.payload;
      return {
        ...current,
        fundEntries: current.fundEntries.map((f) =>
          f.memberId === memberId ? { ...f, [field]: value } : f,
        ),
      };
    }
    case 'TOGGLE_ORDER_CHECK': {
      const { memberId, date } = action.payload;
      return {
        ...current,
        fundEntries: current.fundEntries.map((f) => {
          if (f.memberId !== memberId) return f;
          return {
            ...f,
            orderChecks: { ...f.orderChecks, [date]: !f.orderChecks[date] },
          };
        }),
      };
    }
    case 'SET_DAILY_COST': {
      const { memberId, date, cost } = action.payload;
      return {
        ...current,
        fundEntries: current.fundEntries.map((f) => {
          if (f.memberId !== memberId) return f;
          return {
            ...f,
            dailyCosts: { ...f.dailyCosts, [date]: cost },
          };
        }),
      };
    }
    case 'SET_CONTRIBUTION': {
      const { memberId, index, value } = action.payload;
      return {
        ...current,
        fundEntries: current.fundEntries.map((f) => {
          if (f.memberId !== memberId) return f;
          const contributions = [...f.contributions];
          contributions[index] = value;
          return { ...f, contributions };
        }),
      };
    }
    case 'ADD_ORDER_DATE': {
      const { date } = action.payload;
      if (current.orderDates.includes(date)) return current;
      return {
        ...current,
        orderDates: [...current.orderDates, date].sort(),
        sessions: { ...current.sessions, [date]: emptySession() },
        fundEntries: current.fundEntries.map((f) => ({
          ...f,
          orderChecks: { ...f.orderChecks, [date]: false },
          dailyCosts: { ...f.dailyCosts, [date]: 0 },
        })),
      };
    }
    case 'ADD_MEMBER': {
      const { name } = action.payload;
      const id = `m${Date.now()}`;
      return {
        ...current,
        members: [...current.members, { id, name }],
        fundEntries: [
          ...current.fundEntries,
          {
            memberId: id,
            prevBalance: 0,
            contributions: [0, 0, 0],
            orderChecks: Object.fromEntries(
              current.orderDates.map((d) => [d, false]),
            ),
            dailyCosts: Object.fromEntries(
              current.orderDates.map((d) => [d, 0]),
            ),
          },
        ],
      };
    }
    case 'ADD_RESTAURANT': {
      const restaurant = action.payload;
      return {
        ...current,
        restaurants: [
          ...current.restaurants,
          { ...restaurant, id: `r${Date.now()}` },
        ],
      };
    }
    case 'UPDATE_RESTAURANT': {
      const { id, patch } = action.payload;
      return {
        ...current,
        restaurants: current.restaurants.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      };
    }
    case 'DELETE_RESTAURANT': {
      const { id } = action.payload;
      return {
        ...current,
        restaurants: current.restaurants.filter((r) => r.id !== id),
      };
    }
    case 'UPDATE_SUMMARY_EXTRA': {
      const { restaurant, field, value } = action.payload;
      const existing = current.summaryExtras?.[restaurant] ?? {
        reward: 0,
        payment: 0,
      };
      return {
        ...current,
        summaryExtras: {
          ...current.summaryExtras,
          [restaurant]: { ...existing, [field]: value },
        },
      };
    }
    case 'SET_SHOP_OWNER': {
      const { memberId } = action.payload;
      return setSession(current, current.sessionDate, {
        shopOwnerId: memberId,
        costsFinalized: false,
        disbursedAmount: 0,
      });
    }
    case 'SET_SESSION_ADVANCE': {
      const { amount } = action.payload;
      return setSession(current, current.sessionDate, {
        advanceAmount: Math.max(0, amount),
        costsFinalized: false,
        disbursedAmount: 0,
      });
    }
    case 'FINALIZE_SESSION_COSTS': {
      const date = current.sessionDate;
      const orders = current.todayOrders.filter(
        (o) => o.restaurant.trim() && o.unitPrice > 0,
      );
      const fundEntries = current.fundEntries.map((f) => {
        const member = current.members.find((m) => m.id === f.memberId);
        const order = orders.find(
          (o) =>
            o.memberId === f.memberId ||
            (member?.name && o.ordererName?.trim() === member.name),
        );
        const cost = getOrderLineCost(
          order,
          current.todayOrders,
          current.shopTodayEntries,
        );
        return {
          ...f,
          dailyCosts: { ...f.dailyCosts, [date]: cost },
          orderChecks: {
            ...f.orderChecks,
            [date]: cost > 0,
          },
        };
      });
      return setSession(
        { ...current, fundEntries },
        date,
        { costsFinalized: true },
      );
    }
    case 'DISBURSE_TO_SHOP_OWNER': {
      const date = current.sessionDate;
      const session = getSession(current, date);
      return setSession(current, date, {
        disbursedAmount: session.advanceAmount,
      });
    }
    case 'ADD_SHOP_TODAY': {
      const entries = current.shopTodayEntries ?? [];
      return {
        ...current,
        shopTodayEntries: [
          ...entries,
          {
            id: `s${Date.now()}`,
            ordererName: '',
            restaurant: '',
            orderLink: '',
            actualPayment: 0,
            pickupPersonName: '',
          },
        ],
      };
    }
    case 'UPDATE_SHOP_TODAY': {
      const { id, patch } = action.payload;
      const { pickupPersonName: _ignored, ...safePatch } = patch;
      if (safePatch.restaurant !== undefined) {
        const key = safePatch.restaurant.trim().toLowerCase();
        if (key) {
          const ref = (current.restaurants ?? []).find(
            (r) => r.name.trim().toLowerCase() === key,
          );
          if (ref) {
            safePatch.orderLink = ref.orderLink ?? '';
          }
        }
      }
      const next = {
        ...current,
        shopTodayEntries: (current.shopTodayEntries ?? []).map((s) =>
          s.id === id ? { ...s, ...safePatch } : s,
        ),
      };
      return syncSessionAdvance(next, current.sessionDate);
    }
    case 'DELETE_SHOP_TODAY': {
      const { id } = action.payload;
      const next = {
        ...current,
        shopTodayEntries: (current.shopTodayEntries ?? []).filter(
          (s) => s.id !== id,
        ),
      };
      return syncSessionAdvance(next, current.sessionDate);
    }
    case 'RESET':
      return createDefaultState();
    default:
      return current;
  }
}

function applyAction(current, action) {
  const next = applyActionCore(current, action);
  if (PICKUP_TRIGGER_ACTIONS.has(action.type)) {
    return applyPickupAssignments(next);
  }
  return next;
}

export function getState() {
  return state;
}

export function dispatchAction(action, auth) {
  const { isAdmin } = auth;

  if (ADMIN_ACTIONS.has(action.type)) {
    if (!isAdmin) {
      return {
        ok: false,
        error: 'Chỉ Admin mới được thực hiện thao tác này',
      };
    }
  }

  if (action.type === 'UPDATE_ORDER') {
    const patch = action.payload.patch;
    const allowed = [
      'dishName',
      'restaurant',
      'unitPrice',
      'note',
      'ordered',
      'ordererName',
    ];
    const invalid = Object.keys(patch).filter((k) => !allowed.includes(k));
    if (invalid.length > 0) {
      return { ok: false, error: 'Không có quyền sửa trường này' };
    }
  }

  if (action.type === 'SET_SHOP_OWNER') {
    const { memberId } = action.payload;
    if (memberId && !state.members.some((m) => m.id === memberId)) {
      return { ok: false, error: 'Thành viên không tồn tại' };
    }
  }

  if (action.type === 'ADD_RESTAURANT') {
    const { name, orderLink, note } = action.payload;
    if (!name?.trim()) {
      return { ok: false, error: 'Cần nhập tên quán' };
    }
    if (!orderLink?.trim()) {
      return { ok: false, error: 'Cần nhập link đặt đơn' };
    }
    if (!note?.trim()) {
      return { ok: false, error: 'Cần nhập ghi chú' };
    }
  }

  if (action.type === 'FINALIZE_SESSION_COSTS') {
    if (!hasShopOwnersToday(state)) {
      return {
        ok: false,
        error: 'Chưa có người đặt đơn trong bảng Các shop hôm nay',
      };
    }
    const orders = state.todayOrders.filter(
      (o) => o.restaurant.trim() && o.unitPrice > 0,
    );
    if (orders.length === 0) {
      return { ok: false, error: 'Chưa có đơn hàng để chốt chi phí' };
    }
  }

  if (action.type === 'DISBURSE_TO_SHOP_OWNER') {
    const date = state.sessionDate;
    const session = getSession(state, date);
    if (!hasShopOwnersToday(state)) {
      return { ok: false, error: 'Chưa có chủ shop (người đặt đơn)' };
    }
    if (session.advanceAmount <= 0) {
      return {
        ok: false,
        error: 'Chưa nhập số tiền thanh toán thực tế ở bảng shop',
      };
    }
    if (!session.costsFinalized) {
      return { ok: false, error: 'Cần chốt chi phí trước khi giải ngân' };
    }
    if (session.disbursedAmount >= session.advanceAmount) {
      return { ok: false, error: 'Đã giải ngân đủ cho phiên này' };
    }
    const pending = session.advanceAmount - session.disbursedAmount;
    const pool = commonFundPool(state.fundEntries);
    if (pool < pending) {
      return {
        ok: false,
        error: `Quỹ chung không đủ (còn ${pool.toLocaleString('vi-VN')} đ, cần ${pending.toLocaleString('vi-VN')} đ)`,
      };
    }
  }

  state = applyAction(state, action);
  saveState(state);
  return { ok: true, state };
}
