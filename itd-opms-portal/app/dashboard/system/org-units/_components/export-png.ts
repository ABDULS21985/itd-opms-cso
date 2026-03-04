/**
 * Export an SVG element as a PNG file.
 * Inlines CSS variables so the exported image renders correctly outside the DOM.
 */
export async function exportSvgAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Inline CSS variables on foreignObject content
  inlineComputedStyles(svgElement, clone);

  // Set explicit dimensions
  const bbox = svgElement.getBoundingClientRect();
  clone.setAttribute("width", String(bbox.width));
  clone.setAttribute("height", String(bbox.height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = bbox.width * scale;
      canvas.height = bbox.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG image load failed"));
    };
    img.src = url;
  });
}

function inlineComputedStyles(
  original: Element,
  clone: Element,
): void {
  const origChildren = original.children;
  const cloneChildren = clone.children;

  for (let i = 0; i < origChildren.length; i++) {
    const origChild = origChildren[i];
    const cloneChild = cloneChildren[i];
    if (!origChild || !cloneChild) continue;

    if (origChild instanceof HTMLElement || origChild instanceof SVGElement) {
      const computed = getComputedStyle(origChild);
      const cloneEl = cloneChild as HTMLElement | SVGElement;

      // Inline key visual properties
      const props = [
        "color",
        "background-color",
        "border-color",
        "fill",
        "stroke",
        "font-family",
        "font-size",
        "font-weight",
        "opacity",
      ];
      for (const prop of props) {
        const val = computed.getPropertyValue(prop);
        if (val) cloneEl.style.setProperty(prop, val);
      }
    }

    inlineComputedStyles(origChild, cloneChild);
  }
}
