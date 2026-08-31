import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { shopIdentityStories } from '../../data/stories.ts';
import { openShopIdentityStory } from '../../screens/shop-identity-badge/shop-identity-badge.steps.ts';
import { openCreatePharmacyForm } from '../../screens/create-pharmacy-fields/create-pharmacy-fields.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of shopIdentityStories) {
  test(taggedTitle(`a11y for ${story} story`, e2eTags.a11y), async ({ shopIdentityPage, a11y }) => {
    await openShopIdentityStory({ shopIdentityPage }, story);
    if (story === 'loaded') {
      await shopIdentityPage.expectReady();
    } else {
      await shopIdentityPage.expectAlertVisible();
    }
    await a11y.scan();
  });
}

test(
  taggedTitle('a11y for create pharmacy fields', e2eTags.a11y),
  async ({ createPharmacyPage, a11y }) => {
    await openCreatePharmacyForm({ createPharmacyPage });
    await createPharmacyPage.expectReady();
    await a11y.scan();
  },
);
