// `@pdf-lib/fontkit` ships no type declarations. pdf-lib consumes it opaquely
// via `PDFDocument.registerFontkit`, so an `unknown` default export is enough.
declare module '@pdf-lib/fontkit' {
  const fontkit: unknown;
  export default fontkit;
}
