# Category-Based Access Control System

This system provides a robust way to control access to API endpoints and filter responses based on user categories.

## Key Features

1. **Category-Based API Access Control**: Restrict which endpoints are accessible to different user categories.
2. **Response Field Filtering**: Automatically filter response data based on user category.
3. **Category-Specific Swagger Documentation**: Generate separate API docs for each category, showing only the endpoints they can access.
4. **Customizable Configuration**: Easily modify access rules and response filters.

## Configuration

The entire category system is configured in `category.config.ts`, which contains:

```typescript
export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  public: {
    allowedAPIs: [
      // List of APIs public users can access
      { url: '/api/v1/measurements', methods: ['GET'] }
    ],
    notAllowedAPIs: null,
    responseFilters: {
      exclude: ['internalId', 'createdBy', 'updatedBy', 'sensitiveData']
    },
    swagger: {
      visible: true,
      title: 'GIGA Meter Public API',
      description: 'Public access API endpoints for GIGA Meter data'
    }
  },
  // Other categories...
}
```

### Main Configuration Options

1. **API Access Control**:
   - `allowedAPIs`: List of endpoints this category can access
   - `notAllowedAPIs`: List of endpoints this category cannot access (overrides allowedAPIs)

2. **Response Filtering**:
   - `responseFilters.include`: List of fields that should be included in responses (all other fields will be removed)
   - `responseFilters.exclude`: List of fields that should be excluded from responses (only used if include is not specified)

3. **Swagger Configuration**:
   - `swagger.visible`: Whether this category should have Swagger documentation
   - `swagger.title`: Custom title for this category's Swagger docs
   - `swagger.description`: Custom description for this category's Swagger docs

## Usage

### Accessing the API with a Category

Users can specify their category in multiple ways (in order of precedence):

1. **From Auth Service**:
   The API key validation from `/api/v1/validate_api_key/` endpoint will return a category that automatically sets the user's access level. This is the preferred and most secure method.

The category determines what endpoints the user can access and what fields they can see in responses.

### Restricting Endpoints to Specific Categories

Use the `RequiredCategories` decorator to restrict access to specific categories:

```typescript
@Get('admin-only')
@RequiredCategories('admin')
getAdminOnlyData() {
  // Only accessible to admin category
}

@Get('government-or-admin')
@RequiredCategories('gov', 'admin')
getGovernmentData() {
  // Accessible to gov and admin categories
}
```

### Accessing Category in Controllers

Use the `Category` decorator to get the current category:

```typescript
@Get()
getWithCategory(@Category() category: string) {
  console.log(`Request from ${category} category`);
  
  // You can use this to implement custom logic based on category
  if (category === 'admin') {
    // Add admin-specific logic
  }
}
```

## How It Works

1. **CategoryGuard**:
   - Validates whether the user's category can access the requested endpoint
   - Extracts the category from headers, JWT, or query parameters

2. **CategoryResponseInterceptor**:
   - Filters response data to remove fields that shouldn't be visible to the current category
   - Uses `responseFilters` from the category config

3. **Swagger Integration**:
   - Filters the Swagger documentation to only show endpoints accessible to each category
   - Creates separate Swagger endpoints for each category

## Extending the System

### Adding a New Category

To add a new category, update the `CATEGORIES` array and add a new entry to `DEFAULT_CATEGORY_CONFIG`:

```typescript
export const CATEGORIES = ['public', 'gov', 'admin', 'newCategory'];

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  // Existing categories...
  newCategory: {
    allowedAPIs: [...],
    notAllowedAPIs: null,
    responseFilters: {
      exclude: ['field1', 'field2']
    },
    swagger: {
      visible: true,
      title: 'New Category API',
      description: 'API for the new category'
    }
  }
}
```

### Dynamic Configuration

You can update the category configuration at runtime using the `updateCategoryConfig` function:

```typescript
import { updateCategoryConfig } from './common/category.config';

// Example: Modify the config based on external settings
const newConfig = fetchConfigFromDatabase();
updateCategoryConfig(newConfig);

```

### Response Filtering

You can filter response data based on the user's category:

```typescript
import { CATEGORY_CONFIG } from './common/category.config';

// In your category config
export const CATEGORY_CONFIG = {
  public: {
    // ...
    responseFilters: {
      // Global fields to exclude for all endpoints
      exclude: ['sensitiveData', 'internalId', 'createdBy', 'updatedBy'], 
      
      // Endpoint-specific filters
      endpoints: {
        '/api/v1/schools': {
          // Exclude specific fields for this endpoint only
          exclude: ['contact.email', 'location.coordinates']
        },
        '/api/v1/measurements': {
          // Only include these fields (all others will be excluded)
          include: ['id', 'schoolId', 'data.summary', 'tags[]']
        }
      }
    }
  }
};
```

#### Path Notation for Filtering

The response filtering system supports dot notation to target nested fields and array items:

1. **Simple Properties**: 
   ```
   'fieldName'  // Targets a top-level property
   ```

2. **Nested Object Properties**:
   ```
   'user.address.street'  // Targets user.address.street
   ```

3. **Array Items**:
   ```
   'items[]'      // Targets the entire items array
   'items[].id'   // Targets the id property of each object in the items array
   ```

4. **Deeply Nested Paths**:
   ```
   'data.readings[].measurements.value'  // Targets value in each measurement in each reading
   ```

When configuring filters:
- If you include a parent object or array, all its nested properties remain
- If you exclude a parent object or array, all its nested properties are removed
- You can selectively include/exclude specific deep paths
