#!/usr/bin/env bash
# Install (or refresh) the ListenMore daily timer as a systemd *user* unit.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/.config/systemd/user"
mkdir -p "$dest"
for u in listenmore-drafts.service listenmore-drafts.timer listenmore-drafts-notify-failure.service; do
  install -m 644 "$here/systemd/$u" "$dest/$u"
done
systemctl --user daemon-reload
systemctl --user enable --now listenmore-drafts.timer
systemctl --user list-timers listenmore-drafts.timer --no-pager
