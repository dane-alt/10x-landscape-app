# 10X Landscape

Open the page. You see the Login screen first.

Tap LOGIN (or REGISTER, or the fingerprint). Then tap the tiny red F.

The list is shared. Two people use the same link. Each can submit a named note and see the other person's item after refresh.

Give Feedback is one scroll: name, title, notes, audio, screenshot, video, broken, importance, pledge. Pledge is stored only. Nothing is charged. Name is required. No anonymous comments.

## How to run

```
cd /workspace/10x-landscape-ship
node server.mjs
```

Open the URL in two browsers.

## Fake vs real

- Fake: Login does not check a password. Willow Creek is a sample yard. Seeded names are samples. Pledges are not charged.
- Real: The feedback list is one shared file on the server. Two browsers see the same items. Votes and comments save.

## GitHub

Target repo: dane-alt/10x-landscape-app. GitHub Pages alone cannot save a shared list. This app needs the small server (or another shared store).
