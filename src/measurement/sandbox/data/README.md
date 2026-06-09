# Sandbox seed CSVs

This directory holds the per-country health-center CSVs consumed by
`../seed.ts` to regenerate `../fixtures.measurements.json`.

The CSV files themselves are **not** checked into the repo (see the
project `.gitignore`). The committed `fixtures.measurements.json` is
the source of truth shipped with the application — the CSVs are only
needed by maintainers who want to re-run the seed.

## Expected files

| File      | Country      | ISO3 → ISO2 |
| --------- | ------------ | ----------- |
| `uzb.csv` | Uzbekistan   | UZB → UZ    |
| `zaf.csv` | South Africa | ZAF → ZA    |
| `sle.csv` | Sierra Leone | SLE → SL    |

## Required columns

The parser needs a header row and a `health_id_giga` column populated
on every row that should produce measurements. All other columns are
ignored. The current CSVs are exports from the Giga health-sites
dataset (`healthsites.io` / `Health Connect`); any source that includes
a `health_id_giga` column will work.

## Re-running the seed

```bash
# from repo root
npx ts-node src/measurement/sandbox/seed.ts
```

To extend coverage, drop another `<iso3>.csv` here, add a matching
entry to `COUNTRIES` in `seed.ts`, re-run, and commit the regenerated
JSON.
