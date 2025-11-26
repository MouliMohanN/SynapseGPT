# What is an Agent?

An **Agent** is an AI system that doesn't just "talk" but **acts** to achieve a goal.

While a standard LLM (like ChatGPT) is passive—you give it input, it gives one output—an **Agent** is active and autonomous. It uses an LLM as its "brain" to reason through a problem, but it wraps that brain in a system that allows it to:

1.  **Reason (Plan)**: Break a complex goal into smaller steps before starting.
2.  **Act (Tools)**: Use tools to interact with the world (e.g., read files, run commands, search the web).
3.  **Observe (Feedback)**: See the results of its actions.
4.  **Loop (Self-Correct)**: If an action fails or the result isn't good enough, it tries again or changes its approach.

### In the context of your Test Generator:

*   **Not an Agent (Simple LLM)**:
    *   *Input*: "Here is a PRD. Write tests."
    *   *Output*: "Here are the tests." (One shot. If it missed a requirement, it's gone.)

*   **Agent (What we are building)**:
    *   *Goal*: "Create a perfect test plan for this PRD."
    *   *Step 1 (Reason)*: "First, I need to extract all requirements to make sure I don't miss any."
    *   *Step 2 (Act)*: Extracts 5 requirements.
    *   *Step 3 (Reason)*: "Now I will write tests for Requirement 1."
    *   *Step 4 (Act)*: Writes tests.
    *   *Step 5 (Self-Reflect)*: "Wait, I missed the edge case where the user enters a negative number. I need to add a test for that."
    *   *Step 6 (Act)*: Adds the missing test.
    *   *Final Output*: A high-quality, verified test plan.

The "Agent" is the **loop** of reasoning and acting that ensures reliability and quality beyond what a single prompt can achieve.