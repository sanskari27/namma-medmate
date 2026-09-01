import { useEffect, useState, type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  StatusBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { masterCatalogueMessages } from '../i18n/en.ts';
import {
  useBanSkuMutation,
  useGetSkuQuery,
  useListStockingQuery,
  usePutCeilingMutation,
  usePutSubstitutesMutation,
  useUnbanSkuMutation,
  type MasterSkuDetail,
  type StockingPharmacy,
} from '../store/api/master-catalogue-api.ts';

export interface MasterCatalogueDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  skipQuery?: boolean;
  skuId?: string;
  sku?: MasterSkuDetail;
  stockingItems?: StockingPharmacy[];
  error?: boolean;
}

export function MasterCatalogueDrawer({
  open = true,
  onOpenChange,
  skipQuery = false,
  skuId,
  sku: seededSku,
  stockingItems = [],
  error = false,
}: MasterCatalogueDrawerProps) {
  const resolvedId = skuId ?? seededSku?.platform_master_sku_id ?? '';
  const skuQuery = useGetSkuQuery({ skuId: resolvedId }, { skip: skipQuery || !resolvedId });
  const stockingQuery = useListStockingQuery(
    { skuId: resolvedId },
    { skip: skipQuery || !resolvedId },
  );
  const sku = skipQuery ? seededSku : skuQuery.data;
  const stocking = skipQuery ? stockingItems : (stockingQuery.data?.items ?? []);
  const failed = error || skuQuery.isError || stockingQuery.isError;
  const [ceiling, setCeiling] = useState(sku?.dpco_ceiling ?? '');
  const [substituteId, setSubstituteId] = useState('');
  const [substitutes, setSubstitutes] = useState(
    (sku?.substitutes ?? []).map((item) => item.platform_master_sku_id),
  );
  const [banned, setBanned] = useState(sku?.banned ?? false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [putCeiling] = usePutCeilingMutation();
  const [banSku] = useBanSkuMutation();
  const [unbanSku] = useUnbanSkuMutation();
  const [putSubstitutes] = usePutSubstitutesMutation();

  useEffect(() => {
    if (!sku) {
      return;
    }
    setCeiling(sku.dpco_ceiling ?? '');
    setSubstitutes(sku.substitutes.map((item) => item.platform_master_sku_id));
    setBanned(sku.banned);
  }, [sku]);

  async function handleSaveCeiling(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const value = ceiling.trim() === '' ? null : ceiling.trim();
    if (skipQuery) {
      return;
    }
    const result = await putCeiling({ skuId: resolvedId, dpcoCeiling: value });
    setSaveError('error' in result);
  }

  async function handleSaveSubstitutes(): Promise<void> {
    if (skipQuery) {
      return;
    }
    const result = await putSubstitutes({ skuId: resolvedId, substituteIds: substitutes });
    setSaveError('error' in result);
  }

  async function handleBan(): Promise<void> {
    setConfirmBan(false);
    if (skipQuery) {
      setBanned(true);
      return;
    }
    const result = await banSku({ skuId: resolvedId });
    setSaveError('error' in result);
    if (!('error' in result)) {
      setBanned(true);
    }
  }

  async function handleUnban(): Promise<void> {
    if (skipQuery) {
      setBanned(false);
      return;
    }
    const result = await unbanSku({ skuId: resolvedId });
    setSaveError('error' in result);
    if (!('error' in result)) {
      setBanned(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>
            {sku?.name ?? translate(masterCatalogueMessages, 'masterCatalogue.drawer.title')}
          </SheetTitle>
          <SheetDescription>
            {translate(masterCatalogueMessages, 'masterCatalogue.drawer.composition')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          {failed || saveError ? (
            <StatusBanner tone="error">
              {translate(masterCatalogueMessages, 'masterCatalogue.errors.saveFailed')}
            </StatusBanner>
          ) : null}
          <p className="text-sm text-foreground">{sku?.composition ?? ''}</p>
          <div className="flex items-center gap-2">
            <Badge>{sku?.schedule}</Badge>
            {banned ? (
              <Badge variant="outline">
                {translate(masterCatalogueMessages, 'masterCatalogue.list.banned')}
              </Badge>
            ) : null}
          </div>
          <form className="flex flex-col gap-3" onSubmit={handleSaveCeiling}>
            <Label htmlFor="master-catalogue-drawer-ceiling">
              {translate(masterCatalogueMessages, 'masterCatalogue.drawer.ceiling')}
            </Label>
            <Input
              id="master-catalogue-drawer-ceiling"
              value={ceiling}
              onChange={(event) => setCeiling(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {translate(masterCatalogueMessages, 'masterCatalogue.ceiling.help')}
            </p>
            <div className="flex gap-2">
              <Button type="submit">
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.saveCeiling')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCeiling('');
                }}
              >
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.clearCeiling')}
              </Button>
            </div>
          </form>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              {translate(masterCatalogueMessages, 'masterCatalogue.drawer.substitutes')}
            </h3>
            <div className="flex gap-2">
              <Input
                id="master-catalogue-substitute-id"
                aria-label={translate(
                  masterCatalogueMessages,
                  'masterCatalogue.drawer.substituteId',
                )}
                value={substituteId}
                onChange={(event) => setSubstituteId(event.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!substituteId.trim()) {
                    return;
                  }
                  setSubstitutes((current) =>
                    current.includes(substituteId.trim())
                      ? current
                      : [...current, substituteId.trim()],
                  );
                  setSubstituteId('');
                }}
              >
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.addSubstitute')}
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {substitutes.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => void handleSaveSubstitutes()}>
              {translate(masterCatalogueMessages, 'masterCatalogue.drawer.saveSubstitutes')}
            </Button>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              {translate(masterCatalogueMessages, 'masterCatalogue.drawer.stocking')}
            </h3>
            {stocking.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.stockingEmpty')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {translate(masterCatalogueMessages, 'masterCatalogue.drawer.shop')}
                    </TableHead>
                    <TableHead>
                      {translate(masterCatalogueMessages, 'masterCatalogue.drawer.tenant')}
                    </TableHead>
                    <TableHead>
                      {translate(masterCatalogueMessages, 'masterCatalogue.drawer.location')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocking.map((row) => (
                    <TableRow key={row.location_id}>
                      <TableCell>{row.display_name}</TableCell>
                      <TableCell>{row.tenant_id}</TableCell>
                      <TableCell>{row.location_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
        <SheetFooter>
          {banned ? (
            <Button variant="secondary" onClick={() => void handleUnban()}>
              {translate(masterCatalogueMessages, 'masterCatalogue.drawer.unban')}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmBan(true)}>
              {translate(masterCatalogueMessages, 'masterCatalogue.drawer.ban')}
            </Button>
          )}
        </SheetFooter>
        <AlertDialog open={confirmBan} onOpenChange={setConfirmBan}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.confirmBan')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {translate(masterCatalogueMessages, 'masterCatalogue.ban.confirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleBan()}>
                {translate(masterCatalogueMessages, 'masterCatalogue.drawer.ban')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
