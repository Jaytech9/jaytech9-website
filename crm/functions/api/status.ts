// GET /api/status → which services are set up (shown in Settings). Never returns the keys themselves.
import type { Ctx } from '../_lib/env';
import { json } from '../_lib/http';

export const onRequestGet = (ctx: Ctx) =>
  json({
    database: true,
    signIn: !!(ctx.env.ACCESS_TEAM_DOMAIN && ctx.env.ACCESS_AUD),
    website: !!ctx.env.WEBSITE_DEPLOY_HOOK,
    sms: !!ctx.env.ARKESEL_API_KEY,
    email: !!ctx.env.RESEND_API_KEY,
  });
