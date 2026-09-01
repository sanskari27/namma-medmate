export interface OpeningBooksInput {
  accessToken: string;
  locationId: string;
  startAtZero: boolean;
  cashInTillPaise: number;
  openingKhata: unknown[];
  openingAp: unknown[];
}

export interface BooksGstClient {
  alreadyPosted: boolean;
  postOpenings(input: OpeningBooksInput): Promise<{ journal_ids: string[] }>;
}

export class MemoryBooksGstClient implements BooksGstClient {
  fail = false;
  alreadyPosted = false;
  last?: OpeningBooksInput;

  async postOpenings(input: OpeningBooksInput): Promise<{ journal_ids: string[] }> {
    this.last = input;
    if (this.alreadyPosted) {
      throw Object.assign(new Error('already posted'), { code: 'OPENING_BOOKS_ALREADY_POSTED' });
    }
    if (this.fail) {
      throw new Error('books-gst unavailable');
    }
    this.alreadyPosted = true;
    return { journal_ids: input.startAtZero ? [] : ['j_1'] };
  }
}

export function createHttpBooksGstClient(baseUrl: string): BooksGstClient {
  return {
    alreadyPosted: false,
    async postOpenings(input) {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/books-gst/openings?location_id=${encodeURIComponent(input.locationId)}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            location_id: input.locationId,
            start_at_zero: input.startAtZero,
            cash_in_till_paise: input.cashInTillPaise,
            opening_khata: input.openingKhata,
            opening_ap: input.openingAp,
          }),
        },
      );
      if (response.status === 409) {
        throw Object.assign(new Error('already posted'), { code: 'OPENING_BOOKS_ALREADY_POSTED' });
      }
      if (!response.ok) {
        throw new Error('books-gst unavailable');
      }
      const body = (await response.json()) as { data?: { journal_ids?: string[] } };
      return { journal_ids: body.data?.journal_ids ?? [] };
    },
  };
}
