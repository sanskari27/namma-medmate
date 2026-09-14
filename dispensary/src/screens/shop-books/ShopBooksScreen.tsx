import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { ShopBooksCatalog } from './components/shop-books-catalog';
import { ShopBooksReport, ShopBooksReportToolbar } from './components/shop-books-report';
import { ShopBooksStatusBanner } from './components/shop-books-status-banner';
import { SHOP_BOOKS_CONTENT } from './ShopBooksScreen.content';
import { hasFinanceAccess } from './ShopBooksScreen.utils';
import './ShopBooksScreen.css';
import {
  accessDenied,
  hydrateOwnerScope,
  loadShopBook,
  loadShopBooksCatalog,
  selectShopBooksPeriod,
  selectShopBooksScope,
  selectShopBooksSelectedKey,
} from './store';

export default function ShopBooksScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const selectedKey = useSelector(selectShopBooksSelectedKey);
  const period = useSelector(selectShopBooksPeriod);
  const scope = useSelector(selectShopBooksScope);
  const allowed = hasFinanceAccess(user?.role, user?.roles);
  const owner = user?.role === 'pharmacy_owner';

  useEffect(() => {
    if (!allowed) {
      dispatch(
        accessDenied('Till staff cannot open shop books. Ask the owner for Accounts access.'),
      );
      return;
    }
    dispatch(hydrateOwnerScope({ owner, hasBranch: Boolean(user?.activeBranchId) }));
  }, [allowed, dispatch, owner, user?.activeBranchId]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void dispatch(loadShopBooksCatalog());
  }, [allowed, dispatch, scope]);

  useEffect(() => {
    if (!allowed || !selectedKey) {
      return;
    }
    void dispatch(loadShopBook(selectedKey));
  }, [allowed, dispatch, selectedKey, period, scope]);

  return (
    <div className="bk" aria-label={SHOP_BOOKS_CONTENT.regionLabel}>
      <ShopBooksStatusBanner />
      {allowed ? (
        selectedKey ? (
          <>
            <ShopBooksReportToolbar owner={owner} />
            <ShopBooksReport />
          </>
        ) : (
          <ShopBooksCatalog />
        )
      ) : null}
    </div>
  );
}
