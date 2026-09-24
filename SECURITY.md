# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Use GitHub's private
[security advisory](https://github.com/sultanmaliki/Project-Management-Web-App/security/advisories/new) form instead,
with steps to reproduce and the impact you see. You'll get a response as soon as possible.

## Handling secrets

- Never commit `.env` files or API keys. `.env.example` files are the only ones tracked.
- If a secret is ever committed, **revoke and rotate it immediately** — deleting it from the latest commit does not
  remove it from git history or from anyone who already cloned the repository.
