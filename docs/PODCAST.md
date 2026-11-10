# Podcast Flow

## Components

- `flows/podcast-bookmarks.py` implements the `podcast` spool contract.
- `skills/podcast-digest/SKILL.md` defines Pi-side export of TLDR, deep summary, and transcript files.
- The setup script and launchd template register the Pi podcast flow.
- The popup `保存为播客` and Dashboard `加入队列` actions create jobs directly.
- Links under the `收藏播客` bookmark folder import as `podcast` jobs.
- Node/Python tests cover queue semantics and deterministic transcript parsing.

## Export Notes

- The flow writes `source.md`, `meta.json`, and expects Pi to write `result.json` in `~/.info-collector/work/podcast/<hash>/`.
- The Pi skill owns final Obsidian export into `播客收集/`.
- Flow success is only `result.json` with existing `tldrFile`, `deepSummaryFile`, and `transcriptFile`.
- YouTube `published` is parsed from the watch page's structured date fields; oEmbed only provides title/channel metadata.

## Transcript and routing contracts

- `yt-dlp` checks manual and automatic captions in separate passes so that `captionKind` identifies the transcript source.
- The default entry path is `收藏播客` bookmark folder → `podcast` job. The `保存为播客` shortcut provides direct capture.
