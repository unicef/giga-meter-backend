DATABASE_URL = "postgresql://username:password@localhost:port/proco"
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
    'country_code': 'country_code',
}

# As country_code column in school table is a FOREIGN key, please make sure that correct value is passed to it else insert will fail