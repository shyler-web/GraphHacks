# Debug Drill 0001 — FalkorDB on port 6379 is unreachable

- **Date:** 2026-10-16
- **Task:** T1.2 (debug drill on "6379 refused")
- **Method:** lesson 0106 — "Debug like a scientist" (Expected / Observed / Repro / 3+ hypotheses, each discriminated by a test)
- **Environment:** Docker container `falkordb` (`falkordb/falkordb:latest`), host ports `6379` (Redis protocol) and `3000` (Browser UI). Host has `nc` and `node`; no host `redis-cli`, no `falkordb`/`redis` npm package installed.

---

## Expected

With FalkorDB running, a TCP connection to `localhost:6379` succeeds and the Redis-protocol `PING` returns `PONG`.

```
$ nc -z localhost 6379; echo "exit=$?"
exit=0

$ docker exec falkordb redis-cli ping
PONG
```

## Observed

After `docker stop falkordb`, the same connection is refused. Captured verbatim:

```
$ docker stop falkordb
falkordb
stop exit=0

$ nc -z localhost 6379; echo "exit=$?"
exit=1

$ nc -v -z localhost 6379
nc: connect to localhost (127.0.0.1) port 6379 (tcp) failed: Connection refused
exit=1
```

Raw Node TCP error object (no npm client needed — `net` is built in):

```
$ node -e 'const net=require("net");const s=net.connect({host:"localhost",port:6379});s.on("error",e=>{console.log("name:",e.name);console.log("code:",e.code);console.log("errno:",e.errno);console.log("syscall:",e.syscall);console.log("address:",e.address);console.log("port:",e.port);console.log("message:",e.message)});'
name: Error
code: ECONNREFUSED
errno: -111
syscall: connect
address: 127.0.0.1
port: 6379
message: connect ECONNREFUSED 127.0.0.1:6379
```

**Key distinction:** `ECONNREFUSED` (errno `-111`) means the host actively sent a TCP RST — *nothing is listening on that port*. This is different from `ETIMEDOUT` (a firewall silently dropping packets) and from `ENOTFOUND`/`EAI_AGAIN` (DNS failure). The error code alone narrows the hypothesis space.

## Repro (minimal, ordered, paste-able)

```bash
# 1. Confirm the failure is reproducible by stopping the container
docker stop falkordb

# 2. Observe the refusal (expect exit=1)
nc -z localhost 6379; echo "exit=$?"

# 3. Capture the raw error code (expect ECONNREFUSED)
node -e 'const net=require("net");const s=net.connect({host:"localhost",port:6379});s.on("error",e=>console.log(e.code,e.message));'

# 4. Restore
docker start falkordb && sleep 2

# 5. Verify recovery (expect exit=0 and PONG)
nc -z localhost 6379; echo "exit=$?"
docker exec falkordb redis-cli ping
```

## Hypotheses

| # | Claim | Single discriminating test | Result in THIS drill |
|---|-------|----------------------------|----------------------|
| a | **Container not running** — no process exists to listen on 6379. | `docker ps -a --filter name=falkordb --format '{{.Names}}\t{{.Status}}'` | **CONFIRMED (root cause).** Output: `falkordb  Exited (0) 11 seconds ago`. `docker inspect falkordb --format '{{.State.Running}}'` → `false`. |
| b | **Container running but port not published / wrong host binding** — process is up but Docker never mapped 6379 to the host. | `docker inspect falkordb --format '{{json .HostConfig.PortBindings}}'` and `docker ps` Ports column | **REFUTED as the cause here.** Bindings are correct: `{"3000/tcp":[{"HostIp":"","HostPort":"3000"}],"6379/tcp":[{"HostIp":"","HostPort":"6379"}]}`. The mapping exists; the container is simply stopped. (This hypothesis *would* be confirmed if `State.Running=true` but `PortBindings` lacked `6379/tcp`.) |
| c | **Something else holds the port / firewall** — a foreign process owns 6379, or a firewall drops packets. | `ss -ltnp \| grep ':6379'` (who is listening) + control probe of a known-open port | **REFUTED.** `no listener on :6379`. Control: `ss -ltn` shows `0.0.0.0:8080` (the `glance` container) still listening, proving the probe works and the host network stack is fine. A firewall would give `ETIMEDOUT`, not `ECONNREFUSED`. |
| d | **Host vs 127.0.0.1 vs 0.0.0.0 mismatch** — client targets an address family the server isn't bound to. | Probe `127.0.0.1`, `::1`, and `0.0.0.0` separately | **REFUTED.** All three refused (`exit=1`) while stopped. When the container is up it publishes on `0.0.0.0:6379`, so all three succeed — no family-specific mismatch. |
| e | **Connection string wrong** — app points at the wrong host/port. | `grep -rn "6379"` across config/source | **REFUTED.** `.env.example` has `FALKORDB_PORT=6379`; the cockpit's own instructions use `-p 6379:6379`. Config matches the published port. |

## Root cause (for the reproduced case)

The container was **stopped** (`docker stop falkordb`). With no container process, Docker's published port `6379` has no backing listener, so the host kernel immediately answers the TCP SYN with a RST → the client sees `ECONNREFUSED` (errno `-111`). Hypotheses (b)–(e) were each ruled out by a direct test; (a) was confirmed by `docker ps -a` showing `Exited (0)`.

## Fix

Start the container and confirm the listener is back:

```bash
docker start falkordb
sleep 2
nc -z localhost 6379; echo "exit=$?"      # expect exit=0
docker exec falkordb redis-cli ping        # expect PONG
```

If the container does not exist at all (e.g. it was run with `--rm` and removed), recreate it:

```bash
docker run -d --name falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest
```

**Verification after fix (this drill):**

```
$ docker start falkordb && sleep 2
falkordb
start exit=0

$ docker ps --filter name=falkordb --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
falkordb  Up 2 seconds  0.0.0.0:3000->3000/tcp, 0.0.0.0:6379->6379/tcp

$ nc -z localhost 6379; echo "exit=$?"
exit=0

$ docker exec falkordb redis-cli ping
PONG
```

## Generalizes to

Any "connection refused" to a containerized service: **`ECONNREFUSED` means nothing is listening — check the process/container state first (`docker ps -a`), then the port publication (`docker inspect … PortBindings`), then who owns the port (`ss -ltnp`).** Distinguish it from `ETIMEDOUT` (firewall/drop) and `ENOTFOUND` (DNS). For this repo specifically: before any deeper theory, run `docker ps` and `nc -z localhost 6379` — a stopped `falkordb` container is the most common cause of the app appearing broken.
