---
name: setup
description: Prepare this Google Workspace agent for first use. Use when the repository is newly created, setup is incomplete, Google OAuth credentials are missing, dependencies are not installed, or no Google account has been connected yet.
---

# Setup

Inspect the workspace first and perform only missing steps.

## Workflow

1. Check whether `node_modules/.bin/gws` exists. If it does not, run `npm install` and stop if installation fails.
2. Check whether `credentials/google-oauth-client.json` exists without printing or reading its contents.
3. If the OAuth client is missing, complete **Create the OAuth client** with the user. Pause after each group of Google Cloud Console steps and wait for the user before continuing.
4. Check for account profiles at `accounts/<account-slug>/gws/access.json`.
5. If no account profile exists, use the repository `add-account` skill to connect the first account. Do not duplicate its permission-selection workflow.
6. If one or more profiles exist, report the connected account emails and access levels from those non-secret profile files.

Setup is complete only when the local `gws` executable, shared OAuth client, and at least one account profile all exist.

## Create the OAuth client

Before giving the user any setup steps, explain the purpose in plain language:

> Before I can help with Gmail or Google Drive, Google needs a way to recognize me. We'll create something called an OAuth client, which you can think of as my ID card when I talk to Google from this directory.
>
> This ID card alone does not give me access to your Google account. When you connect an account, I'll ask Google for the permissions I need. Google will show you those permissions and ask you to approve them.
>
> Once you approve, Google links those permissions to this ID card. I can then use only the permissions you approved to access your account.

### Create a Google Cloud project

1. Ask the user to open <https://console.cloud.google.com/> and sign in.
2. Have them open the project selector, choose **New Project**, enter a project name of their choice such as `My GWS Agent`, and select **Create**. Explain that Google will use this name to identify the project when it asks them to approve permissions later, so they should choose a name they recognize.
3. Confirm that the new project is selected before continuing.

### Enable the APIs

Have the user open **APIs & Services → Library**, find each API, and select **Enable**:

- Gmail API
- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API

Explain:

> Enabling these APIs tells Google which services the ID card (OAuth client) we're about to create can be used with. It does not give me access to your account. That happens later, when we connect your account and you approve the requested permissions.

### Configure Google Auth Platform

1. Have the user open **Google Auth Platform → Overview** and select **Get Started** if shown.
2. Ask them to enter a recognizable app name of their choice, select their own email as the user support email, enter their own email again under **Contact Information**, review Google's user-data policy, and finish creating the app. Explain that the app name is the OAuth branding name Google can display on the consent screen, while the support email gives users a way to contact them and the contact email lets Google notify them about the project.
3. Choose **External** as the audience.
4. Open **Audience**, select **Publish App**, and confirm to put the app **In production**. Explain that this prevents the user from having to reconnect the account and approve access again every seven days.

### Download the Desktop client

1. Have the user open **Google Auth Platform → Clients** and select **Create Client**.
2. Choose **Desktop app**, enter a name such as `My Mac`, and select **Create**.
3. Have the user download the JSON file.
4. Explain:

   > The file you downloaded is the ID card (OAuth client) we just created. Drag and drop it into this chat, and I'll move it to the right place in this directory.

5. After the user attaches the file, move it to `credentials/google-oauth-client.json`, creating the `credentials` directory if needed. Handle the filename and location without reading, parsing, or displaying the file's contents.
6. Verify only that the file exists at the expected location.

Never ask the user to paste the JSON contents into chat. Never print, summarize, or commit the OAuth client.
