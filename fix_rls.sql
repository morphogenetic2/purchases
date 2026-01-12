-- Enable RLS (Good practice, even if we are opening it up)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access to EVERYTHING for this minimal app
-- Note: In a real production app with users, you'd use "authenticated" role and "auth.uid()".
-- For this "Shared Password" vibe-auth app, we trust the Anon Key + our App's Auth Guard.

CREATE POLICY "Allow Anon Insert"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow Anon Select"
ON orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow Anon Update"
ON orders
FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow Anon Delete"
ON orders
FOR DELETE
TO anon, authenticated
USING (true);
