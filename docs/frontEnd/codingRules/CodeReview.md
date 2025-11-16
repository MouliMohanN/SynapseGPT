## Why do Code Review ?

- Identify bugs in the early stage
- Get familiar with other's code
- Learn from other's mistakes
- Share your learnings with others
- Involve more people in the solution and initiate discussions for alternative solutions.

## Goal

- Improve product quality and make developers write less error-prone code
- Enhance code maintainability and readability
- Ensure consistency in coding standards across the team

## Best Practices for Code Reviews

### For Reviewers

- Make sure the developer has followed all the codingRules mentioned in the docs folder
- Understand the context and purpose of the changes
- Focus on the logic and design rather than just syntax
- Pause for a min and think how you would implement the solution and always feel free to give alternative solutions
- Provide constructive feedback and suggest improvements
- Be respectful and professional in your comments
- Ask questions if something is unclear

### For Code Authors

- Keep pull requests small and focused on a single task
- Provide clear descriptions of the changes and their purpose
- Be open to feedback and willing to make improvements
- Respond to comments promptly and professionally
- Update the code based on valid suggestions

## Code Review Process

- Author submits a pull request
- Reviewers are assigned or notified
- Reviewers examine the code and provide feedback
- Author addresses the feedback and makes necessary changes
- Reviewers re-examine the updated code
- Once approved, the code is merged into the main branch

## Do's

- Block the PR when
  - Identified functional/UI bugs
  - Solution impacting developer experience
  - Implemented Un-optimized solution
  - The mistake is repeated more than once even if it is too small

## Don'ts

- Don't review partially finished work unless the developer needs your help in the solution

## Conclusion

Effective code reviews lead to higher quality code, better collaboration, and a more knowledgeable development team. By following these guidelines, we can ensure that our code review process is both productive and beneficial for everyone involved.
