// Settings the CRM server code reads. Set them in Cloudflare → Workers & Pages → jaytech9-crm →
// Settings → Variables and Secrets (mark keys as "Secret"). Local values go in crm/.dev.vars.
export interface Env {
  DB: D1Database;                // the shared "jaytech9" D1 database (binding set in wrangler.toml)
  FILES?: R2Bucket;              // client uploads for orders (same R2 bucket as the website)
  SITE_URL?: string;             // public website address used in client links (default https://jaytech9.com)
  ACCESS_TEAM_DOMAIN?: string;   // e.g. https://jaytech9.cloudflareaccess.com
  ACCESS_AUD?: string;           // "Application Audience (AUD) Tag" of the CRM app in Zero Trust → Access
  ADMIN_EMAILS?: string;         // comma-separated; these people become admins on first sign-in
  WEBSITE_DEPLOY_HOOK?: string;  // website project → Settings → Builds → Deploy hooks
  ARKESEL_API_KEY?: string;      // SMS (arkesel.com)
  SMS_SENDER_ID?: string;        // registered sender name, e.g. JayTech9
  RESEND_API_KEY?: string;       // email (resend.com)
  EMAIL_FROM?: string;           // e.g. JayTech9 <info@jaytech9.com>
  DEV_USER_EMAIL?: string;       // LOCAL TESTING ONLY: signs you in on localhost without Cloudflare Access
}

export interface StaffUser { id: string; email: string; name: string; role: 'admin' | 'staff' }
export type Ctx = EventContext<Env, string, { user: StaffUser }>;
