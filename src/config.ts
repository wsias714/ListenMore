/** Dropbox app key (public by design under PKCE: there is no secret). Wade pastes it in
    Settings on first run, or it can be baked in here / via VITE_DROPBOX_APP_KEY. */
export const DEFAULT_DROPBOX_APP_KEY: string = import.meta.env.VITE_DROPBOX_APP_KEY ?? "";
