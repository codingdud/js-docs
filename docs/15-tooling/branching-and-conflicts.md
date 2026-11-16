---
title: "Branching Strategies, Merge vs Rebase and Conflicts"
sidebar_position: 2
---

# Branching Strategies, Merge vs Rebase and Conflicts

A **branch** in Git is just a movable pointer to a commit — not a copy of the project. Creating one is practically free: Git writes a few bytes to `.git/refs/heads/`, nothing more. That lightness is what makes branching the backbone of how teams isolate work: a branch lets you develop a feature, fix a bug, or experiment in parallel with the main codebase, without touching it until you're ready to merge back.

A **branching strategy** is the agreed-upon set of rules a team follows for *which* branches exist, *when* they're created, and *how* code flows from a developer's machine into production. Picking one well is mostly about matching it to how fast and how safely the team needs to ship.

## Branching strategies

### Git Flow

Git Flow keeps development, testing, and production strictly separate using several long-lived and short-lived branch types:

| Branch | Purpose |
|---|---|
| `main` / `master` | The live, production application |
| `develop` | Where finished features are integrated before a release |
| `feature/*` | One branch per piece of developer work |
| `release/*` | Pre-production stabilization and QA for an upcoming release |
| `hotfix/*` | Emergency fixes applied directly against production |

The typical flow: create a feature branch off `develop` → finish the work → merge back into `develop` → when it's time to ship, cut a `release` branch → QA tests against it → once it passes, merge the release branch into `main` and tag a version (and merge it back into `develop` too, so the fixes aren't lost).

Git Flow's strength is control and auditability — every change passes through multiple gates before reaching production, which is why regulated environments (banking, telecom, insurance) favor it. Its weakness is speed: the extra branches and merge steps make it comparatively slow and merge-heavy for teams that need to ship many times a day.

### GitHub Flow

GitHub Flow is deliberately simpler: there's really only one long-lived branch, and `main` is **always** deployable.

```text
feature branch → pull request → review → merge → automatic deploy
```

This suits startups, SaaS products, and teams that deploy frequently, because there's almost no process overhead between "code is done" and "code is live." The trade-off is that it leans heavily on a strong automated test suite — if the tests are weak, a bad merge reaches production immediately, since there's no separate staging gate.

### GitLab Flow

GitLab Flow takes GitHub Flow's simplicity and adds explicit **environment branches** between a feature merge and production, so there is a controlled checkpoint before code goes live:

```text
feature → merge to main
main → promoted to staging
staging (after testing) → promoted to production
```

It's a middle ground: almost as lightweight as GitHub Flow, but with a staging environment that catches problems before they reach real users — a common choice for SaaS, startups, and e-commerce apps that want speed *and* a safety net.

### Trunk-Based Development

Trunk-based development minimizes branching almost entirely: everyone commits to a single shared branch (the "trunk") very frequently, using short-lived branches (often living only hours) or feature flags to hide incomplete work rather than long-lived branches to isolate it. It demands strong CI and a culture of small, frequent commits, which is why it's most associated with large tech organizations that have invested heavily in automated testing and deployment infrastructure.

:::tip Choosing a strategy
As a rule of thumb: the more regulated or large your release process needs to be, the more structure (Git Flow) helps; the more often you deploy and the stronger your test suite, the less structure (GitHub Flow / trunk-based) you need.
:::

## Merge vs. rebase

Both operations bring the commits from one branch into another, but they do it very differently.

```bash
# Merge: combine branches, preserving both histories
git checkout main
git merge feature

# Rebase: replay feature's commits on top of main's latest commit
git checkout feature
git rebase main
```

| | Merge | Rebase |
|---|---|---|
| History shape | Preserves the complete history, including exactly where and when branches diverged and came back together | Rewrites history — moves your commits onto a new base, producing a clean, linear line |
| Commit hashes | Unchanged; a new **merge commit** is added on top | Every replayed commit gets a **new hash**, since its parent changed |
| Result | More accurate, if "noisier", history (extra merge commits) | Easier-to-read, linear history, but the original commits are gone |
| Safe for shared branches? | Yes — always | **No**, unless nobody else has based work on the commits you're rewriting |

### Fast-forward merges

A fast-forward merge is the simplest possible case: it happens when the branch pointer to be merged has a direct, linear path from the current branch — in other words, nothing new has happened on the target branch since the feature branch was created. Git doesn't need to create a merge commit at all; it just slides the branch pointer forward to match:

```bash
git checkout main
git merge feature   # if main hasn't moved since feature branched off, this is a fast-forward
```

### Why you should avoid rebasing shared branches

Because rebase assigns every moved commit a brand-new hash, rebasing a branch that other people have already pulled creates two diverging histories that look unrelated to Git — their old commits and your newly-hashed ones are no longer the same objects, even though they contain the same changes. Everyone else's next `pull` will either conflict badly or silently duplicate every commit. The safe rule is: **only rebase a branch that is exclusively yours and hasn't been pushed anywhere others might have pulled it from.** Once a branch is shared, merge instead.

## Resolving conflicts

### What causes a conflict

