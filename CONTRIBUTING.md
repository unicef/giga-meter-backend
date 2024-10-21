# Setup development environment

Prerequisites:

- Node Package Manager (npm)
- [Node.js](https://nodejs.org/) 20+
- [PostgreSQL](https://www.postgresql.org/) DB v15+

# Technology Stack

- NestJs
- PostgresSQL
- Prisma ORM

# To start developing:

## Pull Requests

Every pull requests should contain tests to coverage the functionality.

- All the test cases should pass in order to merge.
- One review is needed before merging PRs

## Folder Structure

- /src
  - /admin /country /flagged-school /measurement /messages /school /school-master: contains the API controller, service, dto, and test files for each module.
  - /auth: contains the authentication guard and dto files.
  - /common: contains the common decorator, utils, dto, and mock-object files.
  - /prisma: contains the prisma schema, service, and db migration files.

## Get started

1. Install required packages using npm `npm install`

2. Create a .env file in root folder and add below variables to run locally, please check .env.example file for reference::

```bash
DATABASE_URL="database-url"
USE_AUTH="true"
PROJECT_CONNECT_SERVICE_URL="project-connect-service-url"
DAILY_CHECK_APP_API_CODE="daily-check-app-code"
PCDC_APP_DOWNLOAD_URL="pcdc-app-download-url"
SENTRY_DSN="your-sentry-dsn"
```

- DATABASE_URL: is the url of the database like <i>postgresql://username:password@localhost:5432/pcdc?schema=public</i>.
- USE*AUTH: set "true" if APIs should use authentication which uses Giga Maps service API to validate api key generated in Giga Maps generated [here](https://uni-ooi-giga-maps-frontend-dev.azurewebsites.net/docs/explore-api). You can check the current auth logic in auth.guard.ts file which calls [this](https://uni-ooi-giga-maps-service-dev.azurewebsites.net/api/v1/#/Validate%20Api%20Key/get_api_v1_validate_api_key__apiCode*) endpoint.
- PROJECT_CONNECT_SERVICE_URL: Base API URL of the Giga Maps service used for authentication. For Dev, it should be pointed to https://uni-ooi-giga-maps-service-dev.azurewebsites.net
- DAILY_CHECK_APP_API_CODE: API code for daily check app used in calling Giga Maps service API. Ideally, it should always <i>DAILY_CHECK_APP</i> but check with the Giga Maps team if this doesn't work.
- PCDC_APP_DOWNLOAD_URL: Download URL of the latest version of [PCDC](https://github.com/unicef/project-connect-daily-check-app) Windows application.
- SENTRY_DSN: To send data to [Sentry](https://docs.sentry.io/) you will set a client key, usually referred to as the SENTRY_DSN value.

3. Please make sure tha DATABASE_URL is set correctly in the .env file above then run `npx prisma migrate dev` to create the database (if not present already) and the tables.

4. Run command `npx prisma generate` in root folder to generate prisma client which is required to run the app locally.

5. Test by running the app using $`npm run start` and opening the url http://localhost:3000/api, you will see the swagger page with 3 endpoints. To access all endpoints, open http://localhost:3000/api/all.
6. Run the unit tests using `npm run test` and check code coverage `npm run test:cov`

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

## Data seeding:

To seed country master table, you can run the INSERT script present [here](https://github.com/unicef/giga-meter-backend/blob/main/src/prisma/scripts/country-insert-script.sql).
<br/>
To seed school master table, you can run the school-master-seeder utility present [here](https://github.com/unicef/giga-meter-backend/tree/main/utility/school-master-seeder). Please have a look at its readme.md file for the prerequisites and configuration steps.

## Code quality

To enhance readability of code and increase code standards we use the following

- prettier - https://prettier.io/
