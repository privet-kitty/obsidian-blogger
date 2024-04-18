# obsidian-blogger

**This plugin is currently in the beta stage.**

This plugin makes you publish Obsidian notes to Blogger.

## Installation

This plugin has not yet been released to the Community plugins. To experiment with this plugin, you must manually clone and build it. The process is as follows:

1. Clone this repository to your local machine and execute the build process.
   ```bash
   cd /path/to/your/obsidian/vault/.obsidian/plugins
   git clone git@github.com:privet-kitty/obsidian-blogger.git
   cd obsidian-blogger
   npm install
   npm run build
   ```
2. Activate the `Blogger` plugin within the `Community Plugins` section of the settings. A reload of the plugins may be required.

## Create a Credential for Blogger API

Before starting to use this plugin, you need to create an OAuth2 client ID and a secret. Note that this procedure depends on whether you are using a desktop or a mobile.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).
2. You may want to create a new project.
3. Go to `Enabled APIs & services ` and click `ENABLE APIS AND SERVICES`. Search for `Blogger API` and enable it.
4. Go to the [Credentials page on Google Cloud Console](https://console.cloud.google.com/apis/credentials).
5. Click `Create Credentials` and select `OAuth client ID` from the drop-down menu. (For the first time, you may need to compose an OAuth2 consent screen.)
6. (**Desktop** only) Select `Desktop app` and create a key with your favorite name.
7. (**Mobile** only) Select `Web application`, click `ADD URI` from `Autorized redirect URIs` and add `https://privet-kitty.github.io/obsidian-blogger/oauth2_forward.html`. Then, create a key with your favorite name.
8. The credentials will be created. Please note your client ID and secret.
9. Open the plugin settings and set your client ID and secret.

The strange procedure in step 4 is due to the fact that it's not possible to create a local server in the Mobile Obsidian and that Google imposes restrictions on the use of custom URI schemes.

## Fundamental Usage

_Please see [Tips](https://github.com/privet-kitty/obsidian-blogger/blob/main/docs/tips.md) for information beyond this README._

Initially, create your profile via the `Profiles` section in the plugin settings tab. During this process, OAuth2 authentication is necessary to access your Blogger account.

Subsequently, you can publish your document to Blogger using `Publish to Blogger` found in the [Command Palette](https://help.obsidian.md/Plugins/Command+palette) or through a dedicated button in the sidebar. The document will be published to the Blogger URL you set.

You could add YAML front matter at the beginning of your note. The plugin will interpret metadata from the front matter, such as the title and labels. Furthermore, a Blogger post ID will be appended to this front matter after the note has been published successfully.

An example of front matter is as follows:

```markdown
---
title: Post title which will override note title, not required
labels:
  - any tag you want
  - not required
---

Content here.
```

## Acknowledgements

This plugin is based on Cheng Liang's [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress).
