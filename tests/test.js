// Run: node tests/test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\/ <<CORE([\s\S]*?)\/\/ CORE>>/);
if (!m) { console.error('CORE block not found'); process.exit(1); }
const api = new Function(m[1] + `; return {readLink, readText, parseAddress, ownerOf, skeleton,
  looksDisguised, disguiseMatch, classifyEvidence, isLocalHost, isNumericHost};`)();
let fails = 0;
const eq = (n, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) {
  fails++; console.log(`FAIL ${n}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); } };
const ok = (n, cond, extra) => { if (!cond) { fails++; console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`); } };
const verdictOf = (result, id) => (result.checks.find(c => c.id === id) || {}).verdict;

// ---------- skeleton matching: the core of the name check ----------
eq('digit swap collapses', api.skeleton('paypa1'), api.skeleton('paypal'));
eq('rn reads as m', api.skeleton('rnicrosoft'), api.skeleton('microsoft'));
eq('zeros read as o', api.skeleton('g00gle'), api.skeleton('google'));
eq('doubled letters collapse', api.skeleton('gooogle'), api.skeleton('google'));
eq('hyphens ignored', api.skeleton('pay-pal'), api.skeleton('paypal'));
ok('different names do not collapse', api.skeleton('example') !== api.skeleton('paypal'));

eq('paypa1 is a disguise', api.looksDisguised('paypa1', 'paypal'), true);
eq('rnicrosoft is a disguise', api.looksDisguised('rnicrosoft', 'microsoft'), true);
eq('padded name is a disguise', api.looksDisguised('paypal-secure', 'paypal'), true);
eq('exact name is not a disguise', api.looksDisguised('paypal', 'paypal'), false);
eq('unrelated name is not a disguise', api.looksDisguised('example', 'paypal'), false);
eq('disguiseMatch finds paypal', api.disguiseMatch('paypa1'), 'paypal');
eq('disguiseMatch finds sbi variant', api.disguiseMatch('sbi-kyc'), 'sbi');
eq('disguiseMatch quiet on a plain name', api.disguiseMatch('example'), null);

// ---------- ownership ----------
eq('simple domain', api.ownerOf('example.com'), 'example.com');
eq('country second level', api.ownerOf('login.sbi.co.in'), 'sbi.co.in');
eq('deep subdomain', api.ownerOf('a.b.example.com'), 'example.com');
eq('gov.in', api.ownerOf('incometax.gov.in'), 'incometax.gov.in');
eq('two-label host', api.ownerOf('localhost'), 'localhost');

// ---------- address parsing ----------
eq('rejects garbage', api.parseAddress('not a url').ok, false);
eq('rejects ftp', api.parseAddress('ftp://example.com').ok, false);
eq('adds https', api.parseAddress('example.com').url.protocol, 'https:');
eq('numeric host detected', api.isNumericHost('192.168.0.1'), true);
eq('loopback is local', api.isLocalHost('127.0.0.1'), true);
eq('metadata address is local', api.isLocalHost('169.254.169.254'), true);
eq('public host is not local', api.isLocalHost('example.com'), false);

// ---------- the five questions ----------
const clean = api.readLink('https://github.com/QuantumCoder-14/claimcheck');
eq('clean link: no failures', clean.failed, 0);
eq('clean link: headline', clean.tone, 'pass');
eq('clean link: name honest', verdictOf(clean, 'name-honest'), 'pass');
eq('clean link: encrypted', verdictOf(clean, 'transport'), 'pass');

const typo = api.readLink('http://paypa1-secure.com/verify?session=9f2a');
eq('typo link: name fails', verdictOf(typo, 'name-honest'), 'fail');
eq('typo link: transport fails', verdictOf(typo, 'transport'), 'fail');
eq('typo link: headline', typo.tone, 'fail');
ok('typo link: explains the disguise', typo.checks.find(c => c.id === 'name-honest').answer.includes('paypal'));

const short = api.readLink('https://bit.ly/3xK9pQz');
eq('shortener: direct fails', verdictOf(short, 'direct'), 'fail');
eq('shortener: single failure is suspicion not panic', short.tone, 'warn');

const private1 = api.readLink('http://192.168.0.1/admin');
eq('private address: reachable fails', verdictOf(private1, 'reachable'), 'fail');
eq('private address: headline', private1.tone, 'fail');

const own = api.readLink('https://login.sbi.co.in');
eq('own domain: name honest', verdictOf(own, 'name-honest'), 'pass');
eq('own domain: no failures', own.failed, 0);

const puny = api.readLink('https://xn--80ak6aa92e.com/x');
eq('punycode flagged as oddity', verdictOf(puny, 'clean'), 'warn');

eq('unreadable input', api.readLink('::::').ok, false);

// ---------- claim evidence ----------
const forward = api.readText('SHOCKING: everyone knows the banks are hiding this. Sources say the new rule will take every account. Forward this to all your contacts before it is deleted!!!');
eq('forward: all unsourced', forward.counts.none, forward.total);
eq('forward: headline', forward.tone, 'fail');
ok('forward: absolutes counted', forward.absolutes >= 2, 'absolutes=' + forward.absolutes);
ok('forward: "sources say" is not a named source',
   forward.claims.every(c => c.evidence !== 'named'));

const report = api.readText('The ministry of health said in a statement on Tuesday that 1,240 cases were recorded in 2024. "The figures are preliminary and may be revised," a spokesperson told reporters. A notification published on the ministry website sets out the reporting rules.');
ok('report: claims found', report.total >= 2, 'total=' + report.total);
ok('report: at least two sourced', report.supported >= 2, 'supported=' + report.supported);
eq('report: tone', report.tone, 'pass');
ok('report: the quoted sentence is attributed to a spokesperson',
   report.claims.some(c => c.text.includes('preliminary') && (c.evidence === 'named' || c.evidence === 'quote')));
eq('classify: a quote with vague attribution is still just a quote',
   api.classifyEvidence('\u201cWe will review the numbers next week,\u201d it said.'), 'quote');
eq('classify: named ministry', api.classifyEvidence('According to the ministry, cases fell.'), 'named');
eq('classify: unattributed quote', api.classifyEvidence('The note reads \u201cthe figures were revised upward again\u201d in full.'), 'quote');
ok('report: hedging counted', report.hedged >= 1);

eq('empty text rejected', api.readText('   ').ok, false);
const opinion = api.readText('Coffee tastes better in the morning. I prefer the small cup.');
eq('opinion: no assertions', opinion.total, 0);
eq('opinion: headline', opinion.headline, 'Nothing here asserts a fact');

eq('classify: named source', api.classifyEvidence('The ministry said in a statement that cases fell.'), 'named');
eq('classify: document', api.classifyEvidence('A notification published on the site sets the rules.'), 'doc');
eq('classify: figures only', api.classifyEvidence('About 1,240 cases were recorded.'), 'figures');
eq('classify: nothing', api.classifyEvidence('The banks are hiding this.'), 'none');

// ---------- determinism ----------
eq('link reading deterministic',
   JSON.stringify(api.readLink('https://paypa1.com/x')), JSON.stringify(api.readLink('https://paypa1.com/x')));
eq('text reading deterministic',
   JSON.stringify(api.readText('The report said 5 cases.')), JSON.stringify(api.readText('The report said 5 cases.')));

console.log(fails ? `\n${fails} FAILURE(S)` : 'ALL CLAIMCHECK TESTS PASSED');
process.exit(fails ? 1 : 0);
