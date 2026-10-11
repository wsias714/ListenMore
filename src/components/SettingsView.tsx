import { useState } from "react";
import { C, body, display, mono } from "../constants";
import { fmtStamp } from "../lib/library";
import { disconnect, finishAuthWithCode, getAppKey, getRefreshToken, redirectUri, setAppKey, startAuth } from "../lib/dropbox";
import type { Sync } from "../lib/useSync";
import { Btn, Input, Label } from "./atoms";

const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginTop: 14 };
const code: React.CSSProperties = { font: `400 12px/1.5 ${mono}`, color: C.text, background: C.bg, padding: "8px 10px", borderRadius: 6, wordBreak: "break-all" };

export function SettingsView({ sync, onBack, flash }: { sync: Sync; onBack: () => void; flash: (m: string) => void }) {
  const [key, setKey] = useState(getAppKey());
  const [manual, setManual] = useState("");
  const [showTok, setShowTok] = useState(false);

  const connect = async (viaCode: boolean) => {
    if (!key.trim()) return flash("Paste the Dropbox app key first.");
    setAppKey(key);
    try {
      const url = await startAuth(viaCode);
      if (viaCode) window.open(url, "_blank");
      else window.location.href = url;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't start Dropbox sign-in.");
    }
  };

  const submitCode = async () => {
    try {
      await finishAuthWithCode(manual);
      setManual("");
      sync.refreshConnection();
      flash("Dropbox connected.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "That code didn't work.");
    }
  };

  const copy = (t: string, what: string) =>
    navigator.clipboard.writeText(t).then(() => flash(`${what} copied.`), () => flash("Couldn't copy; select it by hand."));

  const status =
    sync.state === "off" ? "Not connected" :
    sync.state === "syncing" ? "Syncing…" :
    sync.state === "offline" ? "Offline; changes are kept on this phone and will sync later" :
    sync.state === "error" ? `Sync problem: ${sync.error}` :
    sync.lastSync ? `Synced ${fmtStamp(sync.lastSync)}` : "Connected";

  return (
    <div style={{ paddingTop: 26 }}>
      <Btn kind="quiet" onClick={onBack}>← Library</Btn>
      <div style={card}>
        <div style={{ font: `800 24px/1.2 ${display}`, letterSpacing: "-.02em" }}>Dropbox sync</div>
        <p style={{ color: sync.state === "error" ? C.rose : C.muted, marginTop: 6 }}>{status}</p>

        {!sync.connected ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <Label hint="from the Dropbox app console; not a secret">App key</Label>
              <Input value={key} onChange={setKey} placeholder="e.g. a1b2c3d4e5f6g7h" />
            </div>
            <div>
              <Label>Redirect URI to register</Label>
              <div style={code}>{redirectUri()}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn kind="solid" onClick={() => void connect(false)}>Connect Dropbox</Btn>
              <Btn kind="quiet" onClick={() => void connect(true)}>Sign-in didn't come back? Use a code</Btn>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><Input value={manual} onChange={setManual} placeholder="Paste the code Dropbox shows" /></div>
              <Btn onClick={() => void submitCode()} disabled={!manual.trim()}>Finish</Btn>
            </div>
            <p style={{ color: C.faint, font: `400 13px/1.5 ${body}`, margin: 0 }}>
              Your existing data on this phone merges into Dropbox the first time. A safety copy is saved
              under Apps/ListenMore/backups/ first.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="solid" onClick={sync.syncNow}>Sync now</Btn>
            <Btn
              kind="warn"
              onClick={() => {
                disconnect();
                sync.refreshConnection();
                flash("Disconnected. Data stays on this phone.");
              }}
            >
              Disconnect
            </Btn>
          </div>
        )}
      </div>

      {sync.connected && (
        <div style={card}>
          <div style={{ font: `800 20px/1.2 ${display}`, letterSpacing: "-.02em" }}>iPhone Shortcut (Action button)</div>
          <p style={{ color: C.muted, marginTop: 6 }}>
            Dictate a thought from anywhere; it drops into Dropbox and shows up on your current book the next
            time you open this app. Build it once in the Shortcuts app:
          </p>
          <ol style={{ color: C.text, paddingLeft: 20, margin: "0 0 14px", font: `400 14px/1.7 ${body}` }}>
            <li><b>Dictate Text</b> (stop after a pause).</li>
            <li><b>Format Date</b> of Current Date: Custom, <span style={{ font: `400 12px ${mono}` }}>yyyy-MM-dd'T'HH-mm-ss</span>. Name it <i>Stamp</i>.</li>
            <li><b>Get Contents of URL</b>: <span style={{ font: `400 12px ${mono}` }}>https://api.dropbox.com/oauth2/token</span>, method POST, Request Body: Form with <span style={{ font: `400 12px ${mono}` }}>grant_type=refresh_token</span>, <span style={{ font: `400 12px ${mono}` }}>refresh_token=</span> (below) and <span style={{ font: `400 12px ${mono}` }}>client_id=</span> (your app key).</li>
            <li><b>Get Dictionary Value</b> for <span style={{ font: `400 12px ${mono}` }}>access_token</span>.</li>
            <li><b>Get Contents of URL</b>: <span style={{ font: `400 12px ${mono}` }}>https://content.dropboxapi.com/2/files/upload</span>, POST. Headers: <span style={{ font: `400 12px ${mono}` }}>Authorization: Bearer </span>+access token; <span style={{ font: `400 12px ${mono}` }}>Content-Type: application/octet-stream</span>; <span style={{ font: `400 12px ${mono}` }}>Dropbox-API-Arg: {`{"path":"/inbox/`}</span>Stamp<span style={{ font: `400 12px ${mono}` }}>{`.txt","mode":"add","autorename":true,"mute":true}`}</span>. Request Body: File, the Dictated Text.</li>
            <li><b>Show Notification</b> "Noted". Then Settings → Action Button → Shortcut → this one.</li>
          </ol>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => copy(getAppKey(), "App key")}>Copy app key</Btn>
            <Btn onClick={() => copy(getRefreshToken(), "Refresh token")}>Copy refresh token</Btn>
            <Btn kind="quiet" onClick={() => setShowTok((s) => !s)}>{showTok ? "Hide" : "Show"} token</Btn>
          </div>
          {showTok && <div style={{ ...code, marginTop: 10 }}>{getRefreshToken()}</div>}
          <p style={{ color: C.faint, font: `400 13px/1.5 ${body}`, margin: "12px 0 0" }}>
            The token only reaches the ListenMore folder in your Dropbox, but treat it like a password.
            Disconnecting here does not revoke it; remove the app under Dropbox → Settings → Connected apps to do that.
          </p>
        </div>
      )}
    </div>
  );
}
