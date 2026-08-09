# Contributing

Install Node.js 18 or newer and pnpm 9, then run:

```bash
pnpm install
pnpm test
pnpm build
```

Adapters should remain independently installable. A protocol-specific change
belongs in its adapter package unless it changes the public lifecycle shared by
every player.

New stream adapters must provide:

- a deterministic `probe()` score;
- cleanup that releases sockets, workers and media elements;
- typed errors and state transitions;
- at least one focused unit test;
- an honest feature-matrix update in the README.

