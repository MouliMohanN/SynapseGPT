# PR Rules

## Note

1. Follow the Do's and Don'ts to ensure best practices.
2. Post before & after Dev Testing screenshot/video on PR/WhatsApp
3. **_REVIEW_** your code thoroughly before and after submitting the PR.
4. Make sure you've read and followed all coding rules under docs folder before raising the PR
5. Make sure to reply/react to comments and resolve them in the same PR. Also, get on a call to disccus on the comments for better understanding.
6. As the PR owner, it’s your responsibility to follow up with your peers for code reviews, approvals, and merging the PR into the Dev branch.
7. Get Minimum of 2 Approvals before you merge the PR
8. Always rebase your feature/bug-fix branch with dev before merging
9. Use a clear, descriptive title that reflects the main purpose of the pull request.
10. Provide a detailed description outlining the changes made in the PR.
11. List any major features added or bugs fixed.
12. If there are any breaking changes, ensure they’re clearly mentioned.
13. We'll review each PR in the codereview call and ignore the detailed review process if fix is simple
14. Commit code on smaller chuncks
15. Do not club your PR with multiple tasks/bugs.
16. In an exceptional case, It is okay to club related tasks/bug fixes in a sinle PR but be sure to maintain seperate commits for each task/bug.

### Guidelines

1. **_Create Enums_** when possible
2. **_Use TypeScript types_** for objects, functions, fields, etc., whenever possible.
3. Remove any **_commented-out and unused code_** to maintain code cleanliness.
4. Add **_comments_** only when necessary to clarify complex logic.
5. **Avoid writing business logic inside the render function.**
6. **_Localize hardcoded text_** displayed on the screen using i18 for internationalization.
7. **_Strictly avoid inline styles_**, use external stylesheets or styled components.
8. If the same value is used in multiple places then read the value from a **_const variable_**
9. **_Break your code into smaller functions and components_** for better readability and reusability.
10. **_Follow proper naming conventions_** —refer to the [NamingConventions.md](NamingConventions.md) for guidelines.
11. When using `React.memo()`, **_manually compare previous and next props_** when passing objects to ensure optimization.
12. Follow component structure. Refer [ComponentStructure.md](ComponentStructure.md)
13. **_Use optionals_** when needed to prevent app crash
14. Use **_Lazy imports_** where possible to improve performance
15. Use Array.filter/find/map/forEach based on use case
16. **_Create a wrapper/abstraction_** around third-party libraries, components, or methods, so that if we decide to switch libraries in the future, changes can be made in one place instead of across the entire codebase.
17. Keep your commits **_small and focused_**, each commit should implement only one task to make it easier to review and understand the rationale behind each change.
18. If there's **_temporary code in the commit_**, fix it before raising the PR or add TODO and track/plan when to remove it.
19. The PR should reflect **_a single story or task_**, avoid bundling multiple stories/tasks in one PR.
20. Use the **_.tsx_** extension for components and **_.ts_** extension for all other TypeScript files.
21. **_Avoid using the `any` type_** in TypeScript; prefer more specific types to ensure type safety.
22. use **_redux_** to communicate between components of the same screen
23. **Avoid writing excessively large functions or components.** Break them down into smaller, manageable pieces.
24. **Don't include empty styles in your code.** Either remove them or define them properly.
25. **Avoid unnecessary memoization or the use of useCallback().** Only use them when there's a clear performance benefit.
26. **Don't mix unrelated changes in the same commit.** Ensure that each commit represents a single unit of work, and that code not directly related to that task is not included.

## For Bug Fixes

1. Use a clear, descriptive title that reflects the main purpose.
2. Provide a clear and detailed description - What is the Bug ?
3. Explain the Root cause - Why did it happen ?
4. Describe the changes you made to fix the bug - What is the fix ?
5. Explain how you tested the fix in the code review call
