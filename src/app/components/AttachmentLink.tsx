// src/app/components/AttachmentLink.tsx
import { supabase, extractStoragePath } from '../../lib/supabase';
import { toast } from 'sonner';

const SIGNED_URL_SECONDS = 60;

export function AttachmentLink({ url, className }: { url: string; className?: string }) {
  const handleOpen = async () => {
    // Open the tab before awaiting, otherwise popup blockers reject it.
    const tab = window.open('', '_blank');
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(extractStoragePath(url), SIGNED_URL_SECONDS);

    if (error || !data) {
      tab?.close();
      toast.error('Failed to open attachment');
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = data.signedUrl;
    }
  };

  return <button type="button" onClick={handleOpen} className={className}>View</button>;
}
