import type {
  OrderEntry,
  FundEntry,
  RestaurantSummary,
  AppState,
  OrderSession,
  ShopTodayEntry,
  Restaurant,
} from '../types';

export function normalizeRestaurant(name: string): string {
  return name.trim().toLowerCase();
}

/** Tìm quán trong danh sách tham khảo (khớp tên, không phân biệt hoa thường) */
export function findReferenceRestaurant(
  state: AppState,
  restaurantName: string,
): Restaurant | undefined {
  const key = normalizeRestaurant(restaurantName);
  if (!key) return undefined;
  return state.restaurants.find((r) => normalizeRestaurant(r.name) === key);
}

/** Tổng đơn + tổng tiền menu (sum đơn giá) theo quán */
export function getShopStats(orders: OrderEntry[], restaurant: string) {
  const key = normalizeRestaurant(restaurant);
  if (!key) return { totalOrders: 0, totalAmount: 0 };
  const matched = orders.filter(
    (o) => normalizeRestaurant(o.restaurant) === key && o.unitPrice > 0,
  );
  return {
    totalOrders: matched.length,
    totalAmount: matched.reduce((s, o) => s + o.unitPrice, 0),
  };
}

export function getActualPaymentForShop(
  shopEntries: ShopTodayEntry[],
  restaurant: string,
): number {
  const key = normalizeRestaurant(restaurant);
  if (!key) return 0;
  return shopEntries
    .filter((e) => normalizeRestaurant(e.restaurant) === key)
    .reduce((s, e) => s + (e.actualPayment || 0), 0);
}

/** Chia số nguyên (đồng) thành count phần — phần thứ index (0-based) */
export function splitInteger(total: number, count: number, index: number): number {
  if (count <= 0 || index < 0 || index >= count) return 0;
  const base = Math.trunc(total / count);
  const remainder = total - base * count;
  const absRem = Math.abs(remainder);
  const sign = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
  return base + (index < absRem ? sign : 0);
}

/** Giảm giá mỗi người = (TT thực tế − tổng tiền menu) / tổng đơn — hiển thị trung bình */
export function discountPerPerson(
  actualPayment: number,
  totalAmount: number,
  totalOrders: number,
): number {
  if (totalOrders <= 0) return 0;
  return (actualPayment - totalAmount) / totalOrders;
}

function ordersAtRestaurant(orders: OrderEntry[], restaurant: string) {
  const key = normalizeRestaurant(restaurant);
  return orders.filter(
    (o) => normalizeRestaurant(o.restaurant) === key && o.unitPrice > 0,
  );
}

/** Giảm giá dòng đặt món — chia đủ đồng, tổng khớp TT thực tế */
export function getOrderDiscount(order: OrderEntry, state: AppState): number {
  if (!order.restaurant.trim() || order.unitPrice <= 0) return 0;
  const restaurantOrders = ordersAtRestaurant(
    state.todayOrders,
    order.restaurant,
  );
  const totalOrders = restaurantOrders.length;
  if (totalOrders <= 0) return 0;
  const { totalAmount } = getShopStats(state.todayOrders, order.restaurant);
  const actualPayment = getActualPaymentForShop(
    state.shopTodayEntries,
    order.restaurant,
  );
  const totalDiscount = actualPayment - totalAmount;
  const index = restaurantOrders.findIndex((o) => o.id === order.id);
  if (index < 0) return 0;
  return splitInteger(totalDiscount, totalOrders, index);
}

export function getShopDiscountPerPerson(
  orders: OrderEntry[],
  shopEntries: ShopTodayEntry[],
  restaurant: string,
): number {
  const { totalOrders, totalAmount } = getShopStats(orders, restaurant);
  const actualPayment = getActualPaymentForShop(shopEntries, restaurant);
  return discountPerPerson(actualPayment, totalAmount, totalOrders);
}

export function getRestaurantPayment(
  state: AppState,
  restaurant: string,
  lineTotalSum: number,
): number {
  const extra = state.summaryExtras[restaurant]?.payment;
  if (extra != null && extra > 0) return extra;
  const actual = getActualPaymentForShop(state.shopTodayEntries, restaurant);
  if (actual > 0) return actual;
  return lineTotalSum;
}

/** Thành tiền = Đơn giá + Giảm giá */
export function getOrderLineTotal(order: OrderEntry, state: AppState): number {
  if (order.unitPrice <= 0) return 0;
  return order.unitPrice + getOrderDiscount(order, state);
}

