/* World Nakama runtime. local-spike and reviewed release modes remain explicitly separated. ES5 for Nakama's JavaScript VM. */
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var identityPrefix = 'emopet:world-spike:v1:';
function denyClientAuth() { throw { code: 7, message: 'EMOPET bootstrap required' }; }
function bootstrap(ctx, logger, nk, payload) {
  // Nakama verifies runtime.http_key before dispatch; user-session RPCs are forbidden.
  if (ctx.userId) throw { code: 7, message: 'Server-to-server only' };
  var body = JSON.parse(payload);
  if (!body || Object.keys(body).length !== 1 || typeof body.customId !== 'string' || body.customId.indexOf(identityPrefix) !== 0) {
    throw { code: 3, message: 'Invalid bootstrap' };
  }
  var canonicalId = body.customId.substring(identityPrefix.length);
  var mode = ctx.env.EMOPET_WORLD_RUNTIME_MODE || 'local-spike';
  if (mode !== 'local-spike' && mode !== 'release') {
    throw { code: 7, message: 'World runtime mode denied' };
  }
  if (!uuidPattern.test(canonicalId)) {
    throw { code: 7, message: 'Canonical EMOPET identity required' };
  }
  if (mode === 'local-spike') {
    // Local acceptance remains limited to explicitly configured synthetic accounts.
    var allowed = (ctx.env.WORLD_SPIKE_TEST_USER_IDS || '').split(',').map(function (id) { return id.trim().toLowerCase(); });
    if (allowed.indexOf(canonicalId) === -1) {
      throw { code: 7, message: 'Synthetic account required' };
    }
  }
  // Release eligibility remains canonical backend authority. This RPC is server-to-server
  // under Nakama's runtime HTTP key and never accepts a client session.
  var user = nk.authenticateCustom(body.customId, undefined, true);
  var generated = nk.authenticateTokenGenerate(user.userId, user.username, Math.floor(Date.now() / 1000) + 300);
  return JSON.stringify({ userId: user.userId, token: generated.token });
}
function deleteAccount(ctx, logger, nk, payload) {
  // Account erasure (#48 L6): server-to-server only, like bootstrap.
  if (ctx.userId) throw { code: 7, message: 'Server-to-server only' };
  var body = JSON.parse(payload);
  if (!body || Object.keys(body).length !== 1 || typeof body.customId !== 'string' || body.customId.indexOf(identityPrefix) !== 0
    || !uuidPattern.test(body.customId.substring(identityPrefix.length))) {
    throw { code: 3, message: 'Invalid deletion' };
  }
  // No allowlist check: a person removed from the pilot projection must still be erasable.
  var user;
  try { user = nk.authenticateCustom(body.customId, undefined, false); } catch (error) { return JSON.stringify({ deleted: false }); }
  // Not recorded: no tombstone keeps the erased person's Nakama id.
  nk.accountDeleteId(user.userId, false);
  return JSON.stringify({ deleted: true });
}
function InitModule(ctx, logger, nk, initializer) {
  initializer.registerRpc('emopet_bootstrap', bootstrap);
  initializer.registerRpc('emopet_delete_account', deleteAccount);
  // Prevent public custom-ID authentication/linking from impersonating the mapping.
  initializer.registerBeforeAuthenticateCustom(denyClientAuth);
  initializer.registerBeforeLinkCustom(denyClientAuth);
  initializer.registerBeforeUnlinkCustom(denyClientAuth);
  initializer.registerBeforeAuthenticateDevice(denyClientAuth);
  initializer.registerBeforeAuthenticateEmail(denyClientAuth);
  initializer.registerBeforeAuthenticateApple(denyClientAuth);
  initializer.registerBeforeAuthenticateFacebook(denyClientAuth);
  initializer.registerBeforeAuthenticateFacebookInstantGame(denyClientAuth);
  initializer.registerBeforeAuthenticateGameCenter(denyClientAuth);
  initializer.registerBeforeAuthenticateGoogle(denyClientAuth);
  initializer.registerBeforeAuthenticateSteam(denyClientAuth);
  // No refresh credential is issued. Renewal goes back through Hono bootstrap.
}
