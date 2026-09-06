import type { Campaign } from '@/services/campaigns';

export type CampaignsPreviewPanelProps = {
  campaign: Campaign | null;
};

export function CampaignsPreviewPanel({ campaign }: CampaignsPreviewPanelProps) {
  if (!campaign) {
    return null;
  }
  const count = campaign.recipientCount;
  return (
    <section className="border border-line bg-surface p-3" aria-label="Recipient count">
      <h2 className="text-sm font-semibold text-ink">This list</h2>
      <p className="mt-2 text-sm text-muted">
        {count == null
          ? 'Count this list to see how many patients match, without sending.'
          : `${count} patients on these tags. Names and phones stay off this screen.`}
      </p>
    </section>
  );
}
