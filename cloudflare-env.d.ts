declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    REVIEW_OWNER_ID?: string;
    REVIEW_ADMIN_PASSWORD_HASH?: string;
  }
}
