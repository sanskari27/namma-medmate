import { Suspense } from "react";
import { SearchClient } from "@/components/search-client";
import { Container } from "@/components/ui";
import { pageMeta } from "@/lib/site";

export const metadata = { ...pageMeta({ title: "Search medicines", description: "Search medicines by brand name or salt and order from licensed pharmacies near you on MedMate.", path: "/search" }), robots: { index: false, follow: true } };

export default function Search() {
  return (
    <main>
      <Container className="flex flex-col gap-6 py-8 sm:gap-8 sm:py-12">
        <h1 className="d-h1">Search <span className="text-green">medicines</span></h1>
        <Suspense>
          <SearchClient />
        </Suspense>
      </Container>
    </main>
  );
}
