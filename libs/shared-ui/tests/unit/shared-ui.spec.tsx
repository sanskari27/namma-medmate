import { cleanup, render, screen } from '@testing-library/react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Switch,
  Checkbox,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
  cn,
} from '../../src/index.ts';

// ponytail: Base UI Select popup/focus-trap hangs jsdom (CI worker timeout). Stub primitives so wrappers still run.
vi.mock('@base-ui/react/select', () => {
  function Slot({
    children,
    className,
    render,
    side: _side,
    sideOffset: _sideOffset,
    align: _align,
    alignOffset: _alignOffset,
    alignItemWithTrigger: _alignItemWithTrigger,
    ...props
  }: HTMLAttributes<HTMLDivElement> & {
    render?: ReactElement;
    side?: string;
    sideOffset?: number;
    align?: string;
    alignOffset?: number;
    alignItemWithTrigger?: boolean;
  }) {
    return (
      <div className={className} {...props}>
        {render}
        {children}
      </div>
    );
  }

  return {
    Select: {
      Root: ({ children }: { children?: ReactNode }) => children,
      Group: Slot,
      Value: Slot,
      Trigger: Slot,
      Portal: ({ children }: { children?: ReactNode }) => children,
      Positioner: Slot,
      Popup: Slot,
      List: Slot,
      GroupLabel: Slot,
      Item: Slot,
      ItemText: Slot,
      ItemIndicator: Slot,
      Icon: Slot,
      Separator: Slot,
      ScrollUpArrow: Slot,
      ScrollDownArrow: Slot,
    },
  };
});

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
    expect(document.querySelector('[data-slot="table-container"]')).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(screen.getByText('1 row')).toBeInTheDocument();
  });

  it('renders dialog, alert dialog, sheet, select, and switch variants', () => {
    render(
      <Dialog open>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add medicine</DialogTitle>
            <DialogDescription>Enter catalogue fields.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <DialogClose>Close me</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Add medicine' })).toBeInTheDocument();
    cleanup();
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Quiet</DialogTitle>
          <DialogFooter>Done</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Quiet')).toBeInTheDocument();
    cleanup();
    render(
      <AlertDialog open>
        <AlertDialogTrigger>Ban</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>!</AlertDialogMedia>
            <AlertDialogTitle>Confirm ban</AlertDialogTitle>
            <AlertDialogDescription>Un-maps every pharmacy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText('Confirm ban')).toBeInTheDocument();
    cleanup();
    render(
      <AlertDialog open>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Small</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText('Small')).toBeInTheDocument();
    cleanup();
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const view = render(
        <Sheet open>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Drawer</SheetTitle>
              <SheetDescription>Details</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose>Dismiss</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText('Drawer')).toBeInTheDocument();
      view.unmount();
    }
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Plain</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByText('Plain')).toBeInTheDocument();
    cleanup();
    render(
      <div>
        <Switch aria-label="Rx-only" />
        <Switch size="sm" defaultChecked aria-label="Banned" />
      </div>,
    );
    expect(screen.getByRole('switch', { name: 'Rx-only' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Banned' })).toBeChecked();
  });

  it('renders select trigger sizes and list building blocks without opening', () => {
    render(
      <Select defaultValue="otc">
        <SelectTrigger aria-label="Schedule">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top" align="start">
          <SelectGroup>
            <SelectLabel>Schedule</SelectLabel>
            <SelectItem value="otc">OTC</SelectItem>
            <SelectItem value="h">H</SelectItem>
          </SelectGroup>
          <SelectSeparator />
        </SelectContent>
      </Select>,
    );
    expect(document.querySelector('[data-slot="select-trigger"]')).toHaveAttribute(
      'data-size',
      'default',
    );
    expect(document.querySelector('[data-slot="select-item"]')).toHaveTextContent('OTC');
    expect(document.querySelector('[data-slot="select-scroll-up-button"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="select-scroll-down-button"]')).toBeInTheDocument();
    cleanup();
    render(
      <Select defaultValue="h">
        <SelectTrigger size="sm" aria-label="Dense schedule">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="h">H</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(document.querySelector('[data-slot="select-trigger"]')).toHaveAttribute(
      'data-size',
      'sm',
    );
  });

  it('renders checkbox and input OTP public variants at 44px', () => {
    render(
      <div>
        <Checkbox aria-label="Remember this device" />
        <Checkbox defaultChecked aria-label="Remembered" />
      </div>,
    );
    const unchecked = screen.getByRole('checkbox', { name: 'Remember this device' });
    expect(unchecked).not.toBeChecked();
    expect(unchecked.className).toContain('size-11');
    expect(screen.getByRole('checkbox', { name: 'Remembered' })).toBeChecked();
    cleanup();
    render(
      <InputOTP maxLength={4} value="12" onChange={() => undefined} aria-label="Login OTP">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
        <InputOTPSeparator />
      </InputOTP>,
    );
    expect(document.querySelector('[data-slot="input-otp"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="input-otp-slot"]').length).toBe(4);
    expect(document.querySelector('[data-slot="input-otp-slot"]')?.className).toContain('size-11');
    expect(screen.getByRole('separator')).toBeInTheDocument();
    cleanup();
    render(<InputOTPSlot index={0} />);
    expect(document.querySelector('[data-slot="input-otp-slot"]')).toBeInTheDocument();
  });
});
