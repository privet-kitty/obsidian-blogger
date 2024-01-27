# obsidian-blogger

**This plugin is currently in the alpha stage.**

This plugin makes you publish Obsidian documents to Blogger.

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

## Fundamental Usage

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

## Additional Information

- [Tips](https://github.com/privet-kitty/obsidian-blogger/blob/main/docs/tips.md)
