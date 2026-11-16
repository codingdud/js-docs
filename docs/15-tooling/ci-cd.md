---
title: "CI/CD, Jenkins, GitHub Actions and SonarQube"
sidebar_position: 3
---

# CI/CD, Jenkins, GitHub Actions and SonarQube

CI/CD is a set of practices that automate how code moves from a developer's machine into production, so that integrating and releasing changes is fast, repeatable, and low-risk instead of a manual, error-prone event.

## CI vs. CD

- **CI — Continuous Integration**: automatically building, testing, and integrating code changes into a shared repository as soon as they're pushed. The goal is to catch integration problems (a change that breaks something elsewhere) within minutes, not weeks.
- **CD — Continuous Delivery/Deployment**: automatically taking code that has passed CI and deploying it to further environments — staging, and ultimately production.

A CI/CD **pipeline** is a sequence of automated stages that take a change all the way from "code just got pushed" to "code is running where users can reach it":

```text
plan → code → CI [build, test, package] → CD [staging, production] → monitor
```

### Why teams adopt CI/CD

- **Faster development** — changes reach production in minutes/hours instead of days/weeks.
- **More stable releases** — automated tests catch regressions before a human ever sees them.
- **Business growth** — shipping faster and more reliably compounds into a real competitive advantage.

### Qualities a good pipeline has

- **Autonomous** — it runs without a human manually kicking off each step.
- **Transparent** — anyone can see which stage a change is in, and why it failed if it did.
- **Fast** — slow pipelines get bypassed or ignored; feedback needs to arrive quickly.
- **Secure** — secrets, credentials, and dependencies are handled safely at every stage.
- **Scalable** — the pipeline keeps working as the number of builds, tests, and deployments grows.

### The pipeline toolkit

A typical JavaScript/web pipeline is assembled from:

- **Version control** — Git (hosted on GitHub, GitLab, Bitbucket, etc.) is what every stage reacts to.
- **Build tooling** — a Docker image build, or a plain JS build (bundler, `tsc`, etc.), producing a deployable artifact.
- **Environments** — distinct `dev`, `staging`/`release`, and `production` environments the artifact is promoted through.
- **Monitoring** — tools like New Relic or Datadog that watch the deployed application's health after release.
- **Code quality/security** — static analysis tools such as SonarQube.
- **Orchestration** — a CI server such as Jenkins, or a hosted runner such as GitHub Actions.

### Pipeline stages, step by step

1. **Commit** — a developer pushes code.
2. **Trigger** — a webhook (or equivalent) notifies the CI system that there's new work to do.
3. **Build** — the code is compiled/bundled (and, for containerized apps, an image is built).
4. **Test** — automated tests run; failures notify the team immediately rather than silently blocking a later, manual check.
5. **Staging** — the build is prepared and loaded into a pre-production environment that mirrors production as closely as possible.
6. **Deploy** — the build is released to production.

## Jenkins

Jenkins is an open-source **automation server** for building CI/CD pipelines. It can automate the build, test, and deploy steps end-to-end, running on your own infrastructure. Its core strength is extensibility: Jenkins ships with a comparatively small core, and almost all of its real functionality — Git integration, Docker support, Slack notifications, deployment targets, and so on — comes from its large plugin ecosystem.

## GitHub Actions

GitHub Actions is an automation solution for CI/CD that is **built directly into a GitHub repository**. Instead of running and maintaining a separate server (as you would with Jenkins), you define workflows as YAML files committed to the repo itself (under `.github/workflows/`), and GitHub runs them on hosted (or self-hosted) runners whenever the triggers you specify — a push, a pull request, a schedule — fire. That tight integration with the repository is what makes it fast to adopt for teams already on GitHub, at the cost of being less portable than a standalone server like Jenkins.

## SonarQube

SonarQube is a **code quality and security analysis** tool. It's typically wired into the pipeline right after the test stage: it scans the codebase for bugs, code smells, duplicated code, and known security vulnerabilities, and can be configured to fail the pipeline ("break the build") if quality drops below a defined threshold ("quality gate"). This turns code quality from a once-in-a-while manual review into an automatic, continuous check on every change.

## Example: a GitLab Pages static-site deploy pipeline

Here is a complete, minimal `.gitlab-ci.yml` that deploys a plain HTML/CSS/JS site to GitLab Pages whenever `main` is updated:

```yaml
# GitLab CI/CD configuration for deploying HTML/CSS/JS site to GitLab Pages
image: alpine:latest  # Lightweight Linux image

pages:
  stage: deploy
  script:
    - mkdir .public
    - cp -r * .public
    - mv .public public  # GitLab Pages expects a 'public' folder
  artifacts:
    paths:
      - public
  only:
    - main  # Deploy only when pushing to the 'main' branch
```

Walking through it:

- `image: alpine:latest` picks a minimal Linux container to run the job in — there's no build step here, so a lightweight image is all that's needed.
- The job is named `pages`, which is a reserved name GitLab Pages looks for specifically; it's what tells GitLab "the artifact this job produces is the site to publish."
- `stage: deploy` places it in the deploy stage of the pipeline.
- The `script` copies every file in the project into a `.public` directory and then renames it to `public`, because **GitLab Pages requires the published output to live in a folder literally named `public`**.
- `artifacts.paths: [public]` tells GitLab CI to keep the `public` folder after the job finishes and hand it to the Pages service.
- `only: [main]` restricts the job to running only on pushes to `main`, so feature branches don't trigger a deploy.

:::tip
This is CD in its simplest possible form: no separate build stage because the source files are already deployable as-is. A real JS app would add a `build` stage first (e.g. `npm ci && npm run build`) and point `artifacts.paths` at the build output directory instead of the raw source.
:::

## Key takeaways

- CI automates build + test + integration on every change; CD automates getting a tested change out to staging and production.
- A pipeline's value comes from being autonomous, transparent, fast, secure, and scalable — not just "automated."
- Jenkins is a self-hosted, plugin-extensible automation server; GitHub Actions is GitHub-native and config-as-YAML-in-repo; SonarQube adds an automated quality/security gate to either.
- A GitLab Pages deploy pipeline is a good minimal example of CD: produce the right output folder (`public`), declare it as an artifact, and restrict the job to the branch that should trigger a release.

### Interview questions

1. What is the difference between CI and CD?
2. What are the typical stages of a CI/CD pipeline, in order?
3. What qualities make a CI/CD pipeline actually good, beyond "it's automated"?
4. What tools would you expect to find in a typical JS project's CI/CD toolkit, and what does each do?
5. What is Jenkins, and how does it get extended beyond its core functionality?
6. How does GitHub Actions differ from running your own Jenkins server?
7. What does SonarQube check for, and where does it typically sit in a pipeline?
8. Why does the GitLab Pages example rename its output folder to `public` before finishing?
9. Why does the example pipeline only run `only: [main]` instead of every branch?
