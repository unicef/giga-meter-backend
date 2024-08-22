<a href="https://giga.global/">
    <img src="https://s41713.pcdn.co/wp-content/uploads/2018/11/2020.05_GIGA-visual-identity-guidelines_v1-25.png" alt="Giga logo" title="Giga" align="right" height="60"/>
</a>

# Giga Meter Backend

<br>

Giga Meter Backend is a NestJS based Web API to expose the Daily Check App data saved from the PCDC desktop application and the MLab chrome extension.

<div align="center">

![Twitter Follow](https://img.shields.io/twitter/follow/gigaglobal)

</div>

## Folder Structure
- /src
  - /admin /country /flagged-school /measurement /messages /school: contains the API controller, service, dto, and test files for each module.
  - /auth: contains the authentication guard and dto files.
  - /common: contains the common decorator, utils, dto, and mock-object files.
  - /prisma: contains the prisma schema, service, and db migration files.

## Setup and installation
Create a .env file in root folder and add below variables to run locally:

```bash
DATABASE_URL="database-url"
USE_AUTH="true"
PROJECT_CONNECT_SERVICE_URL="project-connect-service-url"
DAILY_CHECK_APP_API_CODE="daily-check-app-code"
PCDC_APP_DOWNLOAD_URL="pcdc-app-download-url"
SCHOOLS_EXTERNAL_API="school-external-api-url-OR-empty-string"
```

Install required packages by running below command:

```bash
npm install
```

## Database setup and migration

Please make sure tha DATABASE_URL is set correctly in the .env file above like <i>postgresql://username:password@localhost:5432/pcdc?schema=public</i>

Run below command(s) inside src/prisma folder to generate prisma client:

```bash
npx prisma generate
```
<br />
Make the required changes in the prisma.schema file (present inside src/prisma folder).
<br />
Run below command(s) inside src/prisma folder to migrate database changes:

```bash
npx prisma migrate dev
```

## Running the app and unit tests
To run the app:
```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```
The app will run locally on [localhost:3000](http://localhost:3000/).
<br />
To open Swagger UI documentation for the API, add <i>/api</i> to the url.
<br />
To access all endpoints, add <i>/api/all</i> to the url.

To run the unit tests and check coverage:

```bash
# unit tests
npm run test

# test coverage
npm run test:cov
```

## Build

Each commit to ```main``` branch will trigger a build in [```OOI-Giga-Meter-Backend```](https://unicef.visualstudio.com/OI-Connect/_build?definitionId=1386) pipeline and the Docker image will be pushed to Azure Container Registry as ```azure_container_registry/main/giga-meter-backend:build_id```.

## Deployment

The API can be deployed to the following 3 stages with [```OOI-Giga-Meter-Backend```](https://unicef.visualstudio.com/OI-Connect/_release?_a=releases&definitionId=8) deployment pipeline:

- **Development**: The API will be deployed automatially with each successful build for ```main``` branch.
- **Staging**: The API can be deployed by triggering the release manually on this environment.
- **Production**: The API can be deployed manually on this stage but will require approvals.
