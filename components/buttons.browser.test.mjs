import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Uses a dedicated Chrome CDP endpoint. Owns its disposable page, never the browser process.
const endpoint = process.env.BUTTON_CDP_URL;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const luminance = rgb => rgb.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

test('shared navy interactions preserve semantic variants, logout, navigation and geometry', { skip: !endpoint, timeout: 60000 }, async suite => {
  const target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => { socket.onopen = resolve; });
  const pending = new Map(); let sequence = 0;
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id); pending.delete(message.id);
    if (message.error) request.reject(message.error); else request.resolve(message.result);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const measure = id => evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)}),s=getComputedStyle(e),r=e.getBoundingClientRect();return {bg:s.backgroundColor,fg:s.color,icon:getComputedStyle(e.querySelector('svg')).color,border:s.borderColor,width:r.width,height:r.height,scale:s.scale,outline:s.outlineStyle,focus:e.matches(':focus-visible')}})()`);
  const point = id => evaluate(`(()=>{const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const hover = async id => { await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...await point(id) }); await pause(210); return measure(id); };
  try {
    await command('Page.enable'); await command('Runtime.enable');
    await command('Emulation.setFocusEmulationEnabled', { enabled: true });
    const css = await fs.readFile(new URL('./buttons.css', import.meta.url), 'utf8');
    const variants = [
      ['primary', 'primary', ''], ['legacy', 'primary', 'data-button-hover="accent"'],
      ['back', 'back', ''], ['logout', 'primary', 'data-button-hover="logout"'],
      ['row', 'primary', 'data-row-action="primary"'], ['inverse', 'primary', 'data-button-inverse="true"'],
      ['row-secondary', 'secondary', 'data-row-action="primary"'],
      ['danger', 'danger', ''], ['success', 'success', ''], ['warning', 'warning', ''],
      ['accent', 'accent', ''], ['secondary', 'secondary', ''], ['ghost', 'ghost', ''],
      ['selected', 'primary', 'aria-pressed="true"'], ['unselected', 'primary', 'aria-pressed="false"'], ['disabled', 'primary', 'disabled'],
      ['loading', 'primary', 'disabled data-button-loading="true"'],
    ];
    const html = `<html><head><style>${css}\nbody{margin:16px;font:14px Arial}.fixture{display:flex;flex-wrap:wrap;gap:12px}button{flex:none}.legacy-scale:hover{scale:1.04}.selected-scale:hover{scale:1.03}</style></head><body><div class="fixture">${variants.map(([id, variant, extra]) => `<button id="${id}" class="${id === 'primary' ? 'legacy-scale' : id === 'selected' ? 'selected-scale' : ''}" data-button="${variant}" ${extra}><svg viewBox="0 0 20 20" aria-hidden="true"><path stroke="currentColor" d="M2 10h16"/></svg>${id}</button>`).join('')}</div></body></html>`;
    const { frameTree } = await command('Page.getFrameTree');
    await command('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
    for (const width of [1440, 768, 390]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false });
      await suite.test(`primary/back colors, icon contrast and stable dimensions at ${width}`, async () => {
        for (const id of ['primary', 'legacy', 'back', 'row', 'inverse', 'row-secondary']) {
          await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }); await pause(210);
          const before = await measure(id), after = await hover(id);
          assert.equal(before.bg, 'rgb(0, 6, 51)'); assert.equal(before.fg, 'rgb(255, 255, 255)');
          assert.equal(after.bg, 'rgb(238, 240, 247)'); assert.equal(after.fg, 'rgb(0, 6, 51)');
          assert.equal(after.border, 'rgb(213, 217, 231)');
          const colors = [after.bg, after.fg].map(color => luminance(color.match(/\d+/g).map(Number))).sort((a, b) => b - a);
          assert.ok((colors[0] + 0.05) / (colors[1] + 0.05) >= 4.5, 'rendered hover colors meet WCAG AA');
          assert.equal(after.icon, after.fg); assert.equal(after.width, before.width); assert.equal(after.height, before.height); assert.equal(after.scale, 'none');
        }
      });
    }
    await suite.test('pressed uses a deeper soft surface and info keyboard focus is independent of hover', async () => {
      await hover('primary'); await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...await point('primary') }); await pause(210);
      const pressed = await measure('primary');
      assert.equal(pressed.bg, 'rgb(229, 231, 239)'); assert.equal(pressed.fg, 'rgb(0, 6, 51)'); assert.equal(pressed.icon, pressed.fg);
      await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...await point('primary') });
      await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await evaluate(`document.getElementById('back').focus()`);
      const focus = await measure('back'); assert.equal(focus.focus, true); assert.equal(focus.outline, 'solid');
      assert.equal(await evaluate(`getComputedStyle(document.getElementById('back')).outlineColor`), 'rgb(31, 171, 255)');
      await evaluate(`document.getElementById('inverse').focus()`);
      assert.equal(await evaluate(`getComputedStyle(document.getElementById('inverse')).outlineColor`), 'rgb(31, 171, 255)');
    });
    await suite.test('logout keeps its explicit yellow interaction', async () => {
      await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }); await pause(210);
      const before = await measure('logout'), after = await hover('logout');
      assert.equal(before.bg, 'rgb(0, 6, 51)'); assert.equal(before.fg, 'rgb(255, 208, 0)');
      assert.equal(after.bg, 'rgb(255, 208, 0)'); assert.equal(after.fg, 'rgb(0, 6, 51)');
    });
    await suite.test('semantic, accent, secondary and ghost variants retain their colors', async () => {
      for (const [id, bg] of [['danger', 'rgb(255, 59, 47)'], ['success', 'rgb(85, 190, 36)'], ['warning', 'rgb(255, 149, 0)'], ['accent', 'rgb(255, 208, 0)'], ['secondary', 'rgb(238, 240, 247)'], ['ghost', 'rgba(0, 0, 0, 0)']]) {
        await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }); await pause(210);
        assert.equal((await measure(id)).bg, bg);
      }
      assert.equal((await hover('danger')).bg, 'rgb(230, 53, 42)');
      assert.equal((await hover('success')).bg, 'rgb(73, 168, 31)');
      assert.equal((await hover('accent')).bg, 'rgb(230, 188, 0)');
      const selected = await hover('selected'); assert.equal(selected.bg, 'rgb(43, 48, 86)'); assert.equal(selected.scale, '1.03');
      const unselected = await hover('unselected'); assert.equal(unselected.bg, 'rgb(43, 48, 86)'); assert.equal(unselected.fg, 'rgb(255, 255, 255)');
    });
    await suite.test('disabled and loading controls ignore hover', async () => {
      for (const id of ['disabled', 'loading']) { const current = await hover(id); assert.equal(current.bg, 'rgb(239, 240, 244)'); assert.equal(current.fg, 'rgb(128, 134, 151)'); }
    });
  } finally {
    socket.close(); await fetch(`${endpoint}/json/close/${target.id}`);
  }
});
