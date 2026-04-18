# Nexus Smart Commerce Security Specification

## Data Invariants
1. Products can only be created/updated/deleted by admins.
2. Users can only read/write their own profile (`/users/{userId}`).
3. Admins can read all user profiles.
4. Orders can be created by any authenticated user for themselves.
5. Users can only read their own orders.
6. Admins can read and update all orders (status management).
7. `createdAt` is immutable and must be server time.
8. User roles are immutable and can only be set by the system or other admins (bootstrapped by email).

## The Dirty Dozen Payloads (Target: Rejection)
1. **Unauthenticated Write**: Creating a product without a token.
2. **Identity Spoofing**: User A trying to create an order for User B.
3. **Privilege Escalation**: User A trying to update their role to 'admin'.
4. **Shadow Update**: Adding `isVerified: true` to a product.
5. **ID Poisoning**: Creating a product with a 1MB string as ID.
6. **Immutable Breach**: Trying to change `createdAt` on an existign order.
7. **Type Mismatch**: Setting `price` to a string "low".
8. **Resource Exhaustion**: Sending a 1MB string in the product `name`.
9. **Relational Sync Break**: Creating an order for a non-existent product ID.
10. **State Shortcut**: User changing order status from 'pending' directly to 'delivered'.
11. **PII Leak**: Non-admin user trying to `get` another user's email.
12. **Blanket Read**: Authenticated user trying to list all orders without a filter.

## Test Runner (Draft)
A `firestore.rules.test.ts` would be defined next if the environment supported local emulation testing. 
Since we are in a live cloud environment, we rely on the Red Team audit and ESLint.
