import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

// Run with a dedicated Chrome --remote-debugging-port=9350, or set APP_SELECT_CDP_URL.
// The suite owns only its temporary fixture/server/browser target, never Chrome itself.
const require = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.dirname(directory);
const endpoint = process.env.APP_SELECT_CDP_URL ?? "http://localhost:9350";
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function transpile(source) {
  return ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
}

async function buildFixture(temporary) {
  await fs.writeFile(path.join(temporary, "AppSelect.js"), transpile(await fs.readFile(path.join(directory, "AppSelect.tsx"), "utf8")));
  const fixture = `
    import React, {useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import AppSelect from './AppSelect.js';
    const root = createRoot(document.getElementById('root'));
    const choices = [{value:'a',label:'Alpha'}, {value:'b',label:'Beta'}, {value:'blocked',label:'Disabled option',disabled:true}, {value:'c',label:'Charlie'}];
    let revision = 0;
    function Fixture({kind}) {
      const [value, setValue] = useState('b');
      const [dynamicOptions, setDynamicOptions] = useState(kind==='async'?[]:choices);
      const [block, setBlock] = useState('');
      const controlled = kind.startsWith('controlled');
      window.setFixtureOptions = setDynamicOptions;
      window.setFixtureBlock = setBlock;
      const options = kind === 'empty' ? [] : ['long','overflow'].includes(kind)
        ? Array.from({length:40}, (_,i)=>({value:String(i),label:'Option '+String(i).padStart(2,'0')+' with a readable long title'}))
        : kind === 'required' ? [{value:'',label:'Pilih status'}, ...choices] : ['async','removal'].includes(kind) ? dynamicOptions : choices;
      const content = <form id="fixture-form" onReset={kind==='controlled-reset'?()=>setValue('a'):undefined}
        onSubmit={event=>{event.preventDefault(); window.submissions.push(Object.fromEntries(new FormData(event.currentTarget)));}}>
        <button id="before" type="button">Before</button>
        <AppSelect id="picker" name="status" label="Status" options={kind==='children'?undefined:options}
          defaultValue={controlled||kind==='async'?undefined:kind==='required'?'':kind==='long'||kind==='overflow'?'0':'b'}
          value={controlled?value:undefined} disabled={kind==='disabled'||block==='disabled'} loading={kind==='loading'||block==='loading'}
          error={kind==='error'?'Pilih status yang valid.':undefined} required={kind==='required'}
          placeholder="Pilih kategori" onChange={event=>{
            window.changes.push({value:event.target.value, native:event.nativeEvent instanceof Event, select:event.currentTarget instanceof HTMLSelectElement, name:event.currentTarget.name});
            if(controlled) setValue(event.target.value);
          }}>
          {kind==='children'?<><option value="a">Alpha</option><option value="b">Beta</option><option value="c">Charlie</option></>:undefined}
        </AppSelect>
        <button id="after" type="button">After</button>
        <button id="submit" type="submit">Submit</button>
        <button id="reset" type="reset">Reset</button>
        {controlled&&<button id="external" type="button" onClick={()=>setValue('a')}>External update</button>}
      </form>;
      return kind==='dialog'?<dialog id="native-dialog">{content}</dialog>:kind==='overflow'?<div id="clipped">{content}</div>:content;
    }
    window.mount = kind => {
      window.changes=[]; window.submissions=[];
      flushSync(()=>root.render(<Fixture key={++revision} kind={kind}/>));
      if(kind==='dialog') document.getElementById('native-dialog').showModal();
    };
    window.mount('normal');
  `;
  await fs.writeFile(path.join(temporary, "entry.js"), transpile(fixture));
  const webpack = require("next/dist/compiled/webpack/webpack").webpack;
  await new Promise((resolve, reject) => {
    const compiler = webpack({ mode: "development", devtool: false, context: repository,
      entry: path.join(temporary, "entry.js"), output: { path: temporary, filename: "bundle.js" },
      resolve: { modules: [path.join(repository, "node_modules")] },
    });
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError || stats?.hasErrors()) reject(error ?? closeError ?? new Error(stats.toString({ all: false, errors: true })));
      else resolve();
    }));
  });
  return fs.readFile(path.join(temporary, "bundle.js"));
}

