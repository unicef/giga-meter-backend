# Setup development environment

Prerequisites:

- Node Package Manager (npm)
- Node.js 20+
- PostgresSQL DB v15+

# Technology Stack

- NestJs
- PostgresSQL
- Prisma ORM

# To start developing:

## Pull Requests

Every pull requests should contain tests to coverage the functionality.

- Coverage of 80% on written lines is required in order to merge.
- One review is needed before merging PRs

## Get started

1. Install required packages using npm `npm install`
2. Please make sure tha DATABASE_URL is set correctly in the .env file above then run `npx prisma migrate dev` to create the database (if not present already) and the tables.
3. Run command `npx prisma generate` in root folder to generate prisma client which is required to run the app locally.
4. Make sure to set up environment variables:

```
DATABASE_URL="database-url"
USE_AUTH="true"
PROJECT_CONNECT_SERVICE_URL="project-connect-service-url"
DAILY_CHECK_APP_API_CODE="daily-check-app-code"
PCDC_APP_DOWNLOAD_URL="pcdc-app-download-url"
SENTRY_DSN="your-sentry-dsn"
```

5. Test by running the app using $`npm run start` and opening the url http://localhost:3000/api, you will see the swagger page with 3 endpoints. To access all endpoints, open http://localhost:3000/api/all.

## Database migration:

Make the required changes in the prisma.schema file (present inside src/prisma folder). <br />
Run below command(s) in root folder to migrate database changes:

```bash
npx prisma migrate dev
```

<i>NOTE: Please make sure to commit the database migration file generated inside prisma/migrations folder to move the change to Dev and further environments.</i>

Then run below command(s) in root folder to re-generate prisma client to reflect the changes in schema:

```bash
npx prisma generate
```

## Databse seeding:

To seed country master table, you can run the INSERT script present [here](https://github.com/unicef/giga-meter-backend/blob/main/src/prisma/scripts/country-insert-script.sql).
<br/>
To seed school master table, you can run the school-master-seeder utility present [here](https://github.com/unicef/giga-meter-backend/tree/main/utility/school-master-seeder). Please have a look at its readme.md file for prerequisites and configuration steps.

## Code quality

To enhance readability of code and increase code standards we use the following

- prettier - https://prettier.io/