/** @deprecated dùng getOrderLineTotal */
export function orderTotal(entry: OrderEntry): number {
  return Math.max(0, entry.unitPrice - entry.discount);
}

export function summarizeByRestaurant(state: AppState): RestaurantSummary[] {
  const map = new Map<string, RestaurantSummary>();

  for (const o of state.todayOrders) {
    if (!o.restaurant.trim() || o.unitPrice <= 0) continue;
    const key = o.restaurant.trim();
    const discount = getOrderDiscount(o, state);
    const lineTotal = getOrderLineTotal(o, state);
    const existing = map.get(key) ?? {
      restaurant: key,
      totalOrders: 0,
      totalValue: 0,
      totalDiscount: 0,
      totalAmount: 0,
      reward: 0,
      payment: 0,
    };
    existing.totalOrders += 1;
    existing.totalValue += o.unitPrice;
    existing.totalDiscount += discount;
    existing.totalAmount += lineTotal;
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.restaurant.localeCompare(b.restaurant, 'vi'),
  );
}

/** Số dư cá nhân trong quỹ chung */
export function fundBalance(entry: FundEntry): number {
  const contribSum = entry.contributions.reduce((s, v) => s + v, 0);
  const costSum = Object.values(entry.dailyCosts).reduce((s, v) => s + v, 0);
  return entry.prevBalance + contribSum - costSum;
}

/** Tổng quỹ chung = tổng số dư tất cả thành viên */
export function commonFundPool(fundEntries: FundEntry[]): number {
  return fundEntries.reduce((s, f) => s + fundBalance(f), 0);
}

export function totalContributions(fundEntries: FundEntry[]): number {
  return fundEntries.reduce(
    (s, f) => s + f.contributions.reduce((a, v) => a + v, 0),
    0,
  );
}

export function getSession(state: AppState, date = state.sessionDate): OrderSession {
  return state.sessions[date] ?? {
    shopOwnerId: null,
    advanceAmount: 0,
    disbursedAmount: 0,
    costsFinalized: false,
  };
}

export function sessionOrderTotal(state: AppState): number {
  return state.todayOrders
    .filter((o) => o.restaurant.trim() && o.unitPrice > 0)
    .reduce((s, o) => s + getOrderLineTotal(o, state), 0);
}

export function sessionPaymentTotal(state: AppState): number {
  const summary = summarizeByRestaurant(state);
  return summary.reduce(
    (s, row) => s + getRestaurantPayment(state, row.restaurant, row.totalAmount),
    0,
  );
}

export function pendingDisbursement(session: OrderSession): number {
  return Math.max(0, session.advanceAmount - session.disbursedAmount);
}

/** Chủ shop hôm nay = người đặt đơn trong bảng Các shop hôm nay */
export function getShopOwnersToday(state: AppState) {
  return (state.shopTodayEntries ?? [])
    .filter((e) => e.ordererName.trim())
    .map((e) => ({
      id: e.id,
      ordererName: e.ordererName.trim(),
      restaurant: e.restaurant.trim(),
      actualPayment: e.actualPayment || 0,
      pickupPersonName: (e.pickupPersonName ?? '').trim(),
    }));
}

export function hasShopOwnersToday(state: AppState): boolean {
  return getShopOwnersToday(state).length > 0;
}

export function shopTodayAdvanceTotal(state: AppState): number {
  return (state.shopTodayEntries ?? []).reduce(
    (s, e) => s + (e.actualPayment || 0),
    0,
  );
}

export function isMemberShopOwnerToday(name: string, state: AppState): boolean {
  const n = name.trim();
  if (!n) return false;
  return getShopOwnersToday(state).some((o) => o.ordererName === n);
}

export const SERVINGS_PER_PICKER = 6;

export function pickersNeeded(orderCount: number): number {
  if (orderCount <= 0) return 0;
  return Math.ceil(orderCount / SERVINGS_PER_PICKER);
}

export function pickersNeededForRestaurant(
  orders: OrderEntry[],
  restaurant: string,
): number {
  const { totalOrders } = getShopStats(orders, restaurant);
  return pickersNeeded(totalOrders);
}

export function parsePickupNames(pickupPersonName: string): string[] {
  return pickupPersonName
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function totalOrdersChecked(entry: FundEntry): number {
  return Object.values(entry.orderChecks).filter(Boolean).length;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

export function formatDate(dateStr: string): string {
  if (dateStr === new Date().toISOString().slice(0, 10)) return 'HÔM NAY';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function parseNumber(value: string): number {
  const n = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
