import axios, { AxiosInstance } from "axios";
import { Service } from "typedi";
import FormData from "form-data";

@Service()
export class FileApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.FILE_API_URL,
      timeout: 5000,
    });
  }

  async uploadFile(file: Express.Multer.File) {
    const formData = new FormData();
    formData.append("file", file.buffer, file.originalname);

    const response = await this.api.post("/upload", formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data;
  }

  async listFiles() {
    const response = await this.api.get("/files");
    return response.data;
  }

  async getFile(id: string) {
    const response = await this.api.get(`/files/${id}`);
    return response.data;
  }

  async deleteFile(id: string) {
    const response = await this.api.delete(`/files/${id}`);
    return response.data;
  }
}
