<div style="padding-top: 20px;"></div>
<a href="https://giga.global/">
    <img src="https://s41713.pcdn.co/wp-content/uploads/2018/11/2020.05_GIGA-visual-identity-guidelines_v1-25.png" alt="Giga logo" title="Giga" align="right" height="60" style="padding-top: 10px;"/>
</a>

<div style="padding-top: 20px;"> </div>
<h1><a id="gigameter" class="anchor" aria-hidden="true" href="#gigablocks"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></path></svg></a>
Giga Meter Backend </h1>

<div align="center" >

![GitHub repo size](https://img.shields.io/github/repo-size/unicef/giga-meter-backend)
![GitHub stars](https://img.shields.io/github/stars/unicef/giga-meter-backend)
![Twitter Follow](https://img.shields.io/twitter/follow/gigaglobal)
![License](https://img.shields.io/github/license/unicef/giga-meter-backend)

</div>

<details open="open">
	<summary style="padding-bottom: 10px;"><h2>Table of Contents</h2></summary>
  <ol>
    <li><a href="#about-giga">About Giga</a></li>
    <li><a href="#about-gigameter">About Giga Meter Backend</a>
    <ul>
        <li><a href="#system-requirements">System Requirements</a></li>
        <li><a href="#giga-meter-repos">Github Repositories of GigaMeter</a></li>
      </ul>
      </li>
	<li>
      <a href="#getting-started">Getting Started</a>
    </li>
    <li><a href="#infrastructure-requirements">Infrastructure Requirements</a></li>
    <li><a href="#docker">Running app with Docker</a></li>
    <li><a href="#code-of-conduct">Code of Conduct</a></li>
    <li><a href="#contribution-guidelines">Contribution Guidelines</a></li>
    <li><a href="#license">License/Legal</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#contributors">Contributors</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>

<h2><a id="about-giga" class="anchor" aria-hidden="true" href="#about-giga"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>About Giga</h2>

Giga is a UNICEF-ITU global initiative to connect every school to the Internet and every young person to information, opportunity, and choice. By connecting all schools to the Internet, we ensure that every child has a fair shot at success in an increasingly digital world.

<h2><a id="about-gigameter" class="anchor" aria-hidden="true" href="#about-gigameter"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
About Giga Meter Backend</h2>

Giga Meter Backend runs with pretty minimal hardware requirements by itself. The most intensive part for the software is when you actually build the software, but once it's running it's relatively lightweight.

Giga Meter Backend works with a very large range of operating systems, as it only requires JavaScript execution to run. Giga Meter Backend is known to work well with Windows, Mac, Linux and BSD. Although they do work well on all of them, for production deployments we would suggest Linux as the ideal platform. Any operating system that runs Node.js should be able to work too, but these are some of the common operating systems that we know work well.

<h3><a id="system-requirements" class="anchor" aria-hidden="true" href="#system-requirements"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
System Requirements </h3>
<p></p>
To run Giga Meter Backend, you need to install a few things. Node.js, Git, and PostgreSQL. We use Prisma for database maintenance, and is one of the dependencies. We won't publish installation guides for these as they have their own resources available on the internet.

<h3><a id="giga-meter-repos" class="anchor" aria-hidden="true" href="#giga-meter-repos"><svg class="octicon octicon-link" align="center" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Github Repositories of Giga Meter </h3>

- [GigaMeter Frontend](https://github.com/unicef/project-connect-daily-check-app)
- [GigaMeter Backend](https://github.com/unicef/giga-meter-backend)
- [Giga – documentation](#)

<h2><a id="getting-started" class="anchor" aria-hidden="true" href="#getting-started"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Getting Started</h2>

### Setup and Running

#### Prerequisites:

- Node Package Manager (npm)
- [Node.js](https://nodejs.org/) 20+
- [PostgreSQL](https://www.postgresql.org/) DB v15+
- [Redis (optional, for caching)](https://redis.io/downloads/)
- [Git](https://git-scm.com/downloads)
- [Docker (optional)](https://docs.docker.com/get-started/get-docker/)

#### Installation

Clone the repository and install required packages to run locally.

1. First, you git clone the repository with the following command, so you have a copy of the code.

```
git clone https://github.com/unicef/giga-meter-backend.git
```

2. Then, go into the directory you just cloned with

```
cd giga-meter-backend
```

and run

```
npm install
```

#### Setup Environment Variables

Create an .env file in root folder and add below variables to run locally (Refer to the .env.example file in this repository as well):

```bash
# Database Configuration
POSTGRES_USER=username
POSTGRES_PASSWORD=test_
POSTGRES_DB=giga_meter_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}

# Application Configuration
PORT=3000
NODE_ENV="environment"

# Authentication & Security
USE_AUTH=false
GIGA_METER_APP_KEY="giga_meter_api_key"
DAILY_CHECK_APP_API_CODE="daily_check_app_api_code"

# External Services
PROJECT_CONNECT_SERVICE_URL="project-connect-service-url"
PCDC_APP_DOWNLOAD_URL="pcdc-app-download-url"

# Cache Configuration
NO_CACHE=TRUE
CACHE_EXPIRE=1

# Optional Services
SENTRY_DSN=
```

- `DATABASE_URL`: PostgreSQL connection string using the above variables, to create a connection URL with the following format: postgresql://username:password@localhost:5432/db_name?schema=public.
- `REDIS_URL`: Redis connection string using the above variables
- `PORT`: The port number on which the application will run. Default is 3000
- `NODE_ENV`: The application environment. Must be either "development" - ideal for local development,  or "production".
- `USE_AUTH`: Set to "true" to enable API authentication with GIGA_METER_APP_KEY.
- `GIGA_METER_APP_KEY`: API key for Giga Meter API application authentication. For local development a default key can be used.
- `DAILY_CHECK_APP_API_CODE`: API code for daily check app used in calling Giga Maps service API. Ideally, it should always DAILY_CHECK_APP but check with the Giga Maps team if this doesn't work.
- `PROJECT_CONNECT_SERVICE_URL`:  Base API URL of the Giga Maps service used for authentication. For Dev, it should be pointed to https://uni-ooi-giga-maps-service-dev.azurewebsites.net
- `PCDC_APP_DOWNLOAD_URL`: URL for downloading the latest version of the Giga Meter Windows application
- `NO_CACHE`: Set to "TRUE" to disable Redis caching
- `CACHE_EXPIRE`: Cache expiration time in hours. Default is 1
- `SENTRY_DSN`: Sentry client key for error tracking and monitoring. Optional

#### Database Setup

##### Create a database using psql

1. Run the commands below in your terminal to create a database if needed.
```bash
psql -U postgres # using the default postgres user
CREATE DATABASE giga_meter;
```

Note** When creating a unique user, make sure that your database user has the proper [permissions](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database#shadow-database-user-permissions) needed to create a Shadow Database for Prisma. 

Use the credentials created here  or your personal credentials to update the DATABASE_URL correctly in the .env file variables, replacing the username, password, and db name. Then generate prisma client to run the database migrations.



#### Database Migration

1. Run below command inside src/prisma folder to generate prisma client

```
npx prisma generate
```

Make the required changes in the prisma.schema file (present inside src/prisma folder).

2. Run below command inside src/prisma folder to migrate database changes

```
npx prisma migrate dev
```


#### Database Seed Data

1. If using your local database, load test data

```bash
npx prisma db seed
```

#### Authentication

You can use our default authentication or add your own custom one.

1. To enable authentication, set USE_AUTH="true" in .env file

```
USE_AUTH="true"
```

The default auth uses project connect service API to validate a Giga Maps generated api key. You can have a look at the logic [here](https://github.com/unicef/giga-meter-backend/blob/58861714ffa21c4eff1ca8ec5e629aba16594dec/src/auth/auth.guard.ts#L15).

2. To use custom auth, you can update the logic in auth.guard.ts file [here](https://github.com/unicef/giga-meter-backend/blob/58861714ffa21c4eff1ca8ec5e629aba16594dec/src/auth/auth.guard.ts#L15).
   You can refer [this](https://docs.nestjs.com/security/authentication#implementing-the-authentication-guard) NestJS documentation for reference.

#### Running API server

Once Development Setup, Setup Environment Variables, Database Setup steps are done, you can run the API server locally.

1. Run below command in the root folder

```
npm run start
```

The app will run locally on http://localhost:3000/ route.

To open Swagger UI documentation for the API, add /api to the url.

To access all endpoints, add /api/all to the url.

### Unit testing

You can run unit tests and check the code coverage after setting up the app locally.
Run tests and coverage

1. Run unit tests

```
npm run test
```

2. Check test coverage

```
npm run test:cov
```

<h2><a id="infrastructure-requirements" class="anchor" aria-hidden="true" href="#infrastructure-requirements"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Infrastructure Requirements</h2>

### Monorepo Structure

The Minimum Infrastructure requirements to self-host Giga Meter Backend is mentioned below:

<b>1. Application Server:</b>

- CPU: 2-4 vCPUs
- RAM: 4-8 GB
- Storage: 20-40 GB SSD
- OS: Ubuntu 18.04 is the minimum, it's recommended to use a more recent version (e.g., Ubuntu 22.04) for better performance, security, and access to the latest features.

<b>2. Database Server (PostgreSQL):</b>

- CPU: 2-4 vCPUs
- RAM: 4-8 GB
- Storage: 50-100 GB SSD
- OS: Ubuntu 18.04 is the minimum, it's recommended to use a more recent version (e.g., Ubuntu 22.04) for better performance, security, and access to the latest features.

<b>3. Networking:</b>

- Restrict access to necessary ports
- HTTPS for secure communication

<b>4. Software Requirements::</b>

- Node.js (20 or later)
- PostgreSQL (15 or later)

### Docker

The Docker configuration for Giga Meter is an effort powered by people within the community. Giga Meter does not provide official support for Docker, but we will accept fixes and documentation. Use at your own risk.

#### Requirements

Make sure you have docker & docker compose installed on the server or system.

Note: docker compose without the hyphen is now the primary method of using docker-compose, per the Docker documentation.

#### Getting Started 

We have added a docker file and docker compose file which can be used to create an image and deploy the app in your infrastructure


#### Build App using Docker Compose

The easiest way to get started running the app is using Docker Compose, which will set up all required services (PostgreSQL, Redis, and the backend) automatically:

1. Update the .env file with the desired database credentials for creation of the db with docker

2. Run the application with the docker compose command:
```bash
docker compose build --no-cache && docker compose up -d
```

3. Seed the database with test data from the cli of your local project directory:
```bash
npm install
npx prisma db seed
```

The application will be available at http://localhost:3000

To stop all services:
```bash
docker compose down -v
```

To view logs:
```bash
docker compose logs -f
```

#### Build App Components using Docker

You can also run each service in its own container as required:

##### Giga Meter Backend Container
```bash
# Build the image
docker build -t giga-meter-backend .

# Run the container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  giga-meter-backend
```

The app will be running on localhost:3000

##### PostgreSQL Container
```bash
docker run -d \
  --name giga-meter-db \
  -e POSTGRES_DB=giga_meter_db\
  -e POSTGRES_USER=<username>\
  -e POSTGRES_PASSWORD=<password>\
  -p 5432:5432 \
  postgres:15
```

The postgresql database will be running on port 5432.
Note: Update your local .env file with the credentials used to create the db, and if using a docker deployed db with a locally deployed giga-meter-backend, make sure to change `POSTGRES_HOST` to `host.docker.internal`.

##### Redis Container
```bash
docker run -d --name giga-meter-redis -p 6379:6379 redis
```

The redis service will be running on port 6379
If using a docker deployed redis instance with a locally deployed giga-meter-backend, make sure to change `REDIS_HOST` to `host.docker.internal`.


<h2><a id="code-of-conduct" class="anchor" aria-hidden="true" href="#code-of-conduct"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Code of Conduct</h2>

At Giga, we're committed to maintaining an environment that's respectful, inclusive, and harassment-free for everyone involved in our project and community. We welcome contributors and participants from diverse backgrounds and pledge to uphold the standards.

[Click here for detailed Code of Conduct](https://github.com/unicef/giga-blocks-documentation/blob/main/versioned_docs/version-1.0/Code-of-Conduct.md)

<h2><a id="contribution-guidelines" class="anchor" aria-hidden="true" href="#contribution-guidelines"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Contribution Guidelines</h2>

Thank you for considering contributing to Giga Meter Backend! We value your input and aim to make the contribution process as accessible and transparent as possible. Whether you're interested in reporting bugs, discussing code, submitting fixes, proposing features, becoming a maintainer, or engaging with the GigaMeter community, we welcome your involvement.

[Click here for detailed Contribution Guidelines](#)

<h2><a id="license" class="anchor" aria-hidden="true" href="#license"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
License / Legal</h2>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.
See [LICENSE](https://github.com/unicef/giga-meter-backend/blob/main/LICENSE) for more information.

For the plain text version please see <https://www.gnu.org/licenses/agpl-3.0.txt>

<h2><a id="contact" class="anchor" aria-hidden="true" href="#contact"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Contact</h2>

GigaMeter Project Lead: Shilpa Arora: sharora@unicef.org

GigaMeter Project Member: Vipul Bhavsar: vbhavsar@unicef.org

Giga Open-Source Community Manager: David Njagah: dnjagah@unicef.org

Giga Website: https://giga.global/contact-us/

<br>

<h2><a id="acknowledgements" class="anchor" aria-hidden="true" href="#acknowledgements"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Acknowledgments💜</h2>

- Thanks to Nagarro for helping build this application!

</div>