DATABASE_URL = "postgresql://username:password@localhost:port/proco"
SOURCE_API_URL="source-api-url"
SOURCE_API_TOKEN="source-api-token"
SOURCE_API_SKIP_PARAM="page"
SOURCE_API_LIMIT_PARAM="size"
SOURCE_API_SKIP_DEFAULT_VALUE=0
SOURCE_API_LIMIT_DEFAULT_VALUE=100
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

# As country_code column in school table is a FOREIGN key, please make sure that correct value is passed to it else insert will fail, it accepts country iso 2 code values like IN, AF, etc.