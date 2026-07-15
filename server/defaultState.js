const today = new Date().toISOString().slice(0, 10);

const memberNames = [
 'Little Linh', 'Việt Anh', 'Tuấn', 'Hương',
  'Nam', 'Lan', 'Phong', 'Quỳnh', 'Thảo',
];

export function emptySession() {
  return {
    shopOwnerId: null,
    advanceAmount: 0,
    disbursedAmount: 0,
    costsFinalized: false,
  };
}

export function createDefaultState() {
  const members = memberNames.map((name, i) => ({
    id: `m${i + 1}`,
    name,
  }));

  const restaurants = [
    {
      id: 'r1',
      name: 'Cơm tấm Sài Gòn',
      orderLink: '',
      note: 'Giao qua Grab',
      rating: null,
      color: '#fff3cd',
    },
    {
      id: 'r2',
      name: 'Bún chả Hà Nội',
      orderLink: '',
      note: 'Quán ngon, giao nhanh',
      rating: null,
      color: '#d4edda',
    },
    {
      id: 'r3',
      name: 'Phở Bò',
      orderLink: '',
      note: 'Đặt qua app giao hàng',
      rating: null,
      color: '#f8d7da',
    },
    {
      id: 'r4',
      name: 'Cơm văn phòng ABC',
      orderLink: '',
      note: 'Đặt qua Zalo rẻ hơn app',
      rating: null,
      color: '#cce5ff',
    },
    {
      id: 'r5',
      name: 'Bánh mì 362',
      orderLink: '',
      note: 'Không giao sau 14h',
      rating: null,
      color: '#e2d5f1',
    },
    {
      id: 'r6',
      name: 'Lẩu Thái',
      orderLink: '',
      note: 'Nhóm đông nên đặt trước',
      rating: null,
      color: '#ffe0b2',
    },
  ];

  const todayOrders = [];

  const orderDates = [
    today,
    '2026-03-04',
    '2026-03-06',
    '2026-03-07',
    '2026-03-10',
  ];

  const fundEntries = members.map((m) => ({
    memberId: m.id,
    prevBalance: 0,
    contributions: [0, 0, 0],
    orderChecks: Object.fromEntries(orderDates.map((d) => [d, false])),
    dailyCosts: Object.fromEntries(orderDates.map((d) => [d, 0])),
  }));

  return {
    members,
    restaurants,
    todayOrders,
    fundEntries,
    orderDates,
    sessionDate: today,
    summaryExtras: {},
    sessions: { [today]: emptySession() },
    shopTodayEntries: [],
    orderHistory: {},
    pickupRotations: {},
  };
}
