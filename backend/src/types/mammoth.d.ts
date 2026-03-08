declare module "mammoth" {
  interface ExtractResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  interface InputOptions {
    path?: string;
    buffer?: Buffer;
  }

  function extractRawText(options: InputOptions): Promise<ExtractResult>;
  function convertToHtml(options: InputOptions): Promise<ExtractResult>;

  export { extractRawText, convertToHtml, ExtractResult, InputOptions };
  export default { extractRawText, convertToHtml };
}
