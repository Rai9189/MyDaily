-- Run only after the app that opens attachments through signed URLs is deployed.
update storage.buckets set public = false where id = 'attachments';
