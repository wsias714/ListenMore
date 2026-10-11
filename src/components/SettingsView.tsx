import { useState } from "react";
import { C, body, display, mono } from "../constants";
import { fmtStamp } from "../lib/library";
import { disconnect, finishAuthWithCode, getAppKey, getRefreshToken, redirectUri, setAppKey, startAuth } from "../lib/dropbox";
import type { Sync } from "../lib/useSync";
import { Btn, Input, Label } from "./atoms";

const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginTop: 14 };
const code: React.CSSProperties = { font: `400 12px/1.5 ${mono}`, color: C.text, background: C.bg, padding: "8px 10px", borderRadius: 6, wordBreak: "break-all" };
const m: React.CSSProperties = { font: `400 12px ${mono}`, overflowWrap: "anywhere" };
const h: React.CSSProperties = { font: `800 20px/1.2 ${display}`, letterSpacing: "-.02em" };

export interface DataActions {
  onCSV: () => void;
  onMarkdown: () => void;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStarter: () => void;
}

export function SettingsView({
  sync, data, onBack, flash,
}: {
  sync: Sync;
  data: DataActions;
  onBack: () => void;
  flash: (m: string) => void;
}) {
  const [key, setKey] = useState(getAppKey());
  const [manual, setManual] = useState("");
  const [showTok, setShowTok] = useState(false);

  const connect = async (viaCode: boolean) => {
    if (!key.trim()) return flash("Open Advanced and paste the Dropbox app key first.");
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
      <Btn kind="quiet" onClick={onBack}>← Back</Btn>

      <div style={card}>
        <div style={{ ...h, fontSize: 24 }}>Dropbox</div>
        <p style={{ color: sync.state === "error" ? C.rose : C.muted, marginTop: 6 }}>{status}</p>

        {!sync.connected ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn kind="solid" onClick={() => void connect(false)}>Connect Dropbox</Btn>
              <Btn kind="quiet" onClick={() => void connect(true)}>Didn't come back? Use a code</Btn>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><Input value={manual} onChange={setManual} placeholder="Paste the code Dropbox shows" /></div>
              <Btn onClick={() => void submitCode()} disabled={!manual.trim()}>Finish</Btn>
            </div>
            <p style={{ color: C.faint, font: `400 13px/1.5 ${body}`, margin: 0 }}>
              What's on this phone merges into Dropbox the first time. A safety copy is saved under
              Apps/ListenMore/backups/ first.
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

        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", color: C.muted }}>Advanced</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <div>
              <Label hint="public by design; not a secret">App key</Label>
              <Input value={key} onChange={setKey} />
            </div>
            <div>
              <Label>Redirect URI registered with Dropbox</Label>
              <div style={code}>{redirectUri()}</div>
            </div>
          </div>
        </details>
      </div>

      {sync.connected && (
        <div style={card}>
          <div style={h}>iPhone Shortcut: one button for everything</div>
          <p style={{ color: C.muted, marginTop: 6, font: `400 14px/1.55 ${body}` }}>
            Put this on the Action button. It works with the app closed: pick <b>Note</b>, <b>Start a book</b> or
            <b> Finished</b>, and the app applies it the next time you open it. Build it once in the Shortcuts app:
          </p>
          <ol style={{ color: C.text, paddingLeft: 20, margin: "0 0 14px", font: `400 14px/1.7 ${body}`, overflowWrap: "anywhere" }}>
            <li><b>Get Contents of URL</b>: <span style={m}>https://api.dropbox.com/oauth2/token</span>, method POST, Request Body <i>Form</i>: <span style={m}>grant_type</span>=<span style={m}>refresh_token</span>, <span style={m}>refresh_token</span>=(copy below), <span style={m}>client_id</span>=(copy below).</li>
            <li><b>Get Dictionary Value</b> for <span style={m}>access_token</span>, then <b>Set Variable</b> <i>Token</i>.</li>
            <li><b>Format Date</b> of Current Date: Custom <span style={m}>yyyy-MM-dd'T'HH-mm-ss</span>, <b>Set Variable</b> <i>Stamp</i>.</li>
            <li><b>Choose from Menu</b> with three items: <i>Note</i>, <i>Start a book</i>, <i>Finished</i>.</li>
            <li>
              Under <b>Note</b>: <b>Dictate Text</b>, then <b>Get Contents of URL</b> (the upload, below) with path
              <span style={m}> /inbox/Stamp-note.txt</span> and Request Body <i>File</i> = Dictated Text.
            </li>
            <li>
              Under <b>Start a book</b>: <b>Dictate Text</b> (the title), <b>Text</b> =
              <span style={m}> {`{"cmd":"start","title":"`}</span>Dictated Text<span style={m}>{`"}`}</span>, then the same upload with path
              <span style={m}> /inbox/Stamp-start.json</span> and Request Body <i>File</i> = that Text.
            </li>
            <li>
              Under <b>Finished</b>: <b>Text</b> = <span style={m}>{`{"cmd":"finish"}`}</span>, upload with path
              <span style={m}> /inbox/Stamp-finish.json</span>.
            </li>
            <li>
              The <b>upload</b> is <b>Get Contents of URL</b>: <span style={m}>https://content.dropboxapi.com/2/files/upload</span>, POST.
              Headers: <span style={m}>Authorization</span>: <span style={m}>Bearer </span>+Token; <span style={m}>Content-Type</span>: <span style={m}>application/octet-stream</span>;
              <span style={m}> Dropbox-API-Arg</span>: <span style={m}>{`{"path":"/inbox/…","mode":"add","autorename":true,"mute":true}`}</span>.
            </li>
            <li>Settings → Action Button → Shortcut → this one.</li>
          </ol>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => copy(getAppKey(), "App key")}>Copy app key</Btn>
            <Btn onClick={() => copy(getRefreshToken(), "Refresh token")}>Copy refresh token</Btn>
            <Btn onClick={() => copy('{"cmd":"finish"}', "Finish JSON")}>Copy finish JSON</Btn>
            <Btn kind="quiet" onClick={() => setShowTok((s) => !s)}>{showTok ? "Hide" : "Show"} token</Btn>
          </div>
          {showTok && <div style={{ ...code, marginTop: 10 }}>{getRefreshToken()}</div>}
          <p style={{ color: C.faint, font: `400 13px/1.5 ${body}`, margin: "12px 0 0" }}>
            The token only reaches the ListenMore folder in your Dropbox, but treat it like a password. Disconnecting
            here doesn't revoke it; remove the app under Dropbox → Settings → Connected apps to do that. A plain
            text file in the inbox is still just a note.
          </p>
        </div>
      )}

      <div style={card}>
        <div style={h}>Data</div>
        <p style={{ color: C.muted, marginTop: 6, font: `400 14px/1.5 ${body}` }}>Exports, backup and restore.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={data.onCSV}>Export index (CSV)</Btn>
          <Btn onClick={data.onMarkdown}>Export notes (Markdown)</Btn>
          <Btn onClick={data.onBackup}>Back up (JSON)</Btn>
          <label style={{ font: `600 13px/1 ${body}`, color: C.text, padding: "11px 16px", border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer" }}>
            Restore
            <input type="file" accept="application/json" onChange={data.onRestore} style={{ display: "none" }} />
          </label>
          <Btn kind="quiet" onClick={data.onStarter}>Load starter library</Btn>
        </div>
      </div>
    </div>
  );
}
