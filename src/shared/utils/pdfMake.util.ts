import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import * as fs from 'fs';
import path from 'path';

export class BasicReports {
    private printer: PdfPrinter;

    constructor() {
        const fontsPath = {
            Roboto: {
                normal: path.join(process.cwd(), 'fonts/roboto/Roboto-Regular.ttf'),
                bold: path.join(process.cwd(), 'fonts/roboto/Roboto-Medium.ttf'),
                italics: path.join(process.cwd(), 'fonts/roboto/Roboto-Italic.ttf'),
                bolditalics: path.join(process.cwd(), 'fonts/roboto/Roboto-MediumItalic.ttf'),
            },
        };

        this.printer = new PdfPrinter(fontsPath);
    }

    async createPdf(bodyContent: Content, customStyles?: any): Promise<Buffer> {
        try {
            // Cargar la imagen PNG
            const logoPath = path.join(process.cwd(), 'public/images/logos/img_logo.png');
            const logoBase64 = await this.loadImage(logoPath);

            const docDefinition: TDocumentDefinitions = {
                pageMargins: [40, 80, 40, 60],
                
                header: {
                    columns: [
                        {
                            image: logoBase64,
                            width: 80,
                            alignment: 'left',
                            margin: [40, 20, 0, 0]
                        },
                        {
                            text: 'Mi Empresa',
                            fontSize: 16,
                            bold: true,
                            alignment: 'center',
                            margin: [0, 30, 0, 0]
                        },
                        {
                            image: logoBase64,
                            width: 80,
                            alignment: 'right',
                            margin: [0, 20, 40, 0]
                        },
                    ]
                },

                footer: (currentPage, pageCount) => ({
                    text: `Página ${currentPage} de ${pageCount}`,
                    alignment: 'center',
                    fontSize: 8,
                    margin: [0, 0, 0, 20]
                }),

                content: bodyContent,
                
                defaultStyle: {
                    font: 'Roboto'
                },
                
                styles: customStyles || {}
            };

            const doc = this.printer.createPdfKitDocument(docDefinition);

            return new Promise((resolve, reject) => {
                const chunks: Buffer[] = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                doc.end();
            });
            
        } catch (error) {
            console.error('Error creating PDF:', error);
            throw error;
        }
    }

    private async loadImage(imagePath: string): Promise<string> {
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image not found: ${imagePath}`);
        }

        const imageBuffer = await fs.promises.readFile(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') {
            mimeType = 'image/jpeg';
        }

        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }
}