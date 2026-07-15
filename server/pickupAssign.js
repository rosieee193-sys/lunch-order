/** Số suất trung bình mỗi người có thể cầm */
export const SERVINGS_PER_PICKER = 6;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getShopStatsForOrders(orders, restaurant) {
  const key = restaurant.trim().toLowerCase();
  if (!key) return { totalOrders: 0 };
  const matched = orders.filter(
    (o) => o.restaurant.trim().toLowerCase() === key && o.unitPrice > 0,
  );
  return { totalOrders: matched.length };
}

export function pickersNeeded(orderCount) {
  if (orderCount <= 0) return 0;
  return Math.ceil(orderCount / SERVINGS_PER_PICKER);
}

function ordererNamesAtRestaurant(orders, restaurant) {
  const key = restaurant.trim().toLowerCase();
  if (!key) return [];
  const names = new Set();
  for (const o of orders ?? []) {
    const name = (o.ordererName ?? '').trim();
    if (
      name &&
      o.unitPrice > 0 &&
      o.restaurant.trim().toLowerCase() === key
    ) {
      names.add(name);
    }
  }
  return [...names];
}

function ordererNamesToday(state) {
  const names = new Set();
  for (const o of state.todayOrders ?? []) {
    const name = (o.ordererName ?? '').trim();
    if (name && o.unitPrice > 0) {
      names.add(name);
    }
  }
  return [...names];
}

function memberKey(names) {
  return names.slice().sort().join('\0');
}

function ensureRotation(state) {
  const date = state.sessionDate;
  const allNames = ordererNamesToday(state);
  const key = memberKey(allNames);
  const rotations = { ...(state.pickupRotations ?? {}) };
  let rot = rotations[date];
  if (!rot || rot.memberKey !== key || rot.shuffledNames.length !== allNames.length) {
    rot = {
      memberKey: key,
      shuffledNames: shuffleArray(allNames),
      nextIndex: 0,
    };
  }
  rotations[date] = rot;
  return { rotation: rot, rotations, allNames };
}

function takeNextPicker(rotation, poolNames, exclude) {
  if (poolNames.length === 0) return '';
  const poolSet = new Set(poolNames);
  const eligible = poolNames.filter((n) => !exclude.has(n));
  if (eligible.length === 0) return '';

  const maxTries = Math.max(rotation.shuffledNames.length, poolNames.length) * 2;
  let tries = 0;
  while (tries < maxTries) {
    if (rotation.nextIndex >= rotation.shuffledNames.length) {
      rotation.shuffledNames = shuffleArray([...rotation.shuffledNames]);
      rotation.nextIndex = 0;
    }
    const candidate = rotation.shuffledNames[rotation.nextIndex++];
    tries++;
    if (!exclude.has(candidate) && poolSet.has(candidate)) {
      return candidate;
    }
  }
  return eligible[0];
}

/**
 * Gán người đi lấy đơn cho từng shop:
 * - ceil(suất / 6) người mỗi quán
 * - người đặt đơn không được chọn
 * - random xoay vòng không trùng đến hết danh sách rồi shuffle lại
 * - chỉ chọn từ người có đơn món **cùng quán** hôm nay
 */
export function applyPickupAssignments(state) {
  const shops = state.shopTodayEntries ?? [];
  if (shops.length === 0) return state;

  const { rotation, rotations } = ensureRotation(state);
  rotation.nextIndex = 0;

  const sorted = [...shops].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(
    sorted.map((entry) => {
      const { totalOrders } = getShopStatsForOrders(
        state.todayOrders,
        entry.restaurant,
      );
      const needed = pickersNeeded(totalOrders);
      if (needed === 0) {
        return [entry.id, { ...entry, pickupPersonName: '' }];
      }

      const poolNames = ordererNamesAtRestaurant(
        state.todayOrders,
        entry.restaurant,
      );
      const orderer = entry.ordererName.trim();
      const picked = [];
      const exclude = new Set(orderer ? [orderer] : []);

      for (let i = 0; i < needed; i++) {
        const name = takeNextPicker(rotation, poolNames, exclude);
        if (!name) break;
        picked.push(name);
        exclude.add(name);
      }

      return [entry.id, { ...entry, pickupPersonName: picked.join(', ') }];
    }),
  );

  return {
    ...state,
    pickupRotations: rotations,
    shopTodayEntries: shops.map((s) => byId.get(s.id) ?? s),
  };
}

export const PICKUP_TRIGGER_ACTIONS = new Set([
  'UPDATE_ORDER',
  'ADD_TODAY_ORDER',
  'DELETE_TODAY_ORDER',
  'UPDATE_SHOP_TODAY',
  'ADD_SHOP_TODAY',
  'DELETE_SHOP_TODAY',
  'ADD_MEMBER',
]);
