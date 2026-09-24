# LP.1 isolated transport fixtures

`localhost-test.key` and `localhost-test.crt` are public, disposable test-only
credentials for `preview.fixture.net`, generated for this suite. They grant no
access to any real service. Never deploy or use them for application trust.
The certificate is trusted only through the injected test request's `ca` option;
`rejectUnauthorized` and Node's hostname verification remain enabled.

Network specs bind ephemeral loopback ports and call the private lower transport
owner with a loopback pin. This isolates real Node HTTP/TLS behavior from policy;
production `fetch()` rejects those addresses, as separate policy/orchestration
specs prove. No external host is contacted and no production bypass exists.
