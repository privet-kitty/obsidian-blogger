# Tips

## Integrating CSS or JavaScript into Your Blog

To incorporate CSS or JavaScript scripts into your blog, insert them within the head tag of your blog's HTML template. This requires accessing your Blogger dashboard, selecting the Theme tab, and pressing the Edit HTML button to modify the template.

The examples below illustrate how to integrate CSS or JavaScript scripts. **Direct copying and pasting is not recommended** as they serve merely as examples at the time of writing. It's best to visit the official website of the tool you wish to use and adhere to the provided instructions.

### CSS

```html
<!-- style -->
<link href="https://cdn.jsdelivr.net/npm/stackedit-css@0.1.4/dist/style.css" rel="stylesheet" />
```

### KaTeX

https://katex.org/docs/autorender

```html
<!-- katex -->
<link
  crossorigin="anonymous"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
  integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
  rel="stylesheet"
/>
<script
  crossorigin="anonymous"
  defer="defer"
  integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8"
  src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
/>
<script
  crossorigin="anonymous"
  defer="defer"
  integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05"
  src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
/>
<script>
  document.addEventListener(&quot;DOMContentLoaded&quot;, () => {
      renderMathInElement(document.body, {
        delimiters: [
          {left: &quot;$$&quot;, right: &quot;$$&quot;, display: true},
          {left: &quot;$&quot;, right: &quot;$&quot;, display: false},
        ],
        throwOnError : false
      });
  });
</script>
```

### Highlight.js

https://highlightjs.org/#usage

```html
<!-- highlight.js-->
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs.min.css"
  rel="stylesheet"
/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/lisp.min.js" />
<script>
  hljs.configure({ languages: [] }); // to avoid to highlight unknown languages
  hljs.highlightAll();
</script>
```

### Prism.js

https://prismjs.com/#basic-usage-cdn

```html
<!-- prism.js-->
<link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js" />
<script>
  document.addEventListener(&quot;DOMContentLoaded&quot;, async () =&gt; {
    Prism.highlightAll();
  });
</script>
```

### Pseudocode.js

https://github.com/SaswatPadhi/pseudocode.js

```html
<!-- pseudocode -->
<link
  href="https://cdn.jsdelivr.net/npm/pseudocode@2.4.1/build/pseudocode.min.css"
  rel="stylesheet"
/>
<script src="https://cdn.jsdelivr.net/npm/pseudocode@2.4.1/build/pseudocode.min.js" />
<script>
  document.addEventListener(&quot;DOMContentLoaded&quot;, () =&gt; {
    document.querySelectorAll(&quot;pre code.language-pseudo&quot;).forEach((node) =&gt; {
      node.parentNode.classList.add(&quot;pseudo&quot;);
      node.parentNode.innerHTML = node.innerHTML;
    })
    pseudocode.renderClass(&quot;pseudo&quot;);
  });
</script>
```

### Mermaid.js

http://mermaid.js.org/intro/getting-started.html?#_4-calling-the-mermaid-javascript-api

```html
<!-- mermaid -->
<script type="module">
  import mermaid from &quot;https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs&quot;;
     document.addEventListener(&quot;DOMContentLoaded&quot;, async () =&gt; {
       document.querySelectorAll(&quot;pre code.language-mermaid&quot;).forEach((node) =&gt; {
         node.parentNode.classList.add(&quot;mermaid&quot;);
         node.parentNode.innerHTML = node.innerHTML;
       })
       await mermaid.run();
     });
</script>
```

### Applying CSS only to the posts published by this plugin

`obsidian-blogger` wraps the output HTML by `<div class="obsidian-blogger-post">...</div>`. You can use this class to apply CSS only to the posts published by this plugin. An example would be as follows:

```css
.obsidian-blogger-post {
  margin-bottom: 90px;
  padding-left: 15px;
  padding-right: 15px;
}

.obsidian-blogger-post h1 {
  font-size: 2.5rem;
}
```

### Uploading Images

Unfortunately this plugin does not support uploading images to Blogger. You need to manually upload your images to Blogger (or any other public server) and link to them in your posts with standard syntax, such as `![alt text](https://example.com/image.png)`. This is due to the fact that Blogger does not provide an API for managing images.
