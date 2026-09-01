import { useState } from 'react';
import { translate } from '@namma-medmate/i18n';
import {
  Badge,
  Button,
  Input,
  Label,
  StatusBanner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { GST_SLABS, SCHEDULES, parseGstSlabValue, parseScheduleValue } from '../lib/constants.ts';
import { applySkuFilters, toDetail, type SkuFilters } from '../lib/filters.ts';
import { masterCatalogueMessages } from '../i18n/en.ts';
import { AddMedicineModal } from './add-medicine-modal.tsx';
import { MasterCatalogueDrawer } from './master-catalogue-drawer.tsx';
import { useListSkusQuery, type MasterSkuListItem } from '../store/api/master-catalogue-api.ts';

export interface MasterCatalogueListProps {
  skipQuery?: boolean;
  items?: MasterSkuListItem[];
  error?: boolean;
  addOpen?: boolean;
  selectedSkuId?: string;
}

export function MasterCatalogueList({
  skipQuery = false,
  items: seededItems = [],
  error = false,
  addOpen = false,
  selectedSkuId,
}: MasterCatalogueListProps) {
  const [filters, setFilters] = useState<SkuFilters>({});
  const [modalOpen, setModalOpen] = useState(addOpen);
  const [drawerId, setDrawerId] = useState<string | undefined>(selectedSkuId);
  const query = useListSkusQuery(filters, { skip: skipQuery });
  const remoteItems = query.data?.items ?? [];
  const items = skipQuery ? applySkuFilters(seededItems, filters) : remoteItems;
  const failed = error || (!skipQuery && query.isError);
  const selected = items.find((item) => item.platform_master_sku_id === drawerId);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            {translate(masterCatalogueMessages, 'masterCatalogue.nav.hq')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {translate(masterCatalogueMessages, 'masterCatalogue.nav.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {translate(masterCatalogueMessages, 'masterCatalogue.list.subtitle')}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          {translate(masterCatalogueMessages, 'masterCatalogue.list.add')}
        </Button>
      </header>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
        <div className="flex flex-col gap-2 md:col-span-3">
          <Label htmlFor="master-catalogue-search">
            {translate(masterCatalogueMessages, 'masterCatalogue.list.search')}
          </Label>
          <Input
            id="master-catalogue-search"
            value={filters.q ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="master-catalogue-filter-category">
            {translate(masterCatalogueMessages, 'masterCatalogue.list.category')}
          </Label>
          <Input
            id="master-catalogue-filter-category"
            value={filters.category ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value || undefined,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="master-catalogue-filter-schedule">
            {translate(masterCatalogueMessages, 'masterCatalogue.list.schedule')}
          </Label>
          <select
            id="master-catalogue-filter-schedule"
            className="h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={filters.schedule ?? 'all'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                schedule: parseScheduleValue(event.target.value),
              }))
            }
          >
            <option value="all">
              {translate(masterCatalogueMessages, 'masterCatalogue.list.all')}
            </option>
            {SCHEDULES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="master-catalogue-filter-gst">
            {translate(masterCatalogueMessages, 'masterCatalogue.list.gst')}
          </Label>
          <select
            id="master-catalogue-filter-gst"
            className="h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={filters.gstSlab === undefined ? 'all' : String(filters.gstSlab)}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                gstSlab: parseGstSlabValue(event.target.value),
              }))
            }
          >
            <option value="all">
              {translate(masterCatalogueMessages, 'masterCatalogue.list.all')}
            </option>
            {GST_SLABS.map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={Boolean(filters.rxOnly)}
            onCheckedChange={(checked) =>
              setFilters((current) => ({ ...current, rxOnly: checked === true ? true : undefined }))
            }
            aria-label={translate(masterCatalogueMessages, 'masterCatalogue.list.rxOnly')}
          />
          {translate(masterCatalogueMessages, 'masterCatalogue.list.rxOnly')}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={Boolean(filters.banned)}
            onCheckedChange={(checked) =>
              setFilters((current) => ({ ...current, banned: checked === true ? true : undefined }))
            }
            aria-label={translate(masterCatalogueMessages, 'masterCatalogue.list.banned')}
          />
          {translate(masterCatalogueMessages, 'masterCatalogue.list.banned')}
        </label>
      </div>
      {failed ? (
        <StatusBanner tone="error">
          {translate(masterCatalogueMessages, 'masterCatalogue.list.error')}
        </StatusBanner>
      ) : null}
      {!failed && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate(masterCatalogueMessages, 'masterCatalogue.list.empty')}
        </p>
      ) : null}
      {items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.name')}
              </TableHead>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.composition')}
              </TableHead>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.category')}
              </TableHead>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.schedule')}
              </TableHead>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.gst')}
              </TableHead>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.ceiling')}
              </TableHead>
              <TableHead>
                {translate(masterCatalogueMessages, 'masterCatalogue.list.banned')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.platform_master_sku_id}
                className="cursor-pointer"
                onClick={() => setDrawerId(item.platform_master_sku_id)}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.composition}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <Badge variant={item.rx_only ? 'secondary' : 'outline'}>{item.schedule}</Badge>
                </TableCell>
                <TableCell>{item.gst_slab}</TableCell>
                <TableCell>{item.dpco_ceiling ?? ''}</TableCell>
                <TableCell>
                  {item.banned
                    ? translate(masterCatalogueMessages, 'masterCatalogue.list.banned')
                    : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <AddMedicineModal open={modalOpen} onOpenChange={setModalOpen} skipQuery={skipQuery} />
      {selected ? (
        <MasterCatalogueDrawer
          open
          onOpenChange={(next) => {
            if (!next) {
              setDrawerId(undefined);
            }
          }}
          skipQuery={skipQuery}
          sku={toDetail(selected)}
          skuId={selected.platform_master_sku_id}
        />
      ) : null}
    </section>
  );
}
