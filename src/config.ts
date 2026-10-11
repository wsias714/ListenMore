/** Dropbox app key (public by design under PKCE: there is no secret). Baked in so the phone
    needs no paste; Settings can still override it, or set VITE_DROPBOX_APP_KEY at build time. */
export const DEFAULT_DROPBOX_APP_KEY: string = import.meta.env.VITE_DROPBOX_APP_KEY ?? "1nsrjrp7p08hh6e";
