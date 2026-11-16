---
title: Git Fundamentals
sidebar_position: 1
---

# Git Fundamentals

Git is a **distributed version control system**: it tracks every change made to a project over time, and every developer who clones the project gets a full copy of its history, not just the latest snapshot. That full-copy, offline-capable design is what "distributed" means, and it is the single biggest difference between Git and older, centralized version control tools.

Git buys a team several things at once:

- **Change tracking** — who changed what, and when.
- **Collaboration** — many developers working on the same codebase without stepping on each other.
- **Branching** — isolated lines of work that don't affect the main code until they're merged.
- **History** — the ability to inspect or revert to any previous version.
- **Redundancy** — because every clone is a full copy, the project is backed up in as many places as it has clones.

Internally, Git does not store a diff per commit. Each commit is a **snapshot** of the whole project at that point, identified by a unique SHA-1 hash. Commits link back to their parent(s), forming a history graph — which is also what makes operations like `rebase` (replaying commits onto a new parent) possible.

## Git vs. GitHub

These two names get used interchangeably, but they are not the same thing:

| | Git | GitHub |
|---|---|---|
| What it is | A version control **tool** you run locally | A cloud **platform** that hosts Git repositories |
| Works offline? | Yes — it's just a program on your machine | No — it's a hosted service |
| Adds | Snapshotting, branching, merging, history | Pull requests, issues, code review, CI/CD, team permissions |

In short: Git is the engine; GitHub (and alternatives like GitLab or Bitbucket) is a product built around that engine, adding the collaboration layer a remote team actually works through day to day.

## Repositories: `init` vs. `clone`

A **repository** (repo) is a project's tracked folder. Alongside your normal files, it contains a hidden `.git` directory holding all the metadata Git needs: every commit, every branch pointer, the configuration, and the object database itself.

There are two ways to get a repository:

```bash
# Start tracking an existing folder, or create a brand-new project
git init

# Copy an existing remote repository (e.g. from GitHub) onto your machine
git clone https://github.com/example/project.git
```

- `git init` turns the *current* folder into a Git repository by creating `.git` in it. There is no history yet and no remote is configured.
- `git clone` downloads an *existing* repository in full — every commit, every branch — and automatically wires up a remote (named `origin` by default) pointing back to where it came from.

:::tip
Use `init` when you are starting something new. Use `clone` when you are joining a project that already exists somewhere else.
:::

## File states and the staging area

Git tracks every file in your working directory as being in one of four states:

| State | Description |
|---|---|
| Untracked | A new file Git doesn't know about yet |
| Unmodified | A tracked file identical to the last commit |
| Modified | A tracked file that has changed but hasn't been staged |
| Staged | Changes marked to go into the *next* commit |

The flow between them is: **untracked → staged → committed**, and afterwards **unmodified → modified → staged → committed** again for every subsequent change.

The **staging area** (also called the index) sits between your working directory and the repository's history. It exists so you can:

- Review exactly what you're about to commit, with `git diff --staged`.
- Choose *which* changes go into the next commit, rather than being forced to commit everything you've touched.

```bash
git add <file>        # stage a specific file
git diff --staged     # review what is currently staged
```

### `git add .` vs. `git add -A`

Both stage changes, but their scope differs:

- `git add .` stages new, modified, **and deleted** files **within the current directory and below**. (Older Git, before version 2.0, skipped deletions here unless you added `-A`; every Git in use today includes them.) It simply doesn't touch anything outside that directory.
- `git add -A` (or `--all`) does the same thing — new, modified, and deleted files — but across the **entire repository**, no matter which directory you run it from.

So the real difference between the two today is **scope** (current directory vs. whole repo), not whether deletions are staged.

```bash
git status   # shows branch, staged, unstaged and untracked files at a glance
```

## `git status`, `fetch` vs. `pull`

`git status` is your dashboard: it reports the current branch, what's staged, what's modified-but-unstaged, and what's untracked.

`git fetch` and `git pull` both talk to the remote, but only one of them touches your working branch:

| Command | Downloads remote commits? | Merges into your branch? |
|---|---|---|
| `git fetch` | Yes | No — only updates remote-tracking refs (e.g. `origin/main`) |
| `git pull` | Yes | Yes — `git pull` is effectively `git fetch` + `git merge` |

