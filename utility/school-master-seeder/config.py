DATABASE_URL = "postgresql://test:test@localhost:7432/proco"
DEFAULT_COUNTRY_CODE = "AF"
SOURCE_API="source-api-url"
SOURCE_API_TOKEN="source-api-token"
SOURCE_LOOKUP_FIELDS=["giga_id_school",]
DESTINATION_TABLE="school"
DESTINATION_TABLE_LOOKUP_FIELDS=["giga_id_school",]
column_mapping={
    'school_id': 'external_id',
    'school_name': 'name',
    'longitude': 'geopoint',
    'education_level': 'education_level',
    'giga_id_school': 'giga_id_school',
}