# Python Utility Script for Syncing API Data with PostgreSQL

This Python utility script fetches data from an API, checks if it exists in a PostgreSQL table, and inserts new records if necessary. It is designed for Python 3.8+ and uses SQLAlchemy for database interactions.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Script](#running-the-script)

## Prerequisites
- **Python 3.8+**: Ensure Python 3.8+ is installed.
- **PostgreSQL**: Ensure you have PostgreSQL installed and running.
- **PIP**: Ensure `pip` is installed for managing Python packages.

## Installation

### 1. How to Install Python 3.8
You can download and install Python 3.8 from the official Python website [here](https://www.python.org/downloads/release/python-380/).

#### On Ubuntu:
```bash
sudo apt update
sudo apt install python3.8
```

### 2. How to Install PIP
```bash
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py
```

#### On Ubuntu:
```bash
sudo apt update
sudo apt-get install python3-pip
```

### 3. How to Install Virtual Environment
#### On Windows,
```bash
pip install virtualenv
use `venv\Scripts\activate`
```

#### On Ubuntu:
```bash
python3 -m venv venv
source venv/bin/activate  
```

### 4. How to Install requirements.txt
```bash
pip install -r requirements.txt
```

## Configuration
#### Edit the config.py file:
Before running the script, configure your settings in the config.py file. 
This file contains variables such as your database connection URL, API URL, lookup fields, and column mappings. For example:
```bash
DATABASE_URL = "postgresql://username:password@localhost:port/proco"
SOURCE_API_URL="source-api-url-which-exposes-schools-data"
SOURCE_API_TOKEN="source-api-token-for-above-api"
SOURCE_API_SKIP_PARAM="page"
SOURCE_API_LIMIT_PARAM="size"
SOURCE_API_SKIP_DEFAULT_VALUE=1
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
```

- DATABASE_URL: is the url of the database like <i>postgresql://username:password@localhost:5432/proco?schema=public</i>.
- SOURCE_API_URL: The base URL for the source API where data can be retrieved.
- SOURCE_API_TOKEN: Token for authenticating requests to the source API. Replace with your actual token.
- SOURCE_API_SKIP_PARAM: The query parameter used for pagination in the source API, indicating which page of results to fetch.
- SOURCE_API_LIMIT_PARAM: The query parameter for specifying the maximum number of results to return in a single API request.
- SOURCE_API_SKIP_DEFAULT_VALUE: The default value for the pagination parameter (usually starts at 1).
- SOURCE_API_LIMIT_DEFAULT_VALUE: The default number of results to return per request (can be adjusted based on API limits).
- SOURCE_LOOKUP_FIELDS: List of fields used to match records from the source data, enabling lookup operations.
- DESTINATION_TABLE: The name of the table in the database where data will be stored.
- DESTINATION_TABLE_LOOKUP_FIELDS: Fields in the destination table that correspond to lookup fields from the source.
- COLUMN_MAPPING: Mapping of columns from the source data to the destination table.
<br/> 
<br/> 
<b>NOTES:</b>
1. As country_code column in school table is a FOREIGN key, please make sure that correct value is passed to it else insert will fail, it accepts country iso 2 code values like IN, AF, etc.
2. In sync_data.py we are processing the data by number of pages, if you want to procees by records then set the <i>skip_by_pages</i> value to FALSE (<i>skip_by_pages=False</i>) at line number 7 in sync_data.py
<br/> 
## Running-the-script
### 5. How to run
```bash
python3 sync_data.py
```
