import { Professional } from "./professional";
export abstract class ProfessionalRepository {
  abstract find(id: number): Promise<Professional | null>;
  abstract create(professional: Professional): Promise<number>;
  abstract save(professional: Professional): Promise<void>;
}
