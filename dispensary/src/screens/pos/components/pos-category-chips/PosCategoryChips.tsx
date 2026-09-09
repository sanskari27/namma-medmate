import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { categoryFilterChanged } from '../../store/pos.slice';
import {
  selectPosCategories,
  selectPosCategoryFilterId,
} from '../../store/pos.selectors';

export function PosCategoryChips() {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector(selectPosCategories);
  const activeId = useSelector(selectPosCategoryFilterId);

  return (
    <div className="pos-chips" role="tablist" aria-label={POS_CONTENT.categoriesAria}>
      <button
        type="button"
        className="pos-chip"
        data-active={activeId === 'all'}
        role="tab"
        aria-selected={activeId === 'all'}
        onClick={() => dispatch(categoryFilterChanged('all'))}
      >
        {POS_CONTENT.categoryAll}
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className="pos-chip"
          data-active={activeId === category.id}
          role="tab"
          aria-selected={activeId === category.id}
          onClick={() => dispatch(categoryFilterChanged(category.id))}
        >
          {category.icon ? <span aria-hidden="true">{category.icon}</span> : null}
          {category.name}
        </button>
      ))}
    </div>
  );
}
