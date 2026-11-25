import { useEffect, useState } from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';
import {
  deleteOperatorOrderDocument,
  fetchOperatorOrderQueue,
  updateOperatorOrderStatus,
} from '../../src/order-client';

export function useOperatorQueue(studioId: string, statusFilter: OrderStatus | 'all') {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOperatorOrderQueue(
        studioId,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setOrders(res.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [studioId, statusFilter]);

  async function handleStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    confirmedHandover?: boolean
  ) {
    setUpdatingId(orderId);
    try {
      const updated = await updateOperatorOrderStatus(
        studioId,
        orderId,
        newStatus,
        undefined,
        confirmedHandover
      );
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? updated : o)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      alert(
        msg.includes('PAYMENT_REQUIRED_BEFORE_PRINT')
          ? '⚠️ Payment Required: Collect payment before printing.'
          : msg
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteDocument(orderId: string, assetId: string) {
    try {
      await deleteOperatorOrderDocument(studioId, orderId, assetId);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId !== orderId
            ? o
            : {
                ...o,
                items: o.items.map((i) =>
                  i.assetId === assetId
                    ? { ...i, isDeleted: true, deletedAt: new Date().toISOString() }
                    : i
                ),
              }
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }

  function handlePaymentSuccess(updatedOrder: OrderRecord) {
    setOrders((prev) => prev.map((o) => (o.orderId === updatedOrder.orderId ? updatedOrder : o)));
  }

  return {
    orders,
    loading,
    error,
    updatingId,
    loadOrders,
    handleStatusChange,
    handleDeleteDocument,
    handlePaymentSuccess,
  };
}
