
import { Parent } from './parent.model';
import { Attachment } from './attachment.model';

export class Signature {
    public commonName: string;
    public serialNumber: string;
    public organizationName: string;
    public organizationalUnitName: string;
    public localityName: string;
    public stateOrProvinceName: string;
    public countryName: string;
    public emailAdress: string;
    public telephoneNumber: string;
    public organizationId: string;
    public role: string;
    public purpose: string;
    public basis: string;
    public isSigned: boolean;
    public signedAt: Date;
    public parents: Parent[];
    public attachments: Attachment[];
    public handwrittenImage: string;
    public handwrittenVideo: string;
}
