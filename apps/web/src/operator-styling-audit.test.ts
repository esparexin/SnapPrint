import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Operator Dashboard Frontend & CSS Audit Verification', () => {
  const componentsDir = path.resolve(__dirname, '../app/components');
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

  it('globals.css defines .pb-safe and responsive max-md dialog rules', () => {
    const css = fs.readFileSync(globalsCssPath, 'utf-8');
    expect(css).toContain('.pb-safe');
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('.dialog-overlay');
    expect(css).toContain('.dialog-overlay-nested');
    expect(css).toContain('.dialog-content');
  });

  it('guarantees zero uncompiled Tailwind utility classes across all components', () => {
    const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'));
    const twPattern =
      /\b(flex-col|flex-wrap|bg-slate-50|border-slate-200|rounded-lg|p-3\.5|max-w-3xl|max-w-md|bg-sky-600|hover:bg-sky-700)\b/;

    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
      if (twPattern.test(content)) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies nested dialog overlays declare dialog-overlay-nested', () => {
    const previewModal = fs.readFileSync(
      path.join(componentsDir, 'order-document-preview-modal.tsx'),
      'utf-8'
    );
    const handoverModal = fs.readFileSync(
      path.join(componentsDir, 'order-handover-confirm-modal.tsx'),
      'utf-8'
    );
    const duplexModal = fs.readFileSync(
      path.join(componentsDir, 'duplex-confirm-modal.tsx'),
      'utf-8'
    );
    const unbindModal = fs.readFileSync(
      path.join(componentsDir, 'unbind-device-modal.tsx'),
      'utf-8'
    );

    expect(previewModal).toContain('dialog-overlay-nested');
    expect(handoverModal).toContain('dialog-overlay-nested');
    expect(duplexModal).toContain('isNested');
    expect(unbindModal).toContain('isNested');
  });

  it('verifies printer and fleet components use responsive inline styles', () => {
    const printerRow = fs.readFileSync(path.join(componentsDir, 'printer-row-item.tsx'), 'utf-8');
    const fleetSection = fs.readFileSync(
      path.join(componentsDir, 'workstation-fleet-section.tsx'),
      'utf-8'
    );
    const sizeSection = fs.readFileSync(
      path.join(componentsDir, 'custom-paper-size-section.tsx'),
      'utf-8'
    );
    const sizeForm = fs.readFileSync(
      path.join(componentsDir, 'custom-paper-size-form.tsx'),
      'utf-8'
    );

    expect(printerRow).toContain('minHeight:');
    expect(printerRow).not.toContain('bg-slate-');
    expect(fleetSection).toContain('cardStyle');
    expect(fleetSection).not.toContain('border-slate-');
    expect(sizeSection).not.toContain('bg-sky-100');
    expect(sizeForm).toContain('inputStyle');
    expect(sizeForm).not.toContain('bg-slate-50');
  });
});
