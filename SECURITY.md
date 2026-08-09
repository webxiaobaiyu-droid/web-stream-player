# Security policy

Report vulnerabilities privately before opening a public issue.

The RTSP relay only accepts stream identifiers declared in its configuration.
Do not modify it to accept arbitrary client-provided RTSP URLs: doing so creates
an SSRF and internal-network scanning primitive. Keep camera credentials in the
relay configuration and use WSS plus short-lived access tokens in production.

