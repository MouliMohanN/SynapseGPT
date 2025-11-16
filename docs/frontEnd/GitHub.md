## Git Methods

## Create a branch

`git checkout dev`

`git reset --hard origin/dev`

`git pull`

`git checkout -b branchName`

## Git Rebase

Note it should a feature (YOUR) not dev or master
`git branch`

`git fetch origin dev`

`git checkout dev`

`git pull`

`git checkout feature branch`

`git rebase dev`

if conflict appears 1. Resolve the conflicts 2. Then

`git add .`

In terminal (Commit Terminal) if Commit written then
`:qw`
else
`:q`

`git rebase --continue`

## Error (Tp Abort)

`git rebase --abort`

Verify your commit and then push.

`git push -f`

Remove all branch locally

`git branch | grep -v "main" | xargs git branch -D`

Get commits in oneline

`git log --oneline`

To reduce merge conflicts during rebase, consider autosquashing commits.

`git rebase -i dev --autosquash`

Say, on remote the branch is deleted but in your local the branch is still visible with origin/<your-branch>

`git pull --prune` - Will delete the remote branches in your local
