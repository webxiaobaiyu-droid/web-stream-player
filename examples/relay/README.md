# RTSP relay example

Copy the example configuration outside version control, replace the RTSP URL,
then run:

```bash
cp relay.config.example.json relay.config.json
pnpm dev:relay
```

The browser-facing endpoint is:

```text
ws://localhost:8787/stream/workshop-01
```

Configure an RTSP source in the player with `protocol: "rtsp"` and this URL as
`relayUrl`. FFmpeg uses stream copy (`-c copy`); it does not decode or transcode
the video.

