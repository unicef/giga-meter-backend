<a href="https://giga.global/">
    <img src="https://s41713.pcdn.co/wp-content/uploads/2018/11/2020.05_GIGA-visual-identity-guidelines_v1-25.png" alt="Giga logo" title="Giga" align="right" height="60"/>
</a>

# Giga Meter Backend

<br>

Giga Meter Backend is a NestJS based Web API to expose the Daily Check App data saved from the PCDC desktop application and the MLab chrome extension.

<div align="center">

<!--- These are examples. See https://shields.io for others or to customize this set of shields. You might want to include dependencies, project status and licence info here --->

![Twitter Follow](https://img.shields.io/twitter/follow/gigaglobal)

</div>

## Description

Create a .env file in root folder and add below variables to run locally: <br />
```bash
DATABASE_URL="database-url"
PROJECT_CONNECT_SERVICE_URL="project-connect-service-url"
DAILY_CHECK_APP_API_CODE="daily-check-app-code"
PCDC_APP_DOWNLOAD_URL="pcdc-app-download-url"
```

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
