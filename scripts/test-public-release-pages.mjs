import assert from 'node:assert/strict';

import appAssociationHandler from '../api/app-association.mjs';
import downloadHandler from '../api/download.mjs';
import legalPageHandler from '../api/legal-page.mjs';

process.env.CLUTCH_APPLE_TEAM_ID = 'AB12CD34EF';
process.env.CLUTCH_ANDROID_SHA256_CERT_FINGERPRINTS = Array.from(
  { length: 32 },
  (_, index) => index.toString(16).padStart(2, '0'),
).join(':');
process.env.CLUTCH_SUPPORT_EMAIL = 'support@example.com';
process.env.CLUTCH_IOS_STORE_URL = 'https://apps.apple.com/app/id1234567890';
process.env.CLUTCH_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fabthetap.clutch';

const ios = responseRecorder();
appAssociationHandler(request('/?platform=ios'), ios);
assert.equal(ios.statusCode, 200);
assert.deepEqual(JSON.parse(ios.body), {
  applinks: {
    apps: [],
    details: [{ appID: 'AB12CD34EF.com.fabthetap.clutch', paths: ['/c/*', '/u/*', '/i/*', '/v/*', '/s/*'] }],
  },
});

const android = responseRecorder();
appAssociationHandler(request('/?platform=android'), android);
assert.equal(android.statusCode, 200);
const androidBody = JSON.parse(android.body);
assert.equal(androidBody[0].target.package_name, 'com.fabthetap.clutch');
assert.equal(androidBody[0].target.sha256_cert_fingerprints.length, 1);

const deletion = responseRecorder();
legalPageHandler(request('/?page=deletion'), deletion);
assert.equal(deletion.statusCode, 200);
assert.match(deletion.body, /Supprimer ton compte/);
assert.match(deletion.body, /support%40example.com/);
assert.match(deletion.body, /Ce qui est supprimé/);

const missingPage = responseRecorder();
legalPageHandler(request('/?page=missing'), missingPage);
assert.equal(missingPage.statusCode, 404);

const iosStore = responseRecorder();
downloadHandler(request('/?platform=ios'), iosStore);
assert.equal(iosStore.statusCode, 302);
assert.equal(iosStore.headers.location, 'https://apps.apple.com/app/id1234567890');

const androidStore = responseRecorder();
downloadHandler(request('/?platform=android'), androidStore);
assert.equal(androidStore.statusCode, 302);
assert.match(androidStore.headers.location, /^https:\/\/play\.google\.com\/store\/apps\/details/);

console.log('Public release pages: OK');

function request(url) {
  return { method: 'GET', url, headers: { host: 'clutch.example' } };
}

function responseRecorder() {
  return {
    body: '',
    headers: {},
    statusCode: 200,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body = '') { this.body = String(body); return this; },
    json(body) { this.body = JSON.stringify(body); return this; },
    end(body = '') { this.body = String(body); return this; },
  };
}
