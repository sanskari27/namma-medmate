import { TRENDS_CONTENT } from '../../TrendsScreen.content';

export function TrendsEmptyState() {
  return <p className="tr-empty">{TRENDS_CONTENT.emptyHint}</p>;
}
