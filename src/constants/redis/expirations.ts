export const sessionExpiration = 60 * 60 * 8; // 8 hours
export const diaSessionExpiration = 60 * 60 * 48; // 2 days
// safety net only — large catalogs can take a while, this just keeps a "running" status
// from being stuck forever if the process dies mid-sync
export const productSyncStatusExpiration = 60 * 60; // 1 hour
