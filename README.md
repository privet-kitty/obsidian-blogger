# obsidian-blogger

**This plugin is still in prealpha stage.**

This plugin makes you publish Obsidian documents to Blogger.

## Install

This pluging has not been published to the community plugins yet. You'll need to clone and build it by yourself if you want to try it. The procedure will be as follows:

1. Clone this repository to your local machine and build it.
   ```bash
   cd /path/to/your/obsidian/vault/.obsidian/plugins
   git clone git@github.com:privet-kitty/obsidian-blogger.git
   cd obsidian-blogger
   npm install
   npm run build
   ```
2. Enable `Blogger` plugin in the `Community plugins` tab in the settings. You might need to reload plugins.

## Basic usage

First you need to create your profile from `Profiles` in the plugin settings tab. You'll need to do OAuth2 authentication to get access to your Blogger account in the middle of creating profile.

Then you can publish your document to Blogger by using `Publish to Blogger` in [Command Palette](https://help.obsidian.md/Plugins/Command+palette) or you could just use a button in the side bar. The document will be published to the Blogger URL that you set.

You could add YAML front matter in front of your note. The plugin will read meta-data from the front matter such as override the title or labels. Also, a Blogger post ID will be added to this front matter after the note has been published successfully.

An example of a front matter is as follows:

```markdown
---
title: Post title which will override note title, not required
labels:
  - any tag you want
  - not required
---

Note content here.
```