A merge (or rebase) conflict happens when Git tries to combine two versions of a file and can't automatically decide which change should win. The three common causes:

- **Same lines, different changes** — two branches modify the exact same lines of a file in incompatible ways.
- **Delete vs. modify** — one branch deletes a file while the other modifies it.
- **Same new file, different content** — both branches independently create a file with the same name but different contents.

Git tells you immediately when it hits one — `git status` after a failed merge or rebase lists every file that's in a conflicted state.

### Conflict markers

When Git can't resolve something automatically, it writes **conflict markers** directly into the file, bracketing both versions so you can see exactly what's in dispute:

```text
<<<<<<< HEAD
// your current branch's version of these lines
=======
// the incoming branch's version of these lines
>>>>>>> branch-name
```

- `<<<<<<< HEAD` marks the start of *your* current branch's version.
- `=======` divides the two competing versions.
- `>>>>>>> branch-name` marks the end of the *incoming* branch's version.

### Steps to resolve a conflict

1. Run `git status` to see which files are conflicted.
2. Open each conflicted file and find the conflict markers.
3. Decide the outcome for each conflict: keep the current version, keep the incoming version, keep parts of both (in whatever order makes sense), or write something new entirely.
4. **Remove the conflict markers themselves** — they are not valid code/content and must not survive into the final file.
5. Save the file and `git add` it to mark the conflict as resolved.
6. Finish the operation:
   - During a merge: `git commit` (Git pre-fills a merge commit message for you).
   - During a rebase: `git rebase --continue`.

To back out of a conflicted merge entirely and return to the state before you started:

```bash
git merge --abort
```

### Conflicts during rebase

Conflicts during a rebase are common, and they can happen **more than once per rebase** — because rebase replays your commits one at a time onto the new base, each individual commit can conflict independently:

```text
CONFLICT (content): Merge conflict in index.js
```

For each one: resolve the conflict in the file exactly as described above, `git add` the fixed file, then run `git rebase --continue` to move on to replaying the next commit. If a particular commit turns out not to be worth salvaging, `git rebase --skip` drops it; to give up on the whole rebase and return to where you started, use `git rebase --abort`.

### Recovering when a teammate force-pushed

If a teammate rebased a shared branch and force-pushed, their commits now have different hashes than the ones you have locally, and your branch will look like it has diverged in a confusing way — a normal `pull` will likely try to merge two histories that both claim to contain "the same" work twice over. The fix is to replace your local branch with the new remote history rather than trying to reconcile it:

```bash
git fetch origin
git checkout feature
git reset --hard origin/feature   # discards your local branch, replaces it with the remote's
```

:::warning This discards local commits
`git reset --hard origin/feature` throws away any local commits on `feature` that aren't also on the remote. Before running it, check `git log feature..origin/feature` and `git log origin/feature..feature` to see what's unique to each side, and cherry-pick anything of yours worth keeping (`git cherry-pick <hash>`) onto the fresh branch first.
:::

## Best practices to avoid conflicts

- **Pull frequently** — the longer your branch sits without the latest changes, the more it diverges, and the bigger the eventual conflict.
- **Commit often, in small, focused commits** — small commits are easier to reason about and conflict less than one giant change.
- **Communicate with your team** about who's touching which files, especially for shared, frequently-edited ones.
- **Keep branches short-lived** — merge feature branches back quickly instead of letting them drift from `main`.
- **Use feature branches** to isolate work and minimize overlap in the first place.
- **Divide work clearly** so two people aren't editing the same files simultaneously whenever it's avoidable.
- **Rebase your feature branch onto the latest main before opening a merge/PR** (never a *shared* branch) — this surfaces and resolves conflicts locally, one commit at a time, before they become a messy multi-file merge conflict for a reviewer.

## Key takeaways

- Git Flow trades speed for control; GitHub Flow and trunk-based development trade control for speed; GitLab Flow sits in between.
- Merge preserves history and is always safe; rebase rewrites history for a cleaner log, but must never be done on a branch others have already pulled.
- A fast-forward merge just moves a pointer — no merge commit is created.
- Conflicts come from competing changes to the same lines, a delete-vs-modify mismatch, or two branches creating the same filename; resolve them by editing out the `<<<<<<<` / `=======` / `>>>>>>>` markers, staging the result, and continuing (or aborting) the operation.
- A force-pushed shared branch can't be reconciled with a normal pull — reset your local branch to match the remote, after rescuing any commits unique to you.

### Interview questions

1. What are Git Flow, GitHub Flow, GitLab Flow, and trunk-based development, and when would you pick each?
2. How do you merge one branch into another?
3. What's the difference between merge and rebase, and when should you avoid rebasing?
4. What is a fast-forward merge?
5. What causes a merge conflict?
6. What do the `<<<<<<<`, `=======`, and `>>>>>>>` markers mean?
7. Walk through the steps to resolve a merge conflict.
8. How do you abort a merge in progress?
9. Can conflicts happen during a rebase, and if so, how often?
10. A teammate force-pushed after rebasing a shared branch and your local branch is now broken — how do you fix it?
11. What practices help a team avoid merge conflicts in the first place?
