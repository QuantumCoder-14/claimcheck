// Run: node tests/test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\/ <<CORE([\s\S]*?)\/\/ CORE>>/);
if (!m) { console.error('CORE block not found'); process.exit(1); }
const api = new Function(m[1] + `; return {readLink, readText, parseAddress, ownerOf, skeleton,
  looksDisguised, disguiseMatch, punycodeDecode, decodeHost, scriptsIn, hasMixedScripts, latinize,
  letterStats, looksGenerated, pathRisks, classifySource, quoteAttribution, segment,
  isLocalHost, isNumericHost, WATCHED_NAMES, SOURCE_TAXONOMY};`)();
let fails = 0;
const eq = (n, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) {
  fails++; console.log(`FAIL ${n}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); } };
const ok = (n, cond, extra) => { if (!cond) { fails++; console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`); } };
const v = (result, id) => (result.checks.find(c => c.id === id) || {}).verdict;

// ============ punycode decoding ============
eq('punycode: bücher', api.punycodeDecode('bcher-kva'), 'bücher');
eq('punycode: cyrillic apple', api.punycodeDecode('80ak6aa92e'), 'аррӏе');
eq('punycode: münchen', api.punycodeDecode('mnchen-3ya'), 'münchen');
ok('punycode: rejects rubbish', (() => { try { api.punycodeDecode('!!!'); return false; } catch (e) { return true; } })());
eq('decodeHost leaves ascii alone', api.decodeHost('example.com'), 'example.com');
eq('decodeHost decodes each label', api.decodeHost('xn--80ak6aa92e.com'), 'аррӏе.com');

// ============ transliteration ============
eq('latinize cyrillic apple', api.latinize('аррӏе'), 'apple');
eq('latinize greek', api.latinize('αpple'), 'apple');
eq('latinize leaves latin', api.latinize('apple'), 'apple');

// ============ script analysis ============
eq('scripts: cyrillic only', api.scriptsIn('аррӏе'), ['cyrillic']);
eq('scripts: latin only', api.scriptsIn('paypal'), ['latin']);
eq('mixed scripts detected', api.hasMixedScripts('аpple'), true);
eq('pure cyrillic is not "mixed"', api.hasMixedScripts('аррӏе'), false);
eq('pure latin is not mixed', api.hasMixedScripts('paypal'), false);

// ============ skeleton matching ============
eq('digit swap collapses', api.skeleton('paypa1'), api.skeleton('paypal'));
eq('rn reads as m', api.skeleton('rnicrosoft'), api.skeleton('microsoft'));
eq('doubled letters collapse', api.skeleton('gooogle'), api.skeleton('google'));
eq('paypa1 is a disguise', api.looksDisguised('paypa1', 'paypal'), true);
eq('padded name is a disguise', api.looksDisguised('paypal-secure', 'paypal'), true);
eq('exact name is not a disguise', api.looksDisguised('paypal', 'paypal'), false);
eq('disguiseMatch finds sbi variant', api.disguiseMatch('sbi-kyc'), 'sbi');

// ============ readability ============
ok('mash flagged', api.looksGenerated('x7f2k9qz1').length > 0, JSON.stringify(api.looksGenerated('x7f2k9qz1')));
ok('consonant run flagged', api.looksGenerated('xkcdqwrtp').length > 0, JSON.stringify(api.looksGenerated('xkcdqwrtp')));
eq('a real word is not flagged', api.looksGenerated('amazon'), []);
eq('vowel ratio computed', api.letterStats('amazon').vowelRatio > 0.4, true);

// ============ path analysis ============
ok('double extension caught', api.pathRisks(new URL('https://x.example/invoice.pdf.exe')).some(r => r.includes('double extension')));
ok('executable caught', api.pathRisks(new URL('https://x.example/setup.exe')).some(r => r.includes('runs code')));
ok('apk caught', api.pathRisks(new URL('https://x.example/app.apk')).some(r => r.includes('runs code')));
ok('pressure words caught', api.pathRisks(new URL('https://x.example/account/login/verify')).some(r => r.includes('pressure')));
ok('opaque query caught', api.pathRisks(new URL('https://x.example/a?t=' + 'A'.repeat(48))).some(r => r.includes('opaque')));
eq('clean path is quiet', api.pathRisks(new URL('https://x.example/docs/page.html')).length, 0);

// ============ ownership ============
eq('country second level', api.ownerOf('login.sbi.co.in'), 'sbi.co.in');
eq('deep subdomain', api.ownerOf('a.b.example.com'), 'example.com');
eq('two-label host', api.ownerOf('localhost'), 'localhost');

// ============ the seven questions ============
const homograph = api.readLink('https://xn--80ak6aa92e.com/account/login');
eq('seven questions asked', homograph.checks.length, 7);
eq('homograph: name fails', v(homograph, 'name-honest'), 'fail');
eq('homograph: headline', homograph.tone, 'fail');
ok('homograph: explains the alphabet', homograph.checks.find(c => c.id === 'name-honest').answer.includes('apple'));

