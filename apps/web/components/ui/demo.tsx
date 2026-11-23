'use client';

import React from 'react';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';

export default function DemoEmber() {
  return (
    <div style={{ width: '100%', backgroundColor: '#0284c7' }}>
      <PushpinTearFooter
        brand="SnapPrint"
        name="Palnadu Print Network"
        logoHref="/"
        logo={
          <span style={{ fontSize: '1.5em', fontWeight: 700, letterSpacing: '-0.03em' }}>
            SnapPrint
          </span>
        }
        sheet="#0284c7"
        paper="#f8fafc"
        paperInk="#0f172a"
        seed={23}
        email="contact@snapprint.in"
        newsletter={{
          label: 'receive shop news and printing offers',
          placeholder: 'your@email.com',
        }}
        status={{ label: 'ready for digital xerox orders' }}
        mark="PALNADU / 2026"
        timeZone="Asia/Kolkata"
        timeLabel="IST"
        columns={[
          {
            title: 'services',
            links: [
              { label: 'B&W Xerox & Document Print', href: '/' },
              { label: 'Color Photo Printing', href: '/' },
              { label: 'Duplex Document Xerox', href: '/' },
            ],
          },
          {
            title: 'portal',
            links: [
              { label: 'Shopkeeper Sign In', href: '/' },
              { label: 'Register Studio', href: '/' },
              { label: 'Platform Admin', href: '/admin' },
            ],
          },
        ]}
        sideLinks={[
          { icon: 'shield', label: 'privacy policy', href: '/#privacy' },
          { icon: 'doc', label: 'terms of service', href: '/#terms' },
        ]}
        chat={{ label: 'support', href: 'mailto:contact@snapprint.in' }}
        copyright="© 2026 SnapPrint Technologies"
        credit="multi-tenant print network"
        handle={{ label: '@snapprint', href: 'https://print.palnadu.dev' }}
      />
    </div>
  );
}
