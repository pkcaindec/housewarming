# Party: Take Two (reschedule poll)

Friends type their name, tap the Saturdays that work, and save. Typing the same name later loads their picks so they can change them. The tally updates for everyone.

## Deploy on Vercel (about 5 minutes)
1. Put this folder in a GitHub repo (or drag the folder into Vercel with `npx vercel`).
2. In Vercel: Add New > Project > import the repo. Framework preset: "Other". Leave build settings blank. Deploy.
3. In the project: Storage > Create Database > Upstash for Redis (free plan) > Connect to this project.
4. Deployments > ... on the latest one > Redeploy (so it picks up the database settings).
5. Share the `*.vercel.app` link.

## Change the dates
Edit the `DATES` list near the bottom of `public/index.html`.

## Reset all votes
In the Upstash console, delete the key `party-poll:responses`.
