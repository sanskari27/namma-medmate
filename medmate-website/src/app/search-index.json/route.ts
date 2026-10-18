import { PRODUCTS, categoryOf, productHref } from "@/lib/catalogue";

export const dynamic = "force-static";

/** Small index the search page loads in the browser: name, composition, brand, category, link, Rx, photo. */
export function GET() {
  return Response.json(
    PRODUCTS.map((p) => ({ n: p.name, c: p.comp, b: p.brand, k: categoryOf(p).name, u: productHref(p), r: p.rx ? 1 : 0, i: p.img ?? "" })),
  );
}
