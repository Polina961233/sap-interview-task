declare module "pdf-parse" {
  function pdf(dataBuffer: Buffer): Promise<{ text: string }>;
  export default pdf;
}

declare namespace Express {
  interface Request {
    file?: {
      path: string;
      mimetype: string;
      originalname: string;
    };
  }
}
