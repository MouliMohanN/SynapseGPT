# Naming Conventions

## General Principles

- Use descriptive and meaningful names
- Avoid abbreviations unless they are widely understood
- Be consistent across the codebase
- Prioritize readability over brevity
- Use names that reveal intention
- Choose names that make the code self-documenting

### Folder names to be in camelCase.

```
Ex: homeScreen
```

### File names to be in PascalCase.

```
Ex: HomeScreen.tsx, Constants.ts

*** Note ***
- Exception: Use lowercase for `index.ts` files.
************
```

### Component Names

- Use PascalCase for React component names

```typescript
export const HomeScreenComponent = () => {
    return (
        <></>
    )
}
```

### Types, Interfaces, Classes, and Enums

- Use PascalCase for types, interfaces, classes, and enum names

```typescript
type HomeScreenProps = {};
interface UserData {}
class UserManager {}
enum UserRole {}
```

### Variables/function names to be in camelCase.

```typescript
const mobileNumber;
const getMobileNumber = () => {};
```

### Constants/Enums keys to be in UPPERCASE_SNAKE_CASE

```typescript
export const USER_DETAILS_KEY = 'UserDetailsKey';
```

### File Extensions

- Use .tsx for files containing JSX (React components)
- Use .ts for files containing only TypeScript (no JSX)

### Custom Hooks and Higher Order Components (HOCs)

- Use camelCase and prefix with use for custom hooks
- Use PascalCase for HOCs

```typescript
export const useAuth = () => {};
export const WithAuth = (WrappedComponent) => {};
```

### Thumb Rules

- Use full, descriptive names for variables and functions
- Strictly avoid shorthand and temporary names
- Prefix boolean variables or functions with "is", "has", or "should"

```typescript
const isLoading: boolean;
const hasPermission: boolean;
```

- Use verb phrases for function names that perform actions

```typescript
function getUserData() {}
function updateUserProfile() {}
```

- Avoid redundant prefixes or suffixes in names within a context

```typescript
// Bad
interface UserInterface {}
class UserClass {}

// Good
interface User {}
class User {}
```

- Use plural forms for arrays and collections

```typescript
const users: User[] = [];
const fruitList: string[] = ['apple', 'banana'];
```

- Use noun phrases for object, variable, and class names

```typescript
const userProfile = {};
class DatabaseConnection {}
```

- Avoid using magic numbers; use named constants instead

```typescript
// Bad
if (user.age > 18) {
}

// Good
const LEGAL_ADULT_AGE = 18;
if (user.age > LEGAL_ADULT_AGE) {
}
```

- Use meaningful names for generic types

```typescript
// Bad
function process<T>(input: T): T {}

// Good
function process<InputType>(input: InputType): InputType {}
```

- For React components, use the suffix 'Component' if it helps clarify its purpose

```typescript
const UserProfileComponent = () => {};
```

- For Screen components, use the suffix 'Screen' for better understanding

```typescript
const UserProfileScreen = () => {};
```

- Use active names for event handlers

```typescript
// Bad
const click = () => {};

// Good
const handleClick = () => {};
```

- For asynchronous functions, consider using a prefix or suffix to indicate this

```typescript
const fetchUserDataAsync = async () => {};
// or
const getUserDataPromise = () => {};
```

- Use opposites precisely for naming (e.g., start/stop, open/close, show/hide)

```typescript
const showDialog = () => {};
const hideDialog = () => {};
```

- For boolean properties or variables, use positive names

```typescript
// Bad
const isNotLoggedIn = false;

// Good
const isLoggedIn = true;
```

- Avoid using generic type names that may cause conflicts with naming resolution. Be specific and clear in your naming conventions instead.

```typescript
// Bad
export type FilterTypes = {
  // attributes here
};

// Good
export type WatchList_FilterTypes = {
  // attributes here
};

export type Portfolio_Holdings_FilterTypes = {
  // attributes here
};
```

- Provide unique and specific names for small types whenever possible. For larger type names, use underscores to enhance readability and understanding.

```typescript
// Bad
export type BannedScripRequestScripInfo = {
  mktSegmentId: number;
  token: number;
};

// Good
export type BannedScripRequest_ScripInfo = {
  mktSegmentId: number;
  token: number;
};
```

Remember: Consistency is key. Once a convention is established, stick to it throughout the project.
