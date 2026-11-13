// Settings for the website's server code. The database binding is set in /wrangler.toml.
export interface Env {
  DB: D1Database; // the shared "jaytech9" D1 database
}
