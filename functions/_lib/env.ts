// Settings for the website's server code. Bindings are set in /wrangler.toml; secrets in
// Cloudflare → Workers & Pages → jaytech9-website → Settings → Variables and Secrets.
export interface Env {
  DB: D1Database;                 // the shared "jaytech9" D1 database
  FILES?: R2Bucket;               // private file storage for client uploads (optional until the bucket exists)
  PAYSTACK_SECRET_KEY?: string;   // sk_test_… while testing, sk_live_… once Paystack approves the account
}
