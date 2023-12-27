# obsidian-blogger

**This plugins is still in prealpha stage.**

This plugin makes you publish Obsidian documents to Blogger.

## Usages

First you need to create your profile from `Profiles` in plugin settings. You'll need to do OAuth2 authentication to get access to your Blogger account in the middle of creating profile.

Then you can publish your document to Blogger by using `Publish to Blogger` in [Command Palette](https://help.obsidian.md/Plugins/Command+palette) or you could show a button in side in settings.
The document will be published to the Blogger URL that you set.

You could add YAML front matter in front of notes. The plugin will read
meta-data from front matter such as override title or labels.
Also, Blogger post ID will be added to this front matter
if the note published successfully in order to support edit.

For example, you could add as following:

```markdown
---
title: Post title which will override note title, not required
labels:
  - any tag you want
  - not required
---

Note content here.
```
