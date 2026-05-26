import test from "node:test";
import assert from "node:assert/strict";
import { resolveLaunchManagerExposure } from "../scripts/launch-manager/config.mjs";
import { isValidControlToken, readControlToken } from "../scripts/launch-manager/server.mjs";
import { managerHtml } from "../scripts/launch-manager/ui.mjs";

test("Launch Manager stays loopback by default and requires explicit LAN opt-in", () => {
  assert.deepEqual(
    resolveLaunchManagerExposure({ host: "127.0.0.1", env: {} }),
    {
      host: "127.0.0.1",
      mode: "loopback",
      loopback: true,
      lan: false,
      controlToken: "",
      controlTokenRequired: false,
      controlTokenConfigured: false,
      postApiEnabled: true,
      warning: ""
    }
  );

  assert.throws(
    () => resolveLaunchManagerExposure({ host: "0.0.0.0", env: {} }),
    /must be loopback by default/
  );

  const exposure = resolveLaunchManagerExposure({
    host: "0.0.0.0",
    env: { LAUNCH_MANAGER_ALLOW_LAN: "1", LAUNCH_MANAGER_CONTROL_TOKEN: "show-token" }
  });
  assert.equal(exposure.mode, "lan");
  assert.equal(exposure.controlTokenRequired, true);
  assert.equal(exposure.controlTokenConfigured, true);
  assert.equal(exposure.postApiEnabled, true);
});

test("control token helpers accept explicit headers and bearer tokens only", () => {
  assert.equal(
    readControlToken({ headers: { "x-control-token": " show-token " } }),
    "show-token"
  );
  assert.equal(
    readControlToken({ headers: { authorization: "Bearer show-token" } }),
    "show-token"
  );
  assert.equal(isValidControlToken("show-token", "show-token"), true);
  assert.equal(isValidControlToken("wrong-token", "show-token"), false);
  assert.equal(isValidControlToken("", "show-token"), false);
});

test("Launch Manager UI renders a LAN exposure warning and token field", () => {
  const html = managerHtml({
    title: "Test Manager",
    nonce: "test-nonce",
    networkExposure: {
      mode: "lan",
      lan: true,
      controlTokenRequired: true,
      controlTokenConfigured: true,
      warning: "LAN公開中です。"
    }
  });

  assert.match(html, /LAN公開中/);
  assert.match(html, /id="control-token"/);
  assert.doesNotMatch(html, /<script(?! nonce="test-nonce")/);
});

test("Launch Manager UI makes initial and startup loading states visible", () => {
  const html = managerHtml({
    title: "Test Manager",
    nonce: "test-nonce"
  });

  assert.match(html, /id="startup-notice"/);
  assert.match(html, /状態を読み込んでいます/);
  assert.match(html, /起動確認中/);
  assert.match(html, /残り目安/);
});
