import { Plus, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addOpened, searchChanged, selectStaffSearch } from '../../store';

export function StaffToolbar({ owner }: { owner: boolean }) {
  const dispatch = useDispatch();
  const search = useSelector(selectStaffSearch);
  return (
    <div className="st-toolbar">
      <h3 style={{ margin: 0 }}>Staff & access control</h3>
      <label className="st-search">
        <Search size={15} aria-hidden />
        <input
          type="search"
          value={search}
          placeholder="Search name, email, phone…"
          onChange={(event) => dispatch(searchChanged(event.target.value))}
        />
      </label>
      <div className="st-toolbar-spacer" />
      {owner ? (
        <button type="button" className="st-btn st-btn-primary" onClick={() => dispatch(addOpened(true))}>
          <Plus size={16} /> Add user
        </button>
      ) : null}
    </div>
  );
}
