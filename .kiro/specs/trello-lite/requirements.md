# Requirements Document

## Introduction

Trello-Lite is a lightweight task creation and tracking web application built with Next.js 14 (App Router). Users self-register with email and password, then create personal boards, organize lists (columns) within boards, and manage cards within lists. Cards support drag-and-drop reordering across lists, due dates, labels, and descriptions. All data is persisted in SQLite via Prisma ORM. Boards are strictly single-user; no sharing or collaboration is in scope.

## Glossary

- **System**: The Trello-Lite Next.js web application
- **User**: A registered, authenticated person using the application
- **Board**: A top-level workspace owned by a single User, containing an ordered set of Lists
- **List**: An ordered column within a Board, containing an ordered set of Cards
- **Card**: A task item within a List, carrying a title, optional description, optional due date, and zero or more Labels
- **Label**: A named, colored tag attached to a Card
- **Session**: An authenticated HTTP session established via NextAuth.js after successful login
- **Server_Action**: A Next.js server-side function invoked by the client to mutate data
- **Validator**: The Zod-based input validation layer within each Server_Action
- **Auth_Guard**: The session-check logic at the start of every Server_Action
- **Order**: A non-negative integer representing the position of a List within its Board, or a Card within its List; values are contiguous starting at 0

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a visitor, I want to register with my email and password, so that I can create a personal account and access the application.

#### Acceptance Criteria

1. THE System SHALL provide a registration page where a visitor can submit an email address and a password.
2. WHEN a visitor submits a valid, unique email and a non-empty password, THE System SHALL create a User record with the password stored as a bcrypt hash (cost factor 12).
3. WHEN a visitor submits a registration form with an email that already exists, THE System SHALL reject the registration and return a descriptive error message indicating the email is taken.
4. WHEN a visitor submits a registration form with an invalid email format, THE System SHALL reject the registration and return a field-level validation error.
5. WHEN a visitor submits a registration form with an empty password, THE System SHALL reject the registration and return a field-level validation error.
6. WHEN registration succeeds, THE System SHALL redirect the User to the `/boards` dashboard.

---

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my boards and tasks.

#### Acceptance Criteria

1. THE System SHALL provide a login page where a User can submit an email address and password.
2. WHEN a User submits valid credentials, THE System SHALL establish a Session via an HTTP-only JWT cookie and redirect the User to `/boards`.
3. IF a User submits an incorrect password or unregistered email, THEN THE System SHALL reject the login attempt and display an error message without revealing which field is incorrect.
4. WHILE a valid Session exists, THE System SHALL allow the User to access protected routes without re-authenticating.
5. WHEN a User logs out, THE System SHALL invalidate the Session and redirect the User to the login page.

---

### Requirement 3: Board Management

**User Story:** As an authenticated user, I want to create, view, and delete my boards, so that I can organize my work into separate workspaces.

#### Acceptance Criteria

1. WHEN an authenticated User creates a board with a non-empty title, THE System SHALL persist a Board record with `userId` set to the authenticated User's id and a default background color of `#0079BF`.
2. WHERE a custom color is provided at board creation, THE System SHALL store the provided hex color value as the Board's background color.
3. THE System SHALL only return Boards whose `userId` matches the authenticated User's id when listing boards.
4. WHEN an authenticated User deletes a board they own, THE System SHALL delete the Board and cascade-delete all nested Lists and Cards.
5. IF a User attempts to delete a Board they do not own, THEN THE Auth_Guard SHALL reject the operation and return an Unauthorized error.
6. THE Validator SHALL reject a Board title that is empty or exceeds 100 characters and return a field-level error message.

---

### Requirement 4: List Management

**User Story:** As an authenticated user, I want to create and reorder lists within a board, so that I can define workflow columns like "To Do", "In Progress", and "Done".

#### Acceptance Criteria

1. WHEN an authenticated User creates a List in a Board they own, THE System SHALL persist the List with an `order` value equal to the current count of Lists in that Board (appending to the end).
2. WHEN Lists in a Board are reordered via drag-and-drop, THE System SHALL update each List's `order` so that the resulting values form a contiguous sequence `[0, 1, …, n-1]` matching the new positions.
3. WHEN Lists are reordered, THE System SHALL not add or remove any Lists — the set of List ids before and after reordering SHALL be identical.
4. IF a User attempts to create or reorder Lists in a Board they do not own, THEN THE Auth_Guard SHALL reject the operation and return an Unauthorized error.
5. THE Validator SHALL reject a List title that is empty or exceeds 100 characters and return a field-level error message.

---

### Requirement 5: Card Management

**User Story:** As an authenticated user, I want to create, update, move, and delete cards within lists, so that I can track individual tasks.

