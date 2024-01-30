# Tips

## How to introduce CSS or JS scripts into your blog

You can put any CSS or JS scripts you want to use into the `head` tag in the HTML template of your blog. (You need to go to your Blogger dashboard, click on the `Theme` tab, and click on the `Edit HTML` button to edit the template.)

Below are some examples of how to introduce CSS or JS scripts. **I don't recommend you copy and paste them directly** because they are just an example as of this writing. Instead you should go to the official website of the tool you want to use and follow the instructions there.

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

### highlight

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

### prism

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

### pseudocode

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

### mermaid

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

### How to apply CSS only only to the posts published by this plugin

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
