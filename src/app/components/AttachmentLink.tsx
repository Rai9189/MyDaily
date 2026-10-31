// src/app/components/AttachmentLink.tsx
import { useEffect, useState } from 'react';
import { supabase, extractStoragePath } from '../../lib/supabase';

const SIGNED_URL_SECONDS = 60 * 60;

// A real link, signed up front: window.open() after an await or into a blank
// tab can be blocked by the browser with no visible feedback.
export function AttachmentLink({ url, className }: { url: string; className?: string }) {
  const [href, setHref]     = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHref(null);
    setFailed(false);
    supabase.storage
      .from('attachments')
      .createSignedUrl(extractStoragePath(url), SIGNED_URL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setFailed(true);
        else setHref(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [url]);

  if (!href) {
    return <span className={`${className ?? ''} opacity-50`}>{failed ? 'Unavailable' : 'View'}</span>;
  }

  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>View</a>;
}
