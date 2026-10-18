import { Input, Label } from '@atoms';
import type { WaitlistSignup } from '@/services/waitlist';
import { formatJoined, genderLabel } from '../../WaitlistScreen.utils';

export function WaitlistTable({
  rows,
  query,
  findId,
  onQuery,
}: {
  rows: WaitlistSignup[];
  query: string;
  findId: string;
  onQuery: (value: string) => void;
}) {
  return (
    <>
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor={findId}>Find sign-up</Label>
        <Input
          id={findId}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <caption className="sr-only">Waitlist sign-ups</caption>
          <thead className="border-b border-line bg-elevated text-[11px] text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Joined (IST)
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Name
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Phone
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Pincode
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Age
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Gender
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Language
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Source
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Offer
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-3 font-mono text-[11px] text-muted">
                  {formatJoined(row.createdAt)}
                </td>
                <td className="px-3 py-3 text-ink">{row.name}</td>
                <td className="px-3 py-3 font-mono text-[11px] text-ink">{row.phone}</td>
                <td className="px-3 py-3 font-mono text-[11px] text-ink">{row.pincode}</td>
                <td className="px-3 py-3 text-ink">{row.age}</td>
                <td className="px-3 py-3 text-ink">{genderLabel(row.gender)}</td>
                <td className="px-3 py-3 font-mono text-[11px] text-muted">{row.lang}</td>
                <td className="px-3 py-3 text-muted">{row.source}</td>
                <td className="px-3 py-3 font-mono text-[11px] text-muted">{row.offer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No sign-up matches that search.</p>
      ) : null}
    </>
  );
}
