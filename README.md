<div style="padding-top: 20px;">
<a href="https://giga.global/">
    <img src="https://s41713.pcdn.co/wp-content/uploads/2018/11/2020.05_GIGA-visual-identity-guidelines_v1-25.png" alt="Giga logo" title="Giga" align="right" height="60"/>
</a>

<div style="padding-top: 40px;"> </div>
<h1><a id="gigameter" class="anchor" aria-hidden="true" href="#gigablocks"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
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
To run Giga Meter Backend, you need to install a few things. Node.js, Git, and PostgreSQL. We use Prisma for database maintenance, and is one of the dependencies. We won’t publish installation guides for these as they have their own resources available on the internet.

<h3><a id="giga-meter-repos" class="anchor" aria-hidden="true" href="#giga-meter-repos"><svg class="octicon octicon-link" align="center" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Github Repositories of Giga Meter </h3>

- [GigaMeter Frontend](https://github.com/unicef/project-connect-daily-check-app)
- [GigaMeter Backend](https://github.com/unicef/giga-meter-backend)
- [Giga – documentation](#)

<h2><a id="getting-started" class="anchor" aria-hidden="true" href="#getting-started"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg></a>
Getting Started</h2>

### Setup and Running

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

Create an .env file in root folder and add below variables to run locally:

1. Set database url equal to the prisma connection string

```
DATABASE_URL="postgresql://username:password@localhost:5432/pcdc?schema=public"
```

#### Database Setup

Once the DATABASE_URL is set correctly in the .env file variables, generate prisma client to run the app locally.

1. Run below command inside src/prisma folder to generate prisma client

```
npx prisma generate
```

#### Database Migration

Make the required changes in the prisma.schema file (present inside src/prisma folder).

1. Run below command inside src/prisma folder to migrate database changes

```
npx prisma migrate dev
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

We have added a docker file which can be used to create an image and deploy the app in your infrastructure. You can have a look at the file here.

#### Building Docker Image

Building docker image is quite straight forward and can be done using the following command

```
docker build -f Dockerfile -t repo:tag
```

##### Deployment

The application is running on port 3000. The following command runs the docker container on port 3000

```
docker run -d -p 3000:3000 -e
DAILY_CHECK_APP_API_CODE=DAILY_CHECK_APP -e
DATABASE_URL=YOUR_POSTGRES_DATABASE_CONNECTION_STRING -e
PCDC_APP_DOWNLOAD_URL=PCDC_APP_DOWNLOAD_URL -e
PROJECT_CONNECT_SERVICE_URL=PROJECT_CONNECT_SERVICE_URL -e
USE_AUTH=true_or_false image_repo:tag
```

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
