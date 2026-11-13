// Run: node tests/test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\/ <<CORE([\s\S]*?)\/\/ CORE>>/);
if (!m) { console.error('CORE block not found'); process.exit(1); }
const api = new Function(m[1] + '; return {analyseUrl, scoreText, extractClaims, parseUrl, band, URL_WEIGHTS, registrableDomain, lookalikeBrand, levenshtein, isPrivateHost, factualScore};')();
let fails = 0;
const eq = (n, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) {
  fails++; console.log(`FAIL ${n}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); } };
const ok = (n, cond, extra) => { if (!cond) { fails++; console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`); } };

// ---------- ported from DeepShield's documented model ----------
eq('baseline for an unknown site', api.analyseUrl('https://random-unknown-site.com').risk, 27);
// https gives -8, so 35 - 8 = 27 risk, score 73
eq('score is 100 minus risk', api.analyseUrl('https://random-unknown-site.com').score, 73);
eq('plain http adds 6', api.analyseUrl('http://random-unknown-site.com').risk, 41);
eq('ip host adds 25', api.analyseUrl('http://192.168.1.1/login').risk, 66);
eq('shortener adds 10', api.analyseUrl('https://bit.ly/abc').risk, 37);
eq('punycode adds 22', api.analyseUrl('https://xn--80ak6aa92e.com').signals.some(s => s.id === 'url.punycode_host'), true);
eq('credentials in url', api.analyseUrl('https://user:pass@example.com').signals.some(s => s.id === 'url.credentials_in_url'), true);
eq('nonstandard port', api.analyseUrl('https://example.com:8080/x').signals.some(s => s.id === 'url.nonstandard_port'), true);
eq('lookalike brand', api.analyseUrl('https://sbi-kyc-verify.xyz/login').signals.some(s => s.id === 'url.lookalike_domain'), true);
eq('suspicious tld', api.analyseUrl('https://something.xyz').signals.some(s => s.id === 'url.suspicious_tld'), true);
eq('shortener flagged by name', api.analyseUrl('https://tinyurl.com/xyz').signals.some(s => s.id === 'url.url_shortener'), true);

// clamping
const hostile = api.analyseUrl('http://192.168.1.1:8080/xn--a.com/a?url=http%3A%2F%2Fb%2F%3Fa%3Db%26c%3Dd%26e%3Df');
ok('risk clamps at 100', hostile.risk <= 100, 'risk=' + hostile.risk);
ok('score clamps at 0', hostile.score >= 0, 'score=' + hostile.score);
const clean = api.analyseUrl('https://github.com/QuantumCoder-14/scamcheck');
eq('reputable domain not called lookalike', clean.signals.some(s => s.id === 'url.lookalike_domain'), false);
eq('clean link has no risk signals', clean.signals.filter(s => s.points > 0).length, 0);
eq('clean link score', clean.score, 73);

// bands match the documentation
eq('band critical', api.band(34), 'critical');
eq('band elevated', api.band(35), 'elevated');
eq('band moderate', api.band(60), 'moderate');
eq('band lower', api.band(80), 'lower');

// parsing
eq('rejects garbage', api.parseUrl('not a url at all'), null);
eq('rejects ftp', api.parseUrl('ftp://example.com/x'), null);
eq('adds https when missing', api.parseUrl('example.com/x').url.protocol, 'https:');
eq('lowercases host', api.parseUrl('https://EXAMPLE.COM/X').host, 'example.com');

// ---------- text credibility ----------
const bad = api.scoreText('SHOCKING: everyone knows the mainstream media won\'t tell you this. Sources say a secret report proves 100% that the new rule is a cover-up. Forward this to all your contacts before it is deleted!!!');
const good = api.scoreText('The ministry of health said in a statement on Tuesday that 1,240 cases were reported in 2024, and that the figures are preliminary. A spokesperson said the review is unconfirmed.');
ok('sensational text scores low', bad.score < 30, 'score=' + bad.score);
ok('sober text scores higher', good.score > bad.score, good.score + ' vs ' + bad.score);
ok('sober text passes 60', good.score >= 60, 'score=' + good.score);
ok('chain phrasing detected', bad.signals.some(s => s.id === 'forwarded'));
ok('conspiracy framing detected', bad.signals.some(s => s.id === 'conspiracy'));
ok('unnamed authority detected', bad.signals.some(s => s.id === 'vague-source'));
ok('named source rewarded', good.signals.some(s => s.id === 'sourced'));
ok('hedging rewarded', good.signals.some(s => s.id === 'hedged'));
eq('empty text rejected', api.scoreText('').ok, false);
ok('score stays in range', api.scoreText('x'.repeat(50)).score >= 0 && api.scoreText('x'.repeat(50)).score <= 100);

