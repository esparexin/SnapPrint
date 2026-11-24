import { DocumentPrintConfig } from '@snapprint/contracts';

export const createDefaultConfig = (assetId: string): DocumentPrintConfig => ({
  assetId,
  paperSize: 'A4',
  colorMode: 'black_and_white',
  sides: 'single_sided',
  orientation: 'portrait',
  scaling: 'fit_to_page',
  pageSelection: 'all',
  copies: 1,
});