const realApple = api.readLink('https://apple.com');
eq('the real apple.com passes the name check', v(realApple, 'name-honest'), 'pass');
eq('the real apple.com has no failures', realApple.failed, 0);

const trojan = api.readLink('https://download-centre.example/invoice.pdf.exe');
eq('double extension fails the path check', v(trojan, 'path'), 'fail');
eq('double extension is disqualifying', trojan.tone, 'fail');

const typo = api.readLink('http://paypa1-secure.com/verify?session=9f2a');
eq('typo: name fails', v(typo, 'name-honest'), 'fail');
eq('typo: transport fails', v(typo, 'transport'), 'fail');

const short = api.readLink('https://bit.ly/3xK9pQz');
eq('shortener: direction fails', v(short, 'direct'), 'fail');

const local = api.readLink('http://192.168.0.1/admin');
eq('private address: publicness fails', v(local, 'reachable'), 'fail');

const clean = api.readLink('https://github.com/QuantumCoder-14/claimcheck');
eq('clean link: nothing fails', clean.failed, 0);
eq('clean link: tone', clean.tone, 'pass');
eq('clean link: rendered name', clean.rendered, 'github.com');

eq('unreadable input rejected', api.readLink('::::').ok, false);
eq('ftp rejected', api.parseAddress('ftp://example.com').ok, false);
eq('numeric host detected', api.isNumericHost('10.0.0.1'), true);
eq('loopback is local', api.isLocalHost('127.0.0.1'), true);

// ============ segmentation ============
eq('abbreviations do not split', api.segment('Dr. Mehta met the minister. He left.').length, 2);
eq('ordinary sentences split', api.segment('One thing happened. Another thing followed.').length, 2);
eq('single sentence stays whole', api.segment('Just one sentence here.').length, 1);

// ============ source taxonomy ============
eq('anonymous sources', api.classifySource('Sources say the rule will change.').kind, 'anonymous');
eq('named official', api.classifySource('A spokesperson said in a statement that cases fell.').kind, 'named-official');
eq('academic', api.classifySource('A peer-reviewed study published in the journal found a link.').kind, 'academic');
eq('document', api.classifySource('A notification published on the ministry website sets the rules.').kind, 'document');
eq('court', api.classifySource('The high court ruled that the order stands.').kind, 'court-or-ministry');
eq('figures only', api.classifySource('About 1,240 cases were recorded.').kind, 'figures-only');
eq('nothing', api.classifySource('The banks are hiding this.').kind, 'nothing');
ok('taxonomy is ordered strongest first', api.SOURCE_TAXONOMY[0].strength >= api.SOURCE_TAXONOMY[api.SOURCE_TAXONOMY.length - 1].strength);
ok('anonymous is weaker than named', api.classifySource('Sources say it fell.').strength < api.classifySource('A spokesperson said it fell.').strength);

// ============ quotes ============
ok('attributed quote recognised', api.quoteAttribution('"The figures are preliminary," a spokesperson told reporters.').attributed);
ok('bare quote flagged as unattributed', api.quoteAttribution('The note says "the figures were revised upward again" plainly.').attributed === false);
eq('no quote returns null', api.quoteAttribution('Nothing quoted here at all.'), null);

// ============ text reading ============
const report = api.readText('The ministry of health said in a statement on Tuesday that 1,240 cases were recorded in 2024. "The figures are preliminary and may be revised," a spokesperson told reporters. A notification published on the ministry website sets out the reporting rules.');
ok('report: assertions found', report.total >= 2, 'total=' + report.total);
ok('report: strong sources', report.strong >= 2, 'strong=' + report.strong);
eq('report: tone', report.tone, 'pass');
ok('report: hedging noticed', report.hedged >= 1);

const forward = api.readText('SHOCKING: everyone knows the banks are hiding this. Sources say the new rule will take every account. Forward this to all your contacts before it is deleted!!!');
eq('forward: nothing checkable', forward.strong, 0);
eq('forward: tone', forward.tone, 'fail');
ok('forward: absolutes counted', forward.absolutes >= 2);
ok('forward: unnamed sources stay weak', forward.claims.every(c => c.strength <= 1));

const barequote = api.readText('The note says "the figures were revised upward again" without naming anyone.');
ok('unattributed quote noticed', barequote.unattributedQuotes >= 1, 'got ' + barequote.unattributedQuotes);

eq('empty text rejected', api.readText('  ').ok, false);
eq('opinion has no assertions', api.readText('Coffee tastes better in the morning. I prefer the small cup.').total, 0);

// ============ determinism ============
eq('link deterministic', JSON.stringify(api.readLink('https://paypa1.com/x')), JSON.stringify(api.readLink('https://paypa1.com/x')));
eq('text deterministic', JSON.stringify(api.readText('The report said 5 cases.')), JSON.stringify(api.readText('The report said 5 cases.')));

console.log(fails ? `\n${fails} FAILURE(S)` : `ALL CLAIMCHECK TESTS PASSED (${api.SOURCE_TAXONOMY.length} source kinds)`);
process.exit(fails ? 1 : 0);
