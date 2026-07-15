import { useCallback, useEffect, useState } from 'react';
import { createDefaultState } from '../data/defaultData';
import type {
  AppState,
  OrderEntry,
  FundEntry,
  Restaurant,
  StateAction,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { emitAction, getSocket, reconnectSocket } from '../api/socket';

export function useAppState() {
  const { token, isAdmin } = useAuth();
  const [state, setState] = useState<AppState>(createDefaultState);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket(token);

    const onConnect = () => {
      setConnected(true);
      setError(null);
    };
    const onDisconnect = () => setConnected(false);
    const onSync = (payload: { state: AppState; online: number }) => {
      setState(payload.state);
      setOnline(payload.online);
    };
    const onPresence = (payload: { online: number }) => {
      setOnline(payload.online);
    };
    const onConnectError = () => {
      setConnected(false);
      setError('Không kết nối được server. Chạy npm run dev:all');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state:sync', onSync);
    socket.on('presence:update', onPresence);
    socket.on('connect_error', onConnectError);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state:sync', onSync);
      socket.off('presence:update', onPresence);
      socket.off('connect_error', onConnectError);
    };
  }, [token]);

  useEffect(() => {
    reconnectSocket(token);
  }, [token]);

  const dispatch = useCallback(async (action: StateAction) => {
    const result = await emitAction(action);
    if (!result.ok) {
      setError(result.error ?? 'Thao tác thất bại');
      setTimeout(() => setError(null), 5000);
    }
    return result;
  }, []);

  const updateOrder = useCallback(
    (id: string, patch: Partial<OrderEntry>) =>
      dispatch({ type: 'UPDATE_ORDER', payload: { id, patch } }),
    [dispatch],
  );

  const addTodayOrder = useCallback(
    () => dispatch({ type: 'ADD_TODAY_ORDER' }),
    [dispatch],
  );

  const deleteTodayOrder = useCallback(
    (id: string) => dispatch({ type: 'DELETE_TODAY_ORDER', payload: { id } }),
    [dispatch],
  );

  const updateFundField = useCallback(
    (
      memberId: string,
      field: keyof FundEntry,
      value: FundEntry[keyof FundEntry],
    ) =>
      dispatch({
        type: 'UPDATE_FUND_FIELD',
        payload: { memberId, field, value },
      }),
    [dispatch],
  );

  const toggleOrderCheck = useCallback(
    (memberId: string, date: string) =>
      dispatch({ type: 'TOGGLE_ORDER_CHECK', payload: { memberId, date } }),
    [dispatch],
  );

  const setDailyCost = useCallback(
    (memberId: string, date: string, cost: number) =>
      dispatch({ type: 'SET_DAILY_COST', payload: { memberId, date, cost } }),
    [dispatch],
  );

  const setContribution = useCallback(
    (memberId: string, index: 0 | 1 | 2, value: number) =>
      dispatch({
        type: 'SET_CONTRIBUTION',
        payload: { memberId, index, value },
      }),
    [dispatch],
  );

  const addOrderDate = useCallback(
    (date: string) => dispatch({ type: 'ADD_ORDER_DATE', payload: { date } }),
    [dispatch],
  );

  const addMember = useCallback(
    (name: string) => dispatch({ type: 'ADD_MEMBER', payload: { name } }),
    [dispatch],
  );

  const addRestaurant = useCallback(
    (restaurant: Omit<Restaurant, 'id'>) =>
      dispatch({ type: 'ADD_RESTAURANT', payload: restaurant }),
    [dispatch],
  );

  const updateRestaurant = useCallback(
    (id: string, patch: Partial<Omit<Restaurant, 'id'>>) =>
      dispatch({ type: 'UPDATE_RESTAURANT', payload: { id, patch } }),
    [dispatch],
  );

  const deleteRestaurant = useCallback(
    (id: string) => dispatch({ type: 'DELETE_RESTAURANT', payload: { id } }),
    [dispatch],
  );

  const updateSummaryExtra = useCallback(
    (restaurant: string, field: 'reward' | 'payment', value: number) =>
      dispatch({
        type: 'UPDATE_SUMMARY_EXTRA',
        payload: { restaurant, field, value },
      }),
    [dispatch],
  );

  const setShopOwner = useCallback(
    (memberId: string | null) =>
      dispatch({ type: 'SET_SHOP_OWNER', payload: { memberId } }),
    [dispatch],
  );

  const setSessionAdvance = useCallback(
    (amount: number) =>
      dispatch({ type: 'SET_SESSION_ADVANCE', payload: { amount } }),
    [dispatch],
  );

  const finalizeSessionCosts = useCallback(
    () => dispatch({ type: 'FINALIZE_SESSION_COSTS' }),
    [dispatch],
  );

  const disburseToShopOwner = useCallback(
    () => dispatch({ type: 'DISBURSE_TO_SHOP_OWNER' }),
    [dispatch],
  );

  const addShopToday = useCallback(
    () => dispatch({ type: 'ADD_SHOP_TODAY' }),
    [dispatch],
  );

  const updateShopToday = useCallback(
    (id: string, patch: Partial<import('../types').ShopTodayEntry>) =>
      dispatch({ type: 'UPDATE_SHOP_TODAY', payload: { id, patch } }),
    [dispatch],
  );

  const deleteShopToday = useCallback(
    (id: string) => dispatch({ type: 'DELETE_SHOP_TODAY', payload: { id } }),
    [dispatch],
  );

  const resetState = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  return {
    state,
    connected,
    online,
    error,
    isAdmin,
    updateOrder,
    addTodayOrder,
    deleteTodayOrder,
    updateFundField,
    toggleOrderCheck,
    setDailyCost,
    setContribution,
    addOrderDate,
    addMember,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    updateSummaryExtra,
    setShopOwner,
    setSessionAdvance,
    finalizeSessionCosts,
    disburseToShopOwner,
    addShopToday,
    updateShopToday,
    deleteShopToday,
    resetState,
  };
}
