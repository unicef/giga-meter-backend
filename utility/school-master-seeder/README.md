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
DEFAULT_COUNTRY_CODE = "AF"
SOURCE_API="source-api-url-which-exposes-schools-data"
SOURCE_API_TOKEN="source-api-token-for-above-api"
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
```

## Running-the-script
### 5. How to run
```bash
python3 file_name.py
```



