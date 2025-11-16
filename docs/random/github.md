# Git Commands Used in This Session

Here is a list of the Git commands that were used in this session, along with a description and an example of how to use them.

---

### 1. `git log`

*   **Description:** This command is used to view the commit history of a repository. It can be customized with various options to filter and format the output.
*   **Example:**
    ```bash
    # View the last 5 commits
    git log -n 5
    ```
    ```bash
    # View the last 5 commits, skipping the first 5
    git log -n 5 --skip 5
    ```
    ```bash
    # View the commit history of the current branch in a compact, one-line format
    git log --oneline
    ```
    ```bash
    # View the commits that are in the 'lazyLoadingComponents' branch but not in the 'develop' branch
    git log --oneline develop..lazyLoadingComponents
    ```

---

### 2. `git rev-list`

*   **Description:** This command is used to list commit objects in reverse chronological order. It can be used to count the number of commits.
*   **Example:**
    ```bash
    # Count the number of commits in the current branch
    git rev-list --count HEAD
    ```

---

### 3. `git rev-parse`

*   **Description:** This command is used to pick out and massage parameters. It can be used to get the current branch name.
*   **Example:**
    ```bash
    # Get the name of the current branch
    git rev-parse --abbrev-ref HEAD
    ```

---

### 4. `git revert`

*   **Description:** This command is used to undo the changes made in a previous commit by creating a new commit. It does not delete the original commit but instead creates a new one that reverses the changes.
*   **Example:**
    ```bash
    # Revert the changes of a specific commit without opening the editor
    git revert --no-edit c7f9a75
    ```

---
