// Node-only resolver for checking the same vendored modules used by the browser.
import { register } from "node:module";
import { isMainThread } from "node:worker_threads";
if (isMainThread) register(import.meta.url);
const three = new URL("../../life/vendor/three/three.module.js", import.meta.url).href;
const life = new URL("../../life/", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "three") return { url: three, format: "module", shortCircuit: true };
  if (specifier.startsWith("three/addons/")) return {
    url: new URL(`../../life/vendor/three/addons/${specifier.slice(13)}`, import.meta.url).href,
    format: "module",
    shortCircuit: true
  };
  const result = await nextResolve(specifier, context);
  if (result.url.startsWith(life) && result.url.endsWith(".js")) result.format = "module";
  return result;
}
