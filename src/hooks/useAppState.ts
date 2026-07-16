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
import { fetchState, postAction } from '../api/http';
import { getBrowserSupabase } from '../api/supabaseBrowser';

export function useAppState() {
  const { token, isAdmin } = useAuth();
  const [state, setState] = useState<AppState>(createDefaultState);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await fetchState();
        if (cancelled) return;
        setState(payload.state);
        setOnline(payload.online ?? 0);
        setConnected(true);
        setError(null);
      } catch {
        if (cancelled) return;
        setConnected(false);
        setError('Không kết nối được server');
      }
    }

    void load();

    const supabase = getBrowserSupabase();
    const channel = supabase
      ?.channel('app_state_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_state',
          filter: 'id=eq.main',
        },
        (payload) => {
          const row = payload.new as { data?: AppState } | null;
          if (row?.data) {
            setState(row.data);
            setConnected(true);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnected(true);
      });

    // Fallback poll nếu chưa có Realtime / anon key
    const pollMs = supabase ? 30_000 : 5_000;
    const pollId = window.setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const dispatch = useCallback(
    async (action: StateAction) => {
      const result = await postAction(action, token);
      if (!result.ok) {
        setError(result.error ?? 'Thao tác thất bại');
        setTimeout(() => setError(null), 5000);
        return result;
      }
      if (result.state) {
        setState(result.state);
        setConnected(true);
      }
      return result;
    },
    [token],
  );

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

  const closeDay = useCallback(
    (nextDate?: string) =>
      dispatch({ type: 'CLOSE_DAY', payload: { nextDate } }),
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
    closeDay,
    resetState,
  };
}
