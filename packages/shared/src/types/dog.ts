/** Sensor-engineering fur classes (EMOPET Sensor Spec v2.0 section 3.2). */
export type FurClass = 'FC1' | 'FC2' | 'FC3' | 'FC4';

/** Collar textile insert type, derived from fur class. */
export type InsertType = 'A' | 'B' | 'C';

export interface Dog {
  id: string;
  name: string;
  breed: string;
  breedFciNumber?: number;
  birthDate: Date;
  sex: 'male' | 'female';
  weight: number;
  furClass: FurClass;
  insertType: InsertType;
  photo: string;
  ownerId: string;
  deviceCollarId?: string;
  deviceMatId?: string;
  /** True after 72h warm-up baseline accumulation. */
  baselineComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DogCreateInput {
  name: string;
  breed: string;
  breedFciNumber?: number;
  birthDate: Date;
  sex: 'male' | 'female';
  weight: number;
  furClass: FurClass;
  photo?: string;
}

/** Fur class to insert type mapping. */
export function furClassToInsert(fc: FurClass): InsertType {
  switch (fc) {
    case 'FC1': return 'A';
    case 'FC2': return 'A';
    case 'FC3': return 'B';
    case 'FC4': return 'C';
  }
}