async function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (!message.id) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await pause(25);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  const click = async selector => {
    const point = await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)}); if(!element) throw Error('Missing click target'); const r=element.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await command("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await command("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await command("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    await pause(25);
  };
  const key = async (key, code = key) => {
    const numeric = { Tab: 9, Enter: 13, Escape: 27, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, " ": 32 }[key];
    await command("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: numeric, nativeVirtualKeyCode: numeric });
    await command("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: numeric, nativeVirtualKeyCode: numeric });
    await pause(25);
  };
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setFocusEmulationEnabled", { enabled: true });
  return { command, evaluate, wait, click, key, errors, socket };
}

test("AppSelect real browser interaction and form contract", { timeout: 90000 }, async suite => {
  try { await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1000) }); }
  catch { suite.skip(`Chrome CDP unavailable at ${endpoint}; start a dedicated Chrome with --remote-debugging-port=9350.`); return; }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "app-select-browser-"));
  let server, browser, target;
  try {
    const bundle = await buildFixture(temporary);
    const css = await fs.readFile(path.join(directory, "selects.css"));
    server = http.createServer((request, response) => {
      if (request.url === "/bundle.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle); }
      else if (request.url === "/selects.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
      else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html><head><link rel="stylesheet" href="/selects.css"><style>body{margin:20px;font-family:Arial,sans-serif}form{width:260px;max-width:100%}button{margin:4px}dialog{width:300px;padding:24px}#clipped{position:fixed;bottom:0;right:-10px;width:300px;height:76px;overflow:hidden}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: "PUT" })).json();
    browser = await connect(target);
    const { command, evaluate: ev, wait, click, key } = browser;
    await command("Emulation.setDeviceMetricsOverride", { width: 800, height: 700, deviceScaleFactor: 1, mobile: false });
    await command("Page.navigate", { url: `http://127.0.0.1:${server.address().port}` });
    await wait("typeof window.mount==='function'");
    const mount = async (kind = "normal") => { await ev(`window.mount(${JSON.stringify(kind)})`); await wait("!!document.querySelector('#picker')"); };
    const isOpen = () => ev("!!document.querySelector('[role=listbox]')");
    const active = () => ev("document.querySelector('[data-active=true]')?.textContent");
    const value = () => ev("document.querySelector('[data-select-value]').textContent");
    const selected = label => `[role=option]:nth-child(${({ Alpha: 1, Beta: 2, Charlie: 4 })[label]})`;

    await suite.test("initial selected label and native edit value", async () => {
      assert.equal(await value(), "Beta");
      assert.equal(await ev("new FormData(document.querySelector('form')).get('status')"), "b");
      assert.equal(await ev("document.querySelector('[data-select-native]').tabIndex"), -1);
      assert.equal(await ev("document.querySelector('[data-select-native]').getAttribute('aria-hidden')"), "true");
    });
    await suite.test("click opens a named listbox and expanded combobox", async () => {
      await click("#picker");
      assert.equal(await isOpen(), true);
      assert.equal(await ev("document.querySelector('#picker').getAttribute('aria-expanded')"), "true");
      assert.equal(await ev("document.querySelector('[role=listbox]').getAttribute('aria-label')"), "Status");
    });
    await suite.test("selected option exposes aria-selected and right checkmark", async () => {
      assert.equal(await ev("document.querySelector('[role=option][aria-selected=true]').textContent"), "Beta");
      assert.equal(await ev("!!document.querySelector('[role=option][aria-selected=true] [data-select-check]')"), true);
    });
    await suite.test("global typography, selected tint and hover tint are readable", async () => {
      await key("ArrowDown");
      await pause(180);
      const styles = await ev("(()=>{const t=document.querySelector('#picker'),s=document.querySelector('[aria-selected=true]'),a=document.querySelector('[data-active=true]');return{height:t.getBoundingClientRect().height,font:getComputedStyle(t).fontSize,label:getComputedStyle(document.querySelector('[data-select-label]')).fontSize,selected:getComputedStyle(s).backgroundColor,hover:getComputedStyle(a).backgroundColor}})()");
      assert.ok(styles.height >= 46); assert.equal(styles.font, "14px"); assert.equal(styles.label, "12px");
      assert.match(styles.selected, /rgba\(43, 48, 86, 0\.0\d+\)/);
      assert.match(styles.hover, /rgba\(255, 208, 0, 0\.1\d+\)/);
    });
    await suite.test("selection dispatches a genuine select ChangeEvent and restores focus", async () => {
      await click(selected("Charlie"));
      assert.deepEqual(await ev("window.changes"), [{ value: "c", native: true, select: true, name: "status" }]);
      assert.equal(await value(), "Charlie");
      assert.equal(await isOpen(), false);
      assert.equal(await ev("document.activeElement.id"), "picker");
    });
    await suite.test("choosing the current value closes and focuses without redundant onChange", async () => {
      await mount(); await click("#picker"); await click(selected("Beta"));
      assert.equal(await isOpen(), false);
      assert.equal(await ev("document.activeElement.id"), "picker");
      assert.equal(await value(), "Beta");
      assert.deepEqual(await ev("window.changes"), []);
    });
    await suite.test("Escape closes and retains trigger focus", async () => {
      await click("#picker"); await key("Escape");
      assert.equal(await isOpen(), false);
      assert.equal(await ev("document.activeElement.id"), "picker");
    });
    await suite.test("ArrowDown advances and skips disabled options", async () => {
      await mount(); await click("#picker"); await key("ArrowDown");
      assert.equal(await active(), "Charlie");
    });
    await suite.test("ArrowUp returns to previous enabled option", async () => {
      await key("ArrowUp"); assert.equal(await active(), "Beta");
    });
    await suite.test("Home and End focus first and last enabled options", async () => {
      await key("Home"); assert.equal(await active(), "Alpha");
      await key("End"); assert.equal(await active(), "Charlie");
    });
    await suite.test("Enter commits the focused option", async () => {
      await key("Enter"); assert.equal(await value(), "Charlie"); assert.equal(await isOpen(), false);
    });
    await suite.test("Space opens and chooses, keyboard Tab exits in normal order", async () => {
      await key(" ", "Space"); assert.equal(await isOpen(), true);
      await key("Home"); await key(" ", "Space"); assert.equal(await value(), "Alpha");
      await key(" ", "Space"); await key("Tab");
      assert.equal(await isOpen(), false); assert.equal(await ev("document.activeElement.id"), "after");
    });
    await suite.test("outside pointer closes without stealing outside focus", async () => {
      await click("#picker"); await click("#before");
      assert.equal(await isOpen(), false); assert.equal(await ev("document.activeElement.id"), "before");
    });
    await suite.test("disabled control cannot open or submit its value", async () => {
      await mount("disabled"); await click("#picker"); assert.equal(await isOpen(), false);
      assert.equal(await ev("new FormData(document.querySelector('form')).has('status')"), false);
    });
    await suite.test("disabled option cannot be selected by pointer", async () => {
      await mount(); await click("#picker"); await click("[role=option][aria-disabled=true]");
      assert.equal(await value(), "Beta"); assert.equal(await ev("window.changes.length"), 0); assert.equal(await isOpen(), true);
    });
    await suite.test("type to select focuses a matching label", async () => {
      await mount(); await ev("document.querySelector('#picker').focus()"); await key("c", "KeyC");
      assert.equal(await active(), "Charlie"); await key("Enter"); assert.equal(await value(), "Charlie");
    });
    await suite.test("loading announces progress and blocks opening", async () => {
      await mount("loading"); assert.equal(await value(), "Memuat..."); await click("#picker");
      assert.equal(await isOpen(), false); assert.equal(await ev("document.querySelector('#picker').getAttribute('aria-busy')"), "true");
    });
    await suite.test("empty options render a readable panel message", async () => {
      await mount("empty"); assert.equal(await value(), "Pilih kategori"); await click("#picker");
      assert.equal(await ev("document.querySelector('[data-select-empty]').textContent"), "Tidak ada pilihan tersedia.");
    });
    await suite.test("error helper is linked to invalid trigger", async () => {
      await mount("error");
      assert.equal(await ev("document.querySelector('#picker').getAttribute('aria-invalid')"), "true");
      assert.equal(await ev("document.getElementById(document.querySelector('#picker').getAttribute('aria-describedby')).textContent"), "Pilih status yang valid.");
    });
    await suite.test("long options scroll internally and keyboard focus scrolls into view", async () => {
      await mount("long"); await click("#picker"); await key("End");
      const metrics = await ev("(()=>{const p=document.querySelector('[role=listbox]'),o=p.querySelector('[data-active=true]'),a=p.getBoundingClientRect(),b=o.getBoundingClientRect();return{scroll:p.scrollTop,height:p.clientHeight,total:p.scrollHeight,visible:b.top>=a.top&&b.bottom<=a.bottom+1}})()");
      assert.ok(metrics.total > metrics.height); assert.ok(metrics.height <= 320); assert.ok(metrics.scroll > 0); assert.ok(metrics.visible);
    });
    await suite.test("controlled changes and external value updates synchronize FormData", async () => {
      await mount("controlled"); await click("#picker"); await click(selected("Charlie")); assert.equal(await value(), "Charlie");
      await click("#external"); assert.equal(await value(), "Alpha");
      assert.equal(await ev("new FormData(document.querySelector('form')).get('status')"), "a");
    });
    await suite.test("required validation blocks submission and focuses visible trigger", async () => {
      await mount("required"); await click("#submit");
      assert.equal(await ev("window.submissions.length"), 0); assert.equal(await ev("document.activeElement.id"), "picker");
      assert.equal(await ev("document.querySelector('#picker').getAttribute('aria-invalid')"), "true");
      await click("#picker"); await click("[role=option]:nth-child(2)"); await click("#submit");
      assert.deepEqual(await ev("window.submissions"), [{ status: "a" }]);
    });
    await suite.test("form reset restores uncontrolled initial label and submitted value", async () => {
      await mount(); await click("#picker"); await click(selected("Charlie")); await click("#reset");
      await pause(50);
      assert.deepEqual(await ev("({label:document.querySelector('[data-select-value]').textContent,native:document.querySelector('[data-select-native]').value,form:new FormData(document.querySelector('form')).get('status'),defaults:[...document.querySelector('[data-select-native]').options].filter(o=>o.defaultSelected).map(o=>o.value)})"),
        { label: "Beta", native: "b", form: "b", defaults: ["b"] });
    });
    await suite.test("form reset keeps a controlled value synchronized with its parent", async () => {
      await mount("controlled"); await click("#picker"); await click(selected("Charlie")); await click("#reset");
      await pause(50);
      assert.deepEqual(await ev("({label:document.querySelector('[data-select-value]').textContent,native:document.querySelector('[data-select-native]').value,form:new FormData(document.querySelector('form')).get('status')})"),
        { label: "Charlie", native: "c", form: "c" });
    });
    await suite.test("controlled parent onReset updates win over the previous value", async () => {
      await mount("controlled-reset"); await click("#picker"); await click(selected("Charlie")); await click("#reset");
      await pause(50);
      assert.deepEqual(await ev("({label:document.querySelector('[data-select-value]').textContent,form:new FormData(document.querySelector('form')).get('status')})"),
        { label: "Alpha", form: "a" });
    });
    await suite.test("initially empty async options synchronize the first native option", async () => {
      await mount("async"); assert.equal(await value(), "Pilih kategori");
      await ev("window.setFixtureOptions([{value:'x',label:'Xray'},{value:'y',label:'Yankee'}])");
      await wait("document.querySelector('[data-select-value]').textContent==='Xray'");
      assert.equal(await ev("new FormData(document.querySelector('form')).get('status')"), "x");
    });
    await suite.test("removing the selected option synchronizes native fallback and visible value", async () => {
      await mount("removal"); await click("#picker"); await click(selected("Charlie"));
      await ev("window.setFixtureOptions([{value:'a',label:'Alpha'},{value:'b',label:'Beta'}])");
      await wait("document.querySelector('[data-select-value]').textContent==='Alpha'");
      assert.equal(await ev("new FormData(document.querySelector('form')).get('status')"), "a");
    });
    for (const state of ["disabled", "loading"]) {
      await suite.test(`${state} applied while open closes the panel and clears expanded state`, async () => {
        await mount(); await click("#picker"); await ev(`window.setFixtureBlock(${JSON.stringify(state)})`);
        await wait("!document.querySelector('[role=listbox]')&&document.querySelector('#picker').getAttribute('aria-expanded')==='false'");
        assert.equal(await ev("document.querySelector('#picker').disabled"), true);
      });
    }
    await suite.test("option children retain labels, values and real event callback", async () => {
      await mount("children"); assert.equal(await value(), "Beta"); await click("#picker"); await key("Home"); await key("Enter");
      assert.equal(await value(), "Alpha"); assert.equal(await ev("window.changes[0].value"), "a");
    });
    await suite.test("dialog portal stays interactive and Escape closes only the picker", async () => {
      await mount("dialog"); await click("#picker");
      assert.equal(await ev("document.querySelector('[role=listbox]').parentElement.id"), "native-dialog");
      await click(selected("Charlie")); assert.equal(await value(), "Charlie");
      await click("#picker"); await key("Escape"); assert.equal(await isOpen(), false);
      assert.equal(await ev("document.querySelector('#native-dialog').open"), true);
    });
    await suite.test("mobile overflow portal flips upward and stays inside viewport", async () => {
      await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 700, deviceScaleFactor: 1, mobile: false });
      await mount("overflow"); await ev("document.querySelector('#picker').focus()"); await key("Enter");
      const geometry = await ev("(()=>{const p=document.querySelector('[role=listbox]'),r=p.getBoundingClientRect(),a=document.querySelector('#picker').getBoundingClientRect();return{placement:p.dataset.placement,left:r.left,right:r.right,top:r.top,bottom:r.bottom,anchorTop:a.top,popover:p.matches(':popover-open'),parent:p.parentElement.tagName}})()");
      assert.equal(geometry.placement, "top"); assert.equal(geometry.popover, true); assert.equal(geometry.parent, "BODY");
      assert.ok(geometry.left >= 0 && geometry.right <= 390); assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.anchorTop);
    });
    assert.deepEqual(browser.errors, [], "fixture must not emit browser runtime exceptions");
  } finally {
    browser?.socket.close();
    if (target) await fetch(`${endpoint}/json/close/${target.id}`).catch(() => {});
    if (server) await new Promise(resolve => server.close(resolve));
    const resolved = path.resolve(temporary);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("app-select-browser-"));
    await fs.rm(resolved, { recursive: true, force: true });
  }
});
