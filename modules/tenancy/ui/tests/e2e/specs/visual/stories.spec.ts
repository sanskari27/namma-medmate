import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { shopIdentityStories } from '../../data/stories.ts';
import { openShopIdentityStory } from '../../screens/shop-identity-badge/shop-identity-badge.steps.ts';
import { openCreatePharmacyForm } from '../../screens/create-pharmacy-fields/create-pharmacy-fields.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of shopIdentityStories) {
  test(
    taggedTitle(`visual for ${story} story`, e2eTags.visual),
    async ({ shopIdentityPage, visual }) => {
      await openShopIdentityStory({ shopIdentityPage }, story);
      if (story === 'loaded') {
        await shopIdentityPage.expectReady();
      } else {
        await shopIdentityPage.expectAlertVisible();
      }
      await visual.screenshot(`${story}.png`);
    },
  );
}

test(
  taggedTitle('visual for create pharmacy fields', e2eTags.visual),
  async ({ createPharmacyPage, visual }) => {
    await openCreatePharmacyForm({ createPharmacyPage });
    await createPharmacyPage.expectReady();
    await visual.screenshot('create-pharmacy.png');
  },
);
