'use client';
import { MaterialForm } from './material-form';
import type { Material } from '../api/materials.api';
export function MaterialFormEdit({ material, onSuccess }: { material: Material; onSuccess: () => void }) { return <MaterialForm material={material} onSuccess={onSuccess} />; }
