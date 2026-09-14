import { Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import {
  selectKioskSearchQuery,
} from '../../store/kiosk.selectors';
import { setSearchQuery } from '../../store';

export function KioskSearchBar() {
  const dispatch = useDispatch<AppDispatch>();
  const query = useSelector(selectKioskSearchQuery);

  return (
    <div className="ko-search">
      <Search size={16} aria-hidden color="#5d7a6b" />
      <input
        value={query}
        onChange={(e) => dispatch(setSearchQuery(e.target.value))}
        placeholder={KIOSK_CONTENT.searchPlaceholder}
        aria-label={KIOSK_CONTENT.searchPlaceholder}
      />
    </div>
  );
}
