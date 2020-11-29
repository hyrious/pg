tsserver is expensive -- in both cpu and ram.

in fact, vscode gives tsserver 3GB memories (on my 12GB ram machine) by default.
but it still crashes (to become some zombie process,
if [TypeScript > Tsserver: Use Separate Syntax Server] is on
(which is on by default)).
do you remember seeing [Code Helper] processes eating GBs memory?

so here is what i did to prevent this happening:

1. disable TypeScript > Tsserver: Use Separate Syntax Server in vscode,
2. if vscode does not suits you, try: tsc --watch
3. tsc can not do bundling, we need to use rollup/esbuild/<del>webpack</del>,
   here i choose the faster one, feel free to pick up what you like.

some notices/tips:

* esbuild only recognizes lower case ("esnext" instead of "ESNext")
* ts-node is still "node", it only supports module=commonjs
* try node --enable-source-maps dist/index.cjs.js to track errors
