# WorkQuiz / Bored@Work

Office tournament voting app with three public surfaces:

- `/` landing page
- `/voting` public voting page
- `/admin` admin portal

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Persistence

Production must use Postgres persistence. Set `DATABASE_URL` on Railway before deploying. The app refuses to use file storage in production unless `WORKQUIZ_ALLOW_FILE_STORE=true` is explicitly set, because file storage can be wiped by redeploys.

Local development and tests can still use `data/workquiz.json` when `DATABASE_URL` is not set.

## Round Start Pings

Set `WORKQUIZ_ROUND_START_PING_URL` to send a GET ping when a public tournament round starts. The app records round ping state in the bracket store so status checks and redeploys do not spam repeated messages.

## Migrating Existing JSON Data

After provisioning Railway Postgres and setting `DATABASE_URL`, migrate any existing JSON store before deploying:

```bash
npm run migrate:postgres
```

You can pass a custom JSON path if needed:

```bash
npm run migrate:postgres -- path/to/workquiz.json
```

## Railway Cutover Checklist

Do not deploy while a tournament is live.

1. Confirm no tournament is live.
2. Provision Railway Postgres.
3. Set `DATABASE_URL` on the app service.
4. Run `npm run migrate:postgres` against the Railway database if there is JSON data to preserve.
5. Deploy.
6. Verify `/api/status`, `/voting`, `/admin`, vote submission, and round advancement.
