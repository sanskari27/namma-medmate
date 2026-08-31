import { useMemo, useState } from 'react';
import { translate } from '@namma-medmate/i18n';
import {
  Label,
  StatusBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { whatsappMessages } from '../i18n/en.ts';
import { statusLabel, type MessageStatus } from '../lib/copy.ts';
import { useListMessagesQuery, type InboxItem } from '../store/api/whatsapp-api.ts';

const FILTERS: Array<MessageStatus | ''> = ['', 'queued', 'sent', 'delivered', 'read', 'failed'];

export interface WhatsAppInboxPageProps {
  skipQuery?: boolean;
  items?: InboxItem[];
  errorMessage?: string;
}

export function WhatsAppInboxPage({
  skipQuery = false,
  items: seededItems,
  errorMessage,
}: WhatsAppInboxPageProps) {
  const [status, setStatus] = useState<MessageStatus | ''>('');
  const query = useListMessagesQuery(status ? { status } : undefined, { skip: skipQuery });
  const remoteItems = query.data?.items ?? [];
  const items = skipQuery ? filterSeeded(seededItems ?? [], status) : remoteItems;
  const showError = Boolean(errorMessage) || query.isError;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {translate(whatsappMessages, 'whatsapp.inbox.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate(whatsappMessages, 'whatsapp.inbox.subtitle')}
        </p>
      </header>
      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp-status-filter">
          {translate(whatsappMessages, 'whatsapp.inbox.filter')}
        </Label>
        <select
          id="whatsapp-status-filter"
          className="min-h-11 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as MessageStatus | '');
          }}
        >
          {FILTERS.map((value) => (
            <option key={value || 'all'} value={value}>
              {value ? statusLabel(value) : translate(whatsappMessages, 'whatsapp.inbox.filterAll')}
            </option>
          ))}
        </select>
      </div>
      {showError ? (
        <StatusBanner tone="error">
          {errorMessage ?? translate(whatsappMessages, 'whatsapp.inbox.error')}
        </StatusBanner>
      ) : null}
      {items.length === 0 && !showError ? (
        <StatusBanner tone="info">
          {translate(whatsappMessages, 'whatsapp.inbox.empty')}
        </StatusBanner>
      ) : null}
      {items.length > 0 ? <InboxTable items={items} /> : null}
    </section>
  );
}

function filterSeeded(items: InboxItem[], status: MessageStatus | ''): InboxItem[] {
  return status ? items.filter((item) => item.status === status) : items;
}

function InboxTable({ items }: { items: InboxItem[] }) {
  const rows = useMemo(() => items, [items]);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{translate(whatsappMessages, 'whatsapp.inbox.to')}</TableHead>
          <TableHead>{translate(whatsappMessages, 'whatsapp.inbox.template')}</TableHead>
          <TableHead>{translate(whatsappMessages, 'whatsapp.inbox.status')}</TableHead>
          <TableHead>{translate(whatsappMessages, 'whatsapp.inbox.time')}</TableHead>
          <TableHead>{translate(whatsappMessages, 'whatsapp.inbox.retry')}</TableHead>
          <TableHead>{translate(whatsappMessages, 'whatsapp.inbox.preview')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item) => (
          <TableRow key={item.message_id}>
            <TableCell>{item.to}</TableCell>
            <TableCell>{item.template_key}</TableCell>
            <TableCell>{statusLabel(item.status)}</TableCell>
            <TableCell>{item.created_at}</TableCell>
            <TableCell>{item.retry_count}</TableCell>
            <TableCell className="whitespace-normal">{item.preview}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
