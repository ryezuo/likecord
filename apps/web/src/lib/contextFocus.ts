/** A detached or explicitly hidden invoker cannot receive restored focus. */
export function isContextInvokerAvailable(element: HTMLElement | null | undefined): element is HTMLElement {
  if (!element?.isConnected) return false;
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (node.hidden || node.inert) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}
