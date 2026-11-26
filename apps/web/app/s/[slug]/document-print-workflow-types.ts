import type {
  PublicPaymentSettings,
  StudioPrintRatesContract,
  StudioPublicCapabilities,
} from '@snapprint/contracts';

export interface DocumentPrintWorkflowProps {
  slug: string;
  studioName: string;
  sessionId?: string;
  token?: string;
  isNewSession?: boolean;
  payment?: PublicPaymentSettings;
  isAcceptingOrders?: boolean;
  printRates?: StudioPrintRatesContract;
  capabilities?: StudioPublicCapabilities;
}
