# obsidian-blogger

**This plugin is still in prealpha stage.**

This plugin makes you publish Obsidian documents to Blogger.

## Usages

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
