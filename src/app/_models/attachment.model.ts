
export class Attachment {
    public id: string;
    public url: string;
    public path: string;
    public type: string;
    public hash: string;
    public blob: Blob;
    public base64: any;
    public arrayBuffer: any;
    public sanitizeUrl: any;
    public sanitizePdfViewer: any;
    public sanitizeResource: any;
}
