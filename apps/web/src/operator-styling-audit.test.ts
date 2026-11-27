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

  it('guarantees zero uncompiled Tailwind or undefined CSS classes across all web app routes and components', () => {
    const appDir = path.resolve(__dirname, '../app');
    const css = fs.readFileSync(globalsCssPath, 'utf-8');
    const globalClasses = new Set(
      [...css.matchAll(/\.([a-zA-Z0-9_\\:-]+)/g)].map((m) => m[1].replace(/\\/g, ''))
    );

    const walkTsx = (dir: string): string[] => {
      const results: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...walkTsx(full));
        else if (entry.name.endsWith('.tsx')) results.push(full);
      }
      return results;
    };

    const violations: string[] = [];
    for (const filePath of walkTsx(appDir)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const localClasses = new Set(
        [...content.matchAll(/\.([a-zA-Z0-9_\\:-]+)\s*[{:,]/g)].map((m) => m[1].replace(/\\/g, ''))
      );
      for (const match of content.matchAll(/className\s*=\s*["']([^"']+)["']/g)) {
        for (const cls of match[1].trim().split(/\s+/)) {
          if (cls && !globalClasses.has(cls) && !localClasses.has(cls)) {
            violations.push(`${path.relative(appDir, filePath)}: ${cls}`);
          }
        }
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
