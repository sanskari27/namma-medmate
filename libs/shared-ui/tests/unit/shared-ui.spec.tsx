import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Badge,
  Button,
  Input,
  Label,
  StatusBanner,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '../../src/index.ts';

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
const SIZES = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const;

describe('shared-ui', () => {
  it('renders an accessible button with extra class names', () => {
    render(
      <Button variant="secondary" className="extra">
        Continue
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass('extra');
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('min-h-11');
  });

  it('applies every public variant and size', () => {
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument();
      unmount();
    }
    for (const size of SIZES) {
      const { unmount } = render(<Button size={size}>sized</Button>);
      expect(screen.getByRole('button', { name: 'sized' })).toBeInTheDocument();
      unmount();
    }
  });

  it('uses alert for error banners and status otherwise', () => {
    const { rerender } = render(<StatusBanner tone="error">Failed</StatusBanner>);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    rerender(<StatusBanner tone="info">Working</StatusBanner>);
    expect(screen.getByRole('status')).toHaveTextContent('Working');
    rerender(<StatusBanner tone="success">Saved</StatusBanner>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('merges tailwind classes with cn', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4');
  });

  it('renders badge variants, labelled inputs, and a 44px field', () => {
    const { rerender, unmount } = render(<Badge>Shop</Badge>);
    expect(screen.getByText('Shop')).toBeInTheDocument();
    rerender(<Badge variant="secondary">Plan</Badge>);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    rerender(<Badge variant="outline">One shop</Badge>);
    expect(screen.getByText('One shop')).toBeInTheDocument();
    unmount();
    render(
      <div>
        <Label htmlFor="shop-name">Shop name</Label>
        <Input id="shop-name" defaultValue="Sri Krishna Medicals" />
      </div>,
    );
    expect(screen.getByLabelText('Shop name')).toHaveClass('min-h-11');
  });

  it('renders a table with caption and footer', () => {
    render(
      <Table>
        <TableCaption>Inbox</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>To</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>+919876543210</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1 row</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(screen.getByText('1 row')).toBeInTheDocument();
  });
});
