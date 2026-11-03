# postgres:15 + the PostGIS extension staging actually runs (confirmed from
# a staging pg_dump: server 15.16, `CREATE EXTENSION IF NOT EXISTS postgis`).
# The official postgres image doesn't ship postgis; this layer installs it
# from the PGDG apt repo the base image already has configured.
FROM postgres:15

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-15-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
