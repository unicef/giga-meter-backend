import requests
import pandas as pd
from sqlalchemy import create_engine, exc, text
from config import *
import json

def fetch_data_from_api():
    headers = {'Authorization': f'Bearer {SOURCE_API_TOKEN}'}
    response = requests.get(SOURCE_API, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data

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
    data = data[data['country_code'].notna() & (data['country_code'] != '')]
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

def main():
    api_data = fetch_data_from_api()
    data = api_data['data']
    df = pd.DataFrame(data)
    school_data = df[list(column_mapping.keys())]
    engine = connect_to_db()
    if not engine:
        return

    new_data = check_data_exists(school_data, engine)
    if new_data is not None and not new_data.empty:
        print("New data found, inserting...")
        insert_data(new_data, engine)
    else:
        print("No new data to insert.")

if __name__ == "__main__":
    main()