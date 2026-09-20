import { MaterialsPolicy } from './materials.policy';
import { MaterialsService } from './materials.service';

type ControllerContext = { user: Parameters<typeof MaterialsPolicy.assertView>[0]; service: MaterialsService };

export function listMaterials({ user, service }: ControllerContext) { MaterialsPolicy.assertView(user); return service.list(); }
export function createMaterial({ user, service }: ControllerContext, input: unknown) { MaterialsPolicy.assertCreate(user); return service.create(input); }
export function updateMaterial({ user, service }: ControllerContext, id: string, input: unknown) { MaterialsPolicy.assertUpdate(user); return service.update(id, input); }
export function updateMaterialQuantity({ user, service }: ControllerContext, id: string, input: unknown) { MaterialsPolicy.assertUpdate(user); return service.updateQuantity(id, input); }
export function deleteMaterial({ user, service }: ControllerContext, id: string) { MaterialsPolicy.assertDelete(user); return service.remove(id); }
