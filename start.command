#!/bin/zsh
set -e
cd "${0:A:h}"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use
fi
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != 22 ]]; then
  print -u2 'bellaMLX requires Node 22. Install it with nvm install 22.'
  exit 1
fi
cd panel
exec npm run dev
