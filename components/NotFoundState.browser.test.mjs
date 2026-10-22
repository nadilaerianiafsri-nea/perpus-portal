// Opt-in integration suite: npm run build, then NOT_FOUND_BROWSER_TEST=1 node --test this file.
// Owns a read-only API fixture, isolated Next preview and disposable Chrome profile.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const enabled = process.env.NOT_FOUND_BROWSER_TEST === "1";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function listen(server) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
}
async function waitFor(check, message) {
  for (let i = 0; i < 200; i++) {
    if (await check()) return;
    await pause(100);
  }
  throw Error("Timeout: " + message);
}

test("custom not-found routes, shells, navigation, resources, light theme and responsive layout", { skip: !enabled, timeout: 180000 }, async () => {
  const requests = [], runtimeErrors = [];
  let detailUnavailable = true;
  const member = { id: 1, name: "Anggota Pengujian", email: "member@example.test", role: "PENGUNJUNG", emailVerified: true, memberType: "MAHASISWA" };
  const fixture = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    requests.push({ method: req.method, path: url.pathname });
    const send = (body, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    if (req.method !== "GET") return send({ message: "Read-only fixture" }, 405);
    if (url.pathname === "/__test/recover-detail") { detailUnavailable = false; return send({ ok: true }); }
    if (url.pathname === "/admin/ebooks/circulation/loans/999998") {
      if (detailUnavailable) return send({ message: "Test detail unavailable" }, 500);
      return send({ kind: "loan", record: { id: 999998, status: "AKTIF", borrowedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 86400000).toISOString(), endedAt: null,
        user: member, book: { id: 1, code: "EB-001", title: "Koleksi Pengujian", coverUrl: "", author: "Penulis" } } });
    }
    if (url.pathname === "/admin/ebooks/circulation/loans/999997") { req.socket.destroy(); return; }
    if (url.pathname === "/auth/me") {
      const cookie = req.headers.cookie ?? "";
      if (!cookie.includes("not-found-")) return send({}, 401);
      return send(cookie.includes("not-found-admin") ? { ...member, role: "ADMIN", name: "Admin Pengujian" } : member);
    }
    if (url.pathname === "/members/me/dashboard") return send({ currentUser: member, unreadNotifications: 0,
      stats: { waitingPickup: 0, activeLoans: 0, dueTomorrow: 0, ebooks: 0, history: 0 }, activeReservations: [], nearestDeadlines: [],
      alerts: { overdue: [], lost: [] }, reminders: { email: "Email otomatis", whatsapp: "Oleh petugas" } });
    if (url.pathname.endsWith("/notifications/unread-count")) return send({ count: 0, unread: 0 });
    if (url.pathname === "/collections/999998") return send({ message: "Test service unavailable" }, 500);
    return send({ message: "Record tidak ditemukan" }, 404);
  });
  const fixturePort = await listen(fixture);
  const portReservation = http.createServer();
  const port = await listen(portReservation);
  await new Promise(resolve => portReservation.close(resolve));
  const cdpReservation = http.createServer();
  const cdpPort = await listen(cdpReservation);
  await new Promise(resolve => cdpReservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "perpus-not-found-"));
  const artifacts = path.resolve(process.env.NOT_FOUND_SCREENSHOTS ?? "backend/.tmp/not-found");
  await fs.mkdir(artifacts, { recursive: true });
  let preview, chrome, ws, c, target;
  let serverOutput = "";
  try {
    preview = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port), "--hostname", "127.0.0.1"], {
      env: { ...process.env, API_URL: `http://127.0.0.1:${fixturePort}` }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    });
    preview.stdout.on("data", value => { serverOutput += value; });
    preview.stderr.on("data", value => { serverOutput += value; });
    await waitFor(async () => { try { return (await fetch(origin + "/halaman-yang-tidak-ada")).status === 404; } catch { return false; } }, "Next preview ready: " + serverOutput);
    const executable = process.env.NOT_FOUND_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
    chrome = spawn(executable, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
    await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).ok; } catch { return false; } }, "Chrome ready");
    target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" })).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => { ws.onopen = resolve; });
    let sequence = 0;
    const pending = new Map();
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const call = pending.get(message.id); pending.delete(message.id);
        if (message.error) call.reject(message.error);
        else call.resolve(message.result);
      }
      if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    };
    c = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => {
      const result = await c("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    await c("Page.enable"); await c("Runtime.enable"); await c("Network.enable");
    await c("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    const setRole = async role => {
      await c("Network.deleteCookies", { name: "perpus_session", url: origin });
      if (role !== "public") await c("Network.setCookie", { name: "perpus_session", value: "not-found-" + role, url: origin, httpOnly: true });
    };
    const navigate = async route => {
      await c("Page.navigate", { url: origin + route });
      await waitFor(() => evaluate(`location.pathname===${JSON.stringify(route.split("?")[0])}&&document.readyState==='complete'`), route);
    };
    const enter = async () => {
      await c("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
      await c("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    };
    const cases = [
      ["public", "/halaman-yang-tidak-ada", "public", "/"],
      ["public", "/route-tidak-ada", "public", "/"],
      ["public", "/koleksi/route-tidak-ada", "public", "/koleksi"],
      ["admin", "/admin/transaksi/route-tidak-ada", "admin", "/admin"],
      ["admin", "/admin/transaksi/44", "admin", "/admin"],
      ["admin", "/admin/route-tidak-ada", "admin", "/admin"],
      ["member", "/dashboard/route-tidak-ada", "member", "/dashboard"],
      ["public", "/koleksi/999999", "public", "/koleksi"],
      ["member", "/dashboard/koleksi/999999", "member", "/dashboard/koleksi"],
      ["admin", "/admin/transaksi/e-book/abc?jenis=akses", "admin", "/admin"],
    ];
    const results = [];
    for (const width of [1440, 768, 390]) {
      await c("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      for (const [role, route, context, href] of cases) {
        const resource = route.startsWith("/koleksi/") || route.startsWith("/dashboard/koleksi/");
        await c("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
        await setRole(role); await navigate(route);
        await waitFor(() => evaluate(`!!document.querySelector('[data-not-found="${context}"] img')&&document.querySelector('[data-not-found] img').complete`), "404 illustration");
        await pause(200);
        const ui = await evaluate(`(()=>{const e=document.querySelector('[data-not-found]'),img=e.querySelector('img'),a=e.querySelector('a[data-button="primary"]'),s=getComputedStyle(e),r=e.getBoundingClientRect();return{context:e.dataset.notFound,mode:e.dataset.notFoundMode,href:a.getAttribute('href'),h1:e.querySelectorAll('h1').length,main:document.querySelectorAll('main').length,nested:!!document.querySelector('main main'),generic:document.body.innerText.includes('This page could not be found'),overflow:document.documentElement.scrollWidth>innerWidth,image:img.naturalWidth,background:s.backgroundColor,scheme:s.colorScheme,font:getComputedStyle(e.querySelector('h1')).fontFamily,buttons:e.querySelectorAll('[data-button]').length,buttonHeight:a.getBoundingClientRect().height,shell:!!document.querySelector('aside'),chrome:!!document.querySelector('aside,header,nav,input[type="search"],a[href*="notifikasi"],a[href*="/profil"]'),x:r.x,y:r.y,width:r.width,height:r.height,viewport:innerHeight,border:s.borderWidth,shadow:s.boxShadow,imageTop:img.getBoundingClientRect().top,titleTop:e.querySelector('h1').getBoundingClientRect().top}})()`);
        assert.equal(ui.context, context); assert.equal(ui.href, href); assert.equal(ui.h1, 1);
        assert.equal(ui.main, 1, route); assert.equal(ui.nested, false, route); assert.equal(ui.generic, false, route); assert.equal(ui.overflow, false, route + " " + width + " " + JSON.stringify(ui));
        assert.ok(ui.image > 0); assert.equal(ui.scheme, "light"); assert.ok(/Outfit/i.test(ui.font)); assert.equal(ui.buttons, 2);
        assert.equal(ui.mode, resource ? "resource" : "standalone");
        assert.equal(ui.buttonHeight, 44);
        if (!resource) {
          assert.equal(ui.shell, false); assert.equal(ui.chrome, false);
          assert.equal(ui.x, 0); assert.equal(ui.y, 0); assert.equal(ui.width, width); assert.ok(ui.height >= ui.viewport);
          assert.equal(ui.border, "0px"); assert.equal(ui.shadow, "none");
        } else if (context === "member") assert.equal(ui.shell, true);
        if (width === 390) assert.ok(ui.imageTop < ui.titleTop);
        await c("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        await c("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        await evaluate(`document.querySelector('[data-not-found] a[data-button="primary"]').focus()`);
        const focus = await evaluate(`({visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle})`);
        assert.equal(focus.visible, true); assert.notEqual(focus.outline, "none");
        const primary = await evaluate(`getComputedStyle(document.activeElement).backgroundColor`);
        assert.equal(primary, "rgb(0, 6, 51)");
        await evaluate(`document.activeElement.scrollIntoView({block:'center',behavior:'instant'})`);
        const rect = await evaluate(`(()=>{const r=document.activeElement.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
        await c("Input.dispatchMouseEvent", { type: "mouseMoved", ...rect }); await pause(190);
        await waitFor(() => evaluate(`getComputedStyle(document.activeElement).backgroundColor==='rgb(255, 208, 0)'`), "hover transition " + route);
        assert.equal(await evaluate(`getComputedStyle(document.activeElement).backgroundColor`), "rgb(255, 208, 0)", "primary hover " + route + " at " + width);
        if (route.includes("route-tidak-ada") || route === "/halaman-yang-tidak-ada") {
          const shot = await c("Page.captureScreenshot", { format: "png" });
          await fs.writeFile(path.join(artifacts, `${context}-${route.includes("koleksi") ? "collection-" : ""}${width}.png`), Buffer.from(shot.data, "base64"));
        }
        // Activate the primary action with the keyboard and confirm its destination.
        await enter();
        await waitFor(() => evaluate(`location.pathname===${JSON.stringify(href)}`), "primary CTA " + href);
        if (!resource && context !== "public") {
          await waitFor(() => evaluate(`!!document.querySelector('aside')`), "valid destination keeps shell");
          assert.equal(await evaluate(`!!document.querySelector('[data-not-found-mode="standalone"]')`), false);
        }
        if (!resource) {
          // Enter a valid page through Next Link, then exercise the client history
          // transition back to the cached route 404. No shell may remain mounted.
          await evaluate(`history.back()`);
          await waitFor(() => evaluate(`location.pathname===${JSON.stringify(route.split("?")[0])}&&!!document.querySelector('[data-not-found-mode="standalone"]')`), "client transition to standalone " + route);
          assert.equal(await evaluate(`!!document.querySelector('aside,header,nav,input[type="search"]')`), false);
        }
        results.push({ width, route, context, mode: ui.mode, navigation: href, overflow: false, focus: true, shell: ui.shell });
      }
      console.log(`PASS 404 public/admin/member + missing resources, keyboard and responsive ${width}`);
    }
    // A valid route with a missing record keeps its own data state in AdminShell.
    await setRole("admin"); await navigate("/admin/transaksi/e-book/999999?jenis=akses");
    await waitFor(() => evaluate(`document.body.innerText.includes('Record sirkulasi tidak ditemukan')`), "API 404 data state");
    assert.equal(await evaluate(`!!document.querySelector('[data-not-found]')`), false);
    await setRole("admin"); await navigate("/admin/transaksi/e-book/999998?jenis=akses");
    await waitFor(() => evaluate(`document.body.innerText.includes('Detail belum dapat ditampilkan')`), "admin API 500 state");
    assert.equal(await evaluate(`!!document.querySelector('aside')&&!document.querySelector('[data-not-found-mode="standalone"]')`), true);
    await fetch(`http://127.0.0.1:${fixturePort}/__test/recover-detail`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(x=>x.innerText==='Coba Lagi').click()`);
    await waitFor(() => evaluate(`!!document.querySelector('#circulation-information')`), "admin detail retry recovery");
    await navigate("/admin/transaksi/e-book/999997?jenis=akses");
    await waitFor(() => evaluate(`document.body.innerText.includes('Detail belum dapat ditampilkan')`), "network error state");
    assert.equal(await evaluate(`!!document.querySelector('aside')&&!document.querySelector('[data-not-found-mode="standalone"]')`), true);
    assert.equal(await evaluate(`!!document.querySelector('aside')`), true);
    // Route 404 entered from a valid record returns safely to that record through history.
    await navigate("/admin/transaksi/e-book/999999?jenis=akses");
    await waitFor(() => evaluate(`document.body.innerText.includes('Record sirkulasi tidak ditemukan')`), "data state before history");
    await navigate("/admin/transaksi/44");
    await evaluate(`document.querySelector('[data-not-found] button').focus()`); await enter();
    await waitFor(() => evaluate(`location.pathname==='/admin/transaksi/e-book/999999'&&!!document.querySelector('aside')`), "admin history restores shell");
    // A server error is still an error state, never recast as Not Found.
    await setRole("public"); await navigate("/koleksi/999998");
    await waitFor(() => evaluate(`document.body.innerText.includes('Detail koleksi belum dapat dimuat')`), "API 500 state");
    assert.equal(await evaluate(`!!document.querySelector('[data-not-found]')`), false);
    // Known same-origin history can be used; a fresh target has a safe fallback.
    await navigate("/login"); await navigate("/halaman-yang-tidak-ada");
    await evaluate(`document.querySelector('[data-not-found] button').focus()`); await enter();
    await waitFor(() => evaluate(`location.pathname==='/login'`), "history back");
    await c("Page.resetNavigationHistory");
    await navigate("/halaman-yang-tidak-ada"); await c("Page.resetNavigationHistory");
    await evaluate(`document.querySelector('[data-not-found] button').focus()`); await enter();
    await waitFor(() => evaluate(`location.pathname==='/'`), "direct visit fallback");
    for (const [role, invalid, destination] of [["admin", "/admin/transaksi/44", "/admin"], ["member", "/dashboard/route-tidak-ada", "/dashboard"]]) {
      await setRole(role); await navigate(invalid); await c("Page.resetNavigationHistory");
      // Also exercise the safe fallback on a browser without Navigation API support.
      await evaluate(`Object.defineProperty(window,'navigation',{value:undefined,configurable:true});document.querySelector('[data-not-found] button').focus()`); await enter();
      await waitFor(() => evaluate(`location.pathname===${JSON.stringify(destination)}&&!!document.querySelector('aside')`), role + " direct fallback");
    }
    // Additional existing valid paths retain the layout after their source relocation.
    for (const [role, valid] of [["admin", "/admin/koleksi/data-buku"], ["admin", "/admin/transaksi/reservasi"], ["admin", "/admin/transaksi/peminjaman"], ["member", "/dashboard/pinjaman"], ["member", "/dashboard/pinjaman/999999"]]) {
      await setRole(role); await navigate(valid);
      await waitFor(() => evaluate(`!!document.querySelector('aside')`), "valid shell " + valid);
      assert.equal(await evaluate(`!!document.querySelector('[data-not-found-mode="standalone"]')`), false);
    }
    // Authentication guards remain active for the contextual catch-all.
    const unauthorized = await fetch(origin + "/admin/transaksi/route-tidak-ada", { redirect: "manual" });
    assert.equal(unauthorized.status, 307); assert.equal(unauthorized.headers.get("location"), "/login");
    assert.ok(requests.every(request => request.method === "GET"));
    assert.deepEqual(runtimeErrors, []);
    await fs.writeFile(path.join(artifacts, "results.json"), JSON.stringify({ results, clientTransitions: true, history: true, directFallback: true, api404: true, api500: true, networkError: true, retry: true, validShells: true, auth: true, runtimeErrors }, null, 2));
    console.log("PASS history/fallback, API 404 vs 500, protected layout and GET-only fixture");
  } finally {
    if (c && ws?.readyState === WebSocket.OPEN) await c("Browser.close").catch(() => {});
    ws?.close();
    if (chrome && chrome.exitCode === null) chrome.kill();
    if (preview && preview.exitCode === null) preview.kill();
    fixture.closeAllConnections();
    await new Promise(resolve => fixture.close(resolve));
    // Chrome can release its temporary profile asynchronously on Windows.
    await pause(400);
    if (path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith("perpus-not-found-")) {
      await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    }
  }
});
