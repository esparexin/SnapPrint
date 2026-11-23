export interface StepItem {
  num: string;
  icon: string;
  title: string;
  desc: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export const ABOUT_STEPS: StepItem[] = [
  {
    num: '01',
    icon: '📱',
    title: 'Scan Counter QR',
    desc: 'Customers simply scan the QR code displayed at the store counter. No app download, sign up, or login required.',
  },
  {
    num: '02',
    icon: '⚡',
    title: 'Instant Dynamic Price',
    desc: 'Upload PDFs, photos, or documents. The engine automatically counts pages, detects color vs B&W, and calculates the exact price.',
  },
  {
    num: '03',
    icon: '🖨️',
    title: 'Direct Spool & Auto-Expire',
    desc: 'The file sends directly to the store printer queue via TLS and permanently auto-expires in 120 minutes with strict zero-leak TTL.',
  },
];

export const ABOUT_WHY_FEATURES: FeatureItem[] = [
  {
    icon: '🛡️',
    title: 'Zero WhatsApp Privacy Leaks',
    desc: 'Sensitive Aadhaar cards, voter IDs, and personal documents never stay saved on shopkeeper phones or store desktop folders.',
  },
  {
    icon: '⏱️',
    title: 'No Counter Bottlenecks',
    desc: 'Customers upload and verify print settings directly from their mobile while standing in line, ending pendrive hassles.',
  },
  {
    icon: '💰',
    title: 'Transparent Pricing',
    desc: 'Automatic page count and duplex detection gives upfront cost clarity before printing, preventing billing misunderstandings.',
  },
  {
    icon: '🏪',
    title: 'Built for Local Xerox Centers',
    desc: 'Xerox shops get their own operator workspace to manage queues, accept UPI payments, and control printer fleets easily.',
  },
];
