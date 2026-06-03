DROP POLICY IF EXISTS "item-photos auth delete" ON storage.objects;
DROP POLICY IF EXISTS "item-photos auth update" ON storage.objects;
DROP POLICY IF EXISTS "item-photos auth upload" ON storage.objects;

DROP POLICY IF EXISTS "pat-photos auth delete" ON storage.objects;
DROP POLICY IF EXISTS "pat-photos auth insert" ON storage.objects;
DROP POLICY IF EXISTS "pat-photos auth update" ON storage.objects;