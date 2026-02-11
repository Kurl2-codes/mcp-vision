ReactJS/NextJS Checklist/Guardrail

Naming Convention Standards
The Golden Rule: Consistency > Cleverness. If the existing code uses a specific style, follow it. If you are starting fresh (which you are), follow these strict standards.
1. Frontend (React / Next.js / TypeScript)
File Names (Components): PascalCase
Use for React components. Match the file name to the export name.
✅ DashboardTable.tsx
❌ dashboardTable.tsx, dashboard_table.tsx
File Names (Utilities/Hooks): camelCase
Use for non-component logic files.
✅ useAuth.ts, formatDate.ts
❌ UseAuth.ts, format_date.ts
Variables & Functions: camelCase
Standard JavaScript/TypeScript practice.
✅ const isLoading = true;
✅ function handleSubmit() { ... }
Interfaces & Types: PascalCase
Modern Standard: Do not use the "I" prefix (e.g., IUser) unless you have a strict reason (Hungarian notation is outdated in TS).
✅ interface UserProps { ... }
❌ interface IUserProps { ... }
Boolean Props: Prefix with is, has, or should.
✅ isOpen, hasError, shouldRender
❌ open, error, render (These sound like actions or nouns, not states)

—----------------------------------------------------------------------------------------------------------------------------
1. Project Structure & Organization
Goal: Avoid the "file dump" where everything sits in the components folder.
[ ] Feature-First Architecture:
The Check: Are files organized by what they do (Feature) rather than what they are (Type)?
Standard: Don't dump 50 files into /components. Group them.
Example Structure:

[ ] The "Barrel" Export Pattern (Optional but clean):
The Check: Are imports clean?
Standard: avoid import { Button } from '../../../../components/Button'


2. Code Quality & Standards
Goal: Enforce strict typing and prevent "magic strings."
[ ] No "Any" Types (TypeScript Strictness):
The Check: Run a grep for : any. If found, ask why.
Standard: Define interfaces for API responses.
Pseudo-Concept:
	
[ ] Centralized API Routes:
The Check: Are URL strings hardcoded in components?
Standard: All API endpoints must live in a constants file or a service layer.
Why: If the backend changes /q/create to /qr/new, you shouldn't have to edit 15 files.

3. Data Fetching & Async State
Goal: Prevent "Loading..." flickering and race conditions.
[ ] Separation of Server State vs. Client State:
The Check: Are they using useEffect manually to fetch data?
Standard: Strongly encourage a data-fetching library (SWR or TanStack Query). It handles caching, revalidation, and loading states automatically.
Guardrail: "If you are writing isLoading, isError, and data state variables manually inside a generic component, you are doing it wrong."
[ ] Custom Hooks for Logic:
The Check: Does the UI component contain API calls?
Standard: The UI should only display data. A custom hook should fetch it.
Pseudo-Code Structure:
	

4. Forms & Validation
Goal: Ensure users can't break the backend with bad data.
[ ] Schema-Based Validation:
The Check: Are they writing 20 lines of if (text.includes('@')) logic?
Standard: Use Zod (or Yup) to define the shape of the data.
[ ] Controlled vs. Uncontrolled Inputs:
The Check: For complex forms (like the "Edit Redirect" modal), use React Hook Form.
Why: It reduces re-renders compared to standard React state (useState for every keystroke).
[ ] Error Messaging:
The Check: Does the user know why the form failed?
Standard: Errors must be displayed below the specific input field, not just a generic "Error" alert at the top.

5. UX & Feedback Loops
Goal: The app should feel "alive" and responsive.
[ ] Optimistic UI (Bonus):
The Check: When I click "Disable QR Code," does the toggle switch wait for the server to respond before moving?
Standard: Ideally, the switch moves instantly. If the server fails, it snaps back and shows an error.
[ ] Toast Notifications:
The Check: Are we using alert("Success")? (Forbidden).
Standard: Use a Toast library (e.g., Sonner, React-Hot-Toast) for non-blocking success/error messages.
[ ] Empty States:
The Check: What does the dashboard look like with 0 QR codes?
Standard: It shouldn't be a blank white table. It should be a "Call to Action" component (e.g., "No codes found. Create your first one!").

6. Security & Environment
Goal: Don't leak secrets.
[ ] Environment Variable Prefixing:
The Check: Are they trying to access private API keys in the browser?
Standard:
NEXT_PUBLIC_API_URL -> Visible to browser (Okay for public endpoints).
DB_PASSWORD -> Undefined in the browser (Correct).
Guardrail: Check next.config.js or their .env usage to ensure they understand the boundary.
[ ] Middleware Protection:
The Check: Can I visit /dashboard without logging in?
Standard: Implement middleware.ts to intercept route requests and check for session tokens/cookies before rendering the page.
7. Build & Performance
Goal: Production readiness.
[ ] Image Optimization:
The Check: Are they using the standard <img> tag?
Standard: Use next/image. It handles lazy loading and resizing automatically.
[ ] Console Log Cleanup:
The Check: Open the browser console. Is it full of console.log('here', data)?
Standard: Production builds should be clean. (Tip: Use a linter rule to ban console logs in production).




