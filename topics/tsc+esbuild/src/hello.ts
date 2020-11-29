/** put "qs" to devDependencies because we bundle it */
import { stringify } from "qs";

/**
 * Write description for top-level functions is good.
 * Top-level functions are better declared with `function`.
 */
export default function hello(world: string) {
    console.log("hello,", world);
    return stringify({ hello: world });
}
