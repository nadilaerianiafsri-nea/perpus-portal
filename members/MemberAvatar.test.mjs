import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = new URL('./MemberAvatar.tsx', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
function render(props) {
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(filename.slice(0, filename.lastIndexOf('/')));
  const nativeRequire = loaded.require.bind(loaded);
  loaded.require = name => name.endsWith('.module.css') ? { __esModule: true, default: { avatar: 'avatar', topbar: 'topbar', profile: 'profile', panel: 'panel', image: 'image', initials: 'initials' } } : nativeRequire(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return renderToStaticMarkup(React.createElement(loaded.exports.default, props));
}

test('member avatar falls back to shared first/last initials without a decorative icon', () => {
  const html = render({ name: 'Nadila Eriani Afsri' });
  assert.match(html, />NA</); assert.doesNotMatch(html, /<img|<svg/);
  assert.match(html, /aria-label="Inisial Nadila Eriani Afsri"/);
});
test('stored avatar references use the private photo route and meaningful alt text', () => {
  const html = render({ name: 'Najwa Azizi', profileImageUrl: '/uploads/avatars/12345678-1234-4234-8234-123456789abc.png', variant: 'profile' });
  assert.match(html, /<img[^>]*src="\/api\/members\/me\/profile\/photo\/12345678-1234-4234-8234-123456789abc.png"/);
  assert.match(html, /alt="Foto profil Najwa Azizi"/);
});
test('arbitrary image URLs never become image sources', () => {
  for (const profileImageUrl of ['https://example.test/person.jpg', 'javascript:alert(1)', '/uploads/avatars/../../etc/passwd']) {
    assert.doesNotMatch(render({ name: 'Najwa', profileImageUrl }), /<img/);
  }
});
test('one-letter and missing names render safely', () => {
  assert.match(render({ name: 'A' }), />A</);
  assert.match(render({ name: '' }), />\?</);
});