Because `pull` merges automatically, it can produce a merge conflict on the spot; `fetch` never can, since it never touches your working files. Many teams prefer `fetch` followed by an explicit `merge` or `rebase`, precisely so conflicts happen under their control instead of mid-pull.

## `git commit` and `--amend`

```bash
git commit -m "Add login validation"
```

A commit:

- Creates a permanent **snapshot** of everything currently staged.
- Generates a unique commit **hash** (SHA).
- Records **metadata** — author, timestamp, and message.
- Moves the current branch pointer forward to the new commit.

```bash
git commit --amend
```

`--amend` doesn't edit history in place — there's no such thing in Git. It **replaces** the most recent commit with a brand-new one (new hash, new snapshot), discarding the old one. Use it to fix a typo in the last commit message or to fold a forgotten file into the commit you just made.

:::warning Never amend a commit you've already pushed and others may have pulled
Amending rewrites the commit's hash. If anyone else has already pulled the original commit, your amended version will look like a completely different, diverging commit to their local history, and the next `pull` will conflict or duplicate work. Amend freely before pushing; after pushing to a shared branch, prefer a new commit or `git revert`.
:::

## Detached HEAD

Normally, `HEAD` points at a **branch**, and the branch pointer moves forward with every commit. A detached HEAD happens when `HEAD` points directly at a **commit** instead:

```bash
git checkout abc123      # HEAD now points at commit abc123 directly, not at a branch
```

In this state you can look around and even make experimental commits, but none of those commits belong to any branch — if you check out a different branch afterward, they become unreachable (orphaned) and are eventually garbage-collected. If you want to keep work done in a detached HEAD, create a branch from it *before* switching away:

```bash
git checkout -b temp-branch   # anchors the current commit (and any new ones) to a real branch
```

## `.gitignore`

A `.gitignore` file lists patterns for files and folders Git should never track or stage — build output, `node_modules/`, `.env` files with secrets, editor settings, and so on. Git checks every untracked file against these patterns and simply hides matches from `git status` and `git add`. It only affects files that are *not already tracked*; a file Git is already tracking has to be removed from tracking explicitly (`git rm --cached <file>`) even after adding it to `.gitignore`.

## `git reset`: soft, mixed, hard — vs. `git revert`

`git reset` moves the current branch pointer to a different commit, which **rewrites history** by removing the commits after that point from the branch:

```bash
git reset --soft HEAD~1   # move pointer back 1 commit; keep all changes staged
git reset --mixed HEAD~1  # move pointer back 1 commit; keep changes, but unstaged (the default)
git reset --hard HEAD~1   # move pointer back 1 commit; discard the changes completely
```

| Mode | Working directory | Staging area | Typical use |
|---|---|---|---|
| `--soft` | Unchanged | Keeps changes staged | "Let me redo this commit's message/content" |
| `--mixed` (default) | Unchanged | Changes become unstaged | "Undo the commit, let me re-review what to stage" |
| `--hard` | **Discarded** | Discarded | "Throw this away completely" — destructive |

`git revert` takes the opposite approach: instead of moving the pointer backward, it creates a **new commit** whose changes undo a previous commit. History grows forward; nothing is erased or rewritten, and the original (now-reverted) commit is still visible in the log.

:::danger `reset` vs. `revert` — pick based on whether it's been shared
- **Local, unpushed commits** → `git reset` is safe; nobody else has seen those commits yet.
- **Pushed/shared commits** → use `git revert`. Resetting a branch that others have already pulled rewrites history out from under them.
:::

## `git stash`

`git stash` temporarily shelves uncommitted changes (both staged and unstaged) and restores a clean working directory, without requiring a commit:

```bash
git stash            # save current changes, clean the working directory
git stash list       # see what's stashed
git stash pop        # re-apply the most recent stash and remove it from the stash list
```

Typical uses: switching branches when you're not ready to commit, or pulling the latest changes onto a clean tree before reapplying your work.

## Scenarios

### Recovering after `git reset --hard HEAD~1`

Running:

```bash
git reset --hard HEAD~1
```

moves the branch pointer back one commit and discards the working directory changes that came with it. This feels destructive, but the old commit object usually isn't gone — Git doesn't delete commit objects immediately, it just stops any branch from pointing at them. The **reflog** (`git reflog`) records every place `HEAD` has pointed recently, including the commit you just "lost":

