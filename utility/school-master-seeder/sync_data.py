import requests
import pandas as pd
from sqlalchemy import create_engine, exc, text
from config import *
import json

def fetch_data_from_api(engine, skip_by_pages=True):
    skip = SOURCE_API_SKIP_DEFAULT_VALUE
    limit = SOURCE_API_LIMIT_DEFAULT_VALUE
    has_records = True

    while has_records:
        api_url = f"{SOURCE_API_URL}?{SOURCE_API_SKIP_PARAM}={skip}&{SOURCE_API_LIMIT_PARAM}={limit}"
        headers = {'Authorization': f'Bearer {SOURCE_API_TOKEN}'}
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if not data.get('data'):
                break

            df = pd.DataFrame(data['data'])
            process_data(df[list(column_mapping.keys())], engine)
            has_records = len(data['data']) >= limit
            if skip_by_pages:
                skip += 1  # Skip the number of pages
            else:
                skip += limit # Skip the number of records
        else:
            print("No more data found.")
            has_records = False

def get_next_id(engine):
    max_id_query = text(f"SELECT COALESCE(MAX(id), 0) AS max_id FROM {DESTINATION_TABLE}")
    try:
        with engine.connect() as connection:
            result = connection.execute(max_id_query).fetchone()
            next_id = result[0] + 1
            return next_id
    except exc.SQLAlchemyError as e:
        print(f"Error fetching max id: {e}")

def check_data_exists(data, engine):
    try:
        if 'country_code' not in data.columns:
            raise ValueError("The 'country_code' column is missing from the provided data.")

        filtered_data = data[data['country_code'].notna() & (data['country_code'] != '')]
        existing_data = pd.read_sql(
            f"SELECT {', '.join(DESTINATION_TABLE_LOOKUP_FIELDS)} FROM {DESTINATION_TABLE}",
            engine
        )

        for id_source_field, id_dest_field in zip(SOURCE_LOOKUP_FIELDS, DESTINATION_TABLE_LOOKUP_FIELDS):
            if id_source_field not in filtered_data.columns:
                raise ValueError(f"Source field '{id_source_field}' is missing in the data.")

            if filtered_data[id_source_field].isnull().any():
                raise ValueError(f"Source field '{id_source_field}' contains null values.")

            if existing_data[id_dest_field].isnull().any():
                raise ValueError(f"Destination field '{id_dest_field}' contains null values.")

            new_data = filtered_data[~filtered_data[id_source_field].isin(existing_data[id_dest_field])]

            if not new_data.empty:
                break

        return new_data
    except Exception as ex:
        print(f"Error in check_data_exists: {ex}")

def insert_data(data, engine):
    data = data.rename(columns=column_mapping)
    if 'feature_flags' in data.columns:
        data['feature_flags'] = data['feature_flags'].apply(json.dumps)
    data.to_sql(DESTINATION_TABLE, engine, index=False, if_exists="append")

def connect_to_db():
    try:
        engine = create_engine(DATABASE_URL)
        print("Connected to database successfully!")
        return engine
    except exc.SQLAlchemyError as e:
        print(f"Error connecting to database: {e}")

def process_data(df, engine):
    if 'country_code' not in df.columns:
        print("Error: 'country_code' column is missing from the DataFrame.")
        return

    new_data_to_insert = pd.DataFrame()
    rows_with_missing_country_code = 0

    for index, row in df.iterrows():
        row_df = pd.DataFrame([row])

        if pd.isna(row['country_code']) or row['country_code'] == '':
            print(f"Skipping record with index: {index} due to missing 'country_code'.")
            rows_with_missing_country_code += 1
            continue

        new_data = check_data_exists(row_df, engine)
        if new_data is not None and not new_data.empty:
            new_data_to_insert = pd.concat([new_data_to_insert, new_data], ignore_index=True)

    if rows_with_missing_country_code > 0:
        user_input = input("country_code not found in some API responses. Do you want to continue with the insertion of valid records? (y/n): ")
        if user_input.lower() != 'y':
            print("Aborting the insertion of records.")
            return

    if not new_data_to_insert.empty:
        print("New data found, inserting...")
        insert_data(new_data_to_insert, engine)
    else:
        print("No new data to insert.")

def main():
    engine = connect_to_db()
    if not engine:
        return
    fetch_data_from_api(engine)

if __name__ == "__main__":
    main()