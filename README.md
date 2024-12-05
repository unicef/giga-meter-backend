<a href="https://giga.global/">
    <img src="https://s41713.pcdn.co/wp-content/uploads/2018/11/2020.05_GIGA-visual-identity-guidelines_v1-25.png" alt="Giga logo" title="Giga" align="right" height="60" style="padding-top: 10px;"/>
</a>

# Giga Meter Backend

<br>

Giga Meter Backend is a NestJS based Web API to expose the Daily Check App data saved from the PCDC desktop application and the MLab chrome extension.

<div align="center">

![Twitter Follow](https://img.shields.io/twitter/follow/gigaglobal)

</div>

## Folder Structure

- /src
  - /admin /country /flagged-school /measurement /messages /school /school-master: contains the API controller, service, dto, and test files for each module.
  - /auth: contains the authentication guard and dto files.
  - /common: contains the common decorator, utils, dto, and mock-object files.
  - /prisma: contains the prisma schema, service, and db migration files.

## Setup and installation

### Prerequisites

It is recommended to use [Node.js](https://nodejs.org/) 20+ and [PostgreSQL](https://www.postgresql.org/) 15+ version for the app setup.

### Setup

Create a .env file in root folder and add below variables to run locally, please check .env.example file for reference:

```bash
DATABASE_URL="database-url"
USE_AUTH="true"
PROJECT_CONNECT_SERVICE_URL="project-connect-service-url"
DAILY_CHECK_APP_API_CODE="daily-check-app-code"
PCDC_APP_DOWNLOAD_URL="pcdc-app-download-url"
SENTRY_DSN="your-sentry-dsn"
```

- DATABASE_URL: is the url of the database like <i>postgresql://username:password@localhost:5432/pcdc?schema=public</i>.
- USE_AUTH: set "true" if APIs should use authentication which uses Giga Maps service API to validate api key generated in Giga Maps generated [here](https://uni-ooi-giga-maps-frontend-dev.azurewebsites.net/docs/explore-api). You can check the current auth logic in auth.guard.ts file which calls [this](https://uni-ooi-giga-maps-service-dev.azurewebsites.net/api/v1/#/Validate%20Api%20Key/get_api_v1_validate_api_key__apiCode_) endpoint.
- PROJECT_CONNECT_SERVICE_URL: Base API URL of the Giga Maps service used for authentication. For Dev, it should be pointed to https://uni-ooi-giga-maps-service-dev.azurewebsites.net
- DAILY_CHECK_APP_API_CODE: API code for daily check app used in calling Giga Maps service API. Ideally, it should always <i>DAILY_CHECK_APP</i> but check with the Giga Maps team if this doesn't work.
- PCDC_APP_DOWNLOAD_URL: Download URL of the latest version of [PCDC](https://github.com/unicef/project-connect-daily-check-app) Windows application.
- SENTRY_DSN: To send data to [Sentry](https://docs.sentry.io/) you will set a client key, usually referred to as the SENTRY_DSN value.

<br />
Install required packages by running below command:

```bash
npm install
```

## Database setup and migration

Please make sure tha DATABASE_URL is set correctly in the .env file above.<br />

### Setup

Run below command(s) in root folder to create the database (if not present already) and the tables:

```bash
npx prisma migrate dev
```

Then run below command(s) in root folder to generate prisma client which is required to run the app locally:

```bash
npx prisma generate
```

### Migration

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

### Seeding

To seed country master table, you can run the INSERT script present [here](https://github.com/unicef/giga-meter-backend/blob/main/src/prisma/scripts/country-insert-script.sql).
<br/>
To seed school master table, you can run the school-master-seeder utility present [here](https://github.com/unicef/giga-meter-backend/tree/main/utility/school-master-seeder). Please have a look at its readme.md file for prerequisites and configuration steps.

## Running the app and unit tests

To run the app:

```bash
# development
npm run start
```

The app will run locally on [localhost:3000](http://localhost:3000/).
<br />
To open Swagger UI documentation for the API, open [http://localhost:3000/api](http://localhost:3000/api).
<br />
To access all endpoints, open [http://localhost:3000/api/all](http://localhost:3000/api/all).

To run the unit tests and check coverage:

```bash
# unit tests
npm run test

# test coverage
npm run test:cov
```

## Build and Deployment

Each commit to `main` branch will trigger a build in [`OOI-Giga-Meter-Backend`](https://unicef.visualstudio.com/OI-Connect/_build?definitionId=1386) pipeline and the Docker image will be pushed to Azure Container Registry as `azure_container_registry/main/giga-meter-backend:build_id`.

The API can be deployed to the following 2 stages in the build generated after commit to `main` branch:

- **Deploy To Development**: The API will be deployed automatially with each successful build.
- **Deploy To Production**: The API can be deployed manually on this stage.

## Legal

GIGA Meter Backend
Copyright (c) UNICEF

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