```bash
git reflog
# abc123 HEAD@{0}: reset: moving to HEAD~1
# def456 HEAD@{1}: commit: Add login validation   <- the "lost" commit

git checkout def456          # inspect it, or
git reset --hard def456      # move the branch back onto it
# or, to avoid touching history again:
git branch recovered-work def456
```

This works as long as the commit hasn't been garbage-collected (which happens only after it's been unreachable for a while, by default 30–90 days depending on configuration) — so recovery is very likely to succeed if you act promptly, but it is not a permanent safety net.

### Leaked secrets: rotate first, then clean history

If secrets (API keys, passwords, tokens) get committed and pushed to `main`, the fact that they're in Git history means they must be treated as **compromised the moment they're pushed**, even if you remove them from the latest commit a second later — anyone who already fetched the repo, and GitHub's own caches/forks, may have a copy.

The correct order of operations is:

1. **Rotate the secret immediately** — invalidate the leaked key/password/token at its source (cloud provider, database, third-party API) and issue a new one. This is the step that actually stops the damage; everything else is cleanup.
2. **Remove the secret from the codebase** and replace it with an environment variable or secret manager reference, adding the relevant file to `.gitignore` if appropriate.
3. **Clean the Git history** that still contains the old secret, using a history-rewriting tool such as `git filter-repo` (preferred) or the older `git filter-branch` / BFG Repo-Cleaner, since a single `git revert` or a new commit does *not* remove the secret from earlier commits — it is still retrievable from history.
4. **Force-push the cleaned history** and notify collaborators that they need to re-clone or hard-reset their local copies, since the commit hashes of everything after the rewrite point have changed.

:::warning Rotating the secret is the step that matters most
Rewriting history is good hygiene, but it does not undo exposure that already happened — a leaked key is just as usable by an attacker whether or not you later scrub it from Git. Rotate first; clean history second.
:::

### What `git pull --rebase` does internally

A plain `git pull` is `git fetch` + `git merge`, which produces a merge commit whenever your local branch has diverged from the remote. `git pull --rebase` instead does `git fetch` + `git rebase`:

1. It fetches the remote commits into the hidden remote-tracking branch (e.g. `origin/main`) — your local branch is untouched at this point.
2. It temporarily "detaches" your local commits (the ones not yet on the remote) and rewinds your branch to match the remote's tip.
3. It **replays your local commits one by one on top of** that new tip, giving each replayed commit a new hash (since its parent changed).

The result is a clean, linear history with no merge commit — at the cost of rewriting the hashes of any local commits that hadn't been pushed yet. If a replayed commit touches the same lines as a remote commit, you get a conflict *during the rebase*, which is resolved the same way as any other rebase conflict (see [Branching Strategies, Merge vs Rebase and Conflicts](./branching-and-conflicts.md)).

## Key takeaways

- Git is the tool; GitHub is a hosting platform built on top of it.
- `init` creates a new repo from scratch; `clone` copies an existing one, remote and all.
- `fetch` only downloads; `pull` downloads **and** merges — which is where surprise conflicts come from.
- `reset` rewrites history and is safe only for unpushed commits; `revert` is forward-only and safe for shared history.
- The reflog is your safety net for "lost" commits after a `reset --hard`, but it isn't permanent.
- A leaked secret must be **rotated**, not just deleted from the latest commit — history still remembers it until it's explicitly rewritten.

### Interview questions

1. What is the difference between Git and GitHub?
2. What's the difference between `git init` and `git clone`?
3. What are the states a file can be in, and what moves it between them?
4. What's the difference between `git add .` and `git add -A`?
5. What does `git fetch` do that `git pull` doesn't?
6. What does `git commit --amend` actually do under the hood, and why is it risky on a shared branch?
7. What is a detached `HEAD`, and how do you keep work done in that state?
8. What are the differences between `--soft`, `--mixed`, and `--hard` resets?
9. When should you use `git revert` instead of `git reset`?
10. You ran `git reset --hard HEAD~1` by mistake — how do you get the commit back?
11. You discover a password was committed and pushed. What do you do, in what order?
12. What happens internally when you run `git pull --rebase`?
