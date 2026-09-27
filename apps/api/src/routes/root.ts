import { Router } from 'express';
import type { Links } from '@hourly/shared';
import { viewer } from '../lib/actor.js';
import { paths } from '../lib/links.js';

export const rootRouter: Router = Router();

/**
 * GET / (that is, `/api`) - the entry point of the API.
 *
 * A client that knows only this one address can find every other one by
 * following links, which is what makes the API navigable rather than a list
 * of URLs to hard-code. What is offered depends on the caller: a guest gets
 * the marketplace and the way in, a signed-in user their own collections, the
 * administrator the user list as well.
 */
rootRouter.get('/', (req, res) => {
  const who = viewer(req);

  const links: Links = {
    self: { href: '/api' },
    marketplace: { href: '/api/projects?scope=marketplace' },
    docs: { href: '/api/docs' },
    openapi: { href: '/api/openapi.json' },
  };

  if (who === null) {
    links.register = { href: '/api/auth/register', method: 'POST' };
    links.login = { href: '/api/auth/login', method: 'POST' };
  } else {
    links.me = { href: '/api/auth/me' };
    links.profile = { href: paths.user(who.userId) };
    links.tasks = { href: '/api/tasks' };
    links.logout = { href: '/api/auth/logout', method: 'POST' };

    if (who.role === 'CLIENT') {
      links.projects = { href: '/api/projects?scope=owned' };
      links['create-project'] = { href: '/api/projects', method: 'POST' };
    }
    if (who.role === 'SPECIALIST') {
      links.projects = { href: '/api/projects?scope=assigned' };
      links.sessions = { href: '/api/sessions' };
      links.proposals = { href: '/api/proposals' };
      links['create-project'] = { href: '/api/projects', method: 'POST' };
    }
    if (who.role === 'ADMIN') {
      links.projects = { href: '/api/projects?scope=all' };
      links.users = { href: '/api/users' };
    }
  }

  res.json({ name: 'Hourly API', _links: links });
});
