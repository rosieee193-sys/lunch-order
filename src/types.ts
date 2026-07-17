export interface Member {
  id: string;
  name: string;
}

export interface OrderEntry {
  id: string;
  memberId: string;
  /** Tên người đặt (gợi ý từ danh sách quỹ) */
  ordererName: string;
  dishName: string;
  restaurant: string;
  unitPrice: number;
  note: string;
  ordered: boolean;
  discount: number;
}

export interface Restaurant {
  id: string;
  name: string;
  orderLink: string;
  note: string;
  /** 1–5; null = chưa có (hệ thống tự điền sau) */
  rating: number | null;
  color?: string;
}

export interface FundEntry {
  memberId: string;
  prevBalance: number;
  contributions: [number, number, number];
  orderChecks: Record<string, boolean>;
  dailyCosts: Record<string, number>;
}

export interface SummaryExtra {
  reward: number;
  payment: number;
}

/** Một shop mở trong ngày — người đặt, quán, link, thanh toán thực tế */
export interface ShopTodayEntry {
  id: string;
  ordererName: string;
  restaurant: string;
  orderLink: string;
  actualPayment: number;
  /** Người đi lấy đơn tại quán này */
  pickupPersonName: string;
}

/** Phiên đặt món theo ngày — chủ shop ứng trước, admin giải ngân */
export interface OrderSession {
  shopOwnerId: string | null;
  /** Tổng tiền chủ shop đã ứng trước (Grab, ShopeeFood...) */
  advanceAmount: number;
  /** Số tiền admin đã chuyển hoàn cho chủ shop */
  disbursedAmount: number;
  /** Đã chốt chi phí từ đơn hàng vào quỹ thành viên */
  costsFinalized: boolean;
}

/** Snapshot đặt món đã lưu của một ngày (sau khi chốt / sang ngày mới) */
export interface DayHistory {
  date: string;
  orders: OrderEntry[];
  shops: ShopTodayEntry[];
  summaryExtras: Record<string, SummaryExtra>;
  session: OrderSession;
  closedAt: string;
}

export interface AppState {
  members: Member[];
  restaurants: Restaurant[];
  todayOrders: OrderEntry[];
  fundEntries: FundEntry[];
  orderDates: string[];
  sessionDate: string;
  summaryExtras: Record<string, SummaryExtra>;
  /** Các shop mở hôm nay */
  shopTodayEntries: ShopTodayEntry[];
  /** Lịch sử phiên theo ngày */
  sessions: Record<string, OrderSession>;
  /** Lịch sử đặt món theo ngày (đã lưu) */
  orderHistory: Record<string, DayHistory>;
  /** Vòng xoay random chọn người lấy đơn theo ngày */
  pickupRotations?: Record<string, PickupRotation>;
}

export interface PickupRotation {
  memberKey: string;
  shuffledNames: string[];
  nextIndex: number;
}

export interface RestaurantSummary {
  restaurant: string;
  totalOrders: number;
  totalValue: number;
  totalDiscount: number;
  totalAmount: number;
  reward: number;
  payment: number;
}

export type UserRole = 'admin' | 'member';

export type StateAction =
  | { type: 'UPDATE_ORDER'; payload: { id: string; patch: Partial<OrderEntry> } }
  | { type: 'ADD_TODAY_ORDER' }
  | { type: 'DELETE_TODAY_ORDER'; payload: { id: string } }
  | {
      type: 'UPDATE_FUND_FIELD';
      payload: {
        memberId: string;
        field: keyof FundEntry;
        value: FundEntry[keyof FundEntry];
      };
    }
  | { type: 'TOGGLE_ORDER_CHECK'; payload: { memberId: string; date: string } }
  | {
      type: 'SET_DAILY_COST';
      payload: { memberId: string; date: string; cost: number };
    }
  | {
      type: 'SET_CONTRIBUTION';
      payload: { memberId: string; index: 0 | 1 | 2; value: number };
    }
  | { type: 'ADD_ORDER_DATE'; payload: { date: string } }
  | { type: 'ADD_MEMBER'; payload: { name: string } }
  | { type: 'ADD_RESTAURANT'; payload: Omit<Restaurant, 'id'> }
  | { type: 'UPDATE_RESTAURANT'; payload: { id: string; patch: Partial<Omit<Restaurant, 'id'>> } }
  | { type: 'DELETE_RESTAURANT'; payload: { id: string } }
  | {
      type: 'UPDATE_SUMMARY_EXTRA';
      payload: {
        restaurant: string;
        field: keyof SummaryExtra;
        value: number;
      };
    }
  | { type: 'SET_SHOP_OWNER'; payload: { memberId: string | null } }
  | { type: 'SET_SESSION_ADVANCE'; payload: { amount: number } }
  | { type: 'FINALIZE_SESSION_COSTS' }
  | { type: 'DISBURSE_TO_SHOP_OWNER' }
  | { type: 'ADD_SHOP_TODAY' }
  | {
      type: 'UPDATE_SHOP_TODAY';
      payload: { id: string; patch: Partial<ShopTodayEntry> };
    }
  | { type: 'DELETE_SHOP_TODAY'; payload: { id: string } }
  | { type: 'CLOSE_DAY'; payload: { nextDate?: string } }
  | { type: 'RESET' };

export interface AuthUser {
  username: string;
  role: UserRole;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  auth?: 'google' | 'password';
}
