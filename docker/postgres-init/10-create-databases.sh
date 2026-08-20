#!/bin/bash
# Runs once on a fresh volume. POSTGRES_DB (better_sleep) already exists;
# create the integration-test databases.
set -euo pipefail

# better_test_b is the second database of the content export/import round-trip
# test (also created on demand by the spec itself for existing volumes).
for db in better_test better_test_b; do
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
		-c "CREATE DATABASE $db OWNER $POSTGRES_USER;"
done
