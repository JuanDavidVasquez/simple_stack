import { Response } from 'express';
import { config } from '../../core/config/env';
import setupLogger from "../../shared/utils/logger";
import { Service } from 'typedi/types/decorators/service.decorator';


@Service()
export class PetController {
    private readonly logger = setupLogger({
        ...config.logging,
        dir: `${config.logging.dir}/controllers/pets`,
    })

    constructor() {
        this.logger.info('PetController initialized');
    }

    
}