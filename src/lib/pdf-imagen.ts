/** Dibuja la primera hoja de un PDF como imagen en el teléfono (pdf.js por CDN, sin empaquetar) · Doménica 27 */
export async function pdfAImagen(url: string): Promise<string> {
  const v = "4.4.168";
  // import dinámico desde la red (sin pasar por el empaquetador)
  const importar = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;
  const pdfjs = await importar(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.min.mjs`) as { getDocument: (u: string) => { promise: Promise<{ getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }> }; GlobalWorkerOptions: { workerSrc: string } };
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument(url).promise; const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2 }); const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
  return c.toDataURL("image/jpeg", 0.85);
}
