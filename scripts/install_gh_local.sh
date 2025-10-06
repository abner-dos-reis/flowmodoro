#!/bin/sh
set -e

echo "Installing GitHub CLI locally to ~/.local/bin (no sudo)..."

mkdir -p "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"

arch=$(uname -m)
if [ "$arch" = "x86_64" ]; then
  arch_tag="linux_amd64"
elif [ "$arch" = "aarch64" ] || [ "$arch" = "arm64" ]; then
  arch_tag="linux_arm64"
else
  echo "Unknown architecture: $arch. Please edit this script to set arch_tag manually." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but not found. Please install curl or provide the release tarball manually." >&2
  exit 1
fi

echo "Detecting latest gh release..."
release_json=$(curl -sS https://api.github.com/repos/cli/cli/releases/latest)
tag=$(echo "$release_json" | grep -oP '"tag_name":\s*"\K(.*?)(?=")')
if [ -z "$tag" ]; then
  echo "Could not detect latest gh release. Exiting." >&2
  exit 1
fi

asset_url=$(echo "$release_json" | grep -oP "https://.*/gh_.*_${arch_tag}\\.tar\\.gz" | head -n1)
if [ -z "$asset_url" ]; then
  echo "Could not find release asset for $arch_tag. Exiting." >&2
  exit 1
fi

echo "Downloading $asset_url ..."
tmpdir=$(mktemp -d)
cd "$tmpdir"
curl -sL -O "$asset_url"

tarball=$(ls gh_*_${arch_tag}.tar.gz 2>/dev/null | head -n1)
if [ -z "$tarball" ]; then
  echo "Downloaded tarball not found. Exiting." >&2
  exit 1
fi

tar -xzf "$tarball"
dir=$(find . -maxdepth 2 -type d -name "gh_*" | head -n1)
if [ -z "$dir" ]; then
  dir=$(tar -tzf "$tarball" | head -n1 | cut -f1 -d"/")
fi

echo "Installing binary to $HOME/.local/bin"
cp -v "$dir/bin/gh" "$HOME/.local/bin/gh"
chmod +x "$HOME/.local/bin/gh"

cd ~
rm -rf "$tmpdir"

echo "Done. Add '$HOME/.local/bin' to your PATH if not already. Check with: $HOME/.local/bin/gh --version"
