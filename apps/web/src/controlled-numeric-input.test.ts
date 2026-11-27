import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ControlledNumericInput } from '../app/components/controlled-numeric-input.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('ControlledNumericInput Component', () => {
  it('renders initial numeric value as text input with decimal inputmode', () => {
    const html = renderToStaticMarkup(
      React.createElement(ControlledNumericInput, {
        value: 2.5,
        onChange: vi.fn(),
        allowDecimals: true,
      })
    );
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain('value="2.5"');
  });

  it('renders integer numeric mode when allowDecimals is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(ControlledNumericInput, {
        value: 30,
        onChange: vi.fn(),
      })
    );
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('value="30"');
  });

  it('renders placeholder, required and aria labels properly', () => {
    const html = renderToStaticMarkup(
      React.createElement(ControlledNumericInput, {
        value: '',
        onChange: vi.fn(),
        placeholder: 'e.g. 5',
        required: true,
        'aria-label': 'Duration in days',
      })
    );
    expect(html).toContain('placeholder="e.g. 5"');
    expect(html).toContain('required');
    expect(html).toContain('aria-label="Duration in days"');
  });

  it('renders disabled attribute when disabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(ControlledNumericInput, {
        value: 10,
        onChange: vi.fn(),
        disabled: true,
      })
    );
    expect(html).toContain('disabled');
  });
});
