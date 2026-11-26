import { useEffect, useState } from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';
import {
  deleteOperatorOrderDocument,
  fetchOperatorOrderQueue,
  OrderApiError,
  retryOperatorOrderPrint,
  updateOperatorOrderStatus,
} from '../../src/order-client';
import { useAutoDismiss } from './use-auto-dismiss';

export function useOperatorQueue(studioId: string, statusFilter: OrderStatus | 'all') {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useAutoDismiss(successMessage, () => setSuccessMessage(null));

  async function loadOrders() {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
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
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateOperatorOrderStatus(
        studioId,
        orderId,
        newStatus,
        undefined,
        confirmedHandover
      );
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? updated : o)));
      if (newStatus === 'processing') {
        setSuccessMessage(
          `Order #${updated.orderNumber} printing started & dispatched to printer spooler.`
        );
      } else if (newStatus === 'ready') {
        setSuccessMessage(`Order #${updated.orderNumber} marked ready for pickup.`);
      } else if (newStatus === 'completed') {
        setSuccessMessage(`Order #${updated.orderNumber} handover completed.`);
      } else if (newStatus === 'cancelled') {
        setSuccessMessage(`Order #${updated.orderNumber} cancelled.`);
      }
    } catch (err) {
      const isPaymentRequired =
        (err instanceof OrderApiError && err.code === 'PAYMENT_REQUIRED_BEFORE_PRINT') ||
        (err instanceof Error && err.message.includes('PAYMENT_REQUIRED_BEFORE_PRINT'));
      const msg = isPaymentRequired
        ? '⚠️ Payment Required: Collect payment before printing this order.'
        : err instanceof Error
          ? err.message
          : 'Failed to update status';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteDocument(orderId: string, assetId: string) {
    setError(null);
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
      setSuccessMessage('Document deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }

  function handlePaymentSuccess(updatedOrder: OrderRecord) {
    setOrders((prev) => prev.map((o) => (o.orderId === updatedOrder.orderId ? updatedOrder : o)));
    setSuccessMessage(`Payment recorded for order #${updatedOrder.orderNumber}.`);
  }

  async function handleRetryPrint(order: OrderRecord) {
    setUpdatingId(order.orderId);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await retryOperatorOrderPrint(studioId, order.orderId);
      setSuccessMessage(
        `Order #${order.orderNumber}: ${res.resetCount} print job(s) queued for physical printing.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry print jobs');
    } finally {
      setUpdatingId(null);
    }
  }

  return {
    orders,
    loading,
    error,
    successMessage,
    updatingId,
    loadOrders,
    handleStatusChange,
    handleDeleteDocument,
    handlePaymentSuccess,
    handleRetryPrint,
    clearFeedback: () => {
      setError(null);
      setSuccessMessage(null);
    },
  };
}
