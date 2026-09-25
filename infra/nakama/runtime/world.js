/* SPIKE / NOT PRODUCTION AUTHORITY. ES5 for Nakama's JavaScript VM. */
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
  var allowed = (ctx.env.WORLD_SPIKE_TEST_USER_IDS || '').split(',');
  if (!uuidPattern.test(canonicalId) || allowed.indexOf(canonicalId) === -1) {
    throw { code: 7, message: 'Synthetic account required' };
  }
  var user = nk.authenticateCustom(body.customId, undefined, true);
  var generated = nk.authenticateTokenGenerate(user.userId, user.username, Math.floor(Date.now() / 1000) + 300);
  return JSON.stringify({ userId: user.userId, token: generated.token });
}
function InitModule(ctx, logger, nk, initializer) {
  initializer.registerRpc('emopet_bootstrap', bootstrap);
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
