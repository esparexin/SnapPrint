import { describe, expect, it, vi } from 'vitest';
import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { OrderFulfillmentHeader } from '../app/components/order-fulfillment-header.js';
import { PrinterFleetFooter } from '../app/components/printer-fleet-footer.js';
import { PrinterFleetHeader } from '../app/components/printer-fleet-header.js';
import { SetupWizardModal } from '../app/components/setup-wizard-modal.js';
import { ShopPaymentModalFooter } from '../app/components/shop-payment-modal-footer.js';
import { ShopPaymentModalHeader } from '../app/components/shop-payment-modal-header.js';
import { ShopProfileModalFooter } from '../app/components/shop-profile-modal-footer.js';
import { ShopProfileModalHeader } from '../app/components/shop-profile-modal-header.js';
import { StaffManagementHeader } from '../app/components/staff-management-header.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

vi.mock('../app/hooks/use-dialog.js', () => ({
  useDialog: () => ({
    handleBackdropClick: vi.fn(),
    swipeHandlers: {},
  }),
}));

vi.mock('react-dom', () => ({
  createPortal: (node: unknown) => node,
}));

describe('Close Buttons Streamline & Deduplication', () => {
  it('SetupWizardModal specifies hideCloseButton on ModalSheetShell to prevent overlapping buttons', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    const vnode = SetupWizardModal({
      studioId: 'std_1',
      onComplete,
      onClose,
    });

    expect(vnode.props.hideCloseButton).toBe(true);
    expect(vnode.props.onClose).toBe(onClose);
  });

  it('OrderFulfillmentHeader suppresses close button when onClose is omitted (inShell mode)', () => {
    const vnodeInShell = OrderFulfillmentHeader({
      studioName: 'Test Studio',
      orderCount: 5,
      loading: false,
      onRefresh: vi.fn(),
    });

    // Sub-view in shell should not render a close button
    const actionGroup = vnodeInShell.props.children[1];
    const buttons = Array.isArray(actionGroup.props.children)
      ? actionGroup.props.children
      : [actionGroup.props.children];

    const closeBtn = buttons.find(
      (b: { props?: { className?: string } } | null) => b?.props?.className === 'dialog-close-btn'
    );
    expect(closeBtn).toBeFalsy();

    // Standalone modal with onClose renders exactly one close button
    const onClose = vi.fn();
    const vnodeStandalone = OrderFulfillmentHeader({
      studioName: 'Test Studio',
      orderCount: 5,
      loading: false,
      onRefresh: vi.fn(),
      onClose,
    });

    const actionGroupStandalone = vnodeStandalone.props.children[1];
    const buttonsStandalone = Array.isArray(actionGroupStandalone.props.children)
      ? actionGroupStandalone.props.children
      : [actionGroupStandalone.props.children];

    const standaloneCloseBtn = buttonsStandalone.find(
      (b: { props?: { className?: string } } | null) => b?.props?.className === 'dialog-close-btn'
    );
    expect(standaloneCloseBtn).toBeTruthy();
  });

  it('PrinterFleetHeader suppresses close button when onClose is omitted (inShell mode)', () => {
    const vnodeInShell = PrinterFleetHeader({
      studioId: 'std_1',
      studioName: 'Test Studio',
      onOpenPairing: vi.fn(),
    });

    const actionGroup = vnodeInShell.props.children[1];
    const buttons = Array.isArray(actionGroup.props.children)
      ? actionGroup.props.children
      : [actionGroup.props.children];

    const closeBtn = buttons.find(
      (b: { props?: { className?: string } } | null) => b?.props?.className === 'dialog-close-btn'
    );
    expect(closeBtn).toBeFalsy();

    // Standalone modal with onClose renders close button
    const onClose = vi.fn();
    const vnodeStandalone = PrinterFleetHeader({
      studioId: 'std_1',
      studioName: 'Test Studio',
      onOpenPairing: vi.fn(),
      onClose,
    });

    const actionGroupStandalone = vnodeStandalone.props.children[1];
    const buttonsStandalone = Array.isArray(actionGroupStandalone.props.children)
      ? actionGroupStandalone.props.children
      : [actionGroupStandalone.props.children];

    const standaloneCloseBtn = buttonsStandalone.find(
      (b: { props?: { className?: string } } | null) => b?.props?.className === 'dialog-close-btn'
    );
    expect(standaloneCloseBtn).toBeTruthy();
  });

  it('Inline shell headers and footers omit redundant Close and Cancel buttons when onClose is omitted', () => {
    const printerFooterInline = renderToStaticMarkup(
      React.createElement(PrinterFleetFooter, { loading: false, onRefresh: vi.fn() })
    );
    expect(printerFooterInline).toContain('Refresh Printers');
    expect(printerFooterInline).not.toContain('Close');

    const printerFooterModal = renderToStaticMarkup(
      React.createElement(PrinterFleetFooter, {
        loading: false,
        onRefresh: vi.fn(),
        onClose: vi.fn(),
      })
    );
    expect(printerFooterModal).toContain('Close');

    const profileHeaderInline = renderToStaticMarkup(
      React.createElement(ShopProfileModalHeader, { studioName: 'Test', studioSlug: 'test' })
    );
    expect(profileHeaderInline).not.toContain('dialog-close-btn');

    const paymentHeaderInline = renderToStaticMarkup(
      React.createElement(ShopPaymentModalHeader, { studioName: 'Test', studioSlug: 'test' })
    );
    expect(paymentHeaderInline).not.toContain('dialog-close-btn');

    const staffHeaderInline = renderToStaticMarkup(
      React.createElement(StaffManagementHeader, { studioName: 'Test' })
    );
    expect(staffHeaderInline).not.toContain('dialog-close-btn');

    const profileFooterInline = renderToStaticMarkup(
      React.createElement(ShopProfileModalFooter, { saving: false })
    );
    expect(profileFooterInline).not.toContain('Cancel');

    const paymentFooterInline = renderToStaticMarkup(
      React.createElement(ShopPaymentModalFooter, { saving: false })
    );
    expect(paymentFooterInline).not.toContain('Cancel');
  });
});
