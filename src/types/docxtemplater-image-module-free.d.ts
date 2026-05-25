declare module "docxtemplater-image-module-free" {
  interface ImageModuleOptions {
    centered?: boolean;
    getImage: (tagValue: unknown, tagName: string) => Uint8Array;
    getSize: (
      img: Uint8Array,
      tagValue: unknown,
      tagName: string,
    ) => [number, number] | Promise<[number, number]>;
  }

  // Constructor returns an opaque module instance suitable for the
  // `modules` array passed to Docxtemplater. We don't need to model the
  // instance methods because callers never invoke them directly.
  class ImageModule {
    constructor(options: ImageModuleOptions);
  }

  export default ImageModule;
}