#### Acceptance Criteria

1. WHEN an authenticated User creates a Card in a List belonging to a Board they own, THE System SHALL persist the Card with an `order` value equal to the current count of Cards in that List (appending to the end).
2. WHEN a Card is updated (title, description, due date), THE System SHALL persist the updated field values and return the updated Card record.
3. WHEN an authenticated User deletes a Card they own (via owning the parent Board), THE System SHALL remove the Card from the database.
4. IF a User attempts to create, update, or delete a Card in a Board they do not own, THEN THE Auth_Guard SHALL reject the operation and return an Unauthorized error.
5. THE Validator SHALL reject a Card title that is empty or exceeds 255 characters and return a field-level error message.

---

### Requirement 6: Card Reordering and Cross-List Move

**User Story:** As an authenticated user, I want to drag and drop cards within and between lists, so that I can reprioritize tasks and move them through workflow stages.

#### Acceptance Criteria

1. WHEN a User drags a Card to a new position within the same List, THE System SHALL update the `order` values of all Cards in that List so they form a contiguous sequence `[0, 1, …, m-1]` reflecting the new positions.
2. WHEN a User drags a Card to a different List on the same Board, THE System SHALL update the Card's `listId` to the destination List and update the `order` values of all Cards in both the source and destination Lists so each forms a contiguous sequence starting at 0.
3. AFTER any reorder or cross-list move, THE System SHALL ensure no two Cards in the same List share the same `order` value.
4. AFTER a cross-list move, THE System SHALL ensure the moved Card appears in exactly one List.
5. WHEN a drag-and-drop operation begins, THE System SHALL apply an optimistic update to the local React Query cache so the UI reflects the new order immediately without waiting for the server.
6. IF the Server_Action for a reorder or move fails, THEN THE System SHALL roll back the React Query cache to the snapshot taken before the optimistic update and display an error notification.
7. IF a drag event ends outside a valid drop zone, THEN THE System SHALL discard the drag result and leave all Card positions unchanged.

---

### Requirement 7: Card Detail and Labels

**User Story:** As an authenticated user, I want to view and edit card details including labels, so that I can add context and categorize my tasks.

#### Acceptance Criteria

1. WHEN a User clicks a Card, THE System SHALL open a modal dialog displaying the Card's title, description, due date, and associated Labels.
2. WHEN a User edits the Card title, description, or due date in the modal and saves, THE System SHALL persist the changes via the `updateCard` Server_Action and reflect the updates in the modal and board view.
3. WHEN a User adds a Label to a Card by providing a name and a valid hex color, THE System SHALL persist a Label record associated with that Card.
4. WHEN a User deletes a Label from a Card, THE System SHALL remove the Label record from the database.
5. THE Validator SHALL reject a Label color that is not a valid hex color string in `#RRGGBB` format and return a field-level error message.
6. WHEN the CardModal closes, THE System SHALL return focus to the Board view without losing any unsaved board state.

---

### Requirement 8: Authorization and Input Validation

**User Story:** As a system operator, I want all mutations to be authorized and validated, so that users cannot corrupt data or access resources they don't own.

#### Acceptance Criteria

1. THE Auth_Guard SHALL verify the Session via `getServerSession()` at the start of every Server_Action before any database operation is performed.
2. IF a Server_Action is invoked without a valid Session, THEN THE Auth_Guard SHALL return an Unauthorized error without performing any database operation.
3. WHEN a Server_Action receives input, THE Validator SHALL validate it against the corresponding Zod schema before any database operation is performed.
4. IF input fails Zod schema validation, THEN THE Validator SHALL return field-level error messages to the client without performing any database operation.
5. THE System SHALL store all User passwords as bcrypt hashes with a cost factor of 12 and SHALL never store or return plaintext passwords.

---

### Requirement 9: Data Integrity

**User Story:** As a developer, I want the database to maintain consistent ordering and ownership invariants, so that the application state is always predictable.

#### Acceptance Criteria

1. THE System SHALL ensure that for every Board, the `userId` field references an existing User record (no orphaned Boards).
2. THE System SHALL ensure that for every List in a Board, the `order` values form a contiguous sequence `[0, 1, …, n-1]` at all times.
3. THE System SHALL ensure that for every Card in a List, the `order` values form a contiguous sequence `[0, 1, …, m-1]` at all times.
4. WHEN a Board is deleted, THE System SHALL cascade-delete all Lists belonging to that Board and all Cards belonging to those Lists.
5. WHEN a List is deleted, THE System SHALL cascade-delete all Cards belonging to that List.
6. WHEN a Card is deleted, THE System SHALL cascade-delete all Labels belonging to that Card.
