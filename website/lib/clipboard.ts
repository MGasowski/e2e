/** Copies text, falling back to a hidden textarea where the async API is missing or denied. */
export async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {}

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.cssText = "position: fixed; opacity: 0;";
  document.body.appendChild(textArea);

  let copied = false;
  try {
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    copied = document.execCommand("copy");
  } finally {
    textArea.remove();
  }

  if (!copied) {
    throw new Error("Failed to copy text");
  }
}
