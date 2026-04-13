# Testing & Development Guide

This project follows a rigorous testing strategy combining unit, integration, and E2E tests.

## 🧪 Testing Frameworks
- **Vitest**: Used for fast unit and integration tests.
- **Playwright**: Used for end-to-end user journey verification.

## 🛠️ Testing Patterns

### 1. Mocking Supabase
We use a chainable mock factory in `src/tests/api/finance/` to simulate the Supabase client without hitting the real database:
```typescript
const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    // ... other chainable methods
    then: vi.fn((resolve) => resolve({ data, error })),
};
```

### 2. Bypass Authentication
For integration tests, the `withAuth` Higher Order Function is mocked to return the inner handler directly, allowing us to pass a `mockMember` directly.

### 3. File Operations
When testing XLSX utilities, we mock `FileReader` (via `vi.stubGlobal`) and the `xlsx` library to verify data mapping without actual file I/O.

## 📝 Writing New Tests
1. **Source Code**: `src/tests/` mirrors the `src/` directory.
2. **E2E**: Located in `tests/e2e/` using the `.spec.ts` suffix.

## ✅ Best Practices
- Every new API route must have an integration test covering its `GET` and `POST` methods.
- Logic involving money (balances, variances) must have unit tests with boundary case coverage.
- Avoid persistent data in tests; always mock external services (Storage, DB).
