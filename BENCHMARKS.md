# Benchmarks

These results describe one controlled relay run. They are not a guarantee for other cameras, networks, codecs, browsers, or machines.

## Environment

| Item | Value |
| --- | --- |
| Date | 2026-08-09 |
| Machine | MacBook Air |
| Processor | Apple M4, 10 cores |
| Memory | 32 GB |
| Operating system | macOS 26.5.2 |
| Node.js | 18.19.1 |
| FFmpeg | 8.1.2 |
| Source | H.264, 1920x1080, 25 fps, approximately 4.16 Mb/s |
| RTSP transport | TCP |
| Relay output | MPEG-TS over WebSocket, FFmpeg `-c copy` |

## Relay results

The transfer client ran for 32 seconds. Process CPU time and RSS were measured for 30 seconds after the first media bytes arrived.

| Scenario | First media | Per viewer | Total egress | Relay CPU | Relay RSS avg | FFmpeg CPU | FFmpeg RSS avg | FFmpeg processes | Dropped relay chunks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 viewer | 2.42 s | 4.31 Mb/s | 4.31 Mb/s | 1.07% | 54.79 MiB | 0.77% | 25.36 MiB | 1 | 0 |
| 2 viewers | 2.08 s | 4.32 Mb/s | 8.64 Mb/s | 1.10% | 55.52 MiB | 0.70% | 25.40 MiB | 1 | 0 |

CPU is process CPU time divided by wall time, where 100% represents one fully occupied core. RSS is the average of 30 one-second samples. The two-viewer run kept exactly one FFmpeg child throughout the sample.

The important result is the scaling shape: the second viewer doubled WebSocket egress but did not create another RTSP input or FFmpeg process. Network bandwidth still scales linearly with viewer count.

## Reproduce the transfer measurement

Start an RTSP source, configure `@web-stream-player/rtsp-relay`, then connect one or more WebSocket consumers:

```bash
pnpm build
node packages/rtsp-relay/dist/cli.js ./relay.config.json
pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 1 32
pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 2 32
curl http://127.0.0.1:8787/health
```

The benchmark resets byte and message counters after every client receives its first media chunk. Startup time is reported separately from steady-state throughput.

For process measurements on macOS, sample the Relay and FFmpeg child with:

```bash
ps -p <pid> -o time=,rss=
```

Record CPU time before and after a 30-second window, divide the delta by 30, and sample RSS once per second. Other operating systems expose equivalent counters through their native process tools.

## Production demo chunks

The GitHub Pages build code-splits protocol engines. Values are rounded from the minified Vite output:

| Chunk | Minified | Gzip |
| --- | ---: | ---: |
| Playground app JavaScript | 41.9 KB | 14.6 KB |
| Playground CSS | 15.2 KB | 3.6 KB |
| Vue and icons | 74.7 KB | 28.3 KB |
| mpegts.js engine | 264.3 KB | 62.2 KB |
| hls.js engine | 524.0 KB | 162.1 KB |

These are demo chunk sizes, not the size of every installation. Applications that only need HLS can install the core and HLS adapter without bundling the MPEG-TS path, and vice versa.

## Limitations

- This is a synthetic local-network source, not a congested production camera network.
- The source is H.264. H.265 behavior depends on browser, operating system, hardware decode support, profile, level, and container.
- Stream copy avoids video encoding work. It does not make bandwidth free.
- First-media time includes RTSP connection, keyframe timing, FFmpeg startup, and local scheduling.
- One sample per scenario is evidence for this implementation on this machine, not a statistical distribution.