// ---------- claim extraction ----------
const claims = api.extractClaims('In 2024 the ministry reported 1,240 cases. The sky is blue. A spokesperson said the figure was preliminary and may rise.');
ok('extracts checkable sentences', claims.length >= 2, 'got ' + claims.length);
ok('drops sentences under four words', claims.every(c => c.text.split(/\s+/).length >= 4));
ok('tags dated claims', claims.some(c => c.tags.includes('dated')));
ok('tags attributed claims', claims.some(c => c.tags.includes('attributed')));
ok('sorted by weight', claims.every((c, i, a) => i === 0 || a[i - 1].weight >= c.weight));
eq('opinion-only text yields no claims', api.extractClaims('We should probably think about it more.').length, 0);

// ---------- ported analyser internals ----------
eq('registrable domain', api.registrableDomain('login.sbi.co.in'), 'sbi.co.in');
eq('registrable domain simple', api.registrableDomain('a.b.example.com'), 'example.com');
eq('levenshtein identical', api.levenshtein('google', 'google'), 0);
eq('levenshtein one edit', api.levenshtein('gooogle', 'google'), 1);
eq('typosquat detected', api.lookalikeBrand('gooogle.com', 'gooogle.com'), 'google');
eq('brand substring detected', api.lookalikeBrand('paypal-secure.com', 'paypal-secure.com'), 'paypal');
eq('brand in subdomain detected', api.lookalikeBrand('paypal.evil.com', 'evil.com'), 'paypal');
eq('real brand domain not flagged', api.lookalikeBrand('google.com', 'google.com'), null);
eq('private host loopback', api.isPrivateHost('127.0.0.1'), true);
eq('private host rfc1918', api.isPrivateHost('192.168.1.5'), true);
eq('private host metadata', api.isPrivateHost('169.254.169.254'), true);
eq('public host not private', api.isPrivateHost('example.com'), false);
ok('typosquat link scores worse', api.analyseUrl('https://gooogle.com').score < api.analyseUrl('https://example.com').score);
eq('long url threshold is 120', api.analyseUrl('https://example.com/' + 'a'.repeat(100)).signals.some(s => s.id === 'url.long_url'), false);
eq('over 120 triggers long url', api.analyseUrl('https://example.com/' + 'a'.repeat(120)).signals.some(s => s.id === 'url.long_url'), true);
eq('advisory for private host', api.analyseUrl('http://192.168.0.1/admin').advisories.length, 1);
ok('factual score rewards numbers', api.factualScore('The ministry recorded 1,240 cases in 2024.') > api.factualScore('Things happened recently at some point.'));
ok('factual score penalises hedging', api.factualScore('The report maybe was perhaps wrong.') < api.factualScore('The report recorded 1,240 cases.'));
ok('claims capped at six', api.extractClaims('The ministry recorded 1,240 cases in 2024. '.repeat(10)).length <= 6);

// ---------- determinism ----------
const a1 = JSON.stringify(api.analyseUrl('https://sbi-kyc-verify.xyz/x'));
const a2 = JSON.stringify(api.analyseUrl('https://sbi-kyc-verify.xyz/x'));
eq('url scoring deterministic', a1, a2);
eq('text scoring deterministic', JSON.stringify(api.scoreText('some text here')), JSON.stringify(api.scoreText('some text here')));

// every weight present in the documented table is used somewhere
const documented = ['transport.no_https','transport.https_valid','url.ip_literal_host','url.punycode_host',
  'url.lookalike_domain','url.brand_in_subdomain','url.suspicious_tld','url.excessive_subdomains',
  'url.long_url','url.many_encoded_chars','url.credentials_in_url','url.nonstandard_port',
  'url.encoded_redirect','url.url_shortener'];
eq('all documented weights ported', Object.keys(api.URL_WEIGHTS).sort(), documented.sort());

console.log(fails ? `\n${fails} FAILURE(S)` : 'ALL CLAIMCHECK TESTS PASSED');
process.exit(fails ? 1 : 0);
